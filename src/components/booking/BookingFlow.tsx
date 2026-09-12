"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { loc, formatDate } from "@/lib/format";
import { computePrice } from "@/lib/pricing";
import { guestFormSchema } from "@/lib/validation";
import { saveConfirmed } from "@/lib/bookingStore";
import { BookingStepper } from "./BookingStepper";
import { PriceBreakdown } from "./PriceBreakdown";
import { PaymentForm } from "./PaymentForm";
import { ErrorState } from "@/components/ui/states";
import type { Accommodation, BookingDraft } from "@/lib/types";
import { CalendarDays, Users, XCircle, ArrowLeft, MessageCircle } from "lucide-react";

type Errors = Partial<Record<string, string>>;

export function BookingFlow({
  stay,
  draft,
  demo,
}: {
  stay: Accommodation;
  draft: BookingDraft;
  demo: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const plan = stay.plans.find((p) => p.id === draft.planId) ?? stay.plans[0];

  const [step, setStep] = useState<"guest" | "payment">("guest");
  const [guest, setGuest] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    arrivalTime: "",
    messagingId: "",
    notes: "",
    agree: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [processing, setProcessing] = useState(false);
  const [payStatus, setPayStatus] = useState<"idle" | "failed">("idle");

  const price = useMemo(
    () =>
      computePrice({
        pricePerNight: plan.pricePerNight,
        cleaningFee: stay.cleaningFee,
        checkIn: draft.checkIn,
        checkOut: draft.checkOut,
        adults: draft.adults,
        children: draft.children,
      }),
    [plan, stay.cleaningFee, draft]
  );

  function validateGuest(): boolean {
    const result = guestFormSchema.safeParse(guest);
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string;
      if (!next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return false;
  }

  function goPayment() {
    if (validateGuest()) {
      setStep("payment");
      setPayStatus("idle");
    }
  }

  async function pay(simulate: "success" | "failure") {
    setProcessing(true);
    setPayStatus("idle");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accommodationId: stay.id,
          planId: plan.id,
          checkIn: draft.checkIn,
          checkOut: draft.checkOut,
          adults: draft.adults,
          children: draft.children,
          guest: {
            fullName: guest.fullName,
            email: guest.email,
            phone: guest.phone,
            country: guest.country,
            messagingId: guest.messagingId,
          },
          simulate,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.status === "succeeded") {
        saveConfirmed({
          bookingNumber: data.bookingNumber,
          draft,
          accommodationName: loc(stay.name, locale),
          guestName: guest.fullName,
          email: guest.email,
          total: data.amount,
          currency: data.currency,
          createdAt: new Date().toISOString(),
          status: "confirmed",
        });
        router.push("/booking/confirmation");
      } else {
        setPayStatus("failed");
      }
    } catch {
      setPayStatus("failed");
    } finally {
      setProcessing(false);
    }
  }

  const err = (k: string) => (errors[k] ? t(errors[k] as string) : "");

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 font-serif text-3xl font-bold text-ink">{t("booking.title")}</h1>
      <BookingStepper current={step === "guest" ? 1 : 2} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {step === "guest" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goPayment();
              }}
              noValidate
            >
              <h2 className="mb-4 font-serif text-xl font-bold text-ink">{t("booking.guestInfo")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("booking.fullName")} required error={err("fullName")}>
                  <input className={`field ${errors.fullName ? "field-error" : ""}`} value={guest.fullName} onChange={(e) => setGuest({ ...guest, fullName: e.target.value })} autoComplete="name" />
                </Field>
                <Field label={t("booking.email")} required error={err("email")}>
                  <input type="email" className={`field ${errors.email ? "field-error" : ""}`} value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} autoComplete="email" />
                </Field>
                <Field label={t("booking.phone")} required error={err("phone")}>
                  <input type="tel" className={`field ${errors.phone ? "field-error" : ""}`} value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} autoComplete="tel" />
                </Field>
                <Field label={t("booking.country")} required error={err("country")}>
                  <input className={`field ${errors.country ? "field-error" : ""}`} value={guest.country} onChange={(e) => setGuest({ ...guest, country: e.target.value })} autoComplete="country-name" />
                </Field>
                <Field label={t("booking.arrivalTime")}>
                  <input type="time" className="field" value={guest.arrivalTime} onChange={(e) => setGuest({ ...guest, arrivalTime: e.target.value })} />
                </Field>
                <Field label={`${t("booking.messagingId")}（${t("common.optional")}）`}>
                  <input
                    className="field"
                    value={guest.messagingId}
                    placeholder={t("booking.messagingIdPlaceholder")}
                    onChange={(e) => setGuest({ ...guest, messagingId: e.target.value })}
                  />
                </Field>
              </div>
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand/5 p-2.5 text-xs text-muted">
                <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                {t("booking.messagingNote")}
              </p>
              <Field label={t("booking.notes")}>
                <textarea className="field min-h-24" value={guest.notes} placeholder={t("booking.notesPlaceholder")} onChange={(e) => setGuest({ ...guest, notes: e.target.value })} />
              </Field>

              <label className="mt-4 flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 accent-[rgb(var(--c-brand))]" checked={guest.agree} onChange={(e) => setGuest({ ...guest, agree: e.target.checked })} />
                <span className="text-ink/90">
                  {t("booking.agree")}（
                  <Link href="/terms" className="text-brand underline">{t("legal.termsTitle")}</Link>・
                  <Link href="/cancellation" className="text-brand underline">{t("legal.cancelTitle")}</Link>）
                </span>
              </label>
              {errors.agree && <p className="mt-1 text-sm text-crimson" role="alert">{t(errors.agree)}</p>}

              <button type="submit" className="btn-primary mt-6 w-full sm:w-auto">
                {t("booking.proceedPayment")}
              </button>
            </form>
          )}

          {step === "payment" && (
            <div>
              <button type="button" onClick={() => setStep("guest")} className="mb-4 inline-flex items-center gap-1 text-sm text-brand hover:underline">
                <ArrowLeft className="h-4 w-4" aria-hidden /> {t("common.back")}
              </button>

              {payStatus === "failed" && (
                <div className="mb-4">
                  <ErrorState title={t("payment.failureTitle")}>
                    <p>{t("payment.failureLead")}</p>
                  </ErrorState>
                </div>
              )}

              <PaymentForm amount={price.total} demo={demo} processing={processing} onPay={pay} />
            </div>
          )}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <h2 className="mb-3 font-serif text-lg font-bold text-ink">{t("booking.yourStay")}</h2>
            <p className="font-medium text-ink">{loc(stay.name, locale)}</p>
            <p className="text-sm text-muted">{loc(plan.name, locale)}</p>
            <div className="mt-3 space-y-1.5 text-sm text-muted">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand" aria-hidden />
                {formatDate(draft.checkIn, locale)} → {formatDate(draft.checkOut, locale)}
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" aria-hidden />
                {t("booking.guestsCount", { adults: draft.adults, children: draft.children })}
              </p>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <PriceBreakdown price={price} />
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-muted">
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              {t("common.demoData")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">
        {label} {required && <span className="text-crimson">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-crimson" role="alert">{error}</span>}
    </label>
  );
}
