"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { Check } from "lucide-react";

export function BookingStepper({ current }: { current: number }) {
  const { t } = useI18n();
  const steps = [t("booking.stepDates"), t("booking.stepGuest"), t("booking.stepPayment"), t("booking.stepDone")];
  return (
    <ol className="mb-8 flex items-center gap-2" aria-label="Booking steps">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                done ? "bg-brand text-white" : active ? "bg-brand/15 text-brand ring-2 ring-brand" : "bg-panel text-muted ring-1 ring-line"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={`hidden text-sm sm:inline ${active ? "font-semibold text-ink" : "text-muted"}`}>
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-line" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
