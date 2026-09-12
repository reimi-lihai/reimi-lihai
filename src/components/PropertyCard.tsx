"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { loc, formatJPY } from "@/lib/format";
import { Placeholder } from "./ui/Placeholder";
import { DemoBadge } from "./ui/states";
import { MapPin, Home, Maximize } from "lucide-react";
import type { Property } from "@/lib/types";

export function PropertyCard({ property }: { property: Property }) {
  const { locale, t } = useI18n();
  const isRent = property.deal === "rent";
  return (
    <Link
      href={`/properties/${property.slug}`}
      className="card group flex flex-col transition-all hover:-translate-y-1 hover:shadow-glass"
    >
      <div className="relative aspect-[4/3] w-full">
        <Placeholder alt={loc(property.name, locale)} accent={property.accent} className="h-full w-full" />
        <div className="absolute left-3 top-3 flex gap-2">
          <DemoBadge />
        </div>
        <div className="absolute right-3 top-3 flex gap-2">
          <span className="chip bg-black/40 text-white backdrop-blur">
            {isRent ? t("properties.rent") : t("properties.sale")}
          </span>
          {property.minpakuReady && (
            <span className="chip bg-gold/90 text-brand-deep">{t("nav.stays")}</span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {loc(property.area, locale)}
        </p>
        <h3 className="mt-1 font-serif text-lg font-bold text-ink group-hover:text-brand">
          {loc(property.name, locale)}
        </h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Home className="h-3.5 w-3.5" aria-hidden />
            {property.layout}
          </span>
          <span className="flex items-center gap-1">
            <Maximize className="h-3.5 w-3.5" aria-hidden />
            {property.sizeSqm} m²
          </span>
        </div>
        <div className="mt-3">
          <span className="text-lg font-bold text-brand">{formatJPY(property.price, locale)}</span>
          {isRent && <span className="text-xs text-muted">{t("properties.monthly")}</span>}
        </div>
      </div>
    </Link>
  );
}
