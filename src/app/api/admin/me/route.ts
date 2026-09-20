import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { adminUsers } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const u = await requirePermission();
  const { passwordHash: _omit, ...safe } = u;
  void _omit;
  return NextResponse.json({ ok: true, me: safe });
});

const patch = z.object({
  timezone: z.string().max(64).optional(),
  timezoneMode: z.enum(["auto", "manual"]).optional(),
});

/** PATCH /api/admin/me — display timezone for this admin. */
export const PATCH = handle(async (req: Request) => {
  const u = await requirePermission();
  const p = patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  if (p.data.timezone && !Intl.supportedValuesOf("timeZone").includes(p.data.timezone)) {
    return NextResponse.json({ ok: false, error: "bad_timezone" }, { status: 400 });
  }
  const db = await getDb();
  await db.update(adminUsers).set({ ...p.data, updatedAt: new Date() }).where(eq(adminUsers.id, u.id));
  await audit(db, { actorType: "admin", actorId: u.id, actorLabel: u.name, action: "admin.update_timezone", entityType: "admin_user", entityId: u.id, diff: { from: u.timezone, to: p.data }, ...requestMeta() });
  return NextResponse.json({ ok: true });
});
