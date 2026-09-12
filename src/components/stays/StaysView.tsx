"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { AccommodationCard } from "@/components/AccommodationCard";
import { SearchBookingForm } from "@/components/SearchBookingForm";
import { SectionHeading, EmptyState } from "@/components/ui/states";
import { Reveal } from "@/components/ui/Reveal";
import type { Accommodation, StayType } from "@/lib/types";
import { loc } from "@/lib/format";

const TYPES: StayType[] = ["machiya", "apartment", "house", "villa"];
const TYPE_LABEL: Record<StayType, string> = {
  machiya: "町家 / Machiya",
  apartment: "アパートメント / Apartment",
  house: "一戸建て / House",
  villa: "ヴィラ / Villa",
};

export function StaysView({ stays }: { stays: Accommodation[] }) {
  const { t, locale } = useI18n();
  const sp = useSearchParams();

  const guests =
    Number(sp.get("adults") || 0) + Number(sp.get("children") || 0) || 0;
  const query = sp.toString() ? `?${sp.toString()}` : "";

  const [type, setType] = useState<StayType | "all">("all");
  const [area, setArea] = useState<string>("all");
  const [sort, setSort] = useState<"rating" | "priceAsc" | "priceDesc">("rating");

  const areas = useMemo(
    () => Array.from(new Set(stays.map((s) => s.area.ja))),
    [stays]
  );

  const filtered = useMemo(() => {
    let list = stays.filter((s) => {
      if (type !== "all" && s.type !== type) return false;
      if (area !== "all" && s.area.ja !== area) return false;
      if (guests > 0 && s.maxGuests < guests) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "priceAsc") return a.pricePerNight - b.pricePerNight;
      if (sort === "priceDesc") return b.pricePerNight - a.pricePerNight;
      return b.rating - a.rating;
    });
    return list;
  }, [stays, type, area, guests, sort]);

  return (
    <div className="container-page py-8">
      <SectionHeading eyebrow="Stays" title={t("stays.title")} lead={t("stays.lead")} />

      <div className="mt-6">
        <SearchBookingForm compact />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <p className="mb-3 font-semibold text-ink">{t("stays.filters")}</p>

            <div className="mb-4">
              <label className="field-label" htmlFor="f-type">
                {t("stays.type")}
              </label>
              <select
                id="f-type"
                className="field"
                value={type}
                onChange={(e) => setType(e.target.value as StayType | "all")}
              >
                <option value="all">{t("common.all")}</option>
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {TYPE_LABEL[ty]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="field-label" htmlFor="f-area">
                {t("stays.area")}
              </label>
              <select
                id="f-area"
                className="field"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                <option value="all">{t("common.all")}</option>
                {areas.map((a) => {
                  const s = stays.find((x) => x.area.ja === a);
                  return (
                    <option key={a} value={a}>
                      {s ? loc(s.area, locale) : a}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="f-sort">
                {t("common.search")}
              </label>
              <select
                id="f-sort"
                className="field"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="rating">★ {t("stays.highlights")}</option>
                <option value="priceAsc">¥ ↑</option>
                <option value="priceDesc">¥ ↓</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          <p className="mb-4 text-sm text-muted">
            {t("stays.resultsCount", { count: filtered.length })}
          </p>
          {filtered.length === 0 ? (
            <EmptyState title={t("stays.noResults")} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((s, i) => (
                <Reveal key={s.id} delay={i * 0.04}>
                  <AccommodationCard stay={s} query={query} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
