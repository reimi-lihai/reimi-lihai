import { NextResponse } from "next/server";
import { listReservations } from "@/server/modules/queries";
import { requirePermission } from "@/server/auth/session";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/reservations?q=&status= */
export const GET = handle(async (req: Request) => {
  await requirePermission("reservations:read");
  const sp = new URL(req.url).searchParams;
  const rows = await listReservations({ q: sp.get("q") ?? undefined, status: sp.get("status") ?? undefined });
  return NextResponse.json({ ok: true, reservations: rows });
});
