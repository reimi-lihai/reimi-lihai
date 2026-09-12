"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";
import { primaryNav } from "@/lib/nav";
import { useI18n } from "@/i18n/I18nProvider";
import { Menu } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-surface/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {primaryNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "text-brand" : "text-ink/80 hover:text-brand"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {/* Language selector — always visible & easy to reach */}
          <LanguageSelector />
          <Link href="/stays" className="btn-primary hidden md:inline-flex">
            {t("common.startBooking")}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-line bg-panel/70 p-2 text-ink lg:hidden"
            aria-label={t("common.menu")}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
