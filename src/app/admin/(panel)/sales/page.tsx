import { and, eq, gte, lt, ne } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { payments, properties, reservations } from "@/server/db/schema";
import { localDate } from "@/server/time";
import { Card, PageTitle, loc, yen } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  return { from: `${ym}-01`, to: `${next}-01`, next, prev };
}

export default async function SalesPage({ searchParams }: { searchParams: { month?: string } }) {
  await requireAdmin("sales:read");
  const ym = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : localDate("Asia/Tokyo").slice(0, 7);
  const { from, to, next, prev } = monthRange(ym);
  const db = await getDb();

  const pays = await db
    .select({ pay: payments, r: reservations, p: properties })
    .from(payments)
    .innerJoin(reservations, eq(reservations.id, payments.reservationId))
    .innerJoin(properties, eq(properties.id, reservations.propertyId))
    .where(and(gte(payments.capturedAt, new Date(from + "T00:00:00+09:00")), lt(payments.capturedAt, new Date(to + "T00:00:00+09:00"))));

  // Stays by check-in month for ADR / nights
  const stays = await db
    .select({ r: reservations, p: properties })
    .from(reservations)
    .innerJoin(properties, eq(properties.id, reservations.propertyId))
    .where(and(eq(reservations.kind, "stay"), ne(reservations.source, "test"), gte(reservations.checkIn, from), lt(reservations.checkIn, to)));

  const gross = pays.reduce((s, x) => s + x.pay.amountCaptured, 0);
  const refunded = pays.reduce((s, x) => s + x.pay.amountRefunded, 0);
  const live = stays.filter((s) => ["confirmed", "checked_in", "completed"].includes(s.r.status));
  const cancelled = stays.filter((s) => s.r.status === "cancelled").length;
  const nights = live.reduce((s, x) => s + (x.r.checkIn && x.r.checkOut ? (Date.parse(x.r.checkOut) - Date.parse(x.r.checkIn)) / 86_400_000 : 0), 0);
  const roomRevenue = live.reduce((s, x) => s + Number((x.r.priceSnapshot as { nightly?: number }).nightly ?? 0), 0);

  const group = <K extends string>(key: (x: (typeof pays)[number]) => K) => {
    const m = new Map<K, { gross: number; refunded: number; count: number }>();
    for (const x of pays) {
      const k = key(x);
      const v = m.get(k) ?? { gross: 0, refunded: 0, count: 0 };
      v.gross += x.pay.amountCaptured;
      v.refunded += x.pay.amountRefunded;
      v.count += 1;
      m.set(k, v);
    }
    return [...m.entries()].sort((a, b) => b[1].gross - b[1].refunded - (a[1].gross - a[1].refunded));
  };
  const byProperty = group((x) => loc(x.p.name));
  const bySource = group((x) => (x.r.utmSource ? `${x.r.source} / ${x.r.utmSource}` : x.r.source));

  const kpis = [
    { label: "純売上（決済日ベース）", value: yen(gross - refunded), sub: `売上 ${yen(gross)} − 返金 ${yen(refunded)}` },
    { label: "宿泊予約数（チェックイン月）", value: `${live.length}件`, sub: `キャンセル ${cancelled}件` },
    { label: "販売泊数", value: `${nights}泊`, sub: "確定・滞在中・完了" },
    { label: "ADR（平均客室単価）", value: nights ? yen(Math.round(roomRevenue / nights)) : "—", sub: "宿泊料 ÷ 泊数（清掃料・税を除く）" },
  ];

  const Table = ({ rows }: { rows: [string, { gross: number; refunded: number; count: number }][] }) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted">
          <th className="pb-2">項目</th>
          <th className="pb-2 text-right">件数</th>
          <th className="pb-2 text-right">純売上</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line/60">
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td className="py-2 text-ink">{k}</td>
            <td className="py-2 text-right tabular-nums text-muted">{v.count}</td>
            <td className="py-2 text-right font-semibold tabular-nums text-ink">{yen(v.gross - v.refunded)}</td>
          </tr>
        ))}
        {!rows.length && (
          <tr><td colSpan={3} className="py-6 text-center text-muted">この月の決済はありません</td></tr>
        )}
      </tbody>
    </table>
  );

  return (
    <>
      <PageTitle title={`売上 ${ym.replace("-", "年")}月`} sub="マスターのみ閲覧できます。金額は円・税込。">
        <div className="flex gap-2 text-xs font-semibold">
          <a href={`/admin/sales?month=${prev}`} className="rounded-lg border border-line px-3 py-2 text-ink">← 前月</a>
          <a href={`/admin/sales?month=${next}`} className="rounded-lg border border-line px-3 py-2 text-ink">翌月 →</a>
          <a href={`/api/admin/sales/export?from=${from}&to=${to}`} className="rounded-lg bg-brand px-3 py-2 text-white">CSVエクスポート</a>
        </div>
      </PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-line/80 bg-panel p-4">
            <p className="text-xs font-semibold text-muted">{k.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-ink">{k.value}</p>
            <p className="mt-1 text-[11px] text-muted">{k.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="物件別"><Table rows={byProperty} /></Card>
        <Card title="予約経路別（UTM）"><Table rows={bySource} /></Card>
      </div>
    </>
  );
}
