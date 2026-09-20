/**
 * Stripe (server only). Configured when STRIPE_SECRET_KEY is set; otherwise the
 * booking flow runs in demo mode and never contacts Stripe.
 */
import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    client = new Stripe(key, {
      appInfo: { name: "reimi-platform" },
      // Tests / local stripe-mock can point the SDK elsewhere.
      ...(process.env.STRIPE_API_HOST
        ? { host: process.env.STRIPE_API_HOST, port: Number(process.env.STRIPE_API_PORT ?? 443), protocol: (process.env.STRIPE_API_PROTOCOL as "http" | "https") ?? "https" }
        : {}),
    });
  }
  return client;
}

export function webhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}
