import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { createBooking } from "@/server/modules/booking";
import { publicHandler, quoteBody } from "@/server/publicApi";

export const dynamic = "force-dynamic";

const body = quoteBody.extend({
  guest: z.object({
    fullName: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(5).max(30),
    country: z.string().trim().min(1).max(80),
    arrivalTime: z.string().max(10).optional(),
    messagingId: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
  }),
  locale: z.enum(["ja", "en", "zh-Hant", "zh-Hans", "ko"]).optional(),
  utmSource: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  simulate: z.enum(["success", "failure"]).optional(), // demo mode only
});

/**
 * POST /api/v1/reservations — creates a hold and starts payment.
 * The amount is always recomputed on the server; nothing price-related is read from the client.
 */
export const POST = publicHandler("reserve", 10, async (req: Request) => {
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "validation_failed" }, { status: 400 });
  const r = await createBooking(await getDb(), p.data);
  if (r.status === "failed") {
    return NextResponse.json({ ok: false, demo: true, status: "failed", amount: r.amount, currency: "JPY" });
  }
  return NextResponse.json({
    ok: true,
    demo: r.mode === "demo",
    status: r.status,
    bookingNumber: r.code,
    amount: r.amount,
    currency: "JPY",
    breakdown: r.quote,
    statusToken: r.statusToken,
    clientSecret: "clientSecret" in r ? r.clientSecret : undefined,
  });
});
