/** Small server-safe UI helpers for the admin area. */
import type { ReactNode } from "react";
import { formatInTz, tzShortName } from "@/server/time";

export const PROPERTY_TZ = "Asia/Tokyo";

/**
 * Timestamp in the viewing admin's timezone; when that differs from the
 * property's (JST), the JST wall-clock is shown underneath so Osaka and
 * Toronto staff always talk about the same moment.
 */
export function When({ at, tz, withDate = true, compact = false }: { at: Date | string | null | undefined; tz: string; withDate?: boolean; compact?: boolean }) {
  if (!at) return <span className="text-muted">—</span>;
  const d = typeof at === "string" ? new Date(at) : at;
  const opts: Intl.DateTimeFormatOptions = withDate ? {} : { month: undefined, day: undefined, weekday: undefined };
  const mine = formatInTz(d, tz, "ja-JP", opts);
  const same = tz === PROPERTY_TZ;
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="tabular-nums">
        {mine}
        {!same && <span className="ml-1 text-[10px] font-semibold text-brand">{tzShortName(tz, d)}</span>}
      </span>
      {!same && !compact && (
        <span className="text-[10.5px] tabular-nums text-muted">現地 {formatInTz(d, PROPERTY_TZ, "ja-JP", opts)} JST</span>
      )}
    </span>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  hold: { label: "仮押さえ", cls: "bg-slate-100 text-slate-600" },
  pending_payment: { label: "決済待ち", cls: "bg-amber-100 text-amber-800" },
  confirmed: { label: "確定", cls: "bg-blue-100 text-blue-800" },
  checked_in: { label: "滞在中", cls: "bg-emerald-100 text-emerald-800" },
  completed: { label: "完了", cls: "bg-slate-100 text-slate-600" },
  cancelled: { label: "キャンセル", cls: "bg-rose-100 text-rose-700" },
  no_show: { label: "ノーショー", cls: "bg-rose-100 text-rose-700" },
  received: { label: "受付済み", cls: "bg-amber-100 text-amber-800" },
  in_progress: { label: "対応中", cls: "bg-blue-100 text-blue-800" },
  resolved: { label: "解決済み", cls: "bg-emerald-100 text-emerald-800" },
  todo: { label: "未着手", cls: "bg-amber-100 text-amber-800" },
  doing: { label: "作業中", cls: "bg-blue-100 text-blue-800" },
  done: { label: "完了", cls: "bg-emerald-100 text-emerald-800" },
  active: { label: "有効", cls: "bg-emerald-100 text-emerald-800" },
  revoked: { label: "失効", cls: "bg-rose-100 text-rose-700" },
  upcoming: { label: "開始前", cls: "bg-blue-100 text-blue-800" },
  expired: { label: "期限切れ", cls: "bg-slate-100 text-slate-600" },
  success: { label: "成功", cls: "bg-emerald-100 text-emerald-800" },
  denied: { label: "拒否", cls: "bg-rose-100 text-rose-700" },
  error: { label: "エラー", cls: "bg-rose-100 text-rose-700" },
};

export function Badge({ status, children }: { status: string; children?: ReactNode }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{children ?? s.label}</span>;
}

export const CATEGORY_LABEL: Record<string, string> = {
  facility: "設備トラブル",
  booking_change: "予約変更",
  access: "アクセス・入室",
  inbound: "インバウンド支援",
  real_estate: "不動産",
  other: "その他",
};

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line/80 bg-panel shadow-[0_8px_30px_-20px_rgba(12,40,92,.35)] ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5">
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;
export const loc = (v: unknown) => (v && typeof v === "object" && "ja" in v ? String((v as { ja: string }).ja) : "");
export const COUNTRY_FLAG: Record<string, string> = { TW: "🇹🇼", HK: "🇭🇰", KR: "🇰🇷", CA: "🇨🇦", CN: "🇨🇳", JP: "🇯🇵", VN: "🇻🇳", US: "🇺🇸" };
