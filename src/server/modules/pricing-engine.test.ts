import { describe, expect, it } from "vitest";
import { buildQuote, cancellationFee, normalizeTiers, priceNights, ruleMatches, type EngineRule } from "./pricing-engine";

const rule = (p: Partial<EngineRule>): EngineRule => ({
  id: "r",
  name: "rule",
  ruleType: "weekday",
  condition: {},
  adjustType: "percent",
  adjustValue: 0,
  priority: 100,
  stackable: true,
  ...p,
});

const base = { basePrice: 20000, today: "2026-09-20", guests: 2, rules: [] as EngineRule[], overrides: [] };

describe("priceNights", () => {
  it("uses the base price with no rules", () => {
    const n = priceNights({ ...base, checkIn: "2026-10-01", checkOut: "2026-10-04" });
    expect(n.map((x) => x.price)).toEqual([20000, 20000, 20000]);
  });

  it("applies a weekend surcharge only on Fri/Sat nights", () => {
    // 2026-10-02 is a Friday, 10-03 Saturday
    const n = priceNights({
      ...base,
      checkIn: "2026-10-01",
      checkOut: "2026-10-05",
      rules: [rule({ name: "週末", condition: { days: [5, 6] }, adjustValue: 20 })],
    });
    expect(n.map((x) => x.price)).toEqual([20000, 24000, 24000, 20000]);
    expect(n[1].applied).toEqual(["週末"]);
  });

  it("stacks rules in priority order and stops at a non-stackable rule", () => {
    const rules = [
      rule({ name: "年末年始", ruleType: "season", condition: { from: "12-28", to: "01-03" }, adjustType: "fixed", adjustValue: 10000, priority: 10 }),
      rule({ name: "固定", ruleType: "season", condition: { from: "12-31", to: "12-31" }, adjustType: "override", adjustValue: 50000, priority: 20, stackable: false }),
      rule({ name: "連泊割", ruleType: "length_of_stay", condition: { minNights: 3 }, adjustValue: -10, priority: 30 }),
    ];
    const n = priceNights({ ...base, checkIn: "2026-12-30", checkOut: "2027-01-02", rules });
    // 12/30: 20000+10000 = 30000, −10% = 27000
    // 12/31: +10000 then override 50000, non-stackable → 50000 (no LOS discount)
    // 01/01: season wraps the new year → 27000
    expect(n.map((x) => x.price)).toEqual([27000, 50000, 27000]);
  });

  it("date overrides replace the base and can stop-sell", () => {
    const n = priceNights({
      ...base,
      checkIn: "2026-10-01",
      checkOut: "2026-10-03",
      overrides: [{ date: "2026-10-02", price: 15000, closed: true, minNights: null }],
    });
    expect(n[1]).toMatchObject({ base: 15000, price: 15000, closed: true });
  });

  it("lead-time last-minute discount", () => {
    const lastMinute = rule({ ruleType: "lead_time", condition: { maxDays: 3 }, adjustValue: -15 });
    expect(ruleMatches(lastMinute, { night: "2026-09-22", checkIn: "2026-09-22", nights: 1, today: "2026-09-20", guests: 2 })).toBe(true);
    expect(ruleMatches(lastMinute, { night: "2026-09-30", checkIn: "2026-09-30", nights: 1, today: "2026-09-20", guests: 2 })).toBe(false);
  });
});

describe("buildQuote", () => {
  it("matches the public site's fee formula", () => {
    const q = buildQuote(priceNights({ ...base, checkIn: "2026-10-05", checkOut: "2026-10-07" }), 6000, 1);
    // nightly 40000 + cleaning 6000 + child 2000 = 48000; service 4800; tax 5% of 52800 = 2640
    expect(q).toMatchObject({ nightly: 40000, options: 2000, serviceFee: 4800, taxes: 2640, total: 55440 });
  });
});

describe("cancellationFee (default policy, today = 2026-09-20)", () => {
  it.each([
    ["2026-10-04", 14, 0],
    ["2026-10-03", 13, 30],
    ["2026-09-27", 7, 30],
    ["2026-09-26", 6, 60],
    ["2026-09-22", 2, 60],
    ["2026-09-21", 1, 100],
    ["2026-09-20", 0, 100],
  ])("check-in %s (%i days before) → fee %i%%", (checkIn, days, pct) => {
    const r = cancellationFee(100000, checkIn, "2026-09-20");
    expect(r.daysBefore).toBe(days);
    expect(r.feePct).toBe(pct);
    expect(r.refund).toBe(100000 - pct * 1000);
  });

  it("uses a custom policy and always has a check-in-day tier", () => {
    const tiers = normalizeTiers([{ minDays: 30, feePct: 0 }, { minDays: 3, feePct: 50 }]);
    expect(tiers).toEqual([{ minDays: 30, feePct: 0 }, { minDays: 3, feePct: 50 }, { minDays: 0, feePct: 100 }]);
    expect(cancellationFee(10000, "2026-09-25", "2026-09-20", tiers).feePct).toBe(50);
  });
});
