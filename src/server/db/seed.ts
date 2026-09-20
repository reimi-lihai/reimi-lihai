/**
 * Demo seed — runs once on an empty database (embedded PGlite by default).
 * Builds realistic operational data relative to *today* so every admin screen
 * has something to show: in-house guests, today's arrivals/departures, future
 * stays, a cancellation, viewings, chats in several languages, tasks, keys.
 *
 * Demo admin accounts (password for all: reimi-demo-2026):
 *   master@reimi.example   マスター   Asia/Tokyo
 *   osaka@reimi.example    通常管理者 Asia/Tokyo
 *   toronto@reimi.example  通常管理者 America/Toronto
 */
import { eq, sql } from "drizzle-orm";
import { accommodations } from "@/lib/data/accommodations";
import { properties as reListings } from "@/lib/data/properties";
import type { Db } from "./client";
import {
  adminUsers,
  auditLogs,
  conversations,
  customers,
  lockDevices,
  messages,
  pricingRules,
  rateOverrides,
  payments,
  properties,
  ratePlans,
  reservations,
  tasks,
  units,
} from "./schema";
import { hashPassword } from "../auth/password";
import { localDate, nightsBetween, zonedToUtc } from "../time";
import { issuePass } from "../modules/keys";
import { syncCheckoutTask } from "../modules/reservations";
import { ALL_PERMISSIONS } from "../auth/permissions";

export const DEMO_PASSWORD = "reimi-demo-2026";

export async function seedIfEmpty(db: Db): Promise<void> {
  const existing = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  if (existing.length) return;
  await seed(db);
}

async function seed(db: Db) {
  const TZ = "Asia/Tokyo";
  const pw = hashPassword(DEMO_PASSWORD);

  /* ---------- admins ---------- */
  const [master, osaka, toronto] = await db
    .insert(adminUsers)
    .values([
      {
        email: "master@reimi.example",
        name: "マスター管理者",
        role: "master",
        permissions: [...ALL_PERMISSIONS],
        timezone: "Asia/Tokyo",
        passwordHash: pw,
      },
      {
        email: "osaka@reimi.example",
        name: "山本 彩（大阪）",
        role: "admin",
        permissions: ["reservations:read", "reservations:write", "chat", "keys", "tasks", "properties"],
        timezone: "Asia/Tokyo",
        passwordHash: pw,
      },
      {
        email: "toronto@reimi.example",
        name: "Lin Wei（Toronto）",
        role: "admin",
        permissions: ["reservations:read", "chat", "keys", "tasks"],
        timezone: "America/Toronto",
        timezoneMode: "manual",
        locale: "en",
        passwordHash: pw,
      },
    ])
    .returning();

  /* ---------- properties / units / plans / locks ---------- */
  const propIds: { id: string; unitId: string; planId: string; price: number; clean: number; p: typeof properties.$inferSelect }[] = [];
  for (const a of accommodations) {
    const [p] = await db
      .insert(properties)
      .values({
        slug: a.slug,
        business: "stay",
        name: a.name,
        area: a.area,
        summary: a.summary,
        description: a.description,
        checkInTime: a.checkInTime,
        checkOutTime: a.checkOutTime,
        cleaningFee: a.cleaningFee,
        wifiSsid: `REIMI-${a.slug.split("-")[0].replace(/^./, (c) => c.toUpperCase())}`,
        wifiPassword: "umi-to-mirai-2026",
        status: "published",
      })
      .returning();
    const [u] = await db
      .insert(units)
      .values({ propertyId: p.id, name: { ja: "一棟貸し", en: "Entire home" }, maxGuests: a.maxGuests, bedrooms: a.bedrooms })
      .returning();
    const plans = await db
      .insert(ratePlans)
      .values(a.plans.map((pl) => ({ unitId: u.id, code: pl.id, name: pl.name, basePrice: pl.pricePerNight, maxGuests: pl.maxGuests })))
      .returning();
    await db.insert(lockDevices).values([
      {
        propertyId: p.id,
        provider: "demo",
        externalId: `${a.slug}-entrance`,
        name: { ja: "エントランス", en: "Entrance", "zh-Hant": "大門", "zh-Hans": "大门", ko: "현관" },
        sortOrder: 0,
        batteryLevel: 86,
        lastSeenAt: new Date(),
      },
      {
        propertyId: p.id,
        provider: "demo",
        externalId: `${a.slug}-room`,
        name: { ja: "客室", en: "Room", "zh-Hant": "客房", "zh-Hans": "客房", ko: "객실" },
        sortOrder: 1,
        batteryLevel: a.slug.startsWith("osaka") ? 18 : 72,
        lastSeenAt: new Date(),
      },
    ]);
    propIds.push({ id: p.id, unitId: u.id, planId: plans[0].id, price: plans[0].basePrice, clean: a.cleaningFee, p });
  }

  for (const l of reListings) {
    await db.insert(properties).values({
      slug: l.slug,
      business: "real_estate",
      name: l.name,
      area: l.area,
      summary: l.summary,
      status: "published",
    });
  }

  /* ---------- dynamic pricing ---------- */
  await db.insert(pricingRules).values([
    { scope: "all", name: "週末料金（金・土 +20%）", ruleType: "weekday", condition: { days: [5, 6] }, adjustType: "percent", adjustValue: 20, priority: 10 },
    { scope: "all", name: "年末年始（+35%）", ruleType: "season", condition: { from: "12-28", to: "01-03" }, adjustType: "percent", adjustValue: 35, priority: 5 },
    { scope: "all", name: "桜シーズン（+25%）", ruleType: "season", condition: { from: "03-25", to: "04-10" }, adjustType: "percent", adjustValue: 25, priority: 5 },
    { scope: "all", name: "連泊割（7泊以上 −10%）", ruleType: "length_of_stay", condition: { minNights: 7 }, adjustType: "percent", adjustValue: -10, priority: 50 },
    { scope: "property", targetId: propIds[0].id, name: "直前割（3日以内 −10%）", ruleType: "lead_time", condition: { maxDays: 3 }, adjustType: "percent", adjustValue: -10, priority: 60, isActive: false },
  ]);
  // A maintenance stop-sell night on the Shinsaibashi loft (10 days out)
  await db.insert(rateOverrides).values({ ratePlanId: propIds[2].planId, date: localDate(TZ, 10), closed: true });

  /* ---------- customers ---------- */
  const people = [
    { givenName: "Mei", familyName: "Chen", email: "mei.chen@example.tw", country: "TW", preferredLocale: "zh-Hant", phone: "+886 912 345 678", tags: ["stay_only"] },
    { givenName: "Ka Yan", familyName: "Wong", email: "kayan.wong@example.hk", country: "HK", preferredLocale: "zh-Hant", phone: "+852 9123 4567", tags: ["medical_beauty"] },
    { givenName: "Jiwoo", familyName: "Park", email: "jiwoo.park@example.kr", country: "KR", preferredLocale: "ko", phone: "+82 10 1234 5678", tags: ["stay_only"] },
    { givenName: "Emily", familyName: "Brown", email: "emily.brown@example.ca", country: "CA", preferredLocale: "en", phone: "+1 416 555 0134", tags: ["viewed_property"] },
    { givenName: "Hao", familyName: "Li", email: "hao.li@example.cn", country: "CN", preferredLocale: "zh-Hans", phone: "+86 138 0013 8000", tags: ["medical_beauty"] },
    { givenName: "太郎", familyName: "佐藤", email: "taro.sato@example.jp", country: "JP", preferredLocale: "ja", phone: "090-1234-5678", tags: ["stay_only"] },
    { givenName: "Minh", familyName: "Nguyen", email: "minh.nguyen@example.com", country: "VN", preferredLocale: "en", phone: "+84 90 123 4567", tags: [] },
    { givenName: "Yu-Ting", familyName: "Huang", email: "yuting.huang@example.tw", country: "TW", preferredLocale: "zh-Hant", phone: "+886 922 111 222", tags: ["viewed_property", "stay_only"] },
  ];
  const cs = await db.insert(customers).values(people.map((p) => ({ ...p, marketingOptIn: true }))).returning();
  const C = Object.fromEntries(cs.map((c) => [c.familyName, c]));

  /* ---------- reservations ---------- */
  const d = (n: number) => localDate(TZ, n);
  type Spec = {
    code: string; prop: number; cust: string; in: number; out: number;
    status: (typeof reservations.$inferInsert)["status"]; adults: number; children?: number;
    source: string; utm?: string; locale: string; key?: string;
  };
  const specs: Spec[] = [
    { code: "REI-1019", prop: 0, cust: "Chen", in: -4, out: -1, status: "completed", adults: 2, source: "direct", utm: "instagram", locale: "zh-Hant", key: "demo-expired" },
    { code: "REI-1020", prop: 2, cust: "Nguyen", in: -6, out: -3, status: "completed", adults: 2, source: "direct", utm: "google", locale: "en" },
    { code: "REI-1021", prop: 1, cust: "Park", in: -2, out: 0, status: "checked_in", adults: 3, source: "direct", utm: "naver", locale: "ko" },
    { code: "REI-1022", prop: 3, cust: "Wong", in: -1, out: 3, status: "checked_in", adults: 2, source: "direct", utm: "xiaohongshu", locale: "zh-Hant" },
    { code: "REI-1023", prop: 4, cust: "Brown", in: 0, out: 4, status: "confirmed", adults: 2, children: 2, source: "direct", utm: "google", locale: "en" },
    { code: "REI-1024", prop: 0, cust: "Chen", in: -1, out: 2, status: "checked_in", adults: 2, source: "direct", utm: "instagram", locale: "zh-Hant", key: "demo" },
    { code: "REI-1025", prop: 5, cust: "Huang", in: 0, out: 3, status: "confirmed", adults: 4, source: "qr", locale: "zh-Hant", key: "demo-upcoming" },
    { code: "REI-1026", prop: 2, cust: "佐藤", in: 2, out: 4, status: "confirmed", adults: 2, source: "direct", utm: "line", locale: "ja" },
    { code: "REI-1027", prop: 1, cust: "Li", in: 5, out: 9, status: "confirmed", adults: 2, source: "direct", utm: "wechat", locale: "zh-Hans" },
    { code: "REI-1028", prop: 0, cust: "Park", in: 8, out: 11, status: "pending_payment", adults: 2, source: "direct", utm: "naver", locale: "ko" },
    { code: "REI-1029", prop: 3, cust: "Nguyen", in: 6, out: 8, status: "cancelled", adults: 1, source: "direct", utm: "google", locale: "en" },
    { code: "REI-1030", prop: 4, cust: "Huang", in: 12, out: 15, status: "confirmed", adults: 3, source: "direct", utm: "instagram", locale: "zh-Hant" },
  ];

  const created: Record<string, typeof reservations.$inferSelect> = {};
  for (const s of specs) {
    const P = propIds[s.prop];
    const checkIn = d(s.in);
    const checkOut = d(s.out);
    const nights = nightsBetween(checkIn, checkOut);
    const nightly = P.price * nights;
    const total = Math.round((nightly + P.clean) * 1.15);
    const [r] = await db
      .insert(reservations)
      .values({
        code: s.code,
        kind: "stay",
        propertyId: P.id,
        unitId: P.unitId,
        ratePlanId: P.planId,
        customerId: C[s.cust].id,
        checkIn,
        checkOut,
        adults: s.adults,
        children: s.children ?? 0,
        status: s.status,
        priceSnapshot: { nights, nightly, cleaningFee: P.clean, serviceFee: Math.round((nightly + P.clean) * 0.1), taxes: Math.round((nightly + P.clean) * 0.05), total },
        totalAmount: total,
        source: s.source,
        utmSource: s.utm,
        locale: s.locale,
        createdAt: new Date(Date.now() - (20 - s.in) * 86_400_000),
      })
      .returning();
    created[s.code] = r;

    if (s.status !== "pending_payment") {
      await db.insert(payments).values({
        reservationId: r.id,
        kind: "charge",
        stripePaymentIntentId: `pi_demo_${s.code.replace("-", "")}`,
        amount: total,
        amountCaptured: total,
        amountRefunded: s.status === "cancelled" ? total : 0,
        status: s.status === "cancelled" ? "refunded" : "succeeded",
        capturedAt: r.createdAt,
      });
    }
    const pname = (P.p.name as { ja: string }).ja;
    await syncCheckoutTask(db, r, P.p, pname);
    if (s.key) await issuePass(db, { reservationId: r.id, adminId: master.id, token: s.key });
  }

  // demo-upcoming: make it start a few hours from now regardless of seed time
  await db.execute(sql`update guest_access_passes set valid_from = now() + interval '5 hours 20 minutes' where reservation_id = ${created["REI-1025"].id}`);
  await db.execute(sql`select setval('reservation_code_seq', 1030)`);

  // mark finished cleaning for past stays
  await db.execute(sql`update tasks set status = 'done' where due_at < now()`);
  await db.insert(tasks).values({
    propertyId: propIds[1].id,
    type: "maintenance",
    title: "客室スマートロック電池交換（残量18%）",
    dueAt: zonedToUtc(d(1), "13:00", TZ),
    assigneeId: osaka.id,
  });

  /* ---------- viewings ---------- */
  const reProps = await db.select().from(properties).where(eq(properties.business, "real_estate"));
  if (reProps[0]) {
    await db.insert(reservations).values([
      {
        code: "REI-1031",
        kind: "viewing",
        propertyId: reProps[0].id,
        customerId: C["Brown"].id,
        startsAt: zonedToUtc(d(1), "14:00", TZ),
        endsAt: zonedToUtc(d(1), "15:00", TZ),
        status: "confirmed",
        adults: 1,
        locale: "en",
        note: "オンライン内見（Zoom）トロント在住",
      },
      {
        code: "REI-1032",
        kind: "viewing",
        propertyId: reProps[1]?.id ?? reProps[0].id,
        customerId: C["Huang"].id,
        startsAt: zonedToUtc(d(3), "11:00", TZ),
        endsAt: zonedToUtc(d(3), "12:00", TZ),
        status: "confirmed",
        adults: 2,
        locale: "zh-Hant",
      },
    ]);
    await db.execute(sql`select setval('reservation_code_seq', 1032)`);
  }

  /* ---------- chat (original language, never translated) ---------- */
  const conv = async (
    cust: string, code: string | null, category: (typeof conversations.$inferInsert)["category"],
    status: "received" | "in_progress" | "resolved", assignee: string | null,
    msgs: [("guest" | "admin"), string, number][]
  ) => {
    const [c] = await db
      .insert(conversations)
      .values({
        customerId: C[cust].id,
        reservationId: code ? created[code]?.id : null,
        category, status, assigneeId: assignee,
        lastMessageAt: new Date(Date.now() - msgs[msgs.length - 1][2] * 60_000),
      })
      .returning();
    await db.insert(messages).values(
      msgs.map(([who, body, minsAgo]) => ({
        conversationId: c.id,
        senderType: who,
        senderId: who === "admin" ? assignee : null,
        body,
        createdAt: new Date(Date.now() - minsAgo * 60_000),
      }))
    );
  };
  await conv("Chen", "REI-1024", "facility", "received", osaka.id, [
    ["guest", "你好，客房的門鎖好像沒有反應，我們在門口已經等了10分鐘。可以幫忙確認嗎？", 12],
  ]);
  await conv("Park", "REI-1021", "booking_change", "in_progress", toronto.id, [
    ["guest", "안녕하세요. 체크아웃을 오후 1시로 늦출 수 있을까요?", 95],
    ["admin", "안녕하세요! 확인 후 바로 안내드리겠습니다.", 80],
  ]);
  await conv("Wong", "REI-1022", "inbound", "in_progress", toronto.id, [
    ["guest", "想請問你們可以安排心齋橋附近的皮膚科診所預約和翻譯陪同嗎？", 300],
  ]);
  await conv("Brown", null, "real_estate", "resolved", master.id, [
    ["guest", "Hi, is the Namba 2LDK still available? I'd like to book an online viewing from Toronto.", 2880],
    ["admin", "Hi Emily, yes it is! I've booked you in for tomorrow 14:00 JST (01:00 Toronto). Zoom link to follow.", 2800],
  ]);

  /* ---------- audit ---------- */
  await db.insert(auditLogs).values([
    { actorType: "system", action: "system.seed", entityType: "database", actorLabel: "seed", occurredAt: new Date(Date.now() - 3 * 86_400_000) },
    { actorType: "admin", actorId: master.id, actorLabel: master.name, action: "access_pass.issue", entityType: "reservation", entityId: "REI-1024", occurredAt: new Date(Date.now() - 26 * 3600_000) },
    { actorType: "admin", actorId: toronto.id, actorLabel: toronto.name, action: "conversation.reply", entityType: "conversation", entityId: "REI-1021", occurredAt: new Date(Date.now() - 80 * 60_000) },
  ]);

  void osaka;
}
