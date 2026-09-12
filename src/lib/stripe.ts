/**
 * Stripe integration boundary.
 *
 * The app runs fully in DEMO MODE when no Stripe secret key is configured, so it
 * works out-of-the-box with no credentials. To go live:
 *   1. `npm i stripe`
 *   2. set STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET
 *   3. replace the demo branch in src/app/api/checkout/route.ts with a real
 *      PaymentIntent, and verify webhooks in src/app/api/webhook/route.ts
 *
 * The secret key is read ONLY on the server — never import this into a client
 * component and never expose STRIPE_SECRET_KEY to the browser.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.length > 0);
}

export function stripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
}

/** True when the frontend should render the demo payment UI. */
export function isPaymentDemoMode(): boolean {
  return !isStripeConfigured();
}
