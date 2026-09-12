"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Reusable page hero banner: a rounded image with a legibility scrim and an
 * overlaid title/subtitle. Responsive and animated (respects reduced motion).
 */
export function PageBanner({
  image,
  title,
  subtitle,
  eyebrow,
}: {
  image: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="container-page pt-4">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl shadow-glass ring-1 ring-line"
      >
        <div className="relative aspect-[16/9] w-full sm:aspect-[21/9] lg:aspect-[3/1]">
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/85 via-brand-deep/45 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center p-5 sm:p-8 lg:p-10">
            {eyebrow ? (
              <span className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-soft">
                {eyebrow}
              </span>
            ) : null}
            <h1 className="max-w-2xl font-serif text-2xl font-bold leading-tight text-white drop-shadow sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
