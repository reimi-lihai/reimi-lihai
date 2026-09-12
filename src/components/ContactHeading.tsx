"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { SectionHeading } from "@/components/ui/states";

export function ContactHeading() {
  const { t } = useI18n();
  return <SectionHeading eyebrow="Contact" title={t("contact.title")} lead={t("contact.lead")} />;
}
