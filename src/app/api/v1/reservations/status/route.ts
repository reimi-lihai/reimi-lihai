import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { payments, reservations } from "@/server/db/schema";
import { statusToken } from "@/server/modules/booking";
import { publicHandler } from "@/server/publicApi";

export const dynamic = "force-dynamic";

/** GET /api/v1/reservations/status?code=REI-1040&token=… — polled after card confirmation. */
export const GET = publicHandler("status", 60, async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const code = sp.get("code") ?? "";
  const token = sp.get("token") ?? "";
  const db = await getDb();
  const [r] = await db.select().from(reservations).where(eq(reservations.code, code));
  const expected = r ? Buffer.from(statusToken(r.id)) : Buffer.alloc(0);
  const given = Buffer.from(token);
  if (!r || expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const pays = await db.select().from(payments).where(eq(payments.reservationId, r.id));
  return NextResponse.json({
    ok: true,
    code: r.code,
    status: r.status,
    paymentStatus: pays[0]?.status ?? null,
    total: r.totalAmount,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
  });
});
