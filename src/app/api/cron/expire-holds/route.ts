import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { expireHolds } from "@/server/modules/booking";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/expire-holds — Vercel Cron (see vercel.json). Releases unpaid
 * holds. Holds are also released lazily before every availability check, so
 * a once-a-day schedule (Hobby plan limit) is enough.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const released = await expireHolds(await getDb());
  return NextResponse.json({ ok: true, released });
}
