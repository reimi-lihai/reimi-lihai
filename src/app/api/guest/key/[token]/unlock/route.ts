import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { lockDevices } from "@/server/db/schema";
import { cookieName, findPassByToken, lockAdapter, logKeyEvent, passState, sessionValue } from "@/server/modules/keys";
import { requestMeta } from "@/server/auth/session";
import { rateLimit } from "@/server/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/guest/key/:token/unlock  { doorId }
 * Needs a verified session + active window (checked again server-side on every
 * press) + rate limit 5/min. Every attempt → unlock_events.
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const db = await getDb();
  const row = await findPassByToken(db, params.token);
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const { ip } = requestMeta();

  if (cookies().get(cookieName(params.token))?.value !== sessionValue(row.pass.id, params.token)) {
    return NextResponse.json({ ok: false, error: "not_verified" }, { status: 401 });
  }
  const state = passState(row.pass);
  if (state !== "active") {
    await logKeyEvent(db, { passId: row.pass.id, action: "unlock", result: "denied", reason: `pass_${state}`, ip });
    return NextResponse.json({ ok: false, error: `pass_${state}` }, { status: 403 });
  }
  if (!rateLimit(`unlock:${row.pass.id}`, 5, 60_000)) {
    await logKeyEvent(db, { passId: row.pass.id, action: "unlock", result: "denied", reason: "rate_limited", ip });
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { doorId?: unknown };
  const doorId = typeof body.doorId === "string" ? body.doorId : "";
  const [door] = doorId
    ? await db.select().from(lockDevices).where(and(eq(lockDevices.id, doorId), eq(lockDevices.propertyId, row.p.id)))
    : [];
  if (!door) return NextResponse.json({ ok: false, error: "bad_door" }, { status: 400 });

  const result = await lockAdapter(door.provider).remoteUnlock(door.externalId);
  await logKeyEvent(db, { passId: row.pass.id, action: "unlock", result: result.ok ? "success" : "error", lockDeviceId: door.id, ip });
  if (!result.ok) return NextResponse.json({ ok: false, error: "lock_error" }, { status: 502 });
  return NextResponse.json({ ok: true, unlockedAt: new Date().toISOString(), relockInSec: 8 });
}
