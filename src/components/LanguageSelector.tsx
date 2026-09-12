"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Globe, ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/config";

/**
 * Language selector — shows the native language NAME (not just a flag) and
 * switches the whole UI instantly (no reload) via the i18n context.
 * `prominent` renders a larger pill for the hero first-view.
 */
export function LanguageSelector({
  prominent = false,
  align = "right",
}: {
  prominent?: boolean;
  align?: "left" | "right";
}) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(l: Locale) {
    setLocale(l);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("common.selectLanguage")}
        className={
          prominent
            ? "btn-gold shadow-gold"
            : "inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel/70 px-3 py-2 text-sm font-medium text-ink transition hover:border-brand/50"
        }
      >
        <Globe className="h-4 w-4" aria-hidden />
        <span>{LOCALE_META[locale].label}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <ul
          id={menuId}
          role="listbox"
          aria-label={t("common.language")}
          className={`absolute z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl glass p-1 shadow-glass ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {LOCALES.map((l) => {
            const active = l === locale;
            return (
              <li key={l} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => choose(l)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    active ? "bg-brand/10 font-semibold text-brand" : "text-ink hover:bg-brand/5"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="text-base">
                      {LOCALE_META[l].flag}
                    </span>
                    {LOCALE_META[l].label}
                  </span>
                  {active && <Check className="h-4 w-4" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
