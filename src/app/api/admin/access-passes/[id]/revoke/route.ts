import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { revokePass } from "@/server/modules/keys";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/** POST /api/admin/access-passes/:id/revoke — takes effect immediately. */
export const POST = handle(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requirePermission("keys");
  const db = await getDb();
  const p = await revokePass(db, params.id);
  if (!p) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "access_pass.revoke", entityType: "access_pass", entityId: p.id, ...requestMeta() });
  return NextResponse.json({ ok: true });
});
