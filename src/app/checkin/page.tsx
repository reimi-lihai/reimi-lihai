"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { SectionHeading } from "@/components/ui/states";
import { CheckinForm } from "@/components/checkin/CheckinForm";

export default function CheckinPage() {
  const { t } = useI18n();
  return (
    <div className="container-page py-10">
      <SectionHeading eyebrow="Online check-in" title={t("checkin.title")} lead={t("checkin.lead")} />
      <div className="mt-6">
        <CheckinForm />
      </div>
    </div>
  );
}
