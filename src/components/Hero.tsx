"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSelector } from "./LanguageSelector";
import { Search, Building2, MessagesSquare, Sparkles, ChevronRight } from "lucide-react";

const SLIDES = [
  "/images/hero/hero-otter-jp.png",
  "/images/hero/hero-family-departures-jp.png",
  "/images/hero/hero-family-run-jp.png",
  "/images/hero/hero-family-airport-jp.png",
];

export function Hero() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6500);
    return () => clearInterval(id);
  }, [reduce]);

  const badge = (
    <span className="chip gold-hairline bg-white/10 text-white backdrop-blur lg:bg-white/10">
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      {t("home.heroBadge")}
    </span>
  );

  const ctas = (variant: "light" | "onImage") => (
    <>
      <Link href="/stays" className="btn-gold w-full sm:w-auto">
        <Search className="h-4 w-4" aria-hidden />
        {t("common.searchStays")}
      </Link>
      <Link
        href="/properties"
        className={
          variant === "onImage"
            ? "btn-outline w-full border-white/50 !text-white hover:bg-white/10 sm:w-auto"
            : "btn-outline w-full sm:w-auto"
        }
      >
        <Building2 className="h-4 w-4" aria-hidden />
        {t("common.searchProperties")}
      </Link>
      <Link
        href="/contact"
        className={
          variant === "onImage"
            ? "btn-outline w-full border-white/50 !text-white hover:bg-white/10 sm:w-auto"
            : "btn-outline w-full sm:w-auto"
        }
      >
        <MessagesSquare className="h-4 w-4" aria-hidden />
        {t("common.consult")}
      </Link>
    </>
  );

  const dots = (
    <div className="flex justify-center gap-2 lg:justify-start">
      {SLIDES.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setIndex(i)}
          aria-label={`Slide ${i + 1}`}
          aria-current={i === index}
          className={`h-2 rounded-full transition-all ${
            i === index ? "w-6 bg-gold" : "w-2 bg-brand/30 hover:bg-brand/60 lg:bg-white/50 lg:hover:bg-white/80"
          }`}
        />
      ))}
    </div>
  );

  const slideImage = (priority: boolean) => (
    <AnimatePresence mode="sync">
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: reduce ? 1 : 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 1, ease: "easeInOut" }}
        className="absolute inset-0"
      >
        <Image
          src={SLIDES[index]}
          alt=""
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <section aria-label="Hero">
      {/* ================= MOBILE / TABLET (stacked, no over-zoom) ================= */}
      <div className="lg:hidden">
        {/* Banner shown in its native 16:9 frame → whole image visible, not zoomed */}
        <div className="container-page mt-3">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-glass ring-1 ring-line">
            {slideImage(true)}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-deep/70 to-transparent p-3">
              {dots}
            </div>
          </div>
        </div>

        {/* Copy + CTAs on a clean surface below the image */}
        <motion.div
          className="container-page pt-5"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="chip gold-hairline bg-gold-soft/25 text-brand-deep">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("home.heroBadge")}
          </span>
          <h1 className="mt-3 whitespace-pre-line font-serif text-3xl font-bold leading-tight text-ink">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{t("home.heroSubtitle")}</p>

          <div className="mt-5 flex flex-col gap-2.5">{ctas("light")}</div>

          <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              { n: "6+", l: t("home.heroStat1") },
              { n: "5", l: t("home.heroStat2") },
              { n: "100%", l: t("home.heroStat3") },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-brand/5 py-3">
                <dt className="text-xl font-bold text-brand">{s.n}</dt>
                <dd className="mt-0.5 text-[11px] text-muted">{s.l}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>

      {/* ===================== DESKTOP (full-bleed overlay) ===================== */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 -z-10">
          {slideImage(true)}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/85 via-brand-deep/45 to-brand-deep/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        </div>

        <div className="container-page flex justify-end pt-4">
          <LanguageSelector prominent />
        </div>

        <div className="container-page grid min-h-[74vh] items-center py-10">
          <motion.div
            className="max-w-2xl"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {badge}
            <h1 className="mt-4 whitespace-pre-line font-serif text-6xl font-bold leading-tight text-white drop-shadow-sm">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/90">{t("home.heroSubtitle")}</p>

            <div className="mt-7 flex flex-wrap gap-3">{ctas("onImage")}</div>

            <div className="mt-4">
              <Link href="/stays" className="inline-flex items-center gap-1 text-sm font-semibold text-gold-soft hover:underline">
                {t("common.startBooking")}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-white">
              {[
                { n: "6+", l: t("home.heroStat1") },
                { n: "5", l: t("home.heroStat2") },
                { n: "100%", l: t("home.heroStat3") },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="text-2xl font-bold text-gold-soft">{s.n}</dt>
                  <dd className="text-xs text-white/80">{s.l}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>

        <div className="container-page -mt-2 pb-6">{dots}</div>
      </div>
    </section>
  );
}
