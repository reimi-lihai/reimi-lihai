"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { Compass } from "lucide-react";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="container-page py-24 text-center">
      <Compass className="mx-auto h-14 w-14 text-brand" aria-hidden />
      <h1 className="mt-5 font-serif text-4xl font-bold text-ink">404</h1>
      <p className="mt-2 text-lg font-medium text-ink">{t("errors.notFound")}</p>
      <p className="mt-1 text-muted">{t("errors.notFoundLead")}</p>
      <Link href="/" className="btn-primary mt-6">{t("errors.backHome")}</Link>
    </div>
  );
}
