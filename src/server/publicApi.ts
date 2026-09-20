import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError } from "./modules/booking";
import { requestMeta } from "./auth/session";
import { rateLimit } from "./rateLimit";

export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const quoteBody = z.object({
  stay: z.string().min(1).max(100),
  plan: z.string().max(100).optional(),
  checkIn: dateStr,
  checkOut: dateStr,
  adults: z.number().int().min(1).max(30),
  children: z.number().int().min(0).max(30).default(0),
});

/** Public endpoints: per-IP rate limit + BookingError → JSON. */
export function publicHandler<A extends unknown[]>(bucket: string, limit: number, fn: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    const { ip } = requestMeta();
    if (!rateLimit(`${bucket}:${ip ?? "?"}`, limit, 60_000)) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.code }, { status: e.status });
      console.error(e);
      return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
    }
  };
}
