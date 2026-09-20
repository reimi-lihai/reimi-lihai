import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { BookingError, cancelReservation, cancellationPreview } from "@/server/modules/booking";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET — cancellation fee preview per policy (days before check-in). */
export const GET = handle(async (_req: Request, { params }: { params: { code: string } }) => {
  await requirePermission("reservations:read");
  try {
    const p = await cancellationPreview(await getDb(), params.code);
    return NextResponse.json({ ok: true, paid: p.paid, daysBefore: p.daysBefore, feePct: p.feePct, fee: p.fee, refund: p.refund });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.code }, { status: e.status });
    throw e;
  }
});

const body = z.object({ refund: z.enum(["policy", "full", "none"]), reason: z.string().max(500).optional() });

/** POST — cancel + refund. Refunds need payments:refund (master by default). */
export const POST = handle(async (req: Request, { params }: { params: { code: string } }) => {
  const me = await requirePermission("reservations:write");
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  if (p.data.refund !== "none" && !can(me, "payments:refund")) {
    return NextResponse.json({ ok: false, error: "forbidden_refund" }, { status: 403 });
  }
  try {
    const r = await cancelReservation(await getDb(), params.code, { refund: p.data.refund, by: { id: me.id, name: me.name }, reason: p.data.reason });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.code }, { status: e.status });
    throw e;
  }
});
