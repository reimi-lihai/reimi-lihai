import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { listReservations } from "@/server/modules/queries";
import { Badge, COUNTRY_FLAG, PageTitle, When, loc, yen } from "@/components/admin/ui";
import { nightsBetween } from "@/server/time";

export const dynamic = "force-dynamic";

const FILTERS: [string, string][] = [
  ["", "すべて"],
  ["checked_in", "滞在中"],
  ["confirmed", "確定"],
  ["pending_payment", "決済待ち"],
  ["completed", "完了"],
  ["cancelled", "キャンセル"],
];

export default async function ReservationsPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const me = await requireAdmin("reservations:read");
  const rows = await listReservations({ q: searchParams.q, status: searchParams.status || undefined });

  return (
    <>
      <PageTitle title="予約一覧" sub="宿泊と内見を一元管理。予約番号・氏名・メールで検索できます。" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={searchParams.q} placeholder="REI-1024 / Chen / メール" className="w-64 rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand" />
          {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        </form>
        {FILTERS.map(([v, l]) => {
          const active = (searchParams.status ?? "") === v;
          const qs = new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), ...(v ? { status: v } : {}) });
          return (
            <Link key={v} href={`/admin/reservations?${qs}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-brand text-white" : "border border-line text-ink hover:border-brand"}`}>
              {l}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line/80 bg-panel">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line/70 text-left text-xs font-semibold text-muted">
              <th className="px-4 py-3">予約番号</th>
              <th className="px-4 py-3">種別</th>
              <th className="px-4 py-3">ゲスト</th>
              <th className="px-4 py-3">物件</th>
              <th className="px-4 py-3">日程</th>
              <th className="px-4 py-3 text-right">金額</th>
              <th className="px-4 py-3">経路</th>
              <th className="px-4 py-3">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map(({ r, p, c }) => (
              <tr key={r.id} className="hover:bg-surface/70">
                <td className="px-4 py-3">
                  <Link href={`/admin/reservations/${r.code}`} className="font-mono font-bold text-brand hover:underline">{r.code}</Link>
                </td>
                <td className="px-4 py-3 text-xs">{r.kind === "stay" ? "宿泊" : "内見"}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-ink">{COUNTRY_FLAG[c.country ?? ""] ?? ""} {c.givenName} {c.familyName}</span>
                  <span className="block text-[11px] text-muted">{r.locale}</span>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-ink">{loc(p.name)}</td>
                <td className="px-4 py-3 tabular-nums text-ink">
                  {r.kind === "stay" ? (
                    <>
                      {r.checkIn} → {r.checkOut}
                      <span className="block text-[11px] text-muted">{nightsBetween(r.checkIn!, r.checkOut!)}泊 · 大人{r.adults}{r.children ? ` 子${r.children}` : ""}</span>
                    </>
                  ) : (
                    <When at={r.startsAt} tz={me.timezone} />
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{r.totalAmount ? yen(r.totalAmount) : "—"}</td>
                <td className="px-4 py-3 text-xs text-muted">{r.source}{r.utmSource ? ` / ${r.utmSource}` : ""}</td>
                <td className="px-4 py-3"><Badge status={r.status} /></td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">該当する予約はありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
