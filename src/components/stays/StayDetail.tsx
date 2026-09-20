"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { loc, formatJPY, todayISO, addDaysISO } from "@/lib/format";
import { computePrice } from "@/lib/pricing";
import { Placeholder } from "@/components/ui/Placeholder";
import { DemoBadge } from "@/components/ui/states";
import { PriceBreakdown } from "@/components/booking/PriceBreakdown";
import { AvailabilityStrip } from "./AvailabilityStrip";
import type { PriceBreakdown as PB } from "@/lib/types";
import type { Accommodation } from "@/lib/types";
import {
  Star, Users, BedDouble, Bath, MapPin, Clock, Check, ShieldCheck, CalendarDays,
} from "lucide-react";

export function StayDetail({ stay }: { stay: Accommodation }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();

  const [checkIn, setCheckIn] = useState(sp.get("checkIn") || addDaysISO(todayISO(), 14));
  const [checkOut, setCheckOut] = useState(sp.get("checkOut") || addDaysISO(todayISO(), 16));
  const [adults, setAdults] = useState(Number(sp.get("adults")) || 2);
  const [children, setChildren] = useState(Number(sp.get("children")) || 0);
  const [planId, setPlanId] = useState(stay.plans[0].id);
  const [error, setError] = useState<string | null>(null);

  const plan = stay.plans.find((p) => p.id === planId) ?? stay.plans[0];

  const localPrice = useMemo(
    () =>
      computePrice({
        pricePerNight: plan.pricePerNight,
        cleaningFee: stay.cleaningFee,
        checkIn,
        checkOut,
        adults,
        children,
      }),
    [plan, stay.cleaningFee, checkIn, checkOut, adults, children]
  );

  // Live server quote (dynamic pricing + availability), debounced.
  const [server, setServer] = useState<{ price?: PB; reason?: string | null } | null>(null);
  useEffect(() => {
    if (!(checkOut > checkIn)) return setServer(null);
    const id = setTimeout(() => {
      fetch("/api/v1/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stay: stay.id, plan: planId, checkIn, checkOut, adults, children }),
      })
        .then((r) => r.json())
        .then((j) => setServer(j.ok ? { price: j.quote ?? undefined, reason: j.available ? null : j.reason } : j.error === "stay_not_found" ? null : { reason: j.error }))
        .catch(() => setServer(null));
    }, 250);
    return () => clearTimeout(id);
  }, [stay.id, planId, checkIn, checkOut, adults, children]);

  const price = server?.price ?? localPrice;
  const reason = server?.reason ?? null;
  const reasonText = (r: string) => {
    const m = /^min_nights_(\d+)$/.exec(r);
    if (m) return t("payment.r_min_nights", { n: m[1] });
    const k = `payment.r_${r}`;
    const txt = t(k);
    return txt === k ? t("payment.r_generic") : txt;
  };

  function pickDate(d: string) {
    const nights = Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000) || 2);
    setCheckIn(d);
    setCheckOut(addDaysISO(d, nights));
  }

  function reserve() {
    setError(null);
    if (checkIn < todayISO()) return setError(t("errors.pastDate"));
    if (checkOut <= checkIn) return setError(t("errors.dateOrder"));
    if (adults < 1) return setError(t("errors.minGuests"));
    if (adults + children > plan.maxGuests) return setError(t("stays.maxGuests", { n: plan.maxGuests }));
    const params = new URLSearchParams({
      stay: stay.id,
      plan: planId,
      checkIn,
      checkOut,
      adults: String(adults),
      children: String(children),
    });
    router.push(`/book?${params.toString()}`);
  }

  return (
    <div className="container-page py-8">
      {/* Gallery */}
      <div className="grid gap-3 sm:grid-cols-4 sm:grid-rows-2">
        <div className="relative sm:col-span-2 sm:row-span-2">
          <Placeholder
            src={stay.heroImage}
            alt={loc(stay.name, locale)}
            accent={stay.accent}
            className="aspect-[4/3] w-full rounded-2xl sm:h-full"
            priority
          />
          <div className="absolute left-3 top-3">
            <DemoBadge />
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <Placeholder
            key={i}
            alt=""
            accent={stay.accent}
            className="hidden aspect-[4/3] w-full rounded-xl sm:block"
            label={t("common.demoData")}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Main */}
        <div>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-4 w-4" aria-hidden />
            {loc(stay.area, locale)}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-ink">{loc(stay.name, locale)}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-gold text-gold" aria-hidden />
              {stay.rating.toFixed(1)} ({stay.reviews})
            </span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" aria-hidden />{t("stays.maxGuests", { n: stay.maxGuests })}</span>
            <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" aria-hidden />{stay.beds}</span>
            <span className="flex items-center gap-1"><Bath className="h-4 w-4" aria-hidden />{stay.baths}</span>
          </div>

          <p className="mt-5 whitespace-pre-line leading-relaxed text-ink/90">{loc(stay.description, locale)}</p>

          {/* Highlights */}
          <h2 className="mt-8 font-serif text-xl font-bold text-ink">{t("stays.highlights")}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {stay.highlights.map((h, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-ink/90">
                <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                {loc(h, locale)}
              </li>
            ))}
          </ul>

          {/* Amenities */}
          <h2 className="mt-8 font-serif text-xl font-bold text-ink">{t("stays.amenities")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {stay.amenities.map((a, i) => (
              <li key={i} className="chip">{loc(a, locale)}</li>
            ))}
          </ul>

          {/* Times + rules */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Clock className="h-4 w-4 text-brand" aria-hidden /> {t("stays.checkInTime")} / {t("stays.checkOutTime")}
              </p>
              <p className="mt-1 text-sm text-muted">
                {t("stays.checkInTime")}: {stay.checkInTime} · {t("stays.checkOutTime")}: {stay.checkOutTime}
              </p>
            </div>
            <div className="card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <ShieldCheck className="h-4 w-4 text-brand" aria-hidden /> {t("stays.houseRules")}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-muted">
                {stay.houseRules.map((r, i) => (
                  <li key={i}>・{loc(r, locale)}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-brand/5 p-4 text-sm text-muted">
            {t("stays.location")}: {loc(stay.address, locale)}
          </div>
        </div>

        {/* Booking box */}
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <p className="mb-3 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-brand">{formatJPY(plan.pricePerNight, locale)}</span>
              <span className="text-sm text-muted">{t("common.perNight")}</span>
            </p>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="field-label flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-brand" aria-hidden />{t("stays.checkIn")}</span>
                <input type="date" className="field" value={checkIn} min={todayISO()} onChange={(e) => setCheckIn(e.target.value)} />
              </label>
              <label className="block">
                <span className="field-label flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-brand" aria-hidden />{t("stays.checkOut")}</span>
                <input type="date" className="field" value={checkOut} min={addDaysISO(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">{t("stays.adults")}</span>
                <input type="number" className="field" min={1} max={stay.maxGuests} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))} />
              </label>
              <label className="block">
                <span className="field-label">{t("stays.children")}</span>
                <input type="number" className="field" min={0} max={stay.maxGuests} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))} />
              </label>
            </div>

            <AvailabilityStrip stayId={stay.id} planId={planId} checkIn={checkIn} checkOut={checkOut} onPick={pickDate} />

            {/* Plans */}
            <fieldset className="mt-4">
              <legend className="field-label">{t("stays.roomTypes")}</legend>
              <div className="space-y-2">
                {stay.plans.map((p) => (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition ${
                      planId === p.id ? "border-brand bg-brand/5" : "border-line hover:border-brand/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      className="mt-1 accent-[rgb(var(--c-brand))]"
                      checked={planId === p.id}
                      onChange={() => setPlanId(p.id)}
                    />
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink">{loc(p.name, locale)}</span>
                        <span className="font-semibold text-brand">{formatJPY(p.pricePerNight, locale)}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {p.includes.map((inc) => loc(inc, locale)).join("・")}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 border-t border-line pt-4">
              <PriceBreakdown price={price} />
            </div>

            {error && <p role="alert" className="mt-3 text-sm text-crimson">{error}</p>}
            {!error && reason && <p role="alert" className="mt-3 text-sm text-crimson">{reasonText(reason)}</p>}

            <button type="button" onClick={reserve} disabled={!!reason} className="btn-primary mt-4 w-full">
              {t("common.reserve")}
            </button>
            <p className="mt-2 text-center text-xs text-muted">{t("common.demoData")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
