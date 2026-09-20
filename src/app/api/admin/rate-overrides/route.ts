import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { rateOverrides, ratePlans, units } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { addDays, daysBetween } from "@/server/modules/pricing-engine";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

const body = z
  .object({
    propertyId: z.string().uuid(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // inclusive
    action: z.enum(["set", "clear"]),
    price: z.number().int().min(0).max(10_000_000).nullable().optional(),
    closed: z.boolean().optional(),
    minNights: z.number().int().min(1).max(30).nullable().optional(),
  })
  .refine((b) => b.to >= b.from && daysBetween(b.from, b.to) <= 366, { message: "bad range" });

/** PUT /api/admin/rate-overrides — bulk set/clear per-date price, stop-sell and min nights for every plan of a property. */
export const PUT = handle(async (req: Request) => {
  const me = await requirePermission("pricing");
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const b = p.data;
  const db = await getDb();
  const plans = await db.select({ id: ratePlans.id }).from(ratePlans).innerJoin(units, eq(units.id, ratePlans.unitId)).where(eq(units.propertyId, b.propertyId));
  let count = 0;
  for (const plan of plans) {
    if (b.action === "clear") {
      const del = await db.delete(rateOverrides).where(and(eq(rateOverrides.ratePlanId, plan.id), gte(rateOverrides.date, b.from), lte(rateOverrides.date, b.to))).returning();
      count += del.length;
      continue;
    }
    for (let d = b.from; d <= b.to; d = addDays(d, 1)) {
      const values = { price: b.price ?? null, closed: b.closed ?? false, minNights: b.minNights ?? null };
      await db
        .insert(rateOverrides)
        .values({ ratePlanId: plan.id, date: d, ...values })
        .onConflictDoUpdate({ target: [rateOverrides.ratePlanId, rateOverrides.date], set: values });
      count++;
    }
  }
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: `rate_override.${b.action}`, entityType: "property", entityId: b.propertyId, diff: b, ...requestMeta() });
  return NextResponse.json({ ok: true, count });
});
