"use client";

/**
 * 60-day availability + nightly price strip for a stay (server data:
 * GET /api/v1/stays/:id/calendar). Tap a free date to start the stay there.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

type Day = { date: string; price: number; available: boolean };

export function AvailabilityStrip({
  stayId,
  planId,
  checkIn,
  checkOut,
  onPick,
}: {
  stayId: string;
  planId: string;
  checkIn: string;
  checkOut: string;
  onPick: (date: string) => void;
}) {
  const { intlLocale, t } = useI18n();
  const [days, setDays] = useState<Day[] | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Window starts 3 days before the selected check-in (never before today) so the selection is visible.
  const from = (() => {
    const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) return today;
    const d = new Date(checkIn + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 3);
    const s = d.toISOString().slice(0, 10);
    return s < today ? today : s;
  })();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/stays/${encodeURIComponent(stayId)}/calendar?plan=${encodeURIComponent(planId)}&from=${from}&days=60`)
      .then((r) => r.json())
      .then((j) => !cancelled && setDays(j.ok ? j.days : []))
      .catch(() => !cancelled && setDays([]));
    return () => {
      cancelled = true;
    };
  }, [stayId, planId, from]);

  useEffect(() => {
    scroller.current?.scrollTo({ left: 0 });
  }, [from]);

  if (days && !days.length) return null;

  const wd = new Intl.DateTimeFormat(intlLocale, { weekday: "short", timeZone: "UTC" });
  const md = new Intl.DateTimeFormat(intlLocale, { month: "numeric", day: "numeric", timeZone: "UTC" });
  const scroll = (dir: number) => scroller.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  return (
    <div className="mt-4 min-w-0 max-w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="field-label !mb-0">{t("payment.availability")}</span>
        <span className="flex gap-1">
          <button type="button" aria-label="previous" onClick={() => scroll(-1)} className="rounded-md border border-line p-1 text-muted hover:text-brand">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="next" onClick={() => scroll(1)} className="rounded-md border border-line p-1 text-muted hover:text-brand">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <div ref={scroller} className="thin-scroll flex gap-1 overflow-x-auto pb-1">
        {(days ?? Array.from({ length: 10 }, (_, i) => ({ date: String(i), price: 0, available: false }))).map((d) => {
          const loading = !days;
          const inRange = d.date >= checkIn && d.date < checkOut;
          const dt = loading ? null : new Date(d.date + "T00:00:00Z");
          const dow = dt?.getUTCDay();
          return (
            <button
              key={d.date}
              type="button"
              disabled={loading || !d.available}
              onClick={() => onPick(d.date)}
              className={`flex w-[52px] shrink-0 flex-col items-center rounded-lg border px-1 py-1.5 text-[10.5px] transition ${
                loading
                  ? "animate-pulse border-line bg-line/40"
                  : inRange
                  ? "border-brand bg-brand text-white"
                  : d.available
                  ? "border-line bg-panel hover:border-brand"
                  : "cursor-not-allowed border-line/60 bg-line/30 text-muted line-through"
              }`}
            >
              {dt && (
                <>
                  <span className={inRange ? "text-white/80" : dow === 0 ? "text-crimson" : dow === 6 ? "text-brand" : "text-muted"}>{wd.format(dt)}</span>
                  <span className="font-semibold">{md.format(dt)}</span>
                  <span className={`tabular-nums ${inRange ? "text-white" : d.available ? "text-ink" : ""}`}>
                    {d.available ? `¥${Math.round(d.price / 1000)}k` : "×"}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
