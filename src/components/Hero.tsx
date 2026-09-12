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

  return (
    <section className="relative overflow-hidden" aria-label="Hero">
      {/* Background carousel */}
      <div className="absolute inset-0 -z-10">
        <AnimatePresence mode="sync">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: reduce ? 1 : 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 1.1, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={SLIDES[index]}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>
        {/* Legibility scrim (stronger on the left where the copy sits) */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/85 via-brand-deep/45 to-brand-deep/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
      </div>

      {/* Prominent language selector — top of the first view */}
      <div className="container-page flex justify-end pt-4">
        <LanguageSelector prominent />
      </div>

      <div className="container-page grid min-h-[74vh] items-center py-10 sm:min-h-[78vh]">
        <motion.div
          className="max-w-2xl"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="chip gold-hairline bg-white/10 text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("home.heroBadge")}
          </span>

          <h1 className="mt-4 whitespace-pre-line font-serif text-4xl font-bold leading-tight text-white drop-shadow-sm sm:text-6xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg">
            {t("home.heroSubtitle")}
          </p>

          {/* First-view CTAs */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/stays" className="btn-gold">
              <Search className="h-4 w-4" aria-hidden />
              {t("common.searchStays")}
            </Link>
            <Link href="/properties" className="btn-outline border-white/50 !text-white hover:bg-white/10">
              <Building2 className="h-4 w-4" aria-hidden />
              {t("common.searchProperties")}
            </Link>
            <Link href="/contact" className="btn-outline border-white/50 !text-white hover:bg-white/10">
              <MessagesSquare className="h-4 w-4" aria-hidden />
              {t("common.consult")}
            </Link>
          </div>

          <div className="mt-4">
            <Link
              href="/stays"
              className="inline-flex items-center gap-1 text-sm font-semibold text-gold-soft hover:underline"
            >
              {t("common.startBooking")}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {/* Stat chips */}
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

      {/* Slide dots */}
      <div className="container-page -mt-2 flex justify-center gap-2 pb-6 sm:justify-start">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === index}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-gold" : "w-2 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
