"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { primaryNav } from "@/lib/nav";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";
import { X, ChevronRight } from "lucide-react";

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();

  // Close on route change.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label={t("common.menu")}>
      <div className="absolute inset-0 bg-brand-deep/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm animate-fade-up flex-col glass p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-serif font-bold text-ink">{t("common.menu")}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-brand/10 hover:text-ink"
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <LanguageSelector align="left" />
          <ThemeToggle />
        </div>

        <nav className="flex flex-col" aria-label="Mobile">
          {primaryNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-3 text-base transition ${
                  active ? "bg-brand/10 font-semibold text-brand" : "text-ink hover:bg-brand/5"
                }`}
              >
                {t(item.key)}
                <ChevronRight className="h-4 w-4 opacity-50" aria-hidden />
              </Link>
            );
          })}
        </nav>

        <Link href="/stays" onClick={onClose} className="btn-primary mt-4 w-full">
          {t("common.startBooking")}
        </Link>
      </div>
    </div>
  );
}
