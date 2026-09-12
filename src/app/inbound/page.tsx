"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { SectionHeading } from "@/components/ui/states";
import { Reveal } from "@/components/ui/Reveal";
import { Stethoscope, Sparkles, FileText, Home, ShieldAlert, ArrowRight } from "lucide-react";

export default function InboundPage() {
  const { t } = useI18n();
  const services = [
    { icon: Stethoscope, t: t("inbound.s1t"), b: t("inbound.s1b") },
    { icon: Sparkles, t: t("inbound.s2t"), b: t("inbound.s2b") },
    { icon: FileText, t: t("inbound.s3t"), b: t("inbound.s3b") },
    { icon: Home, t: t("inbound.s4t"), b: t("inbound.s4b") },
  ];
  const steps = [t("inbound.how1"), t("inbound.how2"), t("inbound.how3"), t("inbound.how4")];

  return (
    <div className="container-page py-10">
      <SectionHeading eyebrow="Inbound support" title={t("inbound.title")} lead={t("inbound.lead")} />

      {/* Safety disclaimer — prominent, per requirement */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-gold/50 bg-gold-soft/15 p-4 text-sm text-brand-deep">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
        <p>{t("inbound.disclaimer")}</p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {services.map((s, i) => (
          <Reveal key={s.t} delay={i * 0.05}>
            <div className="card h-full p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10">
                <s.icon className="h-5 w-5 text-brand" aria-hidden />
              </span>
              <h2 className="mt-4 font-serif text-lg font-bold text-ink">{s.t}</h2>
              <p className="mt-2 text-sm text-muted">{s.b}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <h2 className="mt-12 font-serif text-xl font-bold text-ink">{t("inbound.howTitle")}</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={i} className="card p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
            <p className="mt-3 text-sm text-ink">{s}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-2xl bg-gradient-to-br from-brand-deep to-brand p-8 text-center text-white">
        <p className="mx-auto max-w-xl">{t("inbound.lead")}</p>
        <Link href="/contact?category=inbound" className="btn-gold mt-5">
          {t("inbound.cta")} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
