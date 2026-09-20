/** Client-safe helpers to display a cancellation policy in 5 languages. */
import type { Locale } from "@/i18n/config";

export type Tier = { minDays: number; feePct: number };
export type TierRow = { fromDays: number; toDays: number | null; feePct: number };

/** tiers (any order) → rows with day ranges, most days first. toDays=null = "or more". */
export function tierRows(tiers: Tier[]): TierRow[] {
  const sorted = [...tiers].sort((a, b) => b.minDays - a.minDays);
  return sorted.map((t, i) => ({ fromDays: t.minDays, toDays: i === 0 ? null : sorted[i - 1].minDays - 1, feePct: t.feePct }));
}

const L: Record<Locale, { dayOf: string; dayBefore: string; range: (a: number, b: number) => string; orMore: (a: number) => string; free: string; fee: (p: number) => string; head: [string, string]; note: string }> = {
  ja: { dayOf: "当日", dayBefore: "前日", range: (a, b) => `${a}〜${b}日前`, orMore: (a) => `${a}日前まで`, free: "無料", fee: (p) => `${p}%`, head: ["キャンセルの時期（チェックイン日基準）", "キャンセル料"], note: "キャンセル料はお支払い総額に対する割合です。日付は宿泊施設の現地時間で数えます。" },
  en: { dayOf: "On the check-in day", dayBefore: "1 day before", range: (a, b) => `${a}–${b} days before`, orMore: (a) => `${a}+ days before`, free: "Free", fee: (p) => `${p}%`, head: ["When you cancel (before check-in)", "Fee"], note: "Fees are a percentage of the total paid. Days are counted in the property's local time." },
  "zh-Hant": { dayOf: "入住當天", dayBefore: "入住前1天", range: (a, b) => `入住前${a}〜${b}天`, orMore: (a) => `入住前${a}天以上`, free: "免費", fee: (p) => `${p}%`, head: ["取消時間（以入住日為準）", "取消費"], note: "取消費以已付總額的百分比計算，日期以住宿當地時間計算。" },
  "zh-Hans": { dayOf: "入住当天", dayBefore: "入住前1天", range: (a, b) => `入住前${a}〜${b}天`, orMore: (a) => `入住前${a}天以上`, free: "免费", fee: (p) => `${p}%`, head: ["取消时间（以入住日为准）", "取消费"], note: "取消费按已付总额的百分比计算，日期以住宿当地时间计算。" },
  ko: { dayOf: "체크인 당일", dayBefore: "체크인 1일 전", range: (a, b) => `체크인 ${a}~${b}일 전`, orMore: (a) => `체크인 ${a}일 이상 전`, free: "무료", fee: (p) => `${p}%`, head: ["취소 시점 (체크인 기준)", "취소 수수료"], note: "취소 수수료는 결제 총액에 대한 비율이며, 날짜는 숙소 현지 시간 기준입니다." },
};

export function tierLabel(row: TierRow, locale: Locale): string {
  const l = L[locale] ?? L.ja;
  if (row.toDays === null) return l.orMore(row.fromDays);
  if (row.fromDays === 0 && row.toDays === 0) return l.dayOf;
  if (row.fromDays === 1 && row.toDays === 1) return l.dayBefore;
  if (row.fromDays === 0 && row.toDays === 1) return `${l.dayBefore}・${l.dayOf}`.replace("・", locale === "en" ? " / " : "・");
  if (row.fromDays === row.toDays) return l.range(row.fromDays, row.toDays).replace(/(\d+)[〜~–]\1/, "$1");
  return l.range(row.fromDays, row.toDays);
}

export function feeLabel(pct: number, locale: Locale): string {
  const l = L[locale] ?? L.ja;
  return pct === 0 ? l.free : l.fee(pct);
}

export function policyText(locale: Locale) {
  const l = L[locale] ?? L.ja;
  return { head: l.head, note: l.note };
}
