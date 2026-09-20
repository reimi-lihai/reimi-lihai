import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { pricingRules } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

const patch = z.object({ isActive: z.boolean().optional(), priority: z.number().int().min(0).max(1000).optional(), adjustValue: z.number().int().optional() });

export const PATCH = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requirePermission("pricing");
  const p = patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const db = await getDb();
  const [before] = await db.select().from(pricingRules).where(eq(pricingRules.id, params.id));
  if (!before) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  await db.update(pricingRules).set(p.data).where(eq(pricingRules.id, params.id));
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "pricing_rule.update", entityType: "pricing_rule", entityId: params.id, diff: { name: before.name, ...p.data }, ...requestMeta() });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requirePermission("pricing");
  const db = await getDb();
  const [r] = await db.delete(pricingRules).where(eq(pricingRules.id, params.id)).returning();
  if (!r) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "pricing_rule.delete", entityType: "pricing_rule", entityId: params.id, diff: r, ...requestMeta() });
  return NextResponse.json({ ok: true });
});
