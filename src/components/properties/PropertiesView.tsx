"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { PropertyCard } from "@/components/PropertyCard";
import { SectionHeading, EmptyState } from "@/components/ui/states";
import { Reveal } from "@/components/ui/Reveal";
import type { Deal, Property, PropertyType } from "@/lib/types";

const TYPES: PropertyType[] = ["apartment", "house", "building", "land"];

export function PropertiesView({ items }: { items: Property[] }) {
  const { t } = useI18n();
  const [deal, setDeal] = useState<Deal | "all">("all");
  const [type, setType] = useState<PropertyType | "all">("all");
  const [minpaku, setMinpaku] = useState(false);
  const [sort, setSort] = useState<"default" | "priceAsc" | "priceDesc">("default");

  const filtered = useMemo(() => {
    let list = items.filter((p) => {
      if (deal !== "all" && p.deal !== deal) return false;
      if (type !== "all" && p.type !== type) return false;
      if (minpaku && !p.minpakuReady) return false;
      return true;
    });
    if (sort === "priceAsc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "priceDesc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [items, deal, type, minpaku, sort]);

  const TYPE_LABEL: Record<PropertyType, string> = {
    apartment: "マンション / Apartment",
    house: "戸建て / House",
    building: "一棟 / Building",
    land: "土地 / Land",
  };

  return (
    <div className="container-page py-8">
      <SectionHeading eyebrow="Real estate" title={t("properties.title")} lead={t("properties.lead")} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-4 p-5">
            <div>
              <label className="field-label" htmlFor="p-deal">{t("properties.deal")}</label>
              <select id="p-deal" className="field" value={deal} onChange={(e) => setDeal(e.target.value as Deal | "all")}>
                <option value="all">{t("common.all")}</option>
                <option value="sale">{t("properties.sale")}</option>
                <option value="rent">{t("properties.rent")}</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="p-type">{t("properties.propertyType")}</label>
              <select id="p-type" className="field" value={type} onChange={(e) => setType(e.target.value as PropertyType | "all")}>
                <option value="all">{t("common.all")}</option>
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>{TYPE_LABEL[ty]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="p-sort">{t("properties.priceRange")}</label>
              <select id="p-sort" className="field" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="default">—</option>
                <option value="priceAsc">¥ ↑</option>
                <option value="priceDesc">¥ ↓</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="accent-[rgb(var(--c-brand))]" checked={minpaku} onChange={(e) => setMinpaku(e.target.checked)} />
              {t("properties.minpakuUse")}
            </label>
          </div>
        </aside>

        <div>
          <p className="mb-4 text-sm text-muted">{t("properties.resultsCount", { count: filtered.length })}</p>
          {filtered.length === 0 ? (
            <EmptyState title={t("properties.noResults")} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.04}>
                  <PropertyCard property={p} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
