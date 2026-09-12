import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/stripe";

/**
 * Stripe webhook endpoint (scaffold).
 *
 * In production, Stripe calls this on payment events. You MUST verify the
 * signature with STRIPE_WEBHOOK_SECRET before trusting the payload, then
 * finalize the booking (mark it confirmed, issue the booking number, send the
 * confirmation email) idempotently — a webhook may be delivered more than once.
 *
 * Kept as a no-op in demo mode so the app never crashes when Stripe is not set.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: true, demo: true, ignored: true });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  // Production wiring (uncomment after `npm i stripe`):
  //
  //   const Stripe = (await import("stripe")).default;
  //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  //   const payload = await request.text();
  //   let event;
  //   try {
  //     event = stripe.webhooks.constructEvent(
  //       payload, signature, process.env.STRIPE_WEBHOOK_SECRET!
  //     );
  //   } catch {
  //     return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 400 });
  //   }
  //   switch (event.type) {
  //     case "payment_intent.succeeded":
  //       // finalize booking idempotently
  //       break;
  //     case "payment_intent.payment_failed":
  //       // mark failed
  //       break;
  //   }

  return NextResponse.json({ ok: true, received: true });
}
