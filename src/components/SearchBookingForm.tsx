"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { todayISO, addDaysISO } from "@/lib/format";
import { Search, CalendarDays, Users } from "lucide-react";

/**
 * Stay search form. Pushes criteria to /stays as query params. Enforces:
 * no past dates, check-out after check-in, at least 1 guest.
 */
export function SearchBookingForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [checkIn, setCheckIn] = useState(addDaysISO(todayISO(), 14));
  const [checkOut, setCheckOut] = useState(addDaysISO(todayISO(), 16));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (checkIn < todayISO()) return setError(t("errors.pastDate"));
    if (checkOut <= checkIn) return setError(t("errors.dateOrder"));
    if (adults < 1) return setError(t("errors.minGuests"));
    const params = new URLSearchParams({
      checkIn,
      checkOut,
      adults: String(adults),
      children: String(children),
    });
    router.push(`/stays?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className={`glass rounded-2xl p-4 ${compact ? "" : "shadow-glass"}`}
      aria-label={t("home.searchTitle")}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="block">
          <span className="field-label flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-brand" aria-hidden />
            {t("stays.checkIn")}
          </span>
          <input
            type="date"
            className="field"
            value={checkIn}
            min={todayISO()}
            onChange={(e) => setCheckIn(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="field-label flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-brand" aria-hidden />
            {t("stays.checkOut")}
          </span>
          <input
            type="date"
            className="field"
            value={checkOut}
            min={addDaysISO(checkIn, 1)}
            onChange={(e) => setCheckOut(e.target.value)}
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="field-label flex items-center gap-1.5">
              <Users className="h-4 w-4 text-brand" aria-hidden />
              {t("stays.adults")}
            </span>
            <input
              type="number"
              className="field"
              min={1}
              max={20}
              value={adults}
              onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          <label className="block">
            <span className="field-label">{t("stays.children")}</span>
            <input
              type="number"
              className="field"
              min={0}
              max={20}
              value={children}
              onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary h-[46px] w-full lg:w-auto">
            <Search className="h-4 w-4" aria-hidden />
            {t("common.search")}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-crimson">
          {error}
        </p>
      )}
    </form>
  );
}
