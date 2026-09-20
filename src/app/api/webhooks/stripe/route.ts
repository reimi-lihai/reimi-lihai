import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getDb } from "@/server/db/client";
import { payments, refunds, stripeEvents } from "@/server/db/schema";
import { getStripe, webhookSecret } from "@/server/integrations/stripe";
import { finalizePaid, markPaymentFailed } from "@/server/modules/booking";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe
 * - verifies the signature with STRIPE_WEBHOOK_SECRET (raw body)
 * - records event.id in stripe_events first → a redelivered event is a no-op
 * - reservations are confirmed ONLY here (never from the browser)
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = webhookSecret();
  if (!stripe || !secret) return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 400 });
  }

  const db = await getDb();
  const inserted = await db
    .insert(stripeEvents)
    .values({ eventId: event.id, type: event.type, payload: event as unknown as Record<string, unknown> })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.eventId });
  if (!inserted.length) return NextResponse.json({ ok: true, duplicate: true });

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const reservationId = pi.metadata?.reservationId;
        if (reservationId) await finalizePaid(db, { reservationId, paymentIntentId: pi.id, amountReceived: pi.amount_received });
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await markPaymentFailed(db, pi.id, pi.last_payment_error?.message);
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await db.update(payments).set({ status: "canceled" }).where(eq(payments.stripePaymentIntentId, pi.id));
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        const piId = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
        if (piId) {
          // Stripe is the source of truth for the refunded total (covers refunds made in the Stripe dashboard).
          await db
            .update(payments)
            .set({ amountRefunded: ch.amount_refunded, status: sql`case when ${ch.amount_refunded} >= ${payments.amountCaptured} then 'refunded' else 'partially_refunded' end` })
            .where(eq(payments.stripePaymentIntentId, piId));
          const [pay] = await db.select({ id: payments.id }).from(payments).where(eq(payments.stripePaymentIntentId, piId));
          if (pay) await db.update(refunds).set({ status: "succeeded" }).where(eq(refunds.paymentId, pay.id));
        }
        break;
      }
    }
  } catch (e) {
    // Let Stripe retry: forget the event so the retry is processed.
    await db.delete(stripeEvents).where(eq(stripeEvents.eventId, event.id));
    console.error("[stripe webhook]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
