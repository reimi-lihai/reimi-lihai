"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { formatJPY } from "@/lib/format";
import type { PriceBreakdown as PB } from "@/lib/types";

export function PriceBreakdown({ price, compact = false }: { price: PB; compact?: boolean }) {
  const { t, locale } = useI18n();
  if (price.nights <= 0) {
    return <p className="text-sm text-muted">{t("stays.selectDates")}</p>;
  }
  const rows: { label: string; value: number }[] = [
    { label: `${t("booking.nightlyRate")} · ${t("booking.nightsCount", { n: price.nights })}`, value: price.nightly },
    { label: t("booking.cleaningFee"), value: price.cleaningFee },
  ];
  if (price.options > 0) rows.push({ label: t("booking.options"), value: price.options });
  rows.push({ label: t("booking.serviceFee"), value: price.serviceFee });
  rows.push({ label: t("booking.taxes"), value: price.taxes });

  return (
    <div className={compact ? "text-sm" : ""}>
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 text-muted">
            <dt>{r.label}</dt>
            <dd className="tabular-nums text-ink">{formatJPY(r.value, locale)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="font-semibold text-ink">{t("booking.total")}</span>
        <span className="text-lg font-bold text-brand tabular-nums">{formatJPY(price.total, locale)}</span>
      </div>
    </div>
  );
}
