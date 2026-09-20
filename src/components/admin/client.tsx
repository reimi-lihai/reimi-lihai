"use client";

/** Interactive admin widgets (all call the /api/admin/* REST endpoints). */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, LogOut, Mail, Send, ShieldOff } from "lucide-react";

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error ?? `http_${res.status}`);
  return json;
}

const ERR: Record<string, string> = {
  forbidden: "この操作の権限がありません（マスターに依頼してください）",
  unauthorized: "ログインが切れました",
  conflict_overlap: "他の予約と日程が重なるため変更できません",
  last_master: "最後のマスターは無効化できません",
  cancelled: "キャンセル済みの予約には発行できません",
  forbidden_refund: "返金の権限がありません（マスターに依頼してください）",
  already_cancelled: "すでにキャンセル済みです",
  nothing_to_refund: "返金できる残額がありません",
  stripe_not_configured: "Stripe が未設定のため返金できません",
  use_cancel_endpoint: "キャンセルは「キャンセル手続き」から行ってください",
};
const errText = (e: unknown) => ERR[(e as Error).message] ?? `エラー: ${(e as Error).message}`;

/* ---------------- live clocks (header) ---------------- */

export function LiveClocks({ tz }: { tz: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <div className="h-9" />;
  const f = (z: string) => new Intl.DateTimeFormat("ja-JP", { timeZone: z, hour: "2-digit", minute: "2-digit", hourCycle: "h23", month: "numeric", day: "numeric" }).format(now);
  const city = (z: string) => z.split("/").pop()?.replace("_", " ");
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="rounded-lg bg-brand/10 px-2.5 py-1.5 font-semibold text-brand">
        あなた（{city(tz)}） <span className="tabular-nums">{f(tz)}</span>
      </span>
      {tz !== "Asia/Tokyo" && (
        <span className="rounded-lg bg-amber-100 px-2.5 py-1.5 font-semibold text-amber-900">
          現地 Osaka <span className="tabular-nums">{f("Asia/Tokyo")}</span>
        </span>
      )}
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await api("/api/admin/auth/logout", "POST").catch(() => null);
        router.push("/admin/login");
        router.refresh();
      }}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"
    >
      <LogOut className="h-4 w-4" /> ログアウト
    </button>
  );
}

/* ---------------- guest key issuance ---------------- */

export function IssueKeyPanel({
  code,
  activePassId,
  canIssue,
  guestEmail,
}: {
  code: string;
  activePassId: string | null;
  canIssue: boolean;
  guestEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"issue" | "revoke" | null>(null);
  const [issued, setIssued] = useState<{ url: string; qrSvg: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const issue = async () => {
    setBusy("issue");
    setErr(null);
    try {
      const j = await api(`/api/admin/reservations/${code}/access-passes`, "POST");
      setIssued({ url: j.url, qrSvg: j.qrSvg });
      router.refresh();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(null);
    }
  };
  const revoke = async () => {
    if (!activePassId) return;
    setBusy("revoke");
    setErr(null);
    try {
      await api(`/api/admin/access-passes/${activePassId}/revoke`, "POST");
      setIssued(null);
      router.refresh();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(null);
    }
  };

  if (!canIssue) return <p className="text-sm text-muted">ゲストキーの発行権限がありません。</p>;

  return (
    <div className="space-y-4">
      {issued ? (
        <div className="flex flex-col gap-4 rounded-xl border-2 border-dashed border-gold/60 bg-gold/5 p-4 sm:flex-row">
          <div
            className="h-40 w-40 shrink-0 self-center rounded-lg bg-white p-2 shadow-sm [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: issued.qrSvg }}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-bold text-ink">新しいキーを発行しました</p>
            <p className="text-xs text-muted">URL はこの画面でのみ表示されます（DB にはハッシュのみ保存）。今すぐゲストへ送ってください。</p>
            <code className="block truncate rounded-md bg-surface px-2 py-1.5 text-[11px] text-ink">{issued.url}</code>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(issued.url).catch(() => null);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "コピーしました" : "URLをコピー"}
              </button>
              <a
                href={`mailto:${guestEmail}?subject=${encodeURIComponent(`[REIMI] Smart Key ${code}`)}&body=${encodeURIComponent(issued.url)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink"
              >
                <Mail className="h-3.5 w-3.5" /> メールで送る
              </a>
              <a href={issued.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink">
                ゲスト画面を開く
              </a>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={issue}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-brand-deep shadow-sm disabled:opacity-50"
          style={{ background: "linear-gradient(120deg,#f7d56b,#f7c948)" }}
        >
          {busy === "issue" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {activePassId ? "キーを再発行（旧URLは失効）" : "キーを発行してQRを作成"}
        </button>
        {activePassId && (
          <button
            onClick={revoke}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            {busy === "revoke" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
            今すぐ失効
          </button>
        )}
      </div>
      {err && <p className="text-sm font-medium text-rose-700">{err}</p>}
    </div>
  );
}

/* ---------------- reservation status ---------------- */

const RES_OPTIONS: [string, string][] = [
  ["pending_payment", "決済待ち"],
  ["confirmed", "確定"],
  ["checked_in", "滞在中"],
  ["completed", "完了"],
  ["no_show", "ノーショー"],
];

export function ReservationStatusSelect({ code, status, canEdit }: { code: string; status: string; canEdit: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={!canEdit || pending || value === "cancelled"}
        onChange={(e) => {
          const next = e.target.value;
          const prev = value;
          setValue(next);
          setErr(null);
          start(async () => {
            try {
              await api(`/api/admin/reservations/${code}`, "PATCH", { status: next });
              router.refresh();
            } catch (er) {
              setValue(prev);
              setErr(errText(er));
            }
          });
        }}
        className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {value === "cancelled" && <option value="cancelled">キャンセル済み</option>}
        {value === "hold" && <option value="hold">仮押さえ</option>}
        {RES_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="h-4 w-4 animate-spin text-brand" />}
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </div>
  );
}

/* ---------------- chat ---------------- */

const CANNED: { label: string; text: Record<string, string> }[] = [
  {
    label: "確認します",
    text: {
      ja: "ご連絡ありがとうございます。すぐに確認いたしますので、少々お待ちください。",
      en: "Thank you for reaching out. We're checking this right away — please give us a moment.",
      "zh-Hant": "感謝您的聯絡，我們會立即確認，請稍候。",
      "zh-Hans": "感谢您的联系，我们会立即确认，请稍候。",
      ko: "연락 주셔서 감사합니다. 바로 확인하겠습니다. 잠시만 기다려 주세요.",
    },
  },
  {
    label: "鍵の操作案内",
    text: {
      ja: "スマートキー画面で解錠ボタンを1秒ほど長押ししてください。反応しない場合は画面の暗証番号をドアのテンキーに入力してください。",
      en: "Please press and hold the unlock button on your Smart Key screen for about a second. If it doesn't respond, enter the door code shown on the screen into the keypad.",
      "zh-Hant": "請在智慧鑰匙畫面長按解鎖按鈕約一秒。若無反應，請在門鎖鍵盤輸入畫面上的密碼。",
      "zh-Hans": "请在智能钥匙页面长按解锁按钮约一秒。若无反应，请在门锁键盘输入页面上的密码。",
      ko: "스마트 키 화면에서 잠금 해제 버튼을 1초 정도 길게 눌러 주세요. 반응이 없으면 화면의 비밀번호를 도어 키패드에 입력해 주세요.",
    },
  },
  {
    label: "レイトチェックアウト可",
    text: {
      ja: "レイトチェックアウトを承りました。13:00までご利用いただけます。",
      en: "Late check-out is confirmed — you're welcome to stay until 13:00.",
      "zh-Hant": "已為您安排延遲退房，可使用至 13:00。",
      "zh-Hans": "已为您安排延迟退房，可使用至 13:00。",
      ko: "레이트 체크아웃이 확정되었습니다. 13:00까지 이용하실 수 있습니다.",
    },
  },
];

export function ReplyBox({ conversationId, guestLocale, canChat }: { conversationId: string; guestLocale: string; canChat: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!canChat) return null;
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/conversations/${conversationId}/messages`, "POST", { body: text });
      setText("");
      router.refresh();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2 border-t border-line/70 pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-muted">定型文（{guestLocale}）:</span>
        {CANNED.map((c) => (
          <button
            key={c.label}
            onClick={() => setText(c.text[guestLocale] ?? c.text.en)}
            className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-brand hover:text-brand"
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="返信を入力（自動翻訳はされません）"
          className="min-h-[44px] flex-1 resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
        <button onClick={send} disabled={busy || !text.trim()} className="inline-flex items-center gap-1.5 self-end rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} 送信
        </button>
      </div>
      {err && <p className="text-xs text-rose-700">{err}</p>}
    </div>
  );
}

export function ConversationStatus({ id, status, canChat }: { id: string; status: string; canChat: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={status}
      disabled={!canChat || pending}
      onChange={(e) => start(async () => { await api(`/api/admin/conversations/${id}`, "PATCH", { status: e.target.value }).catch(() => null); router.refresh(); })}
      className="rounded-lg border border-line bg-panel px-2 py-1 text-xs font-semibold text-ink"
    >
      <option value="received">受付済み</option>
      <option value="in_progress">対応中</option>
      <option value="resolved">解決済み</option>
    </select>
  );
}

/* ---------------- tasks ---------------- */

export function TaskStatusButtons({ id, status, canEdit }: { id: string; status: string; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = status === "todo" ? "doing" : status === "doing" ? "done" : "todo";
  const label = status === "todo" ? "開始" : status === "doing" ? "完了にする" : "戻す";
  if (!canEdit) return null;
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await api(`/api/admin/tasks/${id}`, "PATCH", { status: next }).catch(() => null); router.refresh(); })}
      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${status === "doing" ? "bg-emerald-600 text-white" : "border border-line text-ink hover:border-brand"}`}
    >
      {pending ? "…" : label}
    </button>
  );
}

/* ---------------- permissions ---------------- */

export function PermissionEditor({
  userId,
  initial,
  grantable,
  isActive,
}: {
  userId: string;
  initial: string[];
  grantable: { key: string; label: string }[];
  isActive: boolean;
}) {
  const router = useRouter();
  const [perms, setPerms] = useState<string[]>(initial);
  const [active, setActive] = useState(isActive);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = active !== isActive || perms.slice().sort().join() !== initial.slice().sort().join();
  const save = async () => {
    setState("saving");
    try {
      await api(`/api/admin/users/${userId}`, "PATCH", { permissions: perms, isActive: active });
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-1.5 sm:grid-cols-2">
        {grantable.map((g) => (
          <label key={g.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface">
            <input
              type="checkbox"
              checked={perms.includes(g.key)}
              onChange={(e) => setPerms((p) => (e.target.checked ? [...p, g.key] : p.filter((x) => x !== g.key)))}
              className="h-4 w-4 accent-[#146cd6]"
            />
            <span className="text-ink">{g.label}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line/70 pt-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#146cd6]" />
          アカウント有効
        </label>
        <button onClick={save} disabled={!dirty || state === "saving"} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
          {state === "saving" ? "保存中…" : state === "saved" && !dirty ? "保存しました" : "権限を保存"}
        </button>
      </div>
      {state === "error" && <p className="text-xs text-rose-700">保存できませんでした</p>}
    </div>
  );
}

const TZ_CHOICES = ["Asia/Tokyo", "America/Toronto", "Asia/Taipei", "Asia/Hong_Kong", "Asia/Seoul", "Europe/London", "America/Los_Angeles"];

export function TimezoneForm({ timezone, mode }: { timezone: string; mode: "auto" | "manual" }) {
  const router = useRouter();
  const [tz, setTz] = useState(timezone);
  const [m, setM] = useState(mode);
  const [browserTz, setBrowserTz] = useState<string>("");
  const [saved, setSaved] = useState(false);
  useEffect(() => setBrowserTz(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const save = async () => {
    await api("/api/admin/me", "PATCH", { timezone: m === "auto" && browserTz ? browserTz : tz, timezoneMode: m });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    router.refresh();
  };
  return (
    <div className="space-y-3 text-sm">
      <label className="flex items-center gap-2">
        <input type="radio" checked={m === "auto"} onChange={() => setM("auto")} className="accent-[#146cd6]" />
        <span className="text-ink">自動（このブラウザ: <b>{browserTz || "…"}</b>）</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" checked={m === "manual"} onChange={() => setM("manual")} className="accent-[#146cd6]" />
        <span className="text-ink">固定</span>
        <select value={tz} onChange={(e) => setTz(e.target.value)} disabled={m !== "manual"} className="rounded-lg border border-line bg-panel px-2 py-1 text-sm text-ink disabled:opacity-50">
          {[...new Set([timezone, ...TZ_CHOICES])].map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
      </label>
      <button onClick={save} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">
        {saved ? "保存しました" : "表示タイムゾーンを保存"}
      </button>
    </div>
  );
}

/* ---------------- cancel & refund ---------------- */

const yenFmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

export function CancelPanel({ code, canCancel, canRefund }: { code: string; canCancel: boolean; canRefund: boolean }) {
  const router = useRouter();
  const [preview, setPreview] = useState<{ paid: number; daysBefore: number; feePct: number; fee: number; refund: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = async () => {
    setOpen(true);
    setErr(null);
    try {
      const j = await api(`/api/admin/reservations/${code}/cancel`, "GET");
      setPreview(j);
    } catch (e) {
      setErr(errText(e));
    }
  };
  const run = async (refund: "policy" | "full" | "none") => {
    setBusy(true);
    setErr(null);
    try {
      const j = await api(`/api/admin/reservations/${code}/cancel`, "POST", { refund, reason: `admin_${refund}` });
      setDone(`キャンセルしました（返金 ${yenFmt(j.refunded)}）`);
      router.refresh();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  if (!canCancel) return null;
  if (done) return <p className="text-sm font-semibold text-emerald-700">{done}</p>;
  if (!open)
    return (
      <button onClick={load} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">
        キャンセル手続き
      </button>
    );
  return (
    <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm">
      {preview ? (
        <>
          <p className="text-ink">
            チェックイン{preview.daysBefore}日前 → キャンセル料 <b>{preview.feePct}%</b>（{yenFmt(preview.fee)}）
          </p>
          <p className="text-ink">
            お支払い済み {yenFmt(preview.paid)} → 規定の返金額 <b>{yenFmt(preview.refund)}</b>
          </p>
          <div className="flex flex-wrap gap-2">
            {canRefund && (
              <>
                <button disabled={busy} onClick={() => run("policy")} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  規定どおり返金してキャンセル
                </button>
                <button disabled={busy} onClick={() => run("full")} className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">
                  全額返金
                </button>
              </>
            )}
            <button disabled={busy} onClick={() => run("none")} className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-ink disabled:opacity-50">
              返金なしでキャンセル
            </button>
            <button disabled={busy} onClick={() => setOpen(false)} className="px-2 text-xs text-muted">閉じる</button>
          </div>
          {!canRefund && <p className="text-xs text-muted">返金の実行はマスター（または返金権限のある管理者）が行います。</p>}
        </>
      ) : (
        <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
      )}
      {err && <p className="text-xs text-rose-700">{err}</p>}
    </div>
  );
}

export function RefundForm({ paymentId, max }: { paymentId: string; max: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(max);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (max <= 0) return null;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs font-semibold text-brand hover:underline">
        一部 / 全額返金
      </button>
    );
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input type="number" min={1} max={max} value={amount} onChange={(e) => setAmount(Math.min(max, Math.max(1, Number(e.target.value) || 0)))} className="w-28 rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="理由（必須）" className="min-w-0 flex-1 rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink" />
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy || !reason.trim()}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await api(`/api/admin/payments/${paymentId}/refund`, "POST", { amount, reason });
              setOpen(false);
              router.refresh();
            } catch (e) {
              setErr(errText(e));
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-md bg-brand px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          {yenFmt(amount)} を返金
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-muted">取消</button>
      </div>
      {err && <p className="text-xs text-rose-700">{err}</p>}
    </div>
  );
}
