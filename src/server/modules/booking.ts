/**
 * Booking: quote → hold → payment → confirm (or expire / cancel / refund).
 *
 *  1. quoteStay()      server-side price (rules + overrides) and availability.
 *  2. createBooking()  upserts the customer, inserts a `hold` (the DB exclusion
 *                      constraint makes double booking impossible even under
 *                      concurrent requests), then
 *                        - Stripe configured → PaymentIntent, status pending_payment
 *                        - demo mode        → confirmed immediately (simulated card)
 *  3. finalizePaid()   called by the Stripe webhook; idempotent.
 *  4. expireHolds()    unpaid holds older than HOLD_MINUTES are released (lazily
 *                      before every availability check + daily cron).
 */
import { createHmac } from "crypto";
import { and, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { accommodations } from "@/lib/data/accommodations";
import type { Db } from "../db/client";
import {
  customers,
  payments,
  pricingRules,
  properties,
  rateOverrides,
  ratePlans,
  refunds,
  reservations,
  units,
} from "../db/schema";
import { audit } from "../audit";
import { localDate } from "../time";
import { getStripe } from "../integrations/stripe";
import { nextReservationCode, syncCheckoutTask } from "./reservations";
import { getCancellationPolicy } from "./settings";
import { addDays, buildQuote, cancellationFee, daysBetween, priceNights, type EngineRule, type Quote } from "./pricing-engine";

export const HOLD_MINUTES = 30;
export const MAX_NIGHTS = 30;
const LIVE_STATUSES = ["hold", "pending_payment", "confirmed", "checked_in"] as const;

type Property = typeof properties.$inferSelect;
type Unit = typeof units.$inferSelect;
type Plan = typeof ratePlans.$inferSelect;
type Reservation = typeof reservations.$inferSelect;

export class BookingError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

/* ------------------------------------------------------------------ */
/* Lookup                                                              */
/* ------------------------------------------------------------------ */

/** Accepts the public site's accommodation id ("stay-namba-machiya") or a property slug. */
export async function resolveStay(db: Db, stayRef: string, planCode?: string) {
  const slug = accommodations.find((a) => a.id === stayRef)?.slug ?? stayRef;
  const [row] = await db
    .select({ p: properties, u: units })
    .from(properties)
    .innerJoin(units, eq(units.propertyId, properties.id))
    .where(and(eq(properties.slug, slug), eq(properties.business, "stay")))
    .limit(1);
  if (!row) throw new BookingError("stay_not_found", 404);
  const plans = await db.select().from(ratePlans).where(and(eq(ratePlans.unitId, row.u.id), eq(ratePlans.isActive, true)));
  const plan = plans.find((p) => p.code === planCode || p.id === planCode) ?? plans[0];
  if (!plan) throw new BookingError("plan_not_found", 404);
  return { property: row.p, unit: row.u, plan };
}

export async function loadPricingInputs(db: Db, s: { property: Property; unit: Unit; plan: Plan }, from: string, to: string) {
  const [ruleRows, overrideRows] = await Promise.all([
    db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.isActive, true),
          or(
            eq(pricingRules.scope, "all"),
            and(eq(pricingRules.scope, "property"), eq(pricingRules.targetId, s.property.id)),
            and(eq(pricingRules.scope, "unit"), eq(pricingRules.targetId, s.unit.id)),
            and(eq(pricingRules.scope, "plan"), eq(pricingRules.targetId, s.plan.id))
          )
        )
      ),
    db
      .select()
      .from(rateOverrides)
      .where(and(eq(rateOverrides.ratePlanId, s.plan.id), gte(rateOverrides.date, from), lt(rateOverrides.date, to))),
  ]);
  const rules: EngineRule[] = ruleRows.map((r) => ({
    id: r.id,
    name: r.name,
    ruleType: r.ruleType,
    condition: r.condition as Record<string, unknown>,
    adjustType: r.adjustType,
    adjustValue: r.adjustValue,
    priority: r.priority,
    stackable: r.stackable,
  }));
  return { rules, overrides: overrideRows.map((o) => ({ date: o.date, price: o.price, closed: o.closed, minNights: o.minNights })) };
}

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

export async function expireHolds(db: Db, unitId?: string): Promise<number> {
  const rows = await db
    .update(reservations)
    .set({ status: "cancelled", cancelledAt: new Date(), note: sql`coalesce(${reservations.note} || ' / ', '') || '支払い期限切れで自動解放'` })
    .where(
      and(
        inArray(reservations.status, ["hold", "pending_payment"]),
        lt(reservations.holdExpiresAt, new Date()),
        unitId ? eq(reservations.unitId, unitId) : undefined
      )
    )
    .returning({ id: reservations.id, code: reservations.code });
  for (const r of rows) {
    await audit(db, { actorType: "system", action: "reservation.hold_expired", entityType: "reservation", entityId: r.code });
  }
  // Best effort: cancel the abandoned PaymentIntents so they can't be paid later.
  const stripe = getStripe();
  if (stripe && rows.length) {
    const pays = await db.select().from(payments).where(inArray(payments.reservationId, rows.map((r) => r.id)));
    for (const p of pays) {
      if (p.stripePaymentIntentId && !p.stripePaymentIntentId.startsWith("pi_demo_")) {
        await stripe.paymentIntents.cancel(p.stripePaymentIntentId).catch(() => null);
      }
    }
  }
  return rows.length;
}

/** Nights (yyyy-mm-dd) in [from, to) already taken on this unit. */
export async function bookedNights(db: Db, unitId: string, from: string, to: string, excludeId?: string): Promise<Set<string>> {
  const rows = await db
    .select({ checkIn: reservations.checkIn, checkOut: reservations.checkOut })
    .from(reservations)
    .where(
      and(
        eq(reservations.unitId, unitId),
        eq(reservations.kind, "stay"),
        inArray(reservations.status, [...LIVE_STATUSES]),
        lt(reservations.checkIn, to),
        sql`${reservations.checkOut} > ${from}`,
        excludeId ? ne(reservations.id, excludeId) : undefined
      )
    );
  const out = new Set<string>();
  for (const r of rows) {
    for (let d = r.checkIn!; d < r.checkOut!; d = addDays(d, 1)) if (d >= from && d < to) out.add(d);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Quote                                                               */
/* ------------------------------------------------------------------ */

export interface QuoteInput {
  stay: string;
  plan?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}

export type QuoteResult =
  | { available: true; quote: Quote; property: Property; unit: Unit; plan: Plan }
  | { available: false; reason: string; quote?: Quote; property: Property; unit: Unit; plan: Plan };

export async function quoteStay(db: Db, input: QuoteInput): Promise<QuoteResult> {
  const s = await resolveStay(db, input.stay, input.plan);
  const today = localDate(s.property.timezone);
  const nights = daysBetween(input.checkIn, input.checkOut);
  const fail = (reason: string, quote?: Quote): QuoteResult => ({ available: false, reason, quote, ...s });

  if (!(nights >= 1)) return fail("bad_dates");
  if (nights > MAX_NIGHTS) return fail("too_long");
  if (input.checkIn < today) return fail("past_date");
  if (input.adults + input.children > s.plan.maxGuests) return fail("over_capacity");

  const { rules, overrides } = await loadPricingInputs(db, s, input.checkIn, input.checkOut);
  const perNight = priceNights({
    basePrice: s.plan.basePrice,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    today,
    guests: input.adults + input.children,
    rules,
    overrides,
  });
  const quote = buildQuote(perNight, s.property.cleaningFee, input.children);

  const minNights = overrides.find((o) => o.date === input.checkIn)?.minNights ?? s.plan.minNights;
  if (nights < minNights) return fail(`min_nights_${minNights}`, quote);
  if (perNight.some((n) => n.closed)) return fail("closed", quote);

  await expireHolds(db, s.unit.id);
  const taken = await bookedNights(db, s.unit.id, input.checkIn, input.checkOut);
  if (taken.size) return fail("unavailable", quote);

  return { available: true, quote, ...s };
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

export interface GuestInput {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  arrivalTime?: string;
  messagingId?: string;
  notes?: string;
}

/** "Mei Chen" → Mei / Chen;  "山田 太郎" → 太郎 / 山田 (CJK: family name first). */
export function splitName(full: string): { givenName: string; familyName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { givenName: "", familyName: parts[0] };
  const cjk = /[぀-ヿ㐀-鿿가-힯]/.test(full);
  return cjk
    ? { familyName: parts[0], givenName: parts.slice(1).join(" ") }
    : { givenName: parts.slice(0, -1).join(" "), familyName: parts[parts.length - 1] };
}

export function statusToken(reservationId: string): string {
  const secret = process.env.KEY_SESSION_SECRET ?? "dev-only-key-session-secret";
  return createHmac("sha256", secret).update(`status:${reservationId}`).digest("base64url").slice(0, 32);
}

function isOverlapError(e: unknown): boolean {
  const s = JSON.stringify(e, Object.getOwnPropertyNames(e as object)) + String((e as { cause?: unknown })?.cause ?? "");
  return s.includes("23P01") || s.includes("reservations_no_overlap");
}

export async function createBooking(
  db: Db,
  input: QuoteInput & { guest: GuestInput; locale?: string; utmSource?: string; utmCampaign?: string; source?: string; simulate?: "success" | "failure" }
) {
  const q = await quoteStay(db, input);
  if (!q.available) throw new BookingError(q.reason, q.reason === "unavailable" ? 409 : 400);

  const email = input.guest.email.trim().toLowerCase();
  const names = splitName(input.guest.fullName);
  const [existing] = await db.select().from(customers).where(eq(customers.email, email));
  const customer = existing
    ? (
        await db
          .update(customers)
          .set({ ...names, phone: input.guest.phone, country: input.guest.country, preferredLocale: input.locale ?? existing.preferredLocale })
          .where(eq(customers.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(customers)
          .values({ email, ...names, phone: input.guest.phone, country: input.guest.country, preferredLocale: input.locale ?? "ja", tags: ["stay_only"] })
          .returning()
      )[0];

  const code = await nextReservationCode(db);
  let r: Reservation;
  try {
    [r] = await db
      .insert(reservations)
      .values({
        code,
        kind: "stay",
        propertyId: q.property.id,
        unitId: q.unit.id,
        ratePlanId: q.plan.id,
        customerId: customer.id,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        adults: input.adults,
        children: input.children,
        status: "hold",
        priceSnapshot: q.quote,
        totalAmount: q.quote.total,
        source: input.source ?? "direct",
        utmSource: input.utmSource,
        utmCampaign: input.utmCampaign,
        locale: input.locale ?? "ja",
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
        arrivalTime: input.guest.arrivalTime || null,
        messagingId: input.guest.messagingId || null,
        guestNote: input.guest.notes || null,
      })
      .returning();
  } catch (e) {
    if (isOverlapError(e)) throw new BookingError("unavailable", 409); // lost a race with a concurrent booking
    throw e;
  }
  await audit(db, { actorType: "guest", actorLabel: email, action: "reservation.hold", entityType: "reservation", entityId: code, diff: { total: q.quote.total } });

  const stripe = getStripe();
  if (!stripe) {
    // ---- demo mode: simulated card ----
    if (input.simulate === "failure") {
      await db.update(reservations).set({ status: "cancelled", cancelledAt: new Date(), note: "デモ決済失敗" }).where(eq(reservations.id, r.id));
      return { mode: "demo" as const, status: "failed" as const, code, amount: q.quote.total, quote: q.quote };
    }
    const piId = `pi_demo_${code.replace("-", "")}`;
    await db.insert(payments).values({ reservationId: r.id, kind: "charge", stripePaymentIntentId: piId, amount: q.quote.total, status: "processing" });
    await finalizePaid(db, { reservationId: r.id, paymentIntentId: piId, amountReceived: q.quote.total });
    return { mode: "demo" as const, status: "succeeded" as const, code, amount: q.quote.total, quote: q.quote, statusToken: statusToken(r.id) };
  }

  // ---- Stripe ----
  const intent = await stripe.paymentIntents.create(
    {
      amount: q.quote.total, // JPY is zero-decimal
      currency: "jpy",
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      description: `${code} ${q.property.name.ja} ${input.checkIn}→${input.checkOut}`,
      metadata: { reservationId: r.id, reservationCode: code, propertySlug: q.property.slug },
    },
    { idempotencyKey: `reservation-${r.id}` }
  );
  await db.insert(payments).values({ reservationId: r.id, kind: "charge", stripePaymentIntentId: intent.id, amount: q.quote.total, status: intent.status });
  await db.update(reservations).set({ status: "pending_payment" }).where(eq(reservations.id, r.id));
  return {
    mode: "stripe" as const,
    status: "requires_payment" as const,
    code,
    amount: q.quote.total,
    quote: q.quote,
    clientSecret: intent.client_secret,
    statusToken: statusToken(r.id),
    holdExpiresAt: r.holdExpiresAt,
  };
}

/* ------------------------------------------------------------------ */
/* Finalize / fail (webhook)                                           */
/* ------------------------------------------------------------------ */

export async function finalizePaid(db: Db, p: { reservationId: string; paymentIntentId: string; amountReceived: number }) {
  const [r] = await db.select().from(reservations).where(eq(reservations.id, p.reservationId));
  if (!r) return { ok: false as const, reason: "not_found" };

  await db
    .update(payments)
    .set({ status: "succeeded", amountCaptured: p.amountReceived, capturedAt: new Date() })
    .where(eq(payments.stripePaymentIntentId, p.paymentIntentId));

  if (r.status === "confirmed" || r.status === "checked_in" || r.status === "completed") return { ok: true as const, already: true };

  // A hold that expired while the guest was still paying: re-take the dates if still free.
  try {
    const [updated] = await db
      .update(reservations)
      .set({ status: "confirmed", holdExpiresAt: null, cancelledAt: null, updatedAt: new Date() })
      .where(eq(reservations.id, r.id))
      .returning();
    const [prop] = await db.select().from(properties).where(eq(properties.id, updated.propertyId));
    await syncCheckoutTask(db, updated, prop, prop.name.ja);
    await audit(db, { actorType: "system", action: "reservation.confirmed", entityType: "reservation", entityId: r.code, diff: { paymentIntentId: p.paymentIntentId, amount: p.amountReceived } });
    // TODO(P4): confirmation email (Resend) + step-mail enrolment
    return { ok: true as const };
  } catch (e) {
    if (!isOverlapError(e)) throw e;
    // Dates were taken by someone else after the hold expired → refund automatically.
    await refundPayment(db, { paymentIntentId: p.paymentIntentId, amount: p.amountReceived, reason: "dates_no_longer_available", by: null });
    await audit(db, { actorType: "system", action: "reservation.paid_after_expiry_refunded", entityType: "reservation", entityId: r.code });
    return { ok: false as const, reason: "refunded_overlap" };
  }
}

export async function markPaymentFailed(db: Db, paymentIntentId: string, message?: string) {
  await db.update(payments).set({ status: "failed" }).where(eq(payments.stripePaymentIntentId, paymentIntentId));
  // The hold stays until it expires so the guest can retry with another card.
  const [pay] = await db.select().from(payments).where(eq(payments.stripePaymentIntentId, paymentIntentId));
  if (pay?.reservationId) {
    const [r] = await db.select().from(reservations).where(eq(reservations.id, pay.reservationId));
    if (r) await audit(db, { actorType: "system", action: "payment.failed", entityType: "reservation", entityId: r.code, diff: { message } });
  }
}

/* ------------------------------------------------------------------ */
/* Cancel / refund                                                     */
/* ------------------------------------------------------------------ */

export async function refundPayment(
  db: Db,
  opts: { paymentId?: string; paymentIntentId?: string; amount: number; reason: string; by: string | null }
) {
  const [pay] = await db
    .select()
    .from(payments)
    .where(opts.paymentId ? eq(payments.id, opts.paymentId) : eq(payments.stripePaymentIntentId, opts.paymentIntentId!));
  if (!pay) throw new BookingError("payment_not_found", 404);
  const refundable = pay.amountCaptured - pay.amountRefunded;
  const amount = Math.min(Math.max(0, Math.round(opts.amount)), refundable);
  if (amount <= 0) throw new BookingError("nothing_to_refund", 409);

  let stripeRefundId: string | null = null;
  const stripe = getStripe();
  const isDemo = !pay.stripePaymentIntentId || pay.stripePaymentIntentId.startsWith("pi_demo_");
  if (!isDemo) {
    if (!stripe) throw new BookingError("stripe_not_configured", 503);
    const rf = await stripe.refunds.create(
      { payment_intent: pay.stripePaymentIntentId!, amount, metadata: { reason: opts.reason } },
      { idempotencyKey: `refund-${pay.id}-${pay.amountRefunded}-${amount}` }
    );
    stripeRefundId = rf.id;
  }
  await db.insert(refunds).values({ paymentId: pay.id, stripeRefundId, amount, reason: opts.reason, requestedBy: opts.by, status: isDemo ? "succeeded" : "pending" });
  const total = pay.amountRefunded + amount;
  await db
    .update(payments)
    .set({ amountRefunded: total, status: total >= pay.amountCaptured ? "refunded" : "partially_refunded" })
    .where(eq(payments.id, pay.id));
  return { amount, stripeRefundId, demo: isDemo };
}

export async function cancellationPreview(db: Db, code: string) {
  const [row] = await db.select({ r: reservations, p: properties }).from(reservations).innerJoin(properties, eq(properties.id, reservations.propertyId)).where(eq(reservations.code, code));
  if (!row || !row.r.checkIn) throw new BookingError("not_found", 404);
  const pays = await db.select().from(payments).where(eq(payments.reservationId, row.r.id));
  const paid = pays.reduce((s, p) => s + p.amountCaptured - p.amountRefunded, 0);
  const { tiers } = await getCancellationPolicy(db);
  const policy = cancellationFee(paid, row.r.checkIn, localDate(row.p.timezone), tiers);
  return { reservation: row.r, paid, ...policy };
}

export async function cancelReservation(
  db: Db,
  code: string,
  opts: { refund: "policy" | "full" | "none"; by: { id: string; name: string } | null; reason?: string }
) {
  const prev = await cancellationPreview(db, code);
  const r = prev.reservation;
  if (r.status === "cancelled") throw new BookingError("already_cancelled", 409);

  const refundAmount = opts.refund === "full" ? prev.paid : opts.refund === "policy" ? prev.refund : 0;
  let refunded = 0;
  if (refundAmount > 0) {
    const pays = await db.select().from(payments).where(and(eq(payments.reservationId, r.id)));
    let left = refundAmount;
    for (const p of pays) {
      const room = p.amountCaptured - p.amountRefunded;
      if (room <= 0 || left <= 0) continue;
      const res = await refundPayment(db, { paymentId: p.id, amount: Math.min(room, left), reason: opts.reason ?? `cancel_${opts.refund}`, by: opts.by?.id ?? null });
      left -= res.amount;
      refunded += res.amount;
    }
  }
  const [updated] = await db
    .update(reservations)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(reservations.id, r.id))
    .returning();
  const [prop] = await db.select().from(properties).where(eq(properties.id, updated.propertyId));
  await syncCheckoutTask(db, updated, prop, prop.name.ja);
  await audit(db, {
    actorType: opts.by ? "admin" : "guest",
    actorId: opts.by?.id,
    actorLabel: opts.by?.name,
    action: "reservation.cancel",
    entityType: "reservation",
    entityId: code,
    diff: { refundMode: opts.refund, feePct: prev.feePct, refunded, daysBefore: prev.daysBefore },
  });
  return { refunded, feePct: prev.feePct, fee: prev.paid - refunded };
}

/* ------------------------------------------------------------------ */
/* Calendar for the public stay page / admin preview                   */
/* ------------------------------------------------------------------ */

export async function priceCalendar(db: Db, stayRef: string, planCode: string | undefined, from: string, days: number) {
  const s = await resolveStay(db, stayRef, planCode);
  const to = addDays(from, days);
  const today = localDate(s.property.timezone);
  await expireHolds(db, s.unit.id);
  const [{ rules, overrides }, taken] = await Promise.all([loadPricingInputs(db, s, from, to), bookedNights(db, s.unit.id, from, to)]);
  // Each date priced as a 1-night stay starting that day (so lead-time rules are per date).
  const nights = Array.from({ length: days }, (_, i) => {
    const d = addDays(from, i);
    return priceNights({ basePrice: s.plan.basePrice, checkIn: d, checkOut: addDays(d, 1), today, guests: 2, rules, overrides })[0];
  });
  return {
    property: s.property,
    plan: s.plan,
    days: nights.map((n) => ({ ...n, booked: taken.has(n.date), past: n.date < today })),
  };
}

