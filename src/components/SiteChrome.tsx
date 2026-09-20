"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Hides the marketing-site chrome (header, footer, tab bar, chat launcher) on
 * standalone app-like screens such as the guest smart-key page (/key/*), which
 * is opened from a QR code on the guest's phone and should feel like its own app.
 */
const STANDALONE_PREFIXES = ["/key", "/admin"];

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const standalone = STANDALONE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (standalone) return null;
  return <>{children}</>;
}
