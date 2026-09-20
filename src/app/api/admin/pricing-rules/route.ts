import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { pricingRules } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

const ruleBody = z
  .object({
    name: z.string().trim().min(1).max(80),
    scope: z.enum(["all", "property"]),
    targetId: z.string().uuid().nullable().optional(),
    ruleType: z.enum(["weekday", "date_range", "season", "lead_time", "length_of_stay", "occupancy"]),
    condition: z.record(z.unknown()),
    adjustType: z.enum(["percent", "fixed", "override"]),
    adjustValue: z.number().int().min(-1_000_000).max(10_000_000),
    priority: z.number().int().min(0).max(1000).default(100),
    stackable: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .refine((r) => r.scope === "all" || !!r.targetId, { message: "targetId required" })
  .refine((r) => r.adjustType !== "percent" || (r.adjustValue >= -90 && r.adjustValue <= 300), { message: "percent out of range" });

export const GET = handle(async () => {
  await requirePermission("pricing");
  const db = await getDb();
  return NextResponse.json({ ok: true, rules: await db.select().from(pricingRules).orderBy(asc(pricingRules.priority)) });
});

export const POST = handle(async (req: Request) => {
  const me = await requirePermission("pricing");
  const p = ruleBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid", issues: p.error.issues.map((i) => i.message) }, { status: 400 });
  const db = await getDb();
  const [rule] = await db.insert(pricingRules).values({ ...p.data, targetId: p.data.scope === "all" ? null : p.data.targetId }).returning();
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "pricing_rule.create", entityType: "pricing_rule", entityId: rule.id, diff: p.data, ...requestMeta() });
  return NextResponse.json({ ok: true, rule });
});
