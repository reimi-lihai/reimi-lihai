export const LOCALES = ["ja", "en", "zh-Hant", "zh-Hans", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ja";

/** Human-readable names shown in the language selector (native names, not just flags). */
export const LOCALE_META: Record<Locale, { label: string; flag: string; htmlLang: string }> = {
  ja: { label: "日本語", flag: "🇯🇵", htmlLang: "ja" },
  en: { label: "English", flag: "🇺🇸", htmlLang: "en" },
  "zh-Hant": { label: "繁體中文", flag: "🇹🇼", htmlLang: "zh-Hant" },
  "zh-Hans": { label: "简体中文", flag: "🇨🇳", htmlLang: "zh-Hans" },
  ko: { label: "한국어", flag: "🇰🇷", htmlLang: "ko" },
};

export const STORAGE_KEY = "reikai.locale";

/** Currency + number formatting locale used by Intl for each UI language. */
export const INTL_LOCALE: Record<Locale, string> = {
  ja: "ja-JP",
  en: "en-US",
  "zh-Hant": "zh-Hant-TW",
  "zh-Hans": "zh-Hans-CN",
  ko: "ko-KR",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Best-effort detection from the browser's Accept-Language / navigator.language. */
export function detectLocale(candidate: string | null | undefined): Locale {
  if (!candidate) return DEFAULT_LOCALE;
  const c = candidate.toLowerCase();
  if (c.startsWith("ja")) return "ja";
  if (c.startsWith("ko")) return "ko";
  if (c.startsWith("zh")) {
    if (c.includes("tw") || c.includes("hk") || c.includes("hant")) return "zh-Hant";
    return "zh-Hans";
  }
  if (c.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}
