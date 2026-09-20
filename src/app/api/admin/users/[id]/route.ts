import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { adminUsers } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { GRANTABLE } from "@/server/auth/permissions";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

const patch = z.object({
  permissions: z.array(z.enum(GRANTABLE as [string, ...string[]])).optional(),
  isActive: z.boolean().optional(),
});

/** PATCH /api/admin/users/:id — master only. Normal admins can't receive master-only permissions. */
export const PATCH = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requirePermission("admins:manage");
  const p = patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  const db = await getDb();
  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, params.id));
  if (!target) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (target.role === "master" && p.data.isActive === false) {
    const others = await db.select().from(adminUsers).where(and(eq(adminUsers.role, "master"), eq(adminUsers.isActive, true), ne(adminUsers.id, target.id)));
    if (!others.length) return NextResponse.json({ ok: false, error: "last_master" }, { status: 409 });
  }
  await db.update(adminUsers).set({ ...p.data, updatedAt: new Date() }).where(eq(adminUsers.id, target.id));
  await audit(db, {
    actorType: "admin", actorId: me.id, actorLabel: me.name, action: "admin.update_permissions",
    entityType: "admin_user", entityId: target.id,
    diff: { before: { permissions: target.permissions, isActive: target.isActive }, after: p.data, target: target.name },
    ...requestMeta(),
  });
  return NextResponse.json({ ok: true });
});
