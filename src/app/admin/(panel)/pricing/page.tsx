import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getDb } from "@/server/db/client";
import { pricingRules, properties } from "@/server/db/schema";
import { priceCalendar } from "@/server/modules/booking";
import { localDate } from "@/server/time";
import { Card, PageTitle, loc, yen } from "@/components/admin/ui";
import { OverrideForm, RuleActions, RuleForm } from "@/components/admin/pricing";

export const dynamic = "force-dynamic";

const TYPE: Record<string, string> = { weekday: "曜日", season: "シーズン", date_range: "期間", length_of_stay: "連泊", lead_time: "予約タイミング", occupancy: "人数" };
const WEEK = "日月火水木金土";

function describe(r: typeof pricingRules.$inferSelect): string {
  const c = r.condition as Record<string, number | number[] | string>;
  const cond =
    r.ruleType === "weekday" ? `${(c.days as number[]).map((d) => WEEK[d]).join("・")}の夜`
    : r.ruleType === "season" || r.ruleType === "date_range" ? `${c.from} 〜 ${c.to}`
    : r.ruleType === "length_of_stay" ? `${c.minNights}泊以上`
    : r.ruleType === "lead_time" ? (c.maxDays !== undefined ? `${c.maxDays}日前以内` : `${c.minDays}日以上前`)
    : `${c.minGuests}名以上`;
  const adj = r.adjustType === "percent" ? `${r.adjustValue > 0 ? "+" : ""}${r.adjustValue}%` : r.adjustType === "fixed" ? `${r.adjustValue > 0 ? "+" : ""}${yen(r.adjustValue)}` : `${yen(r.adjustValue)}に固定`;
  return `${cond} → ${adj}`;
}

export default async function PricingPage({ searchParams }: { searchParams: { property?: string; from?: string } }) {
  const me = await requireAdmin("reservations:read");
  const canEdit = can(me, "pricing");
  const db = await getDb();
  const props = await db.select().from(properties).where(eq(properties.business, "stay")).orderBy(asc(properties.createdAt));
  if (!props.length) return <PageTitle title="料金カレンダー" sub="宿泊物件が登録されていません。" />;
  const current = props.find((p) => p.slug === searchParams.property) ?? props[0];
  const today = localDate("Asia/Tokyo");
  const from = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.from ?? "") ? searchParams.from! : today;
  // start the grid on Sunday
  const startDow = new Date(from + "T00:00:00Z").getUTCDay();
  const gridStart = localDate("Asia/Tokyo", -startDow, new Date(from + "T12:00:00+09:00"));
  const cal = await priceCalendar(db, current.slug, undefined, gridStart, 42);
  const rules = await db.select().from(pricingRules).orderBy(asc(pricingRules.priority));
  const shift = (n: number) => localDate("Asia/Tokyo", n, new Date(from + "T12:00:00+09:00"));
  const nameOf = (id: string | null) => (id ? loc(props.find((p) => p.id === id)?.name) || "（削除された物件）" : "全物件");

  return (
    <>
      <PageTitle title="料金カレンダー・ダイナミックプライシング" sub="基本料金 → 日別の個別設定 → ルール（適用順）の順で1泊料金が決まります。予約済みの料金は予約時点で固定されます。" />

      <div className="mb-4 flex flex-wrap gap-2">
        {props.map((p) => (
          <Link key={p.id} href={`/admin/pricing?property=${p.slug}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${p.id === current.id ? "bg-brand text-white" : "border border-line text-ink hover:border-brand"}`}>
            {loc(p.name)}
          </Link>
        ))}
      </div>

      <Card
        title={`${loc(current.name)} · ${loc(cal.plan.name)}（基本 ${yen(cal.plan.basePrice)}）`}
        action={
          <div className="flex gap-2 text-xs font-semibold">
            <Link href={`/admin/pricing?property=${current.slug}&from=${shift(-28)}`} className="rounded-lg border border-line px-2.5 py-1.5 text-ink">←</Link>
            <Link href={`/admin/pricing?property=${current.slug}`} className="rounded-lg border border-line px-2.5 py-1.5 text-ink">今日</Link>
            <Link href={`/admin/pricing?property=${current.slug}&from=${shift(28)}`} className="rounded-lg border border-line px-2.5 py-1.5 text-ink">→</Link>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1.5 text-xs">
          {[...WEEK].map((w, i) => (
            <div key={w} className={`pb-1 text-center font-semibold ${i === 0 ? "text-rose-600" : i === 6 ? "text-brand" : "text-muted"}`}>{w}</div>
          ))}
          {cal.days.map((d) => {
            const up = d.price > d.base;
            const down = d.price < d.base;
            return (
              <div
                key={d.date}
                title={d.applied.join(" / ")}
                className={`min-h-[74px] rounded-lg border p-1.5 ${d.date === today ? "border-[#f7c948] ring-2 ring-[#f7c948]/40" : "border-line/70"} ${d.past ? "opacity-40" : ""} ${d.closed ? "bg-rose-50" : d.booked ? "bg-brand/5" : "bg-panel"}`}
              >
                <div className="flex justify-between text-[10px] text-muted">
                  <span>{d.date.slice(5).replace("-", "/")}</span>
                  {d.booked && <span className="font-bold text-brand">予約済</span>}
                  {d.closed && <span className="font-bold text-rose-600">停止</span>}
                </div>
                <p className={`mt-1 text-sm font-bold tabular-nums ${up ? "text-amber-700" : down ? "text-emerald-700" : "text-ink"}`}>{yen(d.price)}</p>
                {d.applied.length > 0 && <p className="mt-0.5 truncate text-[9.5px] text-muted">{d.applied.map((a) => a.replace(/（.*）/, "")).join("・")}</p>}
              </div>
            );
          })}
        </div>
        <div className="mt-4 border-t border-line/70 pt-4">
          <p className="mb-2 text-xs font-semibold text-muted">日別の個別設定（この物件の全プラン）</p>
          <OverrideForm propertyId={current.id} canEdit={canEdit} />
          {!canEdit && <p className="text-xs text-muted">料金の編集権限がありません。</p>}
        </div>
      </Card>

      <div className="mt-6">
        <Card title="料金ルール">
          {canEdit && (
            <div className="mb-3">
              <RuleForm properties={props.map((p) => ({ id: p.id, name: loc(p.name) }))} />
            </div>
          )}
          <ul className="divide-y divide-line/60">
            {rules.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${r.isActive ? "" : "opacity-50"}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {r.name}
                    <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold text-muted">{TYPE[r.ruleType]}</span>
                    {!r.stackable && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">以降を適用しない</span>}
                  </p>
                  <p className="text-xs text-muted">{describe(r)} · 対象: {r.scope === "all" ? "全物件" : nameOf(r.targetId)} · 順 {r.priority}</p>
                </div>
                <RuleActions id={r.id} active={r.isActive} canEdit={canEdit} />
              </li>
            ))}
            {!rules.length && <li className="py-6 text-center text-sm text-muted">ルールはまだありません</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
