"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { contactFormSchema } from "@/lib/validation";
import { generateInquiryRef } from "@/lib/ids";
import { chatStore } from "@/lib/chat/store";
import { SectionHeading } from "@/components/ui/states";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";

const CATEGORIES = [
  { value: "booking", key: "contact.catBooking" },
  { value: "property", key: "contact.catProperty" },
  { value: "inbound", key: "contact.catInbound" },
  { value: "other", key: "contact.catOther" },
];

export function ContactForm({ initialCategory }: { initialCategory?: string }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    category: CATEGORIES.some((c) => c.value === initialCategory) ? (initialCategory as string) : "booking",
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = contactFormSchema.safeParse(form);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as string;
        if (!next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    setTimeout(() => {
      setDone(generateInquiryRef());
      setSubmitting(false);
    }, 500);
  }

  const err = (k: string) => (errors[k] ? t(errors[k]) : "");

  if (done) {
    return (
      <div className="mx-auto max-w-lg card p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-brand" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl font-bold text-ink">{t("contact.successTitle")}</h2>
        <p className="mt-2 text-muted">{t("contact.successLead")}</p>
        <p className="mt-3 text-sm text-muted">{t("viewing.ref")}: <span className="font-mono font-bold text-brand">{done}</span></p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-2xl card p-6">
      <label className="block">
        <span className="field-label">{t("contact.category")}</span>
        <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{t(c.key)}</option>
          ))}
        </select>
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">{t("contact.name")} <span className="text-crimson">*</span></span>
          <input className={`field ${errors.name ? "field-error" : ""}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          {err("name") && <span className="mt-1 block text-sm text-crimson">{err("name")}</span>}
        </label>
        <label className="block">
          <span className="field-label">{t("contact.email")} <span className="text-crimson">*</span></span>
          <input type="email" className={`field ${errors.email ? "field-error" : ""}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          {err("email") && <span className="mt-1 block text-sm text-crimson">{err("email")}</span>}
        </label>
        <label className="block sm:col-span-2">
          <span className="field-label">{t("contact.phone")}</span>
          <input type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="field-label">{t("contact.message")} <span className="text-crimson">*</span></span>
        <textarea className={`field min-h-32 ${errors.message ? "field-error" : ""}`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        {err("message") && <span className="mt-1 block text-sm text-crimson">{err("message")}</span>}
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          <Send className="h-4 w-4" aria-hidden />
          {submitting ? t("common.submitting") : t("contact.submit")}
        </button>
        <button type="button" onClick={() => chatStore.open()} className="btn-outline">
          <MessageCircle className="h-4 w-4" aria-hidden />
          {t("chat.launcher")}
        </button>
      </div>
      <p className="mt-3 text-sm text-muted">{t("contact.orChat")}</p>
    </form>
  );
}
