"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useI18n } from "@/i18n/I18nProvider";
import { SectionHeading } from "@/components/ui/states";
import { CheckCircle2, Upload, X, ShieldCheck, Lock, Info } from "lucide-react";

const MAX_MB = 10;
const ACCEPT = ["image/jpeg", "image/png", "image/heic", "image/heif"];

interface Picked {
  file: File;
  url: string;
}

export function CheckinForm() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    bookingRef: "",
    guestName: "",
    nationality: "",
    passportNumber: "",
    dob: "",
    expiry: "",
    address: "",
    consent: false,
  });
  const [passport, setPassport] = useState<Picked | null>(null);
  const [selfie, setSelfie] = useState<Picked | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function pick(
    e: React.ChangeEvent<HTMLInputElement>,
    set: (p: Picked | null) => void,
    key: string
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const nextErr = { ...errors };
    if (!ACCEPT.includes(file.type) && !/\.(jpe?g|png|heic|heif)$/i.test(file.name)) {
      nextErr[key] = t("errors.fileType");
      setErrors(nextErr);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      nextErr[key] = t("errors.fileSize", { n: MAX_MB });
      setErrors(nextErr);
      return;
    }
    delete nextErr[key];
    setErrors(nextErr);
    // DEMO: object URL preview only — the file is NOT uploaded anywhere.
    set({ file, url: URL.createObjectURL(file) });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.guestName.trim()) next.guestName = "errors.required";
    if (!form.nationality.trim()) next.nationality = "errors.required";
    if (!form.passportNumber.trim()) next.passportNumber = "errors.required";
    if (!passport) next.passport = "errors.required";
    if (!form.consent) next.consent = "errors.required";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    // DEMO: nothing is sent to a server. In production, upload over TLS to a
    // secure, access-controlled store and never log the image or PII.
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
    }, 700);
  }

  const err = (k: string) => (errors[k] ? t(errors[k]) : "");

  if (done) {
    return (
      <div className="mx-auto max-w-lg card p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-brand" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl font-bold text-ink">{t("checkin.successTitle")}</h2>
        <p className="mt-2 text-muted">{t("checkin.successLead")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-brand/5 p-3 text-sm text-muted">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
        <span>
          {t("checkin.secureNote")} <br />
          <span className="text-brand">{t("checkin.demoNote")}</span>
        </span>
      </div>

      <div className="card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">{t("checkin.bookingRef")}</span>
            <input className="field" placeholder={t("checkin.bookingRefPlaceholder")} value={form.bookingRef} onChange={(e) => setForm({ ...form, bookingRef: e.target.value })} />
          </label>
          <label className="block">
            <span className="field-label">{t("checkin.guestName")} <span className="text-crimson">*</span></span>
            <input className={`field ${errors.guestName ? "field-error" : ""}`} value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} autoComplete="name" />
            {err("guestName") && <span className="mt-1 block text-sm text-crimson">{err("guestName")}</span>}
          </label>
          <label className="block">
            <span className="field-label">{t("checkin.nationality")} <span className="text-crimson">*</span></span>
            <input className={`field ${errors.nationality ? "field-error" : ""}`} value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} autoComplete="country-name" />
            {err("nationality") && <span className="mt-1 block text-sm text-crimson">{err("nationality")}</span>}
          </label>
          <label className="block">
            <span className="field-label">{t("checkin.passportNumber")} <span className="text-crimson">*</span></span>
            <input className={`field ${errors.passportNumber ? "field-error" : ""}`} value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} />
            {err("passportNumber") && <span className="mt-1 block text-sm text-crimson">{err("passportNumber")}</span>}
          </label>
          <label className="block">
            <span className="field-label">{t("checkin.dob")}</span>
            <input type="date" className="field" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} autoComplete="bday" />
          </label>
          <label className="block">
            <span className="field-label">{t("checkin.expiry")}</span>
            <input type="date" className="field" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">{t("checkin.address")}</span>
            <input className="field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
        </div>

        {/* Uploads */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <UploadTile
            label={t("checkin.passportPhoto")}
            required
            picked={passport}
            error={err("passport")}
            hint={t("checkin.uploadHint")}
            note={t("checkin.uploadNote")}
            selectedLabel={(n) => t("checkin.selected", { name: n })}
            removeLabel={t("checkin.remove")}
            onPick={(e) => pick(e, setPassport, "passport")}
            onRemove={() => {
              if (passport) URL.revokeObjectURL(passport.url);
              setPassport(null);
            }}
          />
          <UploadTile
            label={t("checkin.selfie")}
            picked={selfie}
            error={err("selfie")}
            hint={t("checkin.uploadHint")}
            note={t("checkin.uploadNote")}
            selectedLabel={(n) => t("checkin.selected", { name: n })}
            removeLabel={t("checkin.remove")}
            capture
            onPick={(e) => pick(e, setSelfie, "selfie")}
            onRemove={() => {
              if (selfie) URL.revokeObjectURL(selfie.url);
              setSelfie(null);
            }}
          />
        </div>

        {/* Consent */}
        <label className="mt-6 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 accent-[rgb(var(--c-brand))]" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
          <span className="text-ink/90">
            {t("checkin.consent")} <span className="text-crimson">*</span>
            <span className="mt-1 block text-xs text-muted">{t("checkin.consentDetail")}</span>
          </span>
        </label>
        {err("consent") && <p className="mt-1 text-sm text-crimson" role="alert">{err("consent")}</p>}

        <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          {submitting ? t("common.submitting") : t("checkin.submit")}
        </button>
      </div>
    </form>
  );
}

function UploadTile({
  label,
  required,
  picked,
  error,
  hint,
  note,
  selectedLabel,
  removeLabel,
  capture,
  onPick,
  onRemove,
}: {
  label: string;
  required?: boolean;
  picked: Picked | null;
  error?: string;
  hint: string;
  note: string;
  selectedLabel: (n: string) => string;
  removeLabel: string;
  capture?: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <span className="field-label">
        {label} {required && <span className="text-crimson">*</span>}
      </span>
      {picked ? (
        <div className="relative overflow-hidden rounded-xl border border-line">
          <div className="relative aspect-[16/10] w-full bg-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Image src={picked.url} alt={label} fill className="object-contain" unoptimized />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line bg-panel/80 px-3 py-2 text-xs">
            <span className="truncate text-muted">{selectedLabel(picked.file.name)}</span>
            <button type="button" onClick={onRemove} className="flex items-center gap-1 text-crimson hover:underline">
              <X className="h-3.5 w-3.5" aria-hidden /> {removeLabel}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition hover:border-brand hover:bg-brand/5 ${
            error ? "border-crimson" : "border-line"
          }`}
        >
          <Upload className="h-6 w-6 text-brand" aria-hidden />
          <span className="text-sm font-medium text-ink">{hint}</span>
          <span className="text-xs text-muted">{note}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif"
        capture={capture ? "user" : undefined}
        onChange={onPick}
        className="sr-only"
        aria-label={label}
      />
      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
        <Info className="h-3 w-3" aria-hidden /> {note}
      </p>
      {error && <p className="mt-1 text-sm text-crimson" role="alert">{error}</p>}
    </div>
  );
}
