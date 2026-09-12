"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { loadConfirmed, type ConfirmedBooking } from "@/lib/bookingStore";
import { formatDate, formatJPY } from "@/lib/format";
import { EmptyState } from "@/components/ui/states";
import { CheckCircle2, CalendarDays, Users, Copy, ClipboardCheck } from "lucide-react";

export default function ConfirmationPage() {
  const { t, locale } = useI18n();
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBooking(loadConfirmed());
    setReady(true);
  }, []);

  function copy() {
    if (!booking) return;
    navigator.clipboard?.writeText(booking.bookingNumber).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {}
    );
  }

  if (!ready) return <div className="container-page py-24" />;

  if (!booking) {
    return (
      <div className="container-page py-16">
        <EmptyState title={t("booking.emptyCart")}>
          <Link href="/stays" className="btn-primary mt-4">{t("booking.backToStays")}</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
          <CheckCircle2 className="h-9 w-9 text-brand" aria-hidden />
        </span>
        <h1 className="mt-5 font-serif text-3xl font-bold text-ink">{t("booking.completeTitle")}</h1>
        <p className="mt-2 text-muted">{t("booking.completeLead")}</p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl card p-6">
        <div className="flex flex-col items-center gap-2 rounded-xl bg-brand/5 p-5 text-center">
          <span className="text-sm text-muted">{t("booking.bookingNumber")}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold tracking-wide text-brand">{booking.bookingNumber}</span>
            <button type="button" onClick={copy} className="rounded-lg p-2 text-muted hover:bg-brand/10 hover:text-ink" aria-label="Copy">
              {copied ? <ClipboardCheck className="h-4 w-4 text-brand" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <Row label={t("booking.yourStay")} value={booking.accommodationName} />
          <Row
            label={<span className="flex items-center gap-1"><CalendarDays className="h-4 w-4 text-brand" aria-hidden />{t("booking.stepDates")}</span>}
            value={`${formatDate(booking.draft.checkIn, locale)} → ${formatDate(booking.draft.checkOut, locale)}`}
          />
          <Row
            label={<span className="flex items-center gap-1"><Users className="h-4 w-4 text-brand" aria-hidden />{t("common.guests")}</span>}
            value={t("booking.guestsCount", { adults: booking.draft.adults, children: booking.draft.children })}
          />
          <Row label={t("booking.fullName")} value={booking.guestName} />
          <Row label={t("booking.total")} value={<span className="font-bold text-brand">{formatJPY(booking.total, locale)}</span>} />
        </dl>

        <div className="mt-6 rounded-lg border border-gold/40 bg-gold-soft/15 p-3 text-sm text-brand-deep">
          {t("checkin.lead")}{" "}
          <Link href="/checkin" className="font-semibold underline">{t("nav.checkin")} →</Link>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/checkin" className="btn-primary">{t("nav.checkin")}</Link>
          <Link href="/stays" className="btn-outline">{t("booking.backToStays")}</Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/60 pb-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
