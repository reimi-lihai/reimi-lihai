"use client";

import Image from "next/image";
import { useI18n } from "@/i18n/I18nProvider";
import { SectionHeading } from "@/components/ui/states";
import { Reveal } from "@/components/ui/Reveal";
import { Building2, User, CalendarDays, MapPin, Briefcase } from "lucide-react";

export default function CompanyPage() {
  const { t } = useI18n();

  // Company facts come straight from the official record — do not alter.
  const rows = [
    { icon: Building2, label: t("company.tradeName"), value: t("company.values.tradeName") },
    { icon: Building2, label: t("company.tradeNameEn"), value: t("company.values.tradeNameEn") },
    { icon: MapPin, label: t("company.address"), value: t("company.values.address") },
    { icon: User, label: t("company.ceo"), value: t("company.values.ceo") },
    { icon: CalendarDays, label: t("company.established"), value: t("company.values.established") },
    { icon: Briefcase, label: t("company.mainBusiness"), value: t("company.values.mainBusiness") },
  ];

  return (
    <div className="container-page py-10">
      <SectionHeading eyebrow="Company" title={t("company.title")} lead={t("company.lead")} />

      {/* Brand concept */}
      <Reveal>
        <div className="mt-8 grid items-center gap-6 rounded-2xl bg-gradient-to-br from-brand-deep to-brand p-8 text-white sm:grid-cols-[auto_1fr]">
          <div className="inline-block overflow-hidden rounded-xl bg-white/95 p-3">
            <Image src="/images/logo.png" alt="株式会社麗海 REIMI Co., Ltd." width={200} height={104} className="h-14 w-auto object-contain" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gold-soft">{t("company.conceptTitle")}</p>
            <p className="mt-2 font-serif text-2xl font-bold">{t("brand.concept")}</p>
            <p className="mt-3 text-white/85">{t("brand.message")}</p>
          </div>
        </div>
      </Reveal>

      {/* Corporate info table */}
      <div className="mt-8 card overflow-hidden">
        <dl className="divide-y divide-line/70">
          {rows.map((r) => (
            <div key={r.label} className="grid gap-1 px-5 py-4 sm:grid-cols-[220px_1fr] sm:gap-4">
              <dt className="flex items-center gap-2 text-sm font-semibold text-muted">
                <r.icon className="h-4 w-4 text-brand" aria-hidden />
                {r.label}
              </dt>
              <dd className="text-ink">{r.value}</dd>
            </div>
          ))}
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-[220px_1fr] sm:gap-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Briefcase className="h-4 w-4 text-brand" aria-hidden />
              {t("company.business")}
            </dt>
            <dd className="text-ink">{t("company.values.business")}</dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-[220px_1fr] sm:gap-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Briefcase className="h-4 w-4 text-brand" aria-hidden />
              {t("company.otherPurposes")}
            </dt>
            <dd>
              <ul className="list-inside list-disc space-y-1 text-ink">
                <li>{t("company.values.p1")}</li>
                <li>{t("company.values.p2")}</li>
                <li>{t("company.values.p3")}</li>
              </ul>
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 text-sm text-muted">{t("common.preparing")}：{t("common.contactUs")}</p>
    </div>
  );
}
