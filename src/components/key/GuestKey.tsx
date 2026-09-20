"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Eye,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  LockOpen,
  MessageCircle,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/config";
import { KEY_TEXT, type KeyTextKey } from "./text";

/* ---------------- palette: 青 / 白 / 黄 ---------------- */
const C = {
  navy: "#0c285c",
  blue: "#146cd6",
  sky: "#60aaf4",
  ice: "#eaf3ff",
  yellow: "#f7c948",
  yellowDeep: "#e8a916",
  ink: "#0f203c",
  muted: "#5f7492",
};

type DoorName = Record<Locale, string>;
interface PassView {
  reservationCode: string;
  guestName: string | null;
  propertyName: string;
  unitName: string;
  timezone: string;
  validFrom: string;
  validUntil: string;
  state: "upcoming" | "active" | "expired" | "revoked";
  verified: boolean;
  doors: { id: string; name: DoorName; pin: string | null }[];
  wifi: { ssid: string; password: string } | null;
  demo?: boolean;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "notfound" }
  | { kind: "error" }
  | { kind: "ready"; pass: PassView };

const HOLD_MS = 1200;

export function GuestKey({ token }: { token: string }) {
  const { locale, setLocale, intlLocale } = useI18n();
  const tx = useCallback(
    (k: KeyTextKey, vars?: Record<string, string | number>) => {
      let s = KEY_TEXT[k][locale] ?? KEY_TEXT[k].ja;
      if (vars) for (const [key, v] of Object.entries(vars)) s = s.replace(`{${key}}`, String(v));
      return s;
    },
    [locale]
  );

  const [load, setLoad] = useState<LoadState>({ kind: "loading" });

  const fetchPass = useCallback(async () => {
    try {
      const res = await fetch(`/api/guest/key/${encodeURIComponent(token)}`, { cache: "no-store" });
      if (res.status === 404) return setLoad({ kind: "notfound" });
      const json = await res.json();
      if (!json.ok) return setLoad({ kind: "error" });
      setLoad({ kind: "ready", pass: json.pass });
    } catch {
      setLoad({ kind: "error" });
    }
  }, [token]);

  useEffect(() => {
    fetchPass();
  }, [fetchPass]);

  const fmt = useMemo(() => {
    const tz = load.kind === "ready" ? load.pass.timezone : "Asia/Tokyo";
    return {
      dateTime: new Intl.DateTimeFormat(intlLocale, {
        timeZone: tz,
        month: "numeric",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      time: new Intl.DateTimeFormat(intlLocale, {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };
  }, [intlLocale, load]);

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{ background: "#f6faff", color: C.ink }}
    >
      {/* Blue hero backdrop */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[360px]"
        style={{
          background: `radial-gradient(420px 220px at 85% 0%, ${C.sky}66, transparent 70%), linear-gradient(160deg, ${C.navy} 0%, ${C.blue} 100%)`,
        }}
      />
      <Waves />

      <div
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4"
        style={{ paddingTop: "max(env(safe-area-inset-top), 14px)", paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
      >
        <TopBar locale={locale} setLocale={setLocale} label={tx("language")} />

        {load.kind === "loading" && <LoadingState />}
        {load.kind === "notfound" && (
          <MessageState icon={<AlertCircle className="h-7 w-7" />} title={tx("notFound")} lead={tx("notFoundLead")} tx={tx} />
        )}
        {load.kind === "error" && (
          <MessageState icon={<AlertCircle className="h-7 w-7" />} title={tx("errorTitle")} lead={tx("errorLead")} tx={tx} onRetry={fetchPass} />
        )}
        {load.kind === "ready" && (
          <ReadyState
            token={token}
            pass={load.pass}
            tx={tx}
            locale={locale}
            fmt={fmt}
            onVerified={(p) => setLoad({ kind: "ready", pass: p })}
            onRefresh={fetchPass}
          />
        )}
      </div>
    </div>
  );
}

/* ================================================================ */

type Tx = (k: KeyTextKey, vars?: Record<string, string | number>) => string;
type Fmt = { dateTime: Intl.DateTimeFormat; time: Intl.DateTimeFormat };

function ReadyState({
  token,
  pass,
  tx,
  locale,
  fmt,
  onVerified,
  onRefresh,
}: {
  token: string;
  pass: PassView;
  tx: Tx;
  locale: Locale;
  fmt: Fmt;
  onVerified: (p: PassView) => void;
  onRefresh: () => void;
}) {
  const from = new Date(pass.validFrom);
  const until = new Date(pass.validUntil);

  return (
    <>
      {/* Hero copy */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6 text-white"
      >
        <StatusChip state={pass.state} tx={tx} />
        <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight">
          {pass.verified && pass.guestName ? tx("welcome", { name: pass.guestName }) : tx("title")}
        </h1>
        <p className="mt-1 text-sm text-white/80">
          {pass.propertyName}
          <span className="mx-1.5 opacity-50">·</span>
          {pass.unitName}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-[13px] font-medium text-white ring-1 ring-white/20 backdrop-blur">
          <CalendarDays className="h-4 w-4" style={{ color: C.yellow }} aria-hidden />
          <span>{fmt.dateTime.format(from)}</span>
          <span aria-hidden className="opacity-60">→</span>
          <span>{fmt.dateTime.format(until)}</span>
        </div>
      </motion.header>

      <div className="mt-6 flex-1">
        {pass.state === "expired" || pass.state === "revoked" ? (
          <InfoCard
            icon={<Clock className="h-7 w-7" />}
            title={tx("expiredTitle")}
            lead={tx("expiredLead")}
            tx={tx}
          />
        ) : !pass.verified ? (
          <VerifyCard token={token} tx={tx} demo={pass.demo} onVerified={onVerified} />
        ) : pass.state === "upcoming" ? (
          <UpcomingCard from={from} tx={tx} onReached={onRefresh} />
        ) : (
          <ActiveKey token={token} pass={pass} tx={tx} locale={locale} fmt={fmt} until={until} />
        )}
      </div>

      <footer className="mt-8 flex flex-col items-center gap-1 text-center text-[11px]" style={{ color: C.muted }}>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: C.blue }} aria-hidden />
          {tx("validNote")}
        </span>
        <span>
          {tx("reservation")} {pass.reservationCode} · 株式会社麗海 REIMI
        </span>
      </footer>
    </>
  );
}

/* ---------------- Active key ---------------- */

type UnlockStatus = "idle" | "unlocking" | "unlocked" | "error" | "limited";

function ActiveKey({
  token,
  pass,
  tx,
  locale,
  fmt,
  until,
}: {
  token: string;
  pass: PassView;
  tx: Tx;
  locale: Locale;
  fmt: Fmt;
  until: Date;
}) {
  const [doorId, setDoorId] = useState(pass.doors[0]?.id ?? "");
  const [status, setStatus] = useState<UnlockStatus>("idle");
  const [relock, setRelock] = useState(0);
  const door = pass.doors.find((d) => d.id === doorId) ?? pass.doors[0];

  // relock countdown
  useEffect(() => {
    if (status !== "unlocked") return;
    if (relock <= 0) {
      setStatus("idle");
      return;
    }
    const id = setTimeout(() => setRelock((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [status, relock]);

  const unlock = useCallback(async () => {
    setStatus("unlocking");
    try {
      const res = await fetch(`/api/guest/key/${encodeURIComponent(token)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doorId }),
      });
      if (res.status === 429) return setStatus("limited");
      const json = await res.json();
      if (!json.ok) return setStatus("error");
      try {
        navigator.vibrate?.([30, 40, 60]);
      } catch {
        /* noop */
      }
      setRelock(json.relockInSec ?? 8);
      setStatus("unlocked");
    } catch {
      setStatus("error");
    }
  }, [token, doorId]);

  const statusLine =
    status === "unlocking"
      ? tx("unlocking")
      : status === "unlocked"
      ? tx("relock", { s: relock })
      : status === "error"
      ? tx("failed")
      : status === "limited"
      ? tx("rateLimited")
      : tx("holdToUnlock");

  return (
    <div className="space-y-4">
      {/* Main key card */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="rounded-[28px] bg-white px-5 pb-7 pt-5"
        style={{ boxShadow: "0 24px 60px -24px rgba(12,40,92,.45)" }}
      >
        {pass.doors.length > 1 && (
          <div
            role="tablist"
            aria-label={tx("door")}
            className="mx-auto grid max-w-xs gap-1 rounded-full p-1"
            style={{ background: C.ice, gridTemplateColumns: `repeat(${pass.doors.length}, 1fr)` }}
          >
            {pass.doors.map((d) => {
              const active = d.id === doorId;
              return (
                <button
                  key={d.id}
                  role="tab"
                  aria-selected={active}
                  disabled={status === "unlocking"}
                  onClick={() => {
                    setDoorId(d.id);
                    if (status !== "unlocking") setStatus("idle");
                  }}
                  className="relative rounded-full px-3 py-2 text-[13px] font-semibold transition-colors"
                  style={{ color: active ? "#fff" : C.navy }}
                >
                  {active && (
                    <motion.span
                      layoutId="door-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: `linear-gradient(120deg, ${C.navy}, ${C.blue})` }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{d.name[locale] ?? d.name.ja}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <HoldButton status={status} onComplete={unlock} label={`${tx("holdToUnlock")} — ${door?.name[locale] ?? ""}`} />
        </div>

        <p
          aria-live="polite"
          className="mt-5 text-center text-sm font-semibold"
          style={{
            color:
              status === "error" || status === "limited"
                ? "#c82a3a"
                : status === "unlocked"
                ? C.yellowDeep
                : C.navy,
          }}
        >
          {status === "unlocked" && (
            <span className="block text-lg font-bold" style={{ color: C.navy }}>
              {tx("unlocked")}
            </span>
          )}
          {statusLine}
        </p>
      </motion.section>

      {/* Info tiles */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
        className="grid grid-cols-2 gap-3"
      >
        <PinTile pin={door?.pin ?? null} tx={tx} doorName={door?.name[locale] ?? ""} />
        <Tile icon={<Clock className="h-4 w-4" />} label={tx("checkout")}>
          <span className="text-xl font-bold tracking-tight" style={{ color: C.navy }}>
            {fmt.time.format(until)}
          </span>
        </Tile>
        {pass.wifi && <WifiTile wifi={pass.wifi} tx={tx} />}
        <Link
          href="/contact"
          className="col-span-2 flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition active:scale-[.98]"
          style={{ background: C.ice, color: C.navy }}
        >
          <MessageCircle className="h-4 w-4" style={{ color: C.blue }} aria-hidden />
          {tx("support")}
        </Link>
      </motion.div>
    </div>
  );
}

/* ---------------- Hold-to-unlock button ---------------- */

function HoldButton({
  status,
  onComplete,
  label,
}: {
  status: UnlockStatus;
  onComplete: () => void;
  label: string;
}) {
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const holding = useRef(false);
  const disabled = status === "unlocking" || status === "unlocked";

  const stop = useCallback(() => {
    holding.current = false;
    start.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setProgress(0);
  }, []);

  const tick = useCallback(
    (t: number) => {
      if (!holding.current) return;
      if (start.current == null) start.current = t;
      const p = Math.min(1, (t - start.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        holding.current = false;
        raf.current = null;
        onComplete();
        setTimeout(() => setProgress(0), 250);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    },
    [onComplete]
  );

  const begin = useCallback(() => {
    if (disabled || holding.current) return;
    holding.current = true;
    try {
      navigator.vibrate?.(10);
    } catch {
      /* noop */
    }
    raf.current = requestAnimationFrame(tick);
  }, [disabled, tick]);

  useEffect(() => () => stop(), [stop]);

  const R = 104;
  const CIRC = 2 * Math.PI * R;
  const unlocked = status === "unlocked";

  return (
    <div className="relative h-[232px] w-[232px] select-none" style={{ WebkitTapHighlightColor: "transparent" }}>
      {/* ripple when unlocked */}
      <AnimatePresence>
        {unlocked &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${C.yellow}` }}
              initial={{ scale: 0.8, opacity: 0.7 }}
              animate={{ scale: 1.35, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>

      {/* track + progress ring */}
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 232 232" aria-hidden>
        <circle cx="116" cy="116" r={R} fill="none" stroke={C.ice} strokeWidth="10" />
        <circle
          cx="116"
          cy="116"
          r={R}
          fill="none"
          stroke={C.yellow}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - (unlocked ? 1 : progress))}
          style={{ transition: progress === 0 && !unlocked ? "stroke-dashoffset .25s ease" : undefined }}
        />
      </svg>

      <motion.button
        type="button"
        aria-label={label}
        disabled={disabled}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          begin();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
            e.preventDefault();
            begin();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter" || e.key === " ") stop();
        }}
        onContextMenu={(e) => e.preventDefault()}
        animate={{ scale: progress > 0 ? 0.95 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute inset-[22px] flex touch-none flex-col items-center justify-center rounded-full text-white outline-none focus-visible:ring-4"
        style={{
          background: unlocked
            ? `radial-gradient(circle at 30% 25%, #ffe38a, ${C.yellow} 55%, ${C.yellowDeep})`
            : `radial-gradient(circle at 30% 25%, ${C.sky}, ${C.blue} 50%, ${C.navy})`,
          boxShadow: unlocked
            ? "0 18px 40px -12px rgba(232,169,22,.65), inset 0 2px 0 rgba(255,255,255,.45)"
            : "0 18px 40px -12px rgba(20,108,214,.6), inset 0 2px 0 rgba(255,255,255,.3)",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {status === "unlocking" ? (
            <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2 className="h-14 w-14 animate-spin" aria-hidden />
            </motion.span>
          ) : unlocked ? (
            <motion.span
              key="open"
              initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              style={{ color: C.navy }}
            >
              <LockOpen className="h-16 w-16" strokeWidth={2.2} aria-hidden />
            </motion.span>
          ) : (
            <motion.span key="lock" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <Lock className="h-16 w-16" strokeWidth={2.2} aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
        <span
          className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em]"
          style={{ color: unlocked ? C.navy : "rgba(255,255,255,.85)" }}
        >
          {unlocked ? "OPEN" : "HOLD"}
        </span>
      </motion.button>
    </div>
  );
}

/* ---------------- Tiles ---------------- */

function Tile({
  icon,
  label,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-white p-4 ${className}`} style={{ boxShadow: "0 10px 30px -18px rgba(12,40,92,.35)" }}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
        <span style={{ color: C.blue }}>{icon}</span>
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function PinTile({ pin, tx, doorName }: { pin: string | null; tx: Tx; doorName: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(false), [pin]);
  return (
    <Tile icon={<KeyRound className="h-4 w-4" />} label={tx("pin")}>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-label={`${tx("pin")} ${doorName}`}
      >
        <span className="font-mono text-xl font-bold tracking-[0.18em]" style={{ color: C.navy }}>
          {shown && pin ? pin : "••••••"}
        </span>
        {!shown && <Eye className="h-4 w-4 shrink-0" style={{ color: C.muted }} aria-hidden />}
      </button>
      <p className="mt-1 text-[10.5px] leading-snug" style={{ color: C.muted }}>
        {shown ? tx("pinHint") : tx("tapToShow")}
      </p>
    </Tile>
  );
}

function WifiTile({ wifi, tx }: { wifi: { ssid: string; password: string }; tx: Tx }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wifi.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <Tile icon={<Wifi className="h-4 w-4" />} label="Wi-Fi" className="col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold" style={{ color: C.navy }}>
            {wifi.ssid}
          </p>
          <p className="truncate font-mono text-[13px]" style={{ color: C.muted }}>
            {wifi.password}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition active:scale-95"
          style={{ background: copied ? C.navy : C.yellow, color: copied ? "#fff" : C.navy }}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? tx("copied") : tx("copy")}
        </button>
      </div>
    </Tile>
  );
}

/* ---------------- Verify ---------------- */

function VerifyCard({
  token,
  tx,
  demo,
  onVerified,
}: {
  token: string;
  tx: Tx;
  demo?: boolean;
  onVerified: (p: PassView) => void;
}) {
  const [surname, setSurname] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/guest/key/${encodeURIComponent(token)}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surname }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 429) setErr(tx("locked"));
      else if (!json.ok) setErr(tx("mismatch"));
      else onVerified(json.pass);
    } catch {
      setErr(tx("errorLead"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] bg-white p-6"
      style={{ boxShadow: "0 24px 60px -24px rgba(12,40,92,.45)" }}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: `${C.yellow}33`, color: C.navy }}
      >
        <ShieldCheck className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-bold" style={{ color: C.navy }}>
        {tx("verifyTitle")}
      </h2>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: C.muted }}>
        {tx("verifyLead")}
      </p>
      <label className="mt-5 block">
        <span className="sr-only">{tx("surname")}</span>
        <input
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          placeholder={tx("surname")}
          autoComplete="family-name"
          autoCapitalize="characters"
          enterKeyHint="go"
          className="w-full rounded-xl border-2 px-4 py-3.5 text-base font-semibold uppercase tracking-wider outline-none transition"
          style={{ borderColor: err ? "#c82a3a" : C.ice, background: "#fbfdff", color: C.navy }}
          onFocus={(e) => (e.currentTarget.style.borderColor = C.blue)}
          onBlur={(e) => (e.currentTarget.style.borderColor = err ? "#c82a3a" : C.ice)}
        />
      </label>
      {err && (
        <p role="alert" className="mt-2 text-[13px] font-medium" style={{ color: "#c82a3a" }}>
          {err}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !surname.trim()}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold transition active:scale-[.98] disabled:opacity-50"
        style={{ background: `linear-gradient(120deg, ${C.yellow}, ${C.yellowDeep})`, color: C.navy }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
        {tx("verifyBtn")}
      </button>
      {demo && (
        <p className="mt-4 rounded-lg px-3 py-2 text-center text-[11.5px]" style={{ background: C.ice, color: C.muted }}>
          DEMO — surname: <b style={{ color: C.navy }}>Chen</b>
        </p>
      )}
    </motion.form>
  );
}

/* ---------------- Upcoming / info / loading ---------------- */

function UpcomingCard({ from, tx, onReached }: { from: Date; tx: Tx; onReached: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, from.getTime() - now);
  useEffect(() => {
    if (left === 0) onReached();
  }, [left, onReached]);
  const h = Math.floor(left / 3600_000);
  const m = Math.floor((left % 3600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] bg-white p-6 text-center"
      style={{ boxShadow: "0 24px 60px -24px rgba(12,40,92,.45)" }}
    >
      <span
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: C.ice, color: C.blue }}
      >
        <Lock className="h-8 w-8" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-bold" style={{ color: C.navy }}>
        {tx("upcomingTitle")}
      </h2>
      <p className="mt-1 text-sm" style={{ color: C.muted }}>
        {tx("upcomingLead")}
      </p>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: C.muted }}>
        {tx("startsIn")}
      </p>
      <p className="mt-1 font-mono text-4xl font-bold tabular-nums" style={{ color: C.navy }}>
        {pad(h)}
        <span style={{ color: C.yellowDeep }}>:</span>
        {pad(m)}
        <span style={{ color: C.yellowDeep }}>:</span>
        {pad(s)}
      </p>
    </motion.section>
  );
}

function InfoCard({ icon, title, lead, tx }: { icon: React.ReactNode; title: string; lead: string; tx: Tx }) {
  return (
    <section
      className="rounded-[28px] bg-white p-6 text-center"
      style={{ boxShadow: "0 24px 60px -24px rgba(12,40,92,.45)" }}
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: C.ice, color: C.blue }}>
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-bold" style={{ color: C.navy }}>
        {title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: C.muted }}>
        {lead}
      </p>
      <Link
        href="/contact"
        className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
        style={{ background: C.yellow, color: C.navy }}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        {tx("support")}
      </Link>
    </section>
  );
}

function MessageState({
  icon,
  title,
  lead,
  tx,
  onRetry,
}: {
  icon: React.ReactNode;
  title: string;
  lead: string;
  tx: Tx;
  onRetry?: () => void;
}) {
  return (
    <div className="mt-24">
      <InfoCard icon={icon} title={title} lead={lead} tx={tx} />
      {onRetry && (
        <button onClick={onRetry} className="mx-auto mt-4 block text-sm font-semibold underline" style={{ color: C.blue }}>
          {tx("retry")}
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-24 flex justify-center" aria-busy>
      <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden />
    </div>
  );
}

function StatusChip({ state, tx }: { state: PassView["state"]; tx: Tx }) {
  const map = {
    active: { label: tx("active"), dot: C.yellow },
    upcoming: { label: tx("upcoming"), dot: C.sky },
    expired: { label: tx("expired"), dot: "#9fb3cc" },
    revoked: { label: tx("expired"), dot: "#9fb3cc" },
  } as const;
  const m = map[state];
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
      <span className="relative flex h-2 w-2">
        {state === "active" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: m.dot }} />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: m.dot }} />
      </span>
      {m.label}
    </span>
  );
}

function TopBar({
  locale,
  setLocale,
  label,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between text-white">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: C.yellow, color: C.navy }}
        >
          <KeyRound className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </span>
        <span className="text-sm font-bold tracking-wide">
          REIMI <span className="font-medium opacity-70">Smart Key</span>
        </span>
      </div>
      <label className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 py-1.5 pl-3 pr-2 text-xs font-semibold ring-1 ring-white/25">
        <Globe className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">{label}</span>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="appearance-none bg-transparent pr-1 text-white outline-none"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l} style={{ color: C.ink }}>
              {LOCALE_META[l].label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Waves() {
  return (
    <svg
      aria-hidden
      className="absolute left-0 top-[300px] h-[80px] w-full"
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
    >
      <path d="M0 30 C 80 60, 160 0, 240 25 S 360 55, 400 20 L400 80 L0 80 Z" fill="#f6faff" opacity=".55" />
      <path d="M0 45 C 90 75, 170 20, 260 42 S 370 65, 400 40 L400 80 L0 80 Z" fill="#f6faff" />
      <path d="M0 45 C 90 75, 170 20, 260 42 S 370 65, 400 40" fill="none" stroke={C.yellow} strokeWidth="1.5" opacity=".7" />
    </svg>
  );
}
