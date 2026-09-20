"use client";

/** 管理画面 → スマートキー (master only): preview, screen settings, test key, remote door control. */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BatteryMedium,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Lock,
  LockOpen,
  Power,
  RotateCcw,
  Save,
  Smartphone,
  Trash2,
} from "lucide-react";

export interface KeyUiDraft {
  remoteEnabled: boolean;
  holdMs: number;
  relockSec: number;
  manualLock: boolean;
  showPin: boolean;
  showWifi: boolean;
  showSupport: boolean;
}

async function call(path: string, method: string, body?: unknown) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(j.error ?? `http_${res.status}`);
  return j;
}
const errText = (e: unknown) => {
  const m = (e as Error).message;
  return m === "forbidden" ? "マスターのみ操作できます" : m === "unauthorized" ? "ログインが切れました" : m === "lock_error" ? "鍵が応答しませんでした" : `エラー: ${m}`;
};

const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition disabled:opacity-50";
const btnPrimary = `${btn} bg-brand text-white hover:bg-brand-deep`;
const btnGold = `${btn} text-brand-deep shadow-sm`;
const btnGhost = `${btn} border border-line text-ink hover:bg-surface`;

/* ================================================================ */
/* Preview + settings (share the draft so the preview is live)       */
/* ================================================================ */

const STATES = [
  ["verify", "本人確認"],
  ["upcoming", "開始前"],
  ["active", "利用中"],
  ["expired", "期限切れ"],
] as const;
const LANGS = [
  ["ja", "日本語"],
  ["en", "English"],
  ["zh-Hant", "繁體中文"],
  ["zh-Hans", "简体中文"],
  ["ko", "한국어"],
] as const;
const OUTCOMES = [
  ["success", "成功"],
  ["error", "失敗（鍵が応答しない）"],
  ["limited", "回数制限"],
] as const;

export function KeyDesignStudio({ saved, defaults }: { saved: KeyUiDraft; defaults: KeyUiDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<KeyUiDraft>(saved);
  const [base, setBase] = useState<KeyUiDraft>(saved);
  const [state, setState] = useState<string>("active");
  const [lang, setLang] = useState<string>("ja");
  const [doors, setDoors] = useState<1 | 2>(2);
  const [outcome, setOutcome] = useState<string>("success");
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(base);
  const set = <K extends keyof KeyUiDraft>(k: K, v: KeyUiDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const src = useMemo(() => {
    const b = (v: boolean) => (v ? "1" : "0");
    const q = new URLSearchParams({
      state,
      lang,
      doors: String(doors),
      outcome,
      remote: b(draft.remoteEnabled),
      hold: String(draft.holdMs),
      relock: String(draft.relockSec),
      mlock: b(draft.manualLock),
      pin: b(draft.showPin),
      wifi: b(draft.showWifi),
      support: b(draft.showSupport),
    });
    return `/admin/key-preview?${q}`;
  }, [state, lang, doors, outcome, draft]);

  const save = async (next: KeyUiDraft, onlySwitch = false) => {
    setSaving(true);
    setMsg(null);
    try {
      const j = await call("/api/admin/keys/settings", "PUT", next);
      setBase(j.ui);
      // the emergency switch keeps any unsaved edits in the form
      setDraft((d) => (onlySwitch ? { ...d, remoteEnabled: j.ui.remoteEnabled } : j.ui));
      setMsg({ ok: true, text: "保存しました。すべてのゲストキー画面にすぐ反映されます。" });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: errText(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-6">
        {/* Emergency switch */}
        <section
          className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${
            base.remoteEnabled ? "border-emerald-200 bg-emerald-50/70" : "border-rose-300 bg-rose-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${base.remoteEnabled ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
              <Power className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-ink">アプリ解錠：{base.remoteEnabled ? "稼働中" : "停止中"}</p>
              <p className="text-sm text-muted">
                {base.remoteEnabled
                  ? "ゲストはスマホから解錠・施錠できます。トラブル時はここで全物件のアプリ解錠を一時停止できます。"
                  : "全ゲストのアプリ解錠を停止しています。ゲスト画面には暗証番号での入室案内が表示されます。"}
              </p>
            </div>
          </div>
          <button
            onClick={() => save({ ...base, remoteEnabled: !base.remoteEnabled }, true)}
            disabled={saving}
            className={`${btn} ${base.remoteEnabled ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            {base.remoteEnabled ? "緊急停止する" : "再開する"}
          </button>
        </section>

        {/* Settings */}
        <section className="rounded-2xl border border-line/80 bg-panel shadow-[0_8px_30px_-20px_rgba(12,40,92,.35)]">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink">ゲスト画面の設定</h2>
            <span className="text-xs text-muted">{dirty ? "未保存の変更があります（右のプレビューに反映中）" : "保存済み"}</span>
          </header>
          <div className="space-y-5 p-5">
            <Range
              label="解錠までの長押し時間"
              hint="短いほど素早く開きますが、誤操作しやすくなります"
              value={draft.holdMs}
              min={500}
              max={3000}
              step={100}
              fmt={(v) => `${(v / 1000).toFixed(1)} 秒`}
              onChange={(v) => set("holdMs", v)}
            />
            <Range
              label="自動施錠までのカウントダウン"
              hint="解錠後に表示する秒数。実際の自動施錠時間は鍵本体の設定に合わせてください"
              value={draft.relockSec}
              min={3}
              max={60}
              step={1}
              fmt={(v) => `${v} 秒`}
              onChange={(v) => set("relockSec", v)}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="「今すぐ施錠」ボタンを表示" on={draft.manualLock} onChange={(v) => set("manualLock", v)} />
              <Toggle label="暗証番号（テンキー用）を表示" on={draft.showPin} onChange={(v) => set("showPin", v)} />
              <Toggle label="Wi-Fi 情報を表示" on={draft.showWifi} onChange={(v) => set("showWifi", v)} />
              <Toggle label="「サポートに連絡」ボタンを表示" on={draft.showSupport} onChange={(v) => set("showSupport", v)} />
            </div>
            {!draft.showPin && !draft.remoteEnabled && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                アプリ解錠停止中に暗証番号も非表示にすると、ゲストが入室できなくなります。
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => save(draft)} disabled={!dirty || saving} className={btnPrimary}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存して反映
              </button>
              <button onClick={() => setDraft(base)} disabled={!dirty || saving} className={btnGhost}>
                変更を取り消す
              </button>
              <button onClick={() => setDraft({ ...defaults, remoteEnabled: draft.remoteEnabled })} disabled={saving} className={btnGhost}>
                <RotateCcw className="h-4 w-4" /> 初期値に戻す
              </button>
              {msg && <span className={`text-sm font-medium ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</span>}
            </div>
          </div>
        </section>

        {/* Preview controls */}
        <section className="rounded-2xl border border-line/80 bg-panel shadow-[0_8px_30px_-20px_rgba(12,40,92,.35)]">
          <header className="border-b border-line/70 px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink">プレビューの切り替え</h2>
          </header>
          <div className="space-y-4 p-5">
            <Segment label="画面の状態" value={state} options={STATES} onChange={setState} />
            <Segment label="言語" value={lang} options={LANGS} onChange={setLang} />
            <Segment label="ドアの数" value={String(doors)} options={[["1", "1つ"], ["2", "2つ（エントランス＋お部屋）"]] as const} onChange={(v) => setDoors(v === "1" ? 1 : 2)} />
            <Segment label="鍵の応答（シミュレーション）" value={outcome} options={OUTCOMES} onChange={setOutcome} />
            <p className="text-xs text-muted">
              プレビューはサンプルデータです。長押し・施錠などの操作もできますが、実際の鍵には一切信号を送りません。
              「本人確認」では何を入力しても次へ進めます。
            </p>
          </div>
        </section>
      </div>

      {/* Phone frame */}
      <div className="xl:sticky xl:top-20 xl:self-start">
        <div className="mx-auto w-[min(100%,390px)]">
          <div className="rounded-[46px] bg-[#0f203c] p-3 shadow-[0_30px_80px_-30px_rgba(12,40,92,.7)]">
            <div className="relative overflow-hidden rounded-[36px] bg-white">
              <iframe key={reloadKey} src={src} title="ゲストキー画面プレビュー" className="block h-[760px] w-full border-0" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button onClick={() => setReloadKey((k) => k + 1)} className={btnGhost}>
              <RotateCcw className="h-4 w-4" /> 最初から
            </button>
            <a href={src} target="_blank" rel="noreferrer" className={btnGhost}>
              <ExternalLink className="h-4 w-4" /> 新しいタブで開く
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Range({ label, hint, value, min, max, step, fmt, onChange }: { label: string; hint: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="tabular-nums text-sm font-bold text-brand">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[#146cd6]" />
      <span className="text-xs text-muted">{hint}</span>
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5 text-left text-sm text-ink hover:bg-surface"
    >
      {label}
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Segment({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${v === value ? "bg-brand text-white" : "bg-surface text-ink hover:bg-brand/10"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================ */
/* Real end-to-end test on a phone                                    */
/* ================================================================ */

export function TestKeyPanel({ exists, activeUntil }: { exists: boolean; activeUntil: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ url: string; qrSvg: string; surname: string; mode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const issue = async (mode: "active" | "upcoming") => {
    setBusy(mode);
    setErr(null);
    try {
      const j = await call("/api/admin/keys/test", "POST", { mode });
      setIssued({ url: j.url, qrSvg: j.qrSvg, surname: j.surname, mode });
      router.refresh();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    setBusy("remove");
    setErr(null);
    try {
      await call("/api/admin/keys/test", "DELETE");
      setIssued(null);
      router.refresh();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
        <li>「テストキーを発行」を押すと、テスト用の予約 <b>KEY-TEST</b> とデモ鍵（エントランス・お部屋）が作られます。</li>
        <li>表示されたQRをご自身のスマホで読み取ります。</li>
        <li>
          本人確認で姓に <b className="font-mono">TEST</b> と入力 → 長押しで解錠 → 「今すぐ施錠」まで、ゲストと同じ流れを試せます。
        </li>
      </ol>
      <p className="text-xs text-muted">デモ鍵なので実際のドアは動きません。操作は下の「操作履歴」に記録されます。テスト予約は売上集計に含まれません。</p>

      {issued && (
        <div className="flex flex-col gap-4 rounded-xl border-2 border-dashed border-gold/60 bg-gold/5 p-4 sm:flex-row">
          <div className="h-44 w-44 shrink-0 self-center rounded-lg bg-white p-2 shadow-sm [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: issued.qrSvg }} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <Smartphone className="h-4 w-4 text-brand" /> スマホでQRを読み取ってください
            </p>
            <p className="text-sm text-ink">
              本人確認の姓：<b className="font-mono text-base">{issued.surname}</b>
            </p>
            <p className="text-xs text-muted">
              {issued.mode === "upcoming" ? "2分後に有効になります（開始前のカウントダウン画面を確認できます）。" : "今から24時間有効です。"}
              再発行すると前のURLは使えなくなります。
            </p>
            <code className="block truncate rounded-md bg-surface px-2 py-1.5 text-[11px] text-ink">{issued.url}</code>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(issued.url).catch(() => null);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className={btnPrimary}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "コピーしました" : "URLをコピー"}
              </button>
              <a href={issued.url} target="_blank" rel="noreferrer" className={btnGhost}>
                <ExternalLink className="h-4 w-4" /> このPCで開く
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => issue("active")} disabled={busy !== null} className={btnGold} style={{ background: "linear-gradient(120deg,#f7d56b,#f7c948)" }}>
          {busy === "active" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          テストキーを発行（今すぐ有効）
        </button>
        <button onClick={() => issue("upcoming")} disabled={busy !== null} className={btnGhost}>
          {busy === "upcoming" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          開始前の状態で発行（2分後に有効）
        </button>
        {exists && (
          <button onClick={remove} disabled={busy !== null} className={`${btn} border border-rose-300 text-rose-700 hover:bg-rose-50`}>
            {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            テストデータを削除
          </button>
        )}
      </div>
      {exists && !issued && activeUntil && <p className="text-xs text-muted">有効なテストキーがあります（URLは発行時のみ表示）。スマホで開いていない場合は再発行してください。</p>}
      {err && <p className="text-sm font-medium text-rose-700">{err}</p>}
    </div>
  );
}

/* ================================================================ */
/* Remote door control                                                */
/* ================================================================ */

export interface DoorRow {
  id: string;
  name: string;
  property: string;
  provider: string;
  battery: number | null;
  lastSeen: string | null;
  isTest: boolean;
}

export function DoorControl({ doors }: { doors: DoorRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, { ok: boolean; text: string }>>({});

  const act = async (id: string, action: "unlock" | "lock") => {
    setBusy(`${id}:${action}`);
    try {
      const j = await call(`/api/admin/keys/devices/${id}`, "POST", { action });
      setResult((r) => ({ ...r, [id]: { ok: true, text: `${action === "unlock" ? "解錠" : "施錠"}しました（${(j.ms / 1000).toFixed(1)}秒）` } }));
      router.refresh();
    } catch (e) {
      setResult((r) => ({ ...r, [id]: { ok: false, text: errText(e) } }));
    } finally {
      setBusy(null);
    }
  };

  if (!doors.length)
    return (
      <p className="text-sm text-muted">
        登録された鍵はまだありません。上の「テストキーを発行」を押すとデモ鍵が2つ作られ、ここから遠隔操作を試せます。
        実際のスマートロック（RemoteLOCK・SESAME・igloohome など）の接続は次の開発フェーズで追加します。
      </p>
    );

  return (
    <ul className="divide-y divide-line/60">
      {doors.map((d) => {
        const r = result[d.id];
        return (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                {d.name}
                <span className="ml-2 text-xs font-normal text-muted">{d.property}</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${d.provider === "demo" ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-800"}`}>
                  {d.provider === "demo" ? "デモ（実機なし）" : d.provider}
                </span>
                {d.battery != null && (
                  <span className="inline-flex items-center gap-1">
                    <BatteryMedium className="h-3.5 w-3.5" /> {d.battery}%
                  </span>
                )}
                {d.lastSeen && <span>最終応答 {d.lastSeen}</span>}
              </p>
              {r && <p className={`mt-1 text-xs font-semibold ${r.ok ? "text-emerald-700" : "text-rose-700"}`}>{r.text}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => act(d.id, "unlock")} disabled={busy !== null} className={btnGold} style={{ background: "linear-gradient(120deg,#f7d56b,#f7c948)" }}>
                {busy === `${d.id}:unlock` ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4" />}
                解錠
              </button>
              <button onClick={() => act(d.id, "lock")} disabled={busy !== null} className={btnPrimary}>
                {busy === `${d.id}:lock` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                施錠
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
