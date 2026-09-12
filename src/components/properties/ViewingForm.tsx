"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { loc, todayISO } from "@/lib/format";
import { viewingFormSchema } from "@/lib/validation";
import { generateViewingRef } from "@/lib/ids";
import { SectionHeading } from "@/components/ui/states";
import type { Property } from "@/lib/types";
import { CheckCircle2, Clock, CalendarSearch } from "lucide-react";

const TIMES = ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export function ViewingForm({
  properties,
  preselect,
}: {
  properties: Property[];
  preselect?: string;
}) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState({
    propertyId: preselect && properties.some((p) => p.id === preselect) ? preselect : properties[0]?.id ?? "",
    date: "",
    time: "",
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
    const result = viewingFormSchema.safeParse(form);
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
    // Demo: no backend. Generate a reference and show pending-confirmation state.
    setTimeout(() => {
      setDone(generateViewingRef());
      setSubmitting(false);
    }, 500);
  }

  const err = (k: string) => (errors[k] ? t(errors[k]) : "");

  if (done) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg card p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-brand" aria-hidden />
          <h1 className="mt-4 font-serif text-2xl font-bold text-ink">{t("viewing.successTitle")}</h1>
          <span className="mt-3 inline-flex items-center gap-1.5 chip gold-hairline bg-gold-soft/25 text-brand-deep">
            <Clock className="h-3.5 w-3.5" aria-hidden /> {t("viewing.successPending")}
          </span>
          <p className="mt-4 text-muted">{t("viewing.successLead")}</p>
          <p className="mt-4 text-sm text-muted">
            {t("viewing.ref")}: <span className="font-mono font-bold text-brand">{done}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <SectionHeading eyebrow="Viewing" title={t("viewing.title")} lead={t("viewing.lead")} />

      <form onSubmit={submit} noValidate className="mx-auto mt-6 max-w-2xl card p-6">
        <label className="block">
          <span className="field-label">{t("viewing.property")}</span>
          <select className="field" value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{loc(p.name, locale)}</option>
            ))}
          </select>
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">{t("viewing.date")} <span className="text-crimson">*</span></span>
            <input type="date" min={todayISO()} className={`field ${errors.date ? "field-error" : ""}`} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            {err("date") && <span className="mt-1 block text-sm text-crimson">{err("date")}</span>}
          </label>
          <label className="block">
            <span className="field-label">{t("viewing.time")} <span className="text-crimson">*</span></span>
            <select className={`field ${errors.time ? "field-error" : ""}`} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
              <option value="">—</option>
              {TIMES.map((tm) => <option key={tm} value={tm}>{tm}</option>)}
            </select>
            {err("time") && <span className="mt-1 block text-sm text-crimson">{err("time")}</span>}
          </label>
          <label className="block">
            <span className="field-label">{t("viewing.name")} <span className="text-crimson">*</span></span>
            <input className={`field ${errors.name ? "field-error" : ""}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
            {err("name") && <span className="mt-1 block text-sm text-crimson">{err("name")}</span>}
          </label>
          <label className="block">
            <span className="field-label">{t("viewing.email")} <span className="text-crimson">*</span></span>
            <input type="email" className={`field ${errors.email ? "field-error" : ""}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            {err("email") && <span className="mt-1 block text-sm text-crimson">{err("email")}</span>}
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">{t("viewing.phone")} <span className="text-crimson">*</span></span>
            <input type="tel" className={`field ${errors.phone ? "field-error" : ""}`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
            {err("phone") && <span className="mt-1 block text-sm text-crimson">{err("phone")}</span>}
          </label>
        </div>

        <label className="mt-4 block">
          <span className="field-label">{t("viewing.message")}</span>
          <textarea className="field min-h-28" placeholder={t("viewing.messagePlaceholder")} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </label>

        <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full sm:w-auto">
          <CalendarSearch className="h-4 w-4" aria-hidden />
          {submitting ? t("common.submitting") : t("viewing.submit")}
        </button>
      </form>
    </div>
  );
}
