"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { loc, formatJPY } from "@/lib/format";
import { Placeholder } from "./ui/Placeholder";
import { DemoBadge } from "./ui/states";
import { Star, Users, MapPin } from "lucide-react";
import type { Accommodation } from "@/lib/types";

export function AccommodationCard({
  stay,
  query = "",
}: {
  stay: Accommodation;
  query?: string;
}) {
  const { locale, t } = useI18n();
  return (
    <Link
      href={`/stays/${stay.slug}${query}`}
      className="card group flex flex-col transition-all hover:-translate-y-1 hover:shadow-glass focus-visible:-translate-y-1"
    >
      <div className="relative aspect-[4/3] w-full">
        <Placeholder
          src={stay.heroImage}
          alt={loc(stay.name, locale)}
          accent={stay.accent}
          className="h-full w-full"
        />
        <div className="absolute left-3 top-3">
          <DemoBadge />
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
          {stay.rating.toFixed(1)}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {loc(stay.area, locale)}
        </p>
        <h3 className="mt-1 font-serif text-lg font-bold text-ink group-hover:text-brand">
          {loc(stay.name, locale)}
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted">{loc(stay.summary, locale)}</p>
        <div className="mt-3 flex items-end justify-between">
          <p className="flex items-center gap-1 text-xs text-muted">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {t("stays.maxGuests", { n: stay.maxGuests })}
          </p>
          <p className="text-right">
            <span className="text-lg font-bold text-brand">{formatJPY(stay.pricePerNight, locale)}</span>
            <span className="text-xs text-muted">{t("common.perNight")}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
