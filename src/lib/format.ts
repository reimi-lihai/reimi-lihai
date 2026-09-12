import type { Locale } from "@/i18n/config";
import { INTL_LOCALE } from "@/i18n/config";
import type { Localized } from "./types";

/** Resolve a Localized value for the active locale, falling back to Japanese. */
export function loc(value: Localized, locale: Locale): string {
  return value[locale] ?? value.ja;
}

/** Format a JPY amount in the active UI locale. */
export function formatJPY(amount: number, locale: Locale): string {
  try {
    return new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `¥${amount.toLocaleString()}`;
  }
}

/** Format a date string (yyyy-mm-dd) in the active UI locale. */
export function formatDate(dateStr: string, locale: Locale): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  try {
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn + "T00:00:00").getTime();
  const b = new Date(checkOut + "T00:00:00").getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  const diff = Math.round((b - a) / 86400000);
  return diff > 0 ? diff : 0;
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDaysISO(dateStr: string, days: number): string {
  const d = new Date((dateStr || todayISO()) + "T00:00:00");
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
