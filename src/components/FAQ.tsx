"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const ITEMS = ["1", "2", "3", "4", "5"];

export function FAQ() {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>("1");

  return (
    <div className="mx-auto max-w-3xl divide-y divide-line/70 rounded-2xl glass">
      {ITEMS.map((i) => {
        const expanded = open === i;
        return (
          <div key={i}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-ink">{t(`faq.q${i}`)}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-brand transition ${expanded ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            </h3>
            {expanded && <div className="px-5 pb-5 text-sm text-muted">{t(`faq.a${i}`)}</div>}
          </div>
        );
      })}
    </div>
  );
}
