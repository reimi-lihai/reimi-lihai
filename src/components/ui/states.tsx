"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { AlertCircle, Inbox, Loader2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <h2 className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {lead ? <p className="mt-3 text-muted">{lead}</p> : null}
    </div>
  );
}

/** Small badge marking demo/sample content, per the brief. */
export function DemoBadge({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={`chip gold-hairline bg-gold-soft/30 text-brand-deep ${className}`}
      title={t("common.demoData")}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      {t("common.demo")}
    </span>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <Inbox className="h-8 w-8 text-brand" aria-hidden />
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function ErrorState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div
      className="card flex flex-col items-center gap-3 px-6 py-12 text-center"
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-crimson" aria-hidden />
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="text-sm text-muted">{children}</div> : null}
    </div>
  );
}
