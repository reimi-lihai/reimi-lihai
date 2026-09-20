/**
 * Guest door action (unlock / lock) shared by the two guest routes.
 * Checked server-side on every press: verified session cookie, active stay
 * window, remote switch (管理画面 → スマートキー), rate limit 5/min.
 * Every attempt is logged in unlock_events.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { lockDevices } from "../db/schema";
import { requestMeta } from "../auth/session";
import { rateLimit } from "../rateLimit";
import { cookieName, findPassByToken, lockAdapter, logKeyEvent, passState, sessionValue } from "./keys";
import { getKeyUi } from "./key-settings";

export async function guestDoorAction(req: Request, token: string, action: "unlock" | "lock") {
  const db = await getDb();
  const row = await findPassByToken(db, token);
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const { ip } = requestMeta();
  const passId = row.pass.id;

  if (cookies().get(cookieName(token))?.value !== sessionValue(passId, token)) {
    return NextResponse.json({ ok: false, error: "not_verified" }, { status: 401 });
  }
  const state = passState(row.pass);
  if (state !== "active") {
    await logKeyEvent(db, { passId, action, result: "denied", reason: `pass_${state}`, ip });
    return NextResponse.json({ ok: false, error: `pass_${state}` }, { status: 403 });
  }
  const { ui } = await getKeyUi(db);
  if (!ui.remoteEnabled) {
    await logKeyEvent(db, { passId, action, result: "denied", reason: "remote_disabled", ip });
    return NextResponse.json({ ok: false, error: "remote_disabled" }, { status: 403 });
  }
  if (!rateLimit(`door:${passId}`, 5, 60_000)) {
    await logKeyEvent(db, { passId, action, result: "denied", reason: "rate_limited", ip });
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { doorId?: unknown };
  const doorId = typeof body.doorId === "string" ? body.doorId : "";
  const [door] = doorId
    ? await db.select().from(lockDevices).where(and(eq(lockDevices.id, doorId), eq(lockDevices.propertyId, row.p.id)))
    : [];
  if (!door) return NextResponse.json({ ok: false, error: "bad_door" }, { status: 400 });

  const adapter = lockAdapter(door.provider);
  const result = action === "unlock" ? await adapter.remoteUnlock(door.externalId) : await adapter.remoteLock(door.externalId);
  await logKeyEvent(db, { passId, action, result: result.ok ? "success" : "error", lockDeviceId: door.id, ip });
  if (!result.ok) return NextResponse.json({ ok: false, error: "lock_error" }, { status: 502 });
  const at = new Date().toISOString();
  return NextResponse.json(action === "unlock" ? { ok: true, unlockedAt: at, relockInSec: ui.relockSec } : { ok: true, lockedAt: at });
}
