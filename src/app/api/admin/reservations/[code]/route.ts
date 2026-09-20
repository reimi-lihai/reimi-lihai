import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { customers, properties, reservations, RESERVATION_STATUSES } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { syncCheckoutTask } from "@/server/modules/reservations";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, { params }: { params: { code: string } }) => {
  await requirePermission("reservations:read");
  const db = await getDb();
  const [row] = await db
    .select({ reservation: reservations, property: properties, customer: customers })
    .from(reservations)
    .innerJoin(properties, eq(properties.id, reservations.propertyId))
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .where(eq(reservations.code, params.code));
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...row });
});

const patch = z.object({ status: z.enum(RESERVATION_STATUSES), note: z.string().max(2000).optional() });

/** PATCH /api/admin/reservations/:code — status change; cleaning task follows automatically. */
export const PATCH = handle(async (req: Request, { params }: { params: { code: string } }) => {
  const me = await requirePermission("reservations:write");
  const p = patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  if (p.data.status === "cancelled") {
    // Cancelling goes through POST /cancel so the refund policy is applied and recorded.
    return NextResponse.json({ ok: false, error: "use_cancel_endpoint" }, { status: 400 });
  }
  const db = await getDb();
  const [before] = await db.select().from(reservations).where(eq(reservations.code, params.code));
  if (!before) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  let after;
  try {
    [after] = await db.update(reservations).set({ ...p.data, updatedAt: new Date() }).where(eq(reservations.id, before.id)).returning();
  } catch {
    return NextResponse.json({ ok: false, error: "conflict_overlap" }, { status: 409 });
  }
  const [prop] = await db.select().from(properties).where(eq(properties.id, after.propertyId));
  await syncCheckoutTask(db, after, prop, prop.name.ja);
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "reservation.update", entityType: "reservation", entityId: after.code, diff: { status: [before.status, after.status] }, ...requestMeta() });
  return NextResponse.json({ ok: true, reservation: after });
});
