"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { Hero } from "@/components/Hero";
import { SearchBookingForm } from "@/components/SearchBookingForm";
import { AccommodationCard } from "@/components/AccommodationCard";
import { PropertyCard } from "@/components/PropertyCard";
import { SectionHeading } from "@/components/ui/states";
import { Reveal } from "@/components/ui/Reveal";
import { FAQ } from "@/components/FAQ";
import type { Accommodation, Property } from "@/lib/types";
import {
  ArrowRight,
  Waves,
  Languages,
  ShieldCheck,
  CreditCard,
  Search,
  MousePointerClick,
  KeyRound,
  Sparkles,
  Building2,
  Stethoscope,
  Ship,
} from "lucide-react";

export function HomeView({
  stays,
  props,
}: {
  stays: Accommodation[];
  props: Property[];
}) {
  const { t } = useI18n();

  const values = [
    { icon: Waves, t: t("values.v1t"), b: t("values.v1b") },
    { icon: Languages, t: t("values.v2t"), b: t("values.v2b") },
    { icon: CreditCard, t: t("values.v3t"), b: t("values.v3b") },
    { icon: ShieldCheck, t: t("values.v4t"), b: t("values.v4b") },
  ];
  const flow = [
    { icon: Search, t: t("flow.s1t"), b: t("flow.s1b") },
    { icon: MousePointerClick, t: t("flow.s2t"), b: t("flow.s2b") },
    { icon: CreditCard, t: t("flow.s3t"), b: t("flow.s3b") },
    { icon: KeyRound, t: t("flow.s4t"), b: t("flow.s4b") },
  ];

  return (
    <>
      <Hero />

      {/* Search + about intro */}
      <section className="container-page -mt-4 pb-4" aria-label={t("home.searchTitle")}>
        <Reveal>
          <div className="mb-4">
            <SectionHeading eyebrow={t("home.heroBadge")} title={t("home.searchTitle")} lead={t("home.searchLead")} />
          </div>
          <SearchBookingForm />
        </Reveal>
      </section>

      {/* About */}
      <section className="container-page py-14">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow="About" title={t("home.aboutTitle")} lead={t("home.aboutBody")} />
            <Link href="/company" className="btn-outline mt-5">
              {t("home.aboutLink")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-3">
              {values.map((v) => (
                <div key={v.t} className="card p-4">
                  <v.icon className="h-6 w-6 text-brand" aria-hidden />
                  <p className="mt-2 text-sm font-semibold text-ink">{v.t}</p>
                  <p className="mt-1 text-xs text-muted">{v.b}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Featured stays */}
      <section className="container-page py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Stays" title={t("home.featuredStays")} lead={t("home.featuredStaysLead")} />
          <Link href="/stays" className="hidden shrink-0 text-sm font-semibold text-brand hover:underline sm:inline">
            {t("home.viewAllStays")} →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stays.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.05}>
              <AccommodationCard stay={s} />
            </Reveal>
          ))}
        </div>
        <div className="mt-6 sm:hidden">
          <Link href="/stays" className="btn-outline w-full">
            {t("home.viewAllStays")}
          </Link>
        </div>
      </section>

      {/* Real estate */}
      <section className="container-page py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Real estate" title={t("home.realestateTitle")} lead={t("home.realestateLead")} />
          <Link href="/properties" className="hidden shrink-0 text-sm font-semibold text-brand hover:underline sm:inline">
            {t("home.viewAllProps")} →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {props.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.05}>
              <PropertyCard property={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Inbound teaser */}
      <section className="container-page py-8">
        <Reveal>
          <div className="card relative overflow-hidden p-8 sm:p-10">
            <div className="absolute inset-0 -z-10 bg-kumiko opacity-60" aria-hidden />
            <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
              <div>
                <SectionHeading eyebrow="Inbound" title={t("home.inboundTitle")} lead={t("home.inboundLead")} />
                <Link href="/inbound" className="btn-primary mt-5">
                  {t("inbound.cta")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[Stethoscope, Sparkles, Building2].map((Icon, i) => (
                  <div key={i} className="flex aspect-square items-center justify-center rounded-xl bg-brand/10">
                    <Icon className="h-7 w-7 text-brand" aria-hidden />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Synergy */}
      <section className="container-page py-14">
        <SectionHeading align="center" eyebrow="Synergy" title={t("home.synergyTitle")} lead={t("home.synergyLead")} />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: KeyRound, k: "nav.stays" },
            { icon: Building2, k: "nav.properties" },
            { icon: Ship, k: "nav.inbound" },
          ].map((c, i) => (
            <Reveal key={c.k} delay={i * 0.06}>
              <div className="card flex items-center gap-3 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10">
                  <c.icon className="h-5 w-5 text-brand" aria-hidden />
                </span>
                <span className="font-semibold text-ink">{t(c.k)}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Flow */}
      <section className="container-page py-8">
        <SectionHeading align="center" eyebrow="How it works" title={t("home.flowTitle")} />
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {flow.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.06} as="li">
              <div className="card h-full p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <s.icon className="h-5 w-5 text-brand" aria-hidden />
                </div>
                <p className="mt-3 font-semibold text-ink">{s.t}</p>
                <p className="mt-1 text-sm text-muted">{s.b}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="container-page py-14">
        <SectionHeading align="center" title={t("home.faqTitle")} />
        <div className="mt-8">
          <FAQ />
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-deep to-brand p-8 text-center text-white sm:p-14">
          <div className="absolute inset-0 -z-0 opacity-20 bg-kumiko" aria-hidden />
          <div className="relative">
            <h2 className="font-serif text-2xl font-bold sm:text-3xl">{t("home.ctaTitle")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/90">{t("home.ctaLead")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/stays" className="btn-gold">
                {t("common.searchStays")}
              </Link>
              <Link href="/contact" className="btn-outline border-white/50 !text-white hover:bg-white/10">
                {t("nav.contact")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
