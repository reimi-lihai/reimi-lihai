"use client";

/**
 * Real card payment with Stripe Payment Element.
 * The PaymentIntent (and its amount) is created on the server by
 * POST /api/v1/reservations; this component only confirms it. The booking is
 * confirmed by the Stripe webhook, and we poll the status endpoint until then.
 */
import { useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Lock, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatJPY } from "@/lib/format";

let stripePromise: Promise<Stripe | null> | null = null;
const getStripeJs = (pk: string) => (stripePromise ??= loadStripe(pk));

const STRIPE_LOCALE: Record<string, "ja" | "en" | "zh-TW" | "zh" | "ko"> = {
  ja: "ja",
  en: "en",
  "zh-Hant": "zh-TW",
  "zh-Hans": "zh",
  ko: "ko",
};

export function StripePayment(props: {
  publishableKey: string;
  clientSecret: string;
  amount: number;
  code: string;
  statusToken: string;
  onConfirmed: () => void;
  onFailed: (message?: string) => void;
}) {
  const { locale } = useI18n();
  const stripe = useMemo(() => getStripeJs(props.publishableKey), [props.publishableKey]);
  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret: props.clientSecret,
        locale: STRIPE_LOCALE[locale] ?? "auto",
        appearance: {
          theme: "stripe",
          variables: { colorPrimary: "#146cd6", colorText: "#0f203c", borderRadius: "10px", fontFamily: "system-ui, sans-serif" },
        },
      }}
    >
      <Inner {...props} />
    </Elements>
  );
}

async function waitForConfirmation(code: string, token: string, timeoutMs = 25_000): Promise<boolean> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const res = await fetch(`/api/v1/reservations/status?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null);
    const j = await res?.json().catch(() => null);
    if (j?.status === "confirmed") return true;
    if (j?.status === "cancelled") return false;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

function Inner({ amount, code, statusToken, onConfirmed, onFailed }: Parameters<typeof StripePayment>[0]) {
  const { t, locale } = useI18n();
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState<"idle" | "paying" | "confirming">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy("paying");
    setMessage(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/payment/result?code=${encodeURIComponent(code)}&token=${encodeURIComponent(statusToken)}`,
      },
    });
    if (error) {
      setBusy("idle");
      setMessage(error.message ?? null);
      onFailed(error.message);
      return;
    }
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      setBusy("confirming");
      const ok = await waitForConfirmation(code, statusToken);
      // Payment went through even if the webhook is slow; the confirmation page shows the booking number either way.
      if (ok || paymentIntent.status === "succeeded") onConfirmed();
      else onFailed();
      return;
    }
    setBusy("idle");
    onFailed();
  };

  return (
    <form onSubmit={submit} className="card p-5">
      <PaymentElement options={{ layout: "tabs" }} />
      {message && (
        <p className="mt-3 text-sm text-crimson" role="alert">
          {message}
        </p>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <Lock className="h-3.5 w-3.5" aria-hidden /> {t("payment.securityNote")}
      </p>
      <button type="submit" disabled={!stripe || busy !== "idle"} className="btn-primary mt-5 w-full">
        {busy !== "idle" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {busy === "confirming" ? t("payment.confirming") : busy === "paying" ? t("booking.processing") : t("payment.payReal", { amount: formatJPY(amount, locale) })}
      </button>
    </form>
  );
}
