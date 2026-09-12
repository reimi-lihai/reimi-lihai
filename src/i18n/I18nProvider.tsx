"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  INTL_LOCALE,
  LOCALE_META,
  STORAGE_KEY,
  detectLocale,
  isLocale,
  type Locale,
} from "./config";
import { dictionaries, ja } from "./dictionaries";

type Vars = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate by dot-path key, e.g. t("home.heroTitle"). Falls back to Japanese, then the key. */
  t: (key: string, vars?: Vars) => string;
  /** Locale used by Intl for currency/number/date formatting. */
  intlLocale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function lookup(dict: unknown, path: string[]): unknown {
  return path.reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`
  );
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // On mount, restore from localStorage; else fall back to browser language.
  useEffect(() => {
    let restored: Locale | null = null;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(saved)) restored = saved;
    } catch {
      /* storage may be blocked (private mode) — ignore and use default */
    }
    if (!restored && typeof navigator !== "undefined") {
      restored = detectLocale(navigator.language);
    }
    if (restored && restored !== locale) setLocaleState(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang> and persisted value in sync with the active locale.
  useEffect(() => {
    try {
      document.documentElement.lang = LOCALE_META[locale].htmlLang;
    } catch {
      /* noop */
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* storage blocked — selection simply won't persist */
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const path = key.split(".");
      const active = lookup(dictionaries[locale], path);
      if (typeof active === "string") return interpolate(active, vars);
      // Fallback chain: active locale -> Japanese -> the key itself.
      const fallback = lookup(ja, path);
      if (typeof fallback === "string") return interpolate(fallback, vars);
      return key;
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, intlLocale: INTL_LOCALE[locale] }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

/** Convenience hook returning just the translate function. */
export function useT() {
  return useI18n().t;
}
