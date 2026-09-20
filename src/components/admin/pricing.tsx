"use client";

/** Admin pricing widgets: rule form, rule toggle/delete, bulk date overrides. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(j.error ?? `http_${res.status}`);
  return j;
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
type RuleType = "weekday" | "season" | "date_range" | "length_of_stay" | "lead_time" | "occupancy";
const TYPE_LABEL: Record<RuleType, string> = {
  weekday: "曜日",
  season: "シーズン（毎年）",
  date_range: "特定期間",
  length_of_stay: "連泊",
  lead_time: "予約タイミング（直前・早割）",
  occupancy: "人数",
};

const input = "rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand";

export function RuleForm({ properties }: { properties: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "",
    scope: "all" as "all" | "property",
    targetId: properties[0]?.id ?? "",
    ruleType: "weekday" as RuleType,
    days: [5, 6] as number[],
    from: "",
    to: "",
    minNights: 7,
    leadMode: "max" as "max" | "min",
    leadDays: 3,
    minGuests: 5,
    adjustType: "percent" as "percent" | "fixed" | "override",
    adjustValue: 20,
    priority: 100,
    stackable: true,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const condition = () => {
    switch (f.ruleType) {
      case "weekday":
        return { days: f.days };
      case "season":
        return { from: f.from.slice(5), to: f.to.slice(5) };
      case "date_range":
        return { from: f.from, to: f.to };
      case "length_of_stay":
        return { minNights: f.minNights };
      case "lead_time":
        return f.leadMode === "max" ? { maxDays: f.leadDays } : { minDays: f.leadDays };
      case "occupancy":
        return { minGuests: f.minGuests };
    }
  };

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/admin/pricing-rules", "POST", {
        name: f.name || `${TYPE_LABEL[f.ruleType]} ${f.adjustType === "percent" ? `${f.adjustValue > 0 ? "+" : ""}${f.adjustValue}%` : `¥${f.adjustValue}`}`,
        scope: f.scope,
        targetId: f.scope === "property" ? f.targetId : null,
        ruleType: f.ruleType,
        condition: condition(),
        adjustType: f.adjustType,
        adjustValue: f.adjustValue,
        priority: f.priority,
        stackable: f.stackable,
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message === "forbidden" ? "料金ルール編集の権限がありません" : "入力内容を確認してください");
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white">
        <Plus className="h-3.5 w-3.5" /> ルールを追加
      </button>
    );

  return (
    <div className="space-y-3 rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-xs font-semibold text-muted">名前（空欄で自動）</span>
          <input className={`${input} w-full`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="例：GW料金" />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-semibold text-muted">対象</span>
          <div className="flex gap-2">
            <select className={input} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as "all" | "property" })}>
              <option value="all">全宿泊物件</option>
              <option value="property">物件を指定</option>
            </select>
            {f.scope === "property" && (
              <select className={`${input} min-w-0 flex-1`} value={f.targetId} onChange={(e) => setF({ ...f, targetId: e.target.value })}>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-semibold text-muted">条件の種類</span>
          <select className={`${input} w-full`} value={f.ruleType} onChange={(e) => setF({ ...f, ruleType: e.target.value as RuleType })}>
            {(Object.keys(TYPE_LABEL) as RuleType[]).map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
          </select>
        </label>
        <div className="space-y-1">
          <span className="block text-xs font-semibold text-muted">条件</span>
          {f.ruleType === "weekday" && (
            <div className="flex flex-wrap gap-1">
              {WEEK.map((w, i) => (
                <button key={w} type="button" onClick={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((d) => d !== i) : [...f.days, i] })} className={`h-8 w-8 rounded-lg text-xs font-bold ${f.days.includes(i) ? "bg-brand text-white" : "border border-line text-ink"}`}>
                  {w}
                </button>
              ))}
              <span className="self-center text-[11px] text-muted">の夜</span>
            </div>
          )}
          {(f.ruleType === "season" || f.ruleType === "date_range") && (
            <div className="flex items-center gap-2">
              <input type="date" className={input} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />〜
              <input type="date" className={input} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
            </div>
          )}
          {f.ruleType === "season" && <p className="text-[11px] text-muted">月日だけを使い、毎年自動で適用されます（年またぎ可）</p>}
          {f.ruleType === "length_of_stay" && (
            <p className="flex items-center gap-2"><input type="number" min={2} className={`${input} w-20`} value={f.minNights} onChange={(e) => setF({ ...f, minNights: Number(e.target.value) })} /> 泊以上</p>
          )}
          {f.ruleType === "lead_time" && (
            <p className="flex items-center gap-2">
              チェックインの
              <input type="number" min={0} className={`${input} w-20`} value={f.leadDays} onChange={(e) => setF({ ...f, leadDays: Number(e.target.value) })} /> 日
              <select className={input} value={f.leadMode} onChange={(e) => setF({ ...f, leadMode: e.target.value as "max" | "min" })}>
                <option value="max">前以内（直前割）</option>
                <option value="min">以上前（早割）</option>
              </select>
            </p>
          )}
          {f.ruleType === "occupancy" && (
            <p className="flex items-center gap-2"><input type="number" min={1} className={`${input} w-20`} value={f.minGuests} onChange={(e) => setF({ ...f, minGuests: Number(e.target.value) })} /> 名以上</p>
          )}
        </div>
        <label className="space-y-1">
          <span className="block text-xs font-semibold text-muted">調整</span>
          <div className="flex gap-2">
            <select className={input} value={f.adjustType} onChange={(e) => setF({ ...f, adjustType: e.target.value as "percent" | "fixed" | "override" })}>
              <option value="percent">％で増減</option>
              <option value="fixed">円で増減</option>
              <option value="override">料金を固定</option>
            </select>
            <input type="number" className={`${input} w-28`} value={f.adjustValue} onChange={(e) => setF({ ...f, adjustValue: Number(e.target.value) })} />
            <span className="self-center text-xs text-muted">{f.adjustType === "percent" ? "%（値下げはマイナス）" : "円"}</span>
          </div>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-semibold text-muted">適用順（小さいほど先）・重ねがけ</span>
          <div className="flex items-center gap-3">
            <input type="number" className={`${input} w-20`} value={f.priority} onChange={(e) => setF({ ...f, priority: Number(e.target.value) })} />
            <label className="flex items-center gap-1.5 text-xs text-ink">
              <input type="checkbox" checked={f.stackable} onChange={(e) => setF({ ...f, stackable: e.target.checked })} className="accent-[#146cd6]" />
              後続ルールも重ねる
            </label>
          </div>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button disabled={busy} onClick={submit} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} 保存
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-muted">キャンセル</button>
        {err && <span className="text-xs text-rose-700">{err}</span>}
      </div>
    </div>
  );
}

export function RuleActions({ id, active, canEdit }: { id: string; active: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!canEdit) return null;
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={pending}
        onClick={() => start(async () => { await api(`/api/admin/pricing-rules/${id}`, "PATCH", { isActive: !active }).catch(() => null); router.refresh(); })}
        className={`relative h-5 w-9 rounded-full transition ${active ? "bg-brand" : "bg-line"}`}
        aria-label={active ? "無効にする" : "有効にする"}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${active ? "left-[18px]" : "left-0.5"}`} />
      </button>
      <button
        disabled={pending}
        onClick={() => start(async () => { await api(`/api/admin/pricing-rules/${id}`, "DELETE").catch(() => null); router.refresh(); })}
        className="rounded p-1 text-muted hover:text-rose-600"
        aria-label="削除"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function OverrideForm({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ from: "", to: "", price: "", closed: false, minNights: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!canEdit) return null;
  const run = async (action: "set" | "clear") => {
    if (!f.from) return setMsg("開始日を入力してください");
    setBusy(true);
    setMsg(null);
    try {
      const j = await api("/api/admin/rate-overrides", "PUT", {
        propertyId,
        from: f.from,
        to: f.to || f.from,
        action,
        price: f.price ? Number(f.price) : null,
        closed: f.closed,
        minNights: f.minNights ? Number(f.minNights) : null,
      });
      setMsg(action === "clear" ? `${j.count}件の個別設定を解除しました` : `${j.count}日分を更新しました`);
      router.refresh();
    } catch {
      setMsg("更新できませんでした");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-end gap-2 text-sm">
      <label className="space-y-1">
        <span className="block text-[11px] font-semibold text-muted">期間</span>
        <span className="flex items-center gap-1">
          <input type="date" className={input} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />〜
          <input type="date" className={input} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        </span>
      </label>
      <label className="space-y-1">
        <span className="block text-[11px] font-semibold text-muted">基本料金（円）</span>
        <input type="number" className={`${input} w-28`} value={f.price} placeholder="プランのまま" onChange={(e) => setF({ ...f, price: e.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="block text-[11px] font-semibold text-muted">最低泊数</span>
        <input type="number" className={`${input} w-20`} value={f.minNights} placeholder="—" onChange={(e) => setF({ ...f, minNights: e.target.value })} />
      </label>
      <label className="flex items-center gap-1.5 pb-2 text-xs text-ink">
        <input type="checkbox" checked={f.closed} onChange={(e) => setF({ ...f, closed: e.target.checked })} className="accent-rose-600" /> 販売停止
      </label>
      <button disabled={busy} onClick={() => run("set")} className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50">一括設定</button>
      <button disabled={busy} onClick={() => run("clear")} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink disabled:opacity-50">個別設定を解除</button>
      {msg && <span className="pb-2 text-xs text-muted">{msg}</span>}
    </div>
  );
}
