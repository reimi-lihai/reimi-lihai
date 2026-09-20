import Link from "next/link";
import { AlertTriangle, BatteryLow, LogIn, LogOut, MessagesSquare, Home } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { dashboard } from "@/server/modules/queries";
import { can } from "@/server/auth/permissions";
import { Badge, CATEGORY_LABEL, Card, COUNTRY_FLAG, PageTitle, When, loc, yen } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: { denied?: string } }) {
  const me = await requireAdmin();
  const d = await dashboard();
  const tz = me.timezone;
  const showSales = can(me, "sales:read");

  const stats = [
    { label: "本日チェックイン", value: d.arrivals.length, icon: LogIn, tone: "text-brand" },
    { label: "本日チェックアウト", value: d.departures.length, icon: LogOut, tone: "text-amber-600" },
    { label: "滞在中", value: d.inHouse.length, icon: Home, tone: "text-emerald-600" },
    { label: "未解決チャット", value: d.openChats.length, icon: MessagesSquare, tone: "text-rose-600" },
  ];

  return (
    <>
      {searchParams.denied && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4" /> このページを開く権限がありません（{searchParams.denied}）。マスターに権限を依頼してください。
        </div>
      )}
      <PageTitle title={`ようこそ、${me.name}`} sub={`物件現地の本日：${d.today}（JST）`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line/80 bg-panel p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <s.icon className={`h-4 w-4 ${s.tone}`} /> {s.label}
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line/80 bg-panel p-4">
          <p className="text-xs font-semibold text-muted">今後7泊の稼働率（宿泊物件全体）</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-3xl font-bold tabular-nums text-ink">{Math.round(d.occupancy * 100)}%</p>
            <div className="mb-2 h-2 flex-1 overflow-hidden rounded-full bg-brand/10">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(d.occupancy * 100)}%` }} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-line/80 bg-panel p-4">
          <p className="text-xs font-semibold text-muted">今月の売上（返金控除後）</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{showSales ? yen(d.monthRevenue) : "••••••"}</p>
          {!showSales && <p className="text-[11px] text-muted">売上はマスターのみ閲覧できます</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="本日の到着・出発">
          <ul className="divide-y divide-line/60">
            {[...d.arrivals.map((x) => ({ ...x, dir: "in" as const })), ...d.departures.map((x) => ({ ...x, dir: "out" as const }))].map(({ r, p, c, dir }) => (
              <li key={r.id + dir} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/admin/reservations/${r.code}`} className="text-sm font-semibold text-ink hover:text-brand">
                    {COUNTRY_FLAG[c.country ?? ""] ?? ""} {c.givenName} {c.familyName}
                  </Link>
                  <p className="truncate text-xs text-muted">{r.code} · {loc(p.name)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${dir === "in" ? "bg-brand/10 text-brand" : "bg-amber-100 text-amber-800"}`}>
                  {dir === "in" ? `IN ${p.checkInTime}` : `OUT ${p.checkOutTime}`}
                </span>
              </li>
            ))}
            {!d.arrivals.length && !d.departures.length && <li className="py-4 text-sm text-muted">本日の到着・出発はありません</li>}
          </ul>
        </Card>

        <Card title="未解決のチャット" action={<Link href="/admin/inbox" className="text-xs font-semibold text-brand">インボックスへ</Link>}>
          <ul className="divide-y divide-line/60">
            {d.openChats.map(({ c, cust }) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {cust ? `${cust.givenName} ${cust.familyName}` : "ゲスト"}{" "}
                    <span className="ml-1 text-xs font-normal text-muted">{CATEGORY_LABEL[c.category]}</span>
                  </p>
                  <p className="text-xs text-muted">最終メッセージ <When at={c.lastMessageAt} tz={tz} compact /></p>
                </div>
                <Badge status={c.status} />
              </li>
            ))}
            {!d.openChats.length && <li className="py-4 text-sm text-muted">未解決のチャットはありません</li>}
          </ul>
        </Card>

        <Card title="直近のタスク（チェックアウト連動で自動生成）" action={<Link href="/admin/tasks" className="text-xs font-semibold text-brand">すべて</Link>}>
          <ul className="divide-y divide-line/60">
            {d.openTasks.map(({ t, p }) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{t.title}</p>
                  <p className="text-xs text-muted">期限 <When at={t.dueAt} tz={tz} compact /> · {loc(p.name)}</p>
                </div>
                <Badge status={t.status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="アラート・内見予定">
          <ul className="divide-y divide-line/60">
            {d.lowBattery.map(({ d: dev, p }) => (
              <li key={dev.id} className="flex items-center gap-3 py-2.5">
                <BatteryLow className="h-5 w-5 text-rose-600" />
                <div className="text-sm">
                  <p className="font-semibold text-ink">スマートロック電池残量 {dev.batteryLevel}%</p>
                  <p className="text-xs text-muted">{loc(p.name)} · {loc(dev.name)}</p>
                </div>
              </li>
            ))}
            {d.viewings.map(({ r, p, c }) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-ink">内見：{c.givenName} {c.familyName}</p>
                  <p className="truncate text-xs text-muted">{loc(p.name)}{r.note ? ` · ${r.note}` : ""}</p>
                </div>
                <When at={r.startsAt} tz={tz} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
