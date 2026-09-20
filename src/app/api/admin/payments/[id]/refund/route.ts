import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { payments, reservations } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { BookingError, refundPayment } from "@/server/modules/booking";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

const body = z.object({ amount: z.number().int().positive(), reason: z.string().min(1).max(500) });

/** POST /api/admin/payments/:id/refund — partial or full refund (Stripe Refund API). */
export const POST = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requirePermission("payments:refund");
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const db = await getDb();
  try {
    const r = await refundPayment(db, { paymentId: params.id, amount: p.data.amount, reason: p.data.reason, by: me.id });
    const [pay] = await db.select({ code: reservations.code }).from(payments).leftJoin(reservations, eq(reservations.id, payments.reservationId)).where(eq(payments.id, params.id));
    await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "payment.refund", entityType: "reservation", entityId: pay?.code ?? params.id, diff: { amount: r.amount, reason: p.data.reason, stripeRefundId: r.stripeRefundId }, ...requestMeta() });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.code }, { status: e.status });
    throw e;
  }
});
