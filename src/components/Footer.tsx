"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/i18n/I18nProvider";
import { MapPin } from "lucide-react";

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: t("footer.services"),
      links: [
        { href: "/stays", label: t("nav.stays") },
        { href: "/properties", label: t("nav.properties") },
        { href: "/inbound", label: t("nav.inbound") },
        { href: "/checkin", label: t("nav.checkin") },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { href: "/company", label: t("nav.company") },
        { href: "/contact", label: t("nav.contact") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { href: "/privacy", label: t("legal.privacyTitle") },
        { href: "/terms", label: t("legal.termsTitle") },
        { href: "/cancellation", label: t("legal.cancelTitle") },
      ],
    },
  ];

  return (
    <footer className="mt-20 border-t border-line/70 bg-panel/40">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-3 inline-block overflow-hidden rounded-lg bg-white/90 p-2 ring-1 ring-line">
            <Image
              src="/images/logo.png"
              alt="株式会社麗海 REIKAI Co., Ltd."
              width={180}
              height={94}
              className="h-10 w-auto object-contain"
            />
          </div>
          <p className="max-w-xs text-sm text-muted">{t("footer.tagline")}</p>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span>
              {t("brand.name")}（{t("brand.nameEn")}）
              <br />
              {t("footer.address")}
            </span>
          </p>
        </div>

        {cols.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="mb-3 text-sm font-semibold text-ink">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted transition hover:text-brand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line/70">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted sm:flex-row">
          <p>
            © {year} {t("brand.name")}（{t("brand.nameEn")}）. {t("footer.rights")}
          </p>
          <p className="font-serif italic text-brand">{t("brand.message")}</p>
        </div>
      </div>
    </footer>
  );
}
