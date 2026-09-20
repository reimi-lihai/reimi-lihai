"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";

/**
 * Standalone payment-result page. Useful for redirect-based flows (e.g. a real
 * Stripe redirect returning ?status=success|failed|canceled). The in-app demo
 * flow resolves inline, but this route is here for completeness.
 */
function ResultInner() {
  const { t } = useI18n();
  const sp = useSearchParams();
  const code = sp.get("code");
  const token = sp.get("token");
  // Returning from a Stripe redirect (3-D Secure etc.): ask the server what happened.
  const [polled, setPolled] = useState<"success" | "failed" | "pending" | null>(code && token ? "pending" : null);
  useEffect(() => {
    if (!code || !token) return;
    let stop = false;
    const until = Date.now() + 25_000;
    (async () => {
      while (!stop && Date.now() < until) {
        const j = await fetch(`/api/v1/reservations/status?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null);
        if (j?.status === "confirmed") return setPolled("success");
        if (j?.status === "cancelled" || j?.paymentStatus === "failed") return setPolled("failed");
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!stop) setPolled("failed");
    })();
    return () => {
      stop = true;
    };
  }, [code, token]);
  if (polled === "pending") return <div className="container-page py-20 text-center text-muted">…</div>;
  const status = (polled ?? sp.get("status") ?? "success") as "success" | "failed" | "canceled";

  const map = {
    success: { icon: CheckCircle2, color: "text-brand", title: t("payment.successTitle"), lead: t("payment.successLead") },
    failed: { icon: XCircle, color: "text-crimson", title: t("payment.failureTitle"), lead: t("payment.failureLead") },
    canceled: { icon: MinusCircle, color: "text-muted", title: t("payment.canceledTitle"), lead: t("payment.canceledLead") },
  } as const;
  const s = map[status] ?? map.success;
  const Icon = s.icon;

  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-lg text-center">
        <Icon className={`mx-auto h-16 w-16 ${s.color}`} aria-hidden />
        <h1 className="mt-5 font-serif text-2xl font-bold text-ink">{s.title}</h1>
        <p className="mt-2 text-muted">{s.lead}</p>
        {status === "success" && code && <p className="mt-4 font-mono text-2xl font-bold text-brand">{code}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {status === "success" ? (
            !code && <Link href="/booking/confirmation" className="btn-primary">{t("booking.viewConfirmation")}</Link>
          ) : (
            <Link href="/stays" className="btn-primary">{t("payment.retry")}</Link>
          )}
          <Link href="/" className="btn-outline">{t("errors.backHome")}</Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="container-page py-20" />}>
      <ResultInner />
    </Suspense>
  );
}
