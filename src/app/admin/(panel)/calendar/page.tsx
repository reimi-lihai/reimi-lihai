import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { calendar } from "@/server/modules/queries";
import { localDate } from "@/server/time";
import { PageTitle, loc } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const DAYS = 14;
const COLORS: Record<string, string> = {
  checked_in: "bg-emerald-500 text-white",
  confirmed: "bg-[#146cd6] text-white",
  pending_payment: "bg-amber-400 text-[#0c285c]",
  completed: "bg-slate-300 text-slate-700",
  hold: "bg-slate-300 text-slate-700",
  no_show: "bg-rose-300 text-rose-900",
};

export default async function CalendarPage({ searchParams }: { searchParams: { from?: string } }) {
  await requireAdmin("reservations:read");
  const today = localDate("Asia/Tokyo");
  const from = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.from ?? "") ? searchParams.from! : localDate("Asia/Tokyo", -2);
  const days = Array.from({ length: DAYS }, (_, i) => localDate("Asia/Tokyo", i, new Date(from + "T12:00:00+09:00")));
  const { props, rows } = await calendar(from, DAYS);
  const shift = (n: number) => localDate("Asia/Tokyo", n, new Date(from + "T12:00:00+09:00"));
  const wd = (s: string) => "日月火水木金土"[new Date(s + "T12:00:00+09:00").getUTCDay()];

  return (
    <>
      <PageTitle title="予約カレンダー" sub="物件ごとの宿泊状況（日付は物件の現地日付）。バーをクリックで予約詳細へ。">
        <div className="flex gap-2 text-xs font-semibold">
          <Link href={`/admin/calendar?from=${shift(-7)}`} className="rounded-lg border border-line px-3 py-2 text-ink">← 前週</Link>
          <Link href="/admin/calendar" className="rounded-lg border border-line px-3 py-2 text-ink">今日</Link>
          <Link href={`/admin/calendar?from=${shift(7)}`} className="rounded-lg border border-line px-3 py-2 text-ink">翌週 →</Link>
        </div>
      </PageTitle>
      <div className="overflow-x-auto rounded-2xl border border-line/80 bg-panel">
        <div className="min-w-[980px]" style={{ display: "grid", gridTemplateColumns: `220px repeat(${DAYS}, minmax(52px,1fr))` }}>
          <div className="sticky left-0 border-b border-r border-line/70 bg-panel px-3 py-2 text-xs font-semibold text-muted">物件</div>
          {days.map((d) => (
            <div key={d} className={`border-b border-line/70 px-1 py-2 text-center text-[11px] ${d === today ? "bg-[#f7c948]/25 font-bold text-ink" : "text-muted"}`}>
              {d.slice(5).replace("-", "/")}
              <span className={`block ${wd(d) === "土" ? "text-brand" : wd(d) === "日" ? "text-rose-600" : ""}`}>{wd(d)}</span>
            </div>
          ))}
          {props.map((p) => {
            const mine = rows.filter((x) => x.r.propertyId === p.id);
            return (
              <div key={p.id} className="contents">
                <div className="sticky left-0 truncate border-b border-r border-line/70 bg-panel px-3 py-3 text-sm font-semibold text-ink">{loc(p.name)}</div>
                <div className="relative border-b border-line/70" style={{ gridColumn: `span ${DAYS}` }}>
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }}>
                    {days.map((d) => (
                      <div key={d} className={`border-r border-line/40 ${d === today ? "bg-[#f7c948]/10" : ""}`} />
                    ))}
                  </div>
                  {mine.map(({ r, c }) => {
                    const start = Math.max(0, days.indexOf(r.checkIn!) === -1 ? (r.checkIn! < from ? 0 : DAYS) : days.indexOf(r.checkIn!));
                    const endIdx = days.indexOf(r.checkOut!);
                    const end = endIdx === -1 ? (r.checkOut! > days[DAYS - 1] ? DAYS : 0) : endIdx;
                    if (end <= start) return null;
                    // half-day offsets: check-in afternoon, check-out morning
                    const left = ((start + (r.checkIn! >= from ? 0.5 : 0)) / DAYS) * 100;
                    const right = ((end + (endIdx !== -1 ? 0.5 : 0)) / DAYS) * 100;
                    return (
                      <Link
                        key={r.id}
                        href={`/admin/reservations/${r.code}`}
                        title={`${r.code} ${c.givenName} ${c.familyName}`}
                        className={`absolute top-1/2 flex h-7 -translate-y-1/2 items-center truncate rounded-md px-2 text-[11px] font-bold shadow-sm hover:brightness-110 ${COLORS[r.status] ?? "bg-slate-300"}`}
                        style={{ left: `${left}%`, width: `calc(${right - left}% - 2px)` }}
                      >
                        {c.familyName} · {r.code}
                      </Link>
                    );
                  })}
                  <div className="h-12" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        {[["checked_in", "滞在中"], ["confirmed", "確定"], ["pending_payment", "決済待ち"], ["completed", "完了"]].map(([k, l]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`h-3 w-5 rounded ${COLORS[k]}`} />{l}</span>
        ))}
      </div>
    </>
  );
}
