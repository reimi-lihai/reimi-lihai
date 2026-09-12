"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { PageBanner } from "@/components/PageBanner";
import { CheckinForm } from "@/components/checkin/CheckinForm";

export default function CheckinPage() {
  const { t } = useI18n();
  return (
    <>
      <PageBanner
        image="/images/hero/hero-otter-jp.png"
        eyebrow="Online check-in"
        title={t("checkin.title")}
        subtitle={t("checkin.lead")}
      />
      <div className="container-page py-8">
        <CheckinForm />
      </div>
    </>
  );
}
