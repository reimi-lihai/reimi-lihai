import { and, asc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { customers, payments, properties, reservations } from "@/server/db/schema";
import { requirePermission } from "@/server/auth/session";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sales/export?from=2026-09-01&to=2026-10-01 — master only.
 * One row per payment (captured in range), UTF-8 with BOM so Excel opens it correctly.
 */
export const GET = handle(async (req: Request) => {
  await requirePermission("sales:read");
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from") ?? "2000-01-01";
  const to = sp.get("to") ?? "2100-01-01";
  const db = await getDb();
  const rows = await db
    .select({ pay: payments, r: reservations, p: properties, c: customers })
    .from(payments)
    .innerJoin(reservations, eq(reservations.id, payments.reservationId))
    .innerJoin(properties, eq(properties.id, reservations.propertyId))
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .where(and(gte(payments.capturedAt, new Date(from + "T00:00:00+09:00")), lt(payments.capturedAt, new Date(to + "T00:00:00+09:00"))))
    .orderBy(asc(payments.capturedAt));
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const jst = (d: Date | null) => (d ? new Date(d.getTime() + 9 * 3600_000).toISOString().replace("T", " ").slice(0, 16) : "");
  const header = ["決済日時(JST)", "予約番号", "状態", "物件", "チェックイン", "チェックアウト", "ゲスト", "国", "経路", "utm_source", "売上", "返金", "純売上", "Stripe PaymentIntent"];
  const lines = rows.map(({ pay, r, p, c }) =>
    [jst(pay.capturedAt), r.code, r.status, p.name.ja, r.checkIn, r.checkOut, `${c.givenName} ${c.familyName}`, c.country, r.source, r.utmSource, pay.amountCaptured, pay.amountRefunded, pay.amountCaptured - pay.amountRefunded, pay.stripePaymentIntentId]
      .map(esc)
      .join(",")
  );
  return new Response("﻿" + [header.map(esc).join(","), ...lines].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="sales_${from}_${to}.csv"` },
  });
});
