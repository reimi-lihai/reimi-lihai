/**
 * End-to-end smart-key test for the master account.
 *
 * Creates (once) a hidden test set — draft property "キー動作確認（テスト）",
 * one unit, two demo doors, customer TEST and reservation KEY-TEST — then issues
 * a real guest pass through the normal issuePass() path. Scanning the QR with a
 * phone runs the exact guest flow (verify surname → hold to unlock → lock),
 * against the demo lock adapter, so no real door moves.
 *
 * Everything is removed again by removeKeyTest(). source = "test" keeps it out
 * of the sales figures.
 */
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { customers, guestAccessPasses, lockDevices, properties, reservations, units } from "../db/schema";
import { localDate } from "../time";
import { issuePass } from "./keys";

export const TEST_SLUG = "__key-test";
export const TEST_CODE = "KEY-TEST";
export const TEST_SURNAME = "TEST";
const TEST_EMAIL = "key-test@reimi.invalid";

export type TestMode = "active" | "upcoming";

async function ensureFixture(db: Db) {
  let [prop] = await db.select().from(properties).where(eq(properties.slug, TEST_SLUG));
  if (!prop) {
    [prop] = await db
      .insert(properties)
      .values({
        slug: TEST_SLUG,
        business: "stay",
        status: "draft",
        name: { ja: "キー動作確認（テスト）", en: "Key test (demo)", "zh-Hant": "鑰匙測試", "zh-Hans": "钥匙测试", ko: "키 테스트" },
        area: { ja: "テスト用ルーム", en: "Test room", "zh-Hant": "測試房", "zh-Hans": "测试房", ko: "테스트 룸" },
        timezone: "Asia/Tokyo",
        wifiSsid: "REIMI-TEST",
        wifiPassword: "test-wifi-2026",
      })
      .returning();
  }
  let [unit] = await db.select().from(units).where(eq(units.propertyId, prop.id));
  if (!unit) [unit] = await db.insert(units).values({ propertyId: prop.id, name: { ja: "テスト" }, maxGuests: 2 }).returning();

  const doors = await db.select().from(lockDevices).where(eq(lockDevices.propertyId, prop.id));
  if (!doors.length) {
    await db.insert(lockDevices).values([
      { propertyId: prop.id, provider: "demo", externalId: "test-entrance", sortOrder: 0, batteryLevel: 92, name: { ja: "エントランス", en: "Entrance", "zh-Hant": "大門", "zh-Hans": "大门", ko: "현관" } },
      { propertyId: prop.id, provider: "demo", externalId: "test-room", sortOrder: 1, batteryLevel: 64, name: { ja: "お部屋", en: "Room", "zh-Hant": "房間", "zh-Hans": "房间", ko: "객실" } },
    ]);
  }

  let [cust] = await db.select().from(customers).where(eq(customers.email, TEST_EMAIL));
  if (!cust) [cust] = await db.insert(customers).values({ email: TEST_EMAIL, givenName: "Key", familyName: TEST_SURNAME, tags: ["test"] }).returning();

  const checkIn = localDate("Asia/Tokyo");
  const checkOut = localDate("Asia/Tokyo", 1);
  let [res] = await db.select().from(reservations).where(eq(reservations.code, TEST_CODE));
  if (!res) {
    [res] = await db
      .insert(reservations)
      .values({
        code: TEST_CODE,
        kind: "stay",
        propertyId: prop.id,
        unitId: unit.id,
        customerId: cust.id,
        checkIn,
        checkOut,
        adults: 1,
        status: "confirmed",
        source: "test",
        note: "スマートキー動作確認用（管理画面 → スマートキー から削除できます）",
      })
      .returning();
  } else {
    [res] = await db.update(reservations).set({ checkIn, checkOut, status: "confirmed", updatedAt: new Date() }).where(eq(reservations.id, res.id)).returning();
  }
  return { prop, res };
}

/** Issues a fresh test pass. active: usable now for 24 h. upcoming: starts in 2 minutes (to see the countdown). */
export async function issueTestKey(db: Db, adminId: string, mode: TestMode) {
  const { res } = await ensureFixture(db);
  const { token, passId } = await issuePass(db, { reservationId: res.id, adminId });
  const now = Date.now();
  const validFrom = new Date(mode === "upcoming" ? now + 2 * 60_000 : now - 60_000);
  const validUntil = new Date(now + 24 * 3600_000);
  await db.update(guestAccessPasses).set({ validFrom, validUntil }).where(eq(guestAccessPasses.id, passId));
  return { token, passId, validFrom, validUntil };
}

export async function getTestStatus(db: Db) {
  const [res] = await db.select().from(reservations).where(eq(reservations.code, TEST_CODE));
  if (!res) return null;
  const passes = await db.select().from(guestAccessPasses).where(eq(guestAccessPasses.reservationId, res.id));
  const live = passes.filter((p) => p.status === "active").sort((a, b) => +b.createdAt - +a.createdAt)[0] ?? null;
  return { reservationId: res.id, pass: live };
}

/** Deletes the whole test set (passes, events and door codes cascade from the reservation). */
export async function removeKeyTest(db: Db) {
  await db.delete(reservations).where(eq(reservations.code, TEST_CODE));
  await db.delete(properties).where(eq(properties.slug, TEST_SLUG));
  await db.delete(customers).where(eq(customers.email, TEST_EMAIL));
}
