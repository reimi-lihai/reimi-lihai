"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { loc, formatJPY } from "@/lib/format";
import { Placeholder } from "@/components/ui/Placeholder";
import { DemoBadge } from "@/components/ui/states";
import type { Property } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import { MapPin, Home, Maximize, CalendarClock, Check, CalendarSearch, MessagesSquare } from "lucide-react";

export function PropertyDetail({ property }: { property: Property }) {
  const { t, locale } = useI18n();
  const isRent = property.deal === "rent";

  return (
    <div className="container-page py-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Placeholder alt={loc(property.name, locale)} accent={property.accent} className="aspect-[16/10] w-full rounded-2xl" priority />
          <div className="absolute left-3 top-3"><DemoBadge /></div>
        </div>
        <div className="grid grid-rows-2 gap-3">
          <Placeholder alt="" accent={property.accent} className="hidden aspect-video w-full rounded-xl sm:block" label={t("common.demoData")} />
          <Placeholder alt="" accent={property.accent} className="hidden aspect-video w-full rounded-xl sm:block" label={t("common.demoData")} />
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-4 w-4" aria-hidden /> {loc(property.area, locale)}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-ink">{loc(property.name, locale)}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="chip">{isRent ? t("properties.rent") : t("properties.sale")}</span>
            {property.minpakuReady && <span className="chip gold-hairline bg-gold-soft/25">{t("properties.minpakuUse")}</span>}
          </div>

          <p className="mt-5 leading-relaxed text-ink/90">{loc(property.summary, locale)}</p>

          <h2 className="mt-8 font-serif text-xl font-bold text-ink">{t("properties.overview")}</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Spec icon={Home} label={t("properties.layout")} value={property.layout} />
            <Spec icon={Maximize} label={t("properties.area")} value={`${property.sizeSqm} m²`} />
            <Spec icon={MapPin} label={t("properties.address")} value={loc(property.address, locale)} />
            <Spec icon={CalendarClock} label={t("properties.built")} value={property.builtYear ? String(property.builtYear) : t("common.preparing")} />
          </dl>

          <h2 className="mt-8 font-serif text-xl font-bold text-ink">{t("properties.features")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {property.features.map((f, i) => (
              <li key={i} className="chip">{loc(f, locale)}</li>
            ))}
          </ul>

          <h2 className="mt-8 font-serif text-xl font-bold text-ink">{t("properties.highlights")}</h2>
          <ul className="mt-3 space-y-2">
            {property.highlights.map((h, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-ink/90">
                <Check className="h-4 w-4 text-brand" aria-hidden /> {loc(h, locale)}
              </li>
            ))}
          </ul>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <p className="text-sm text-muted">{isRent ? t("properties.rentPrice") : t("properties.price")}</p>
            <p className="mt-1">
              <span className="text-2xl font-bold text-brand">{formatJPY(property.price, locale)}</span>
              {isRent && <span className="text-sm text-muted">{t("properties.monthly")}</span>}
            </p>
            <div className="mt-4 space-y-2">
              <Link href={`/viewing?property=${property.id}`} className="btn-primary w-full">
                <CalendarSearch className="h-4 w-4" aria-hidden /> {t("properties.bookViewing")}
              </Link>
              <Link href="/contact?category=property" className="btn-outline w-full">
                <MessagesSquare className="h-4 w-4" aria-hidden /> {t("properties.consultManagement")}
              </Link>
            </div>
            <p className="mt-3 text-center text-xs text-muted">{t("common.demoData")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <Icon className="h-5 w-5 text-brand" aria-hidden />
      <div>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="text-sm font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}
