import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { getCancellationPolicy, resetCancellationPolicy, setCancellationPolicy, tiersSchema } from "@/server/modules/settings";
import { DEFAULT_CANCELLATION_TIERS } from "@/server/modules/pricing-engine";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requirePermission("reservations:read");
  const p = await getCancellationPolicy(await getDb());
  return NextResponse.json({ ok: true, ...p, defaults: DEFAULT_CANCELLATION_TIERS });
});

const body = z.union([z.object({ tiers: tiersSchema }), z.object({ reset: z.literal(true) })]);

/**
 * PUT /api/admin/settings/cancellation-policy — master only (settings:payments).
 * Applies to cancellations from now on; already-cancelled bookings keep what was charged.
 */
export const PUT = handle(async (req: Request) => {
  const me = await requirePermission("settings:payments");
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const db = await getDb();
  const before = await getCancellationPolicy(db);
  let tiers;
  if ("reset" in p.data) {
    await resetCancellationPolicy(db);
    tiers = DEFAULT_CANCELLATION_TIERS;
  } else {
    // fees must not go down as check-in gets closer
    const sorted = [...p.data.tiers].sort((a, b) => b.minDays - a.minDays);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].feePct < sorted[i - 1].feePct) return NextResponse.json({ ok: false, error: "fee_must_increase" }, { status: 400 });
    }
    tiers = await setCancellationPolicy(db, p.data.tiers, me.id);
  }
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "settings.cancellation_policy", entityType: "site_settings", entityId: "cancellation_policy", diff: { before: before.tiers, after: tiers }, ...requestMeta() });
  return NextResponse.json({ ok: true, tiers });
});
