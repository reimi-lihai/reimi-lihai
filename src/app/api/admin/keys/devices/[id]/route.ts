import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { lockDevices } from "@/server/db/schema";
import { requestMeta, requireMasterApi } from "@/server/auth/session";
import { lockAdapter } from "@/server/modules/keys";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

const body = z.object({ action: z.enum(["unlock", "lock"]) });

/**
 * POST /api/admin/keys/devices/:id  { action: "unlock" | "lock" }
 * Remote operation by a master (tests, locked-out guests). Always audited.
 */
export const POST = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireMasterApi();
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success || !z.string().uuid().safeParse(params.id).success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const db = await getDb();
  const [door] = await db.select().from(lockDevices).where(eq(lockDevices.id, params.id));
  if (!door) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const adapter = lockAdapter(door.provider);
  const started = Date.now();
  const result = p.data.action === "unlock" ? await adapter.remoteUnlock(door.externalId) : await adapter.remoteLock(door.externalId);
  const ms = Date.now() - started;
  if (result.ok) await db.update(lockDevices).set({ lastSeenAt: new Date() }).where(eq(lockDevices.id, door.id));
  await audit(db, {
    actorType: "admin",
    actorId: me.id,
    actorLabel: me.name,
    action: `lock.remote_${p.data.action}`,
    entityType: "lock_device",
    entityId: door.id,
    diff: { door: door.name.ja, provider: door.provider, ok: result.ok, ms },
    ...requestMeta(),
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: "lock_error" }, { status: 502 });
  return NextResponse.json({ ok: true, action: p.data.action, ms, at: new Date().toISOString() });
});
