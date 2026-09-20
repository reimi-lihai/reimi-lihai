/**
 * Rule-based nightly pricing (pure — no DB, unit-tested in pricing-engine.test.ts).
 *
 * For each night:
 *   base  = date override price ?? plan base price
 *   rules = active rules whose condition matches, applied in priority order (low first)
 *           percent: price × (1 + v/100) | fixed: price + v | override: price = v
 *           a matching rule with stackable=false stops later rules for that night
 *   price = rounded to ¥100, never below ¥0
 * Fees/taxes follow src/lib/pricing.ts so the public UI and the server agree.
 */
import { CHILD_OPTION_FEE, LODGING_TAX_RATE, SERVICE_FEE_RATE } from "@/lib/pricing";

export type RuleType = "weekday" | "date_range" | "season" | "lead_time" | "length_of_stay" | "occupancy";

export interface EngineRule {
  id: string;
  name: string;
  ruleType: RuleType;
  condition: Record<string, unknown>;
  adjustType: "percent" | "fixed" | "override";
  adjustValue: number;
  priority: number;
  stackable: boolean;
}

export interface EngineOverride {
  date: string;
  price: number | null;
  closed: boolean;
  minNights: number | null;
}

export interface NightPrice {
  date: string;
  base: number;
  price: number;
  applied: string[];
  closed: boolean;
}

export interface Quote {
  nights: number;
  perNight: NightPrice[];
  nightly: number;
  cleaningFee: number;
  options: number;
  serviceFee: number;
  taxes: number;
  total: number;
  currency: "JPY";
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

function weekday(date: string): number {
  return new Date(date + "T00:00:00Z").getUTCDay(); // 0 = Sun … 6 = Sat
}

export function ruleMatches(
  rule: EngineRule,
  ctx: { night: string; checkIn: string; nights: number; today: string; guests: number }
): boolean {
  const c = rule.condition as Record<string, unknown>;
  switch (rule.ruleType) {
    case "weekday": {
      const days = (c.days as number[]) ?? [];
      return days.includes(weekday(ctx.night));
    }
    case "date_range": {
      const from = String(c.from ?? "");
      const to = String(c.to ?? "");
      return !!from && !!to && ctx.night >= from && ctx.night <= to;
    }
    case "season": {
      // yearly range by MM-DD, may wrap the new year (e.g. 12-20 → 01-05)
      const md = ctx.night.slice(5);
      const from = String(c.from ?? "");
      const to = String(c.to ?? "");
      if (!from || !to) return false;
      return from <= to ? md >= from && md <= to : md >= from || md <= to;
    }
    case "lead_time": {
      const lead = daysBetween(ctx.today, ctx.checkIn);
      if (typeof c.maxDays === "number" && lead > c.maxDays) return false;
      if (typeof c.minDays === "number" && lead < c.minDays) return false;
      return typeof c.maxDays === "number" || typeof c.minDays === "number";
    }
    case "length_of_stay":
      return typeof c.minNights === "number" && ctx.nights >= c.minNights;
    case "occupancy":
      return typeof c.minGuests === "number" && ctx.guests >= c.minGuests;
    default:
      return false;
  }
}

function applyRule(price: number, rule: EngineRule): number {
  switch (rule.adjustType) {
    case "percent":
      return price * (1 + rule.adjustValue / 100);
    case "fixed":
      return price + rule.adjustValue;
    case "override":
      return rule.adjustValue;
  }
}

export function priceNights(input: {
  basePrice: number;
  checkIn: string;
  checkOut: string;
  today: string;
  guests: number;
  rules: EngineRule[];
  overrides: EngineOverride[];
}): NightPrice[] {
  const nights = daysBetween(input.checkIn, input.checkOut);
  const byDate = new Map(input.overrides.map((o) => [o.date, o]));
  const rules = [...input.rules].sort((a, b) => a.priority - b.priority);
  const out: NightPrice[] = [];
  for (let i = 0; i < nights; i++) {
    const night = addDays(input.checkIn, i);
    const ov = byDate.get(night);
    const base = ov?.price ?? input.basePrice;
    let price = base;
    const applied: string[] = [];
    for (const r of rules) {
      if (!ruleMatches(r, { night, checkIn: input.checkIn, nights, today: input.today, guests: input.guests })) continue;
      price = applyRule(price, r);
      applied.push(r.name);
      if (!r.stackable) break;
    }
    out.push({ date: night, base, price: Math.max(0, Math.round(price / 100) * 100), applied, closed: !!ov?.closed });
  }
  return out;
}

export function buildQuote(perNight: NightPrice[], cleaningFeeBase: number, children: number): Quote {
  const nights = perNight.length;
  const nightly = perNight.reduce((s, n) => s + n.price, 0);
  const cleaningFee = nights > 0 ? cleaningFeeBase : 0;
  const options = Math.max(0, children) * CHILD_OPTION_FEE * nights;
  const preTax = nightly + cleaningFee + options;
  const serviceFee = Math.round(preTax * SERVICE_FEE_RATE);
  const taxes = Math.round((preTax + serviceFee) * LODGING_TAX_RATE);
  return { nights, perNight, nightly, cleaningFee, options, serviceFee, taxes, total: preTax + serviceFee + taxes, currency: "JPY" };
}

/* ---------------- cancellation policy ---------------- */

export interface CancellationTier {
  /** applies when the guest cancels this many days (or more) before check-in; 0 = check-in day */
  minDays: number;
  /** fee as % of the amount paid */
  feePct: number;
}

/**
 * Default policy (editable in 管理画面 → 設定; stored in site_settings):
 * 14日前まで無料 / 7〜13日前 30% / 2〜6日前 60% / 前日・当日 100%.
 */
export const DEFAULT_CANCELLATION_TIERS: CancellationTier[] = [
  { minDays: 14, feePct: 0 },
  { minDays: 7, feePct: 30 },
  { minDays: 2, feePct: 60 },
  { minDays: 0, feePct: 100 },
];

/** Sorted (most days first), deduplicated, always with a 0-day tier. */
export function normalizeTiers(tiers: CancellationTier[]): CancellationTier[] {
  const byDays = new Map<number, number>();
  for (const t of tiers) byDays.set(Math.max(0, Math.floor(t.minDays)), Math.min(100, Math.max(0, Math.round(t.feePct))));
  if (!byDays.has(0)) byDays.set(0, 100);
  return [...byDays.entries()].map(([minDays, feePct]) => ({ minDays, feePct })).sort((a, b) => b.minDays - a.minDays);
}

export function cancellationFee(total: number, checkIn: string, today: string, tiers: CancellationTier[] = DEFAULT_CANCELLATION_TIERS) {
  const sorted = normalizeTiers(tiers);
  const daysBefore = daysBetween(today, checkIn);
  const tier = sorted.find((t) => daysBefore >= t.minDays) ?? sorted[sorted.length - 1];
  const fee = Math.round((total * tier.feePct) / 100);
  return { daysBefore, feePct: tier.feePct, fee, refund: Math.max(0, total - fee) };
}
