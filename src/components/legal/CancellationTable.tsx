"use client";

/** Live cancellation fee table — reads the policy set in the admin (GET /api/v1/policies/cancellation). */
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { feeLabel, policyText, tierLabel, tierRows, type Tier } from "@/lib/cancellation";

const FALLBACK: Tier[] = [
  { minDays: 14, feePct: 0 },
  { minDays: 7, feePct: 30 },
  { minDays: 2, feePct: 60 },
  { minDays: 0, feePct: 100 },
];

export function CancellationTable() {
  const { locale } = useI18n();
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  useEffect(() => {
    fetch("/api/v1/policies/cancellation")
      .then((r) => r.json())
      .then((j) => setTiers(j.ok ? j.tiers : FALLBACK))
      .catch(() => setTiers(FALLBACK));
  }, []);
  const text = policyText(locale);
  const rows = tierRows(tiers ?? FALLBACK);
  return (
    <div className={`mt-3 overflow-hidden rounded-xl border border-line ${tiers ? "" : "opacity-60"}`}>
      <table className="w-full text-sm">
        <thead className="bg-brand/5 text-left text-xs text-muted">
          <tr>
            <th className="px-4 py-2.5">{text.head[0]}</th>
            <th className="px-4 py-2.5 text-right">{text.head[1]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.fromDays}>
              <td className="px-4 py-2.5 text-ink">{tierLabel(r, locale)}</td>
              <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${r.feePct === 0 ? "text-emerald-700" : r.feePct === 100 ? "text-crimson" : "text-ink"}`}>{feeLabel(r.feePct, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-2 text-xs text-muted">{text.note}</p>
    </div>
  );
}
