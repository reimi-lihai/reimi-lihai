"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Building2, BedDouble, ShieldCheck, MessageCircle } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { chatStore, useChat } from "@/lib/chat/store";

/**
 * Mobile / tablet bottom navigation (hidden on lg+).
 * Booking (宿泊予約) is the centered, elevated primary action.
 * Chat lives here on mobile (the floating launcher is desktop-only), so there
 * is exactly one chat entry point per breakpoint.
 */
export function MobileTabBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { unread } = useChat();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  const left = [
    { href: "/", labelKey: "nav.home", icon: Home },
    { href: "/properties", labelKey: "nav.properties", icon: Building2 },
  ];
  const right = [
    { href: "/checkin", labelKey: "nav.checkin", icon: ShieldCheck },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[60] lg:hidden"
      aria-label="Mobile primary"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end border-t border-line/70 bg-surface/90 px-1 pt-1 backdrop-blur-xl">
        {left.map((item) => (
          <TabItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        {/* Center: primary booking action */}
        <div className="relative flex justify-center">
          <Link
            href="/stays"
            aria-label={t("common.startBooking")}
            className="group -mt-6 flex flex-col items-center"
          >
            <motion.span
              whileTap={{ scale: 0.9 }}
              className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glass ring-4 ring-surface"
              style={{ backgroundImage: "linear-gradient(135deg, rgb(var(--c-brand-deep)), rgb(var(--c-brand)))" }}
            >
              <BedDouble className="h-6 w-6" aria-hidden />
            </motion.span>
            <span className="mt-0.5 text-[10px] font-semibold text-brand">
              {t("nav.stays")}
            </span>
          </Link>
        </div>

        {right.map((item) => (
          <TabItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        {/* Chat */}
        <button
          type="button"
          onClick={() => chatStore.open()}
          className="relative flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-muted transition active:scale-95"
          aria-label={t("chat.launcher")}
        >
          <span className="relative">
            <MessageCircle className="h-5 w-5" aria-hidden />
            {unread > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium leading-none">{t("chat.launcher")}</span>
        </button>
      </div>
    </nav>
  );
}

function TabItem({
  href,
  labelKey,
  icon: Icon,
  active,
}: {
  href: string;
  labelKey: string;
  icon: typeof Home;
  active: boolean;
}) {
  const { t } = useI18n();
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 transition active:scale-95 ${
        active ? "text-brand" : "text-muted"
      }`}
    >
      {active && (
        <motion.span
          layoutId="tab-indicator"
          className="absolute -top-1 h-1 w-8 rounded-full bg-brand"
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      )}
      <Icon className="h-5 w-5" aria-hidden />
      <span className="text-[10px] font-medium leading-none">{t(labelKey)}</span>
    </Link>
  );
}
