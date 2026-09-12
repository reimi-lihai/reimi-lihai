import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validation";
import { computePrice } from "@/lib/pricing";
import { getAccommodationById } from "@/lib/data";
import { isStripeConfigured } from "@/lib/stripe";
import { generateBookingNumber } from "@/lib/ids";

/**
 * Checkout endpoint.
 *
 * Security posture:
 * - The client NEVER dictates the amount. We look up the plan/accommodation on
 *   the server and recompute the price from dates + guests via computePrice().
 * - In DEMO MODE (no STRIPE_SECRET_KEY) we simulate success/failure so the full
 *   flow works with no credentials, and we never imply a real charge.
 * - The booking number is only issued on a successful payment.
 *
 * To go live: replace the demo branch with a Stripe PaymentIntent created with
 * the server-computed `amount`, return its client_secret, confirm on the client,
 * and finalize the booking from the webhook (src/app/api/webhook/route.ts).
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation_failed" },
      { status: 400 }
    );
  }
  const req = parsed.data;

  const accommodation = await getAccommodationById(req.accommodationId);
  if (!accommodation) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const plan =
    accommodation.plans.find((p) => p.id === req.planId) ?? accommodation.plans[0];

  // Basic sanity checks on dates / guests (defense in depth).
  if (req.checkOut <= req.checkIn) {
    return NextResponse.json({ ok: false, error: "bad_dates" }, { status: 400 });
  }
  if (req.adults + req.children > plan.maxGuests) {
    return NextResponse.json({ ok: false, error: "over_capacity" }, { status: 400 });
  }

  // Authoritative price — recomputed on the server.
  const price = computePrice({
    pricePerNight: plan.pricePerNight,
    cleaningFee: accommodation.cleaningFee,
    checkIn: req.checkIn,
    checkOut: req.checkOut,
    adults: req.adults,
    children: req.children,
  });

  if (price.nights <= 0 || price.total <= 0) {
    return NextResponse.json({ ok: false, error: "bad_amount" }, { status: 400 });
  }

  const demo = !isStripeConfigured();

  if (demo) {
    // Demo: honor the simulate hint; default to success.
    const failed = req.simulate === "failure";
    if (failed) {
      return NextResponse.json({
        ok: false,
        demo: true,
        status: "failed",
        amount: price.total,
        currency: price.currency,
      });
    }
    return NextResponse.json({
      ok: true,
      demo: true,
      status: "succeeded",
      bookingNumber: generateBookingNumber(),
      amount: price.total,
      currency: price.currency,
      breakdown: price,
    });
  }

  // ---- PRODUCTION (Stripe) ----
  // Left as an integration point on purpose. Do NOT confirm the booking here;
  // create a PaymentIntent and finalize via webhook. Example:
  //
  //   const Stripe = (await import("stripe")).default;
  //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  //   const intent = await stripe.paymentIntents.create({
  //     amount: price.total,           // JPY is zero-decimal — no *100
  //     currency: "jpy",
  //     metadata: { accommodationId: accommodation.id, planId: plan.id,
  //                 checkIn: req.checkIn, checkOut: req.checkOut },
  //     automatic_payment_methods: { enabled: true },
  //   });
  //   return NextResponse.json({ ok: true, demo: false,
  //     clientSecret: intent.client_secret, amount: price.total, currency: "JPY" });
  return NextResponse.json(
    { ok: false, error: "stripe_not_implemented" },
    { status: 501 }
  );
}
