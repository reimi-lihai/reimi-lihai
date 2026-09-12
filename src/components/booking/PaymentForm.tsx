"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatJPY } from "@/lib/format";
import { CreditCard, Lock, Info, CheckCircle2, XCircle } from "lucide-react";

/**
 * Demo payment form. In demo mode it never contacts a real card network; the
 * "simulate success/failure" buttons drive the outcome so the whole flow can be
 * exercised. The parent calls the server (/api/checkout) which recomputes the
 * authoritative amount — this component never sends an amount.
 *
 * For production, swap the card fields for Stripe Elements / Payment Element and
 * confirm with the client_secret returned by the checkout API.
 */
export function PaymentForm({
  amount,
  demo,
  processing,
  onPay,
}: {
  amount: number;
  demo: boolean;
  processing: boolean;
  onPay: (simulate: "success" | "failure") => void;
}) {
  const { t, locale } = useI18n();
  const [card, setCard] = useState({ name: "", number: "", exp: "", cvc: "" });

  return (
    <div>
      {demo && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-gold/50 bg-gold-soft/20 p-3 text-sm text-brand-deep">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t("payment.demoBanner")}
        </p>
      )}

      <div className="card p-5">
        <p className="mb-4 flex items-center gap-2 font-semibold text-ink">
          <CreditCard className="h-5 w-5 text-brand" aria-hidden /> {t("payment.title")}
        </p>

        <div className="grid gap-3">
          <label className="block">
            <span className="field-label">{t("payment.cardName")}</span>
            <input className="field" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} autoComplete="cc-name" placeholder="TARO YAMADA" />
          </label>
          <label className="block">
            <span className="field-label">{t("payment.cardNumber")}</span>
            <input className="field" value={card.number} inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" onChange={(e) => setCard({ ...card, number: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">{t("payment.expiry")}</span>
              <input className="field" value={card.exp} placeholder="MM / YY" autoComplete="cc-exp" onChange={(e) => setCard({ ...card, exp: e.target.value })} />
            </label>
            <label className="block">
              <span className="field-label">{t("payment.cvc")}</span>
              <input className="field" value={card.cvc} inputMode="numeric" autoComplete="cc-csc" placeholder="123" onChange={(e) => setCard({ ...card, cvc: e.target.value })} />
            </label>
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Lock className="h-3.5 w-3.5" aria-hidden /> {t("payment.securityNote")}
        </p>

        {demo ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={processing} onClick={() => onPay("success")} className="btn-primary">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {processing ? t("booking.processing") : t("payment.simulateSuccess")}
            </button>
            <button type="button" disabled={processing} onClick={() => onPay("failure")} className="btn-outline !text-crimson" style={{ borderColor: "rgb(var(--c-crimson) / 0.4)" }}>
              <XCircle className="h-4 w-4" aria-hidden />
              {t("payment.simulateFailure")}
            </button>
          </div>
        ) : (
          <button type="button" disabled={processing} onClick={() => onPay("success")} className="btn-primary mt-5 w-full">
            {processing ? t("booking.processing") : t("payment.payReal", { amount: formatJPY(amount, locale) })}
          </button>
        )}
        {demo && <p className="mt-3 text-center text-xs text-muted">{t("payment.stripeReady")}</p>}
      </div>
    </div>
  );
}
