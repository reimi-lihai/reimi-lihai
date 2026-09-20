/**
 * Guest smart-key passes.
 *
 *  issue  → random 32-byte token (base64url) → URL /key/{token} + QR. DB keeps sha256 only.
 *  verify → once per device (surname) → HttpOnly session cookie until the stay ends.
 *  unlock → provider adapter (demo adapter here) + unlock_events log.
 */
import { createHash, createHmac, randomBytes } from "crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  customers,
  guestAccessPasses,
  lockCredentials,
  lockDevices,
  properties,
  reservations,
  unlockEvents,
} from "../db/schema";
import { stayWindow } from "./reservations";

export type PassState = "upcoming" | "active" | "expired" | "revoked";

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function passState(p: { status: string; validFrom: Date; validUntil: Date }, at = new Date()): PassState {
  if (p.status === "revoked") return "revoked";
  if (at < p.validFrom) return "upcoming";
  if (at >= p.validUntil) return "expired";
  return "active";
}

/* ---------------- session cookie (bound to one pass) ---------------- */

const secret = () => process.env.KEY_SESSION_SECRET ?? "dev-only-key-session-secret";

export function cookieName(token: string): string {
  return `rk_key_${hashToken(token).toString("hex").slice(0, 16)}`;
}
export function sessionValue(passId: string, token: string): string {
  return createHmac("sha256", secret()).update(`${passId}:${hashToken(token).toString("hex")}`).digest("base64url");
}

/* ---------------- issue / revoke ---------------- */

export async function issuePass(
  db: Db,
  opts: { reservationId: string; adminId: string | null; token?: string }
): Promise<{ token: string; passId: string }> {
  const [row] = await db
    .select({ r: reservations, p: properties })
    .from(reservations)
    .innerJoin(properties, eq(properties.id, reservations.propertyId))
    .where(eq(reservations.id, opts.reservationId));
  if (!row || row.r.kind !== "stay" || !row.r.checkIn || !row.r.checkOut) throw new Error("not_a_stay");
  if (row.r.status === "cancelled") throw new Error("cancelled");

  const { from, until } = stayWindow(row.p, row.r.checkIn, row.r.checkOut);
  const token = opts.token ?? newToken();

  // One live pass per reservation: revoke previous ones.
  await db
    .update(guestAccessPasses)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(guestAccessPasses.reservationId, row.r.id), eq(guestAccessPasses.status, "active")));

  const [pass] = await db
    .insert(guestAccessPasses)
    .values({
      reservationId: row.r.id,
      tokenHash: hashToken(token),
      validFrom: from,
      validUntil: until,
      createdBy: opts.adminId,
    })
    .returning();

  // Door codes valid for the same window (provider adapter would call the lock API here).
  const doors = await db.select().from(lockDevices).where(eq(lockDevices.propertyId, row.p.id));
  const existing = await db.select().from(lockCredentials).where(eq(lockCredentials.reservationId, row.r.id));
  for (const d of doors) {
    if (existing.some((c) => c.lockDeviceId === d.id && c.status === "active")) continue;
    await db.insert(lockCredentials).values({
      lockDeviceId: d.id,
      reservationId: row.r.id,
      pinCode: String(100000 + (randomBytes(4).readUInt32BE() % 900000)),
      validFrom: from,
      validUntil: until,
    });
  }
  return { token, passId: pass.id };
}

export async function revokePass(db: Db, passId: string) {
  const [p] = await db
    .update(guestAccessPasses)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(guestAccessPasses.id, passId))
    .returning();
  return p;
}

/* ---------------- guest-side lookup ---------------- */

export async function findPassByToken(db: Db, token: string) {
  if (!token || token.length > 128) return null;
  const [row] = await db
    .select({ pass: guestAccessPasses, r: reservations, p: properties, c: customers })
    .from(guestAccessPasses)
    .innerJoin(reservations, eq(reservations.id, guestAccessPasses.reservationId))
    .innerJoin(properties, eq(properties.id, reservations.propertyId))
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .where(eq(guestAccessPasses.tokenHash, hashToken(token)));
  return row ?? null;
}

export type PassRow = NonNullable<Awaited<ReturnType<typeof findPassByToken>>>;

export async function guestView(db: Db, row: PassRow, verified: boolean) {
  const doors = await db
    .select({ d: lockDevices, c: lockCredentials })
    .from(lockDevices)
    .leftJoin(
      lockCredentials,
      and(
        eq(lockCredentials.lockDeviceId, lockDevices.id),
        eq(lockCredentials.reservationId, row.r.id),
        eq(lockCredentials.status, "active")
      )
    )
    .where(eq(lockDevices.propertyId, row.p.id))
    .orderBy(asc(lockDevices.sortOrder));

  const name = row.p.name;
  return {
    reservationCode: row.r.code,
    guestName: verified ? row.c.familyName : null,
    propertyName: name.ja,
    propertyNameLocalized: name,
    unitName: row.p.area?.ja ?? "",
    timezone: row.p.timezone,
    validFrom: row.pass.validFrom.toISOString(),
    validUntil: row.pass.validUntil.toISOString(),
    state: passState(row.pass),
    verified,
    locale: row.r.locale,
    doors: doors.map(({ d, c }) => ({
      id: d.id,
      name: { ja: d.name.ja, en: d.name.en ?? d.name.ja, "zh-Hant": d.name["zh-Hant"] ?? d.name.ja, "zh-Hans": d.name["zh-Hans"] ?? d.name.ja, ko: d.name.ko ?? d.name.ja },
      pin: verified ? c?.pinCode ?? null : null,
    })),
    wifi: verified && row.p.wifiSsid ? { ssid: row.p.wifiSsid, password: row.p.wifiPassword ?? "" } : null,
    demo: !process.env.DATABASE_URL,
  };
}

export function checkIdentity(row: PassRow, input: string): boolean {
  const norm = (s: string) => s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "");
  if (row.pass.verifyMethod === "phone_last4") {
    return !!row.c.phone && norm(input) === row.c.phone.replace(/\D/g, "").slice(-4);
  }
  return norm(input).length > 0 && norm(input) === norm(row.c.familyName);
}

export async function logKeyEvent(
  db: Db,
  e: { passId: string; action: "verify" | "unlock"; result: "success" | "denied" | "error"; reason?: string; lockDeviceId?: string; ip?: string | null }
) {
  await db.insert(unlockEvents).values({
    passId: e.passId,
    action: e.action,
    result: e.result,
    reason: e.reason,
    lockDeviceId: e.lockDeviceId,
    ipHash: e.ip ? createHash("sha256").update(e.ip).digest("hex").slice(0, 16) : null,
  });
  if (e.result === "success") {
    await db.update(guestAccessPasses).set({ lastUsedAt: new Date() }).where(eq(guestAccessPasses.id, e.passId));
  }
}

export async function recentKeyEvents(db: Db, reservationId: string, limit = 20) {
  return db
    .select({ e: unlockEvents, door: lockDevices.name })
    .from(unlockEvents)
    .innerJoin(guestAccessPasses, eq(guestAccessPasses.id, unlockEvents.passId))
    .leftJoin(lockDevices, eq(lockDevices.id, unlockEvents.lockDeviceId))
    .where(eq(guestAccessPasses.reservationId, reservationId))
    .orderBy(desc(unlockEvents.occurredAt))
    .limit(limit);
}

/* ---------------- lock provider adapter ---------------- */

export interface LockAdapter {
  remoteUnlock(externalId: string): Promise<{ ok: boolean }>;
}

const demoAdapter: LockAdapter = {
  async remoteUnlock() {
    await new Promise((r) => setTimeout(r, 900));
    return { ok: true };
  },
};

export function lockAdapter(provider: string): LockAdapter {
  // TODO(P3): remotelock / sesame / igloohome adapters
  void provider;
  return demoAdapter;
}
