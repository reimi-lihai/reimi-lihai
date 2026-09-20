"use client";

/** Cancellation policy editor (master only). */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { feeLabel, tierLabel, tierRows, type Tier } from "@/lib/cancellation";

export function CancellationPolicyEditor({ initial, defaults, canEdit }: { initial: Tier[]; defaults: Tier[]; canEdit: boolean }) {
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [err, setErr] = useState<string | null>(null);

  const sorted = useMemo(() => [...tiers].sort((a, b) => b.minDays - a.minDays), [tiers]);
  const problems = useMemo(() => {
    const p: string[] = [];
    const days = sorted.map((t) => t.minDays);
    if (new Set(days).size !== days.length) p.push("同じ日数の区分が重複しています");
    if (!days.includes(0)) p.push("「当日（0日前）」の区分が必要です");
    for (let i = 1; i < sorted.length; i++) if (sorted[i].feePct < sorted[i - 1].feePct) p.push("チェックインに近いほど料率が高く（または同じに）なるようにしてください");
    if (sorted.some((t) => t.feePct < 0 || t.feePct > 100 || !Number.isInteger(t.feePct))) p.push("料率は0〜100の整数で入力してください");
    return [...new Set(p)];
  }, [sorted]);
  const dirty = JSON.stringify(sorted) !== JSON.stringify([...initial].sort((a, b) => b.minDays - a.minDays));

  const save = async (body: unknown) => {
    setState("saving");
    setErr(null);
    const res = await fetch("/api/admin/settings/cancellation-policy", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.ok) {
      setTiers(j.tiers);
      setState("saved");
      router.refresh();
    } else {
      setState("idle");
      setErr(j.error === "forbidden" ? "変更できるのはマスターのみです" : j.error === "fee_must_increase" ? "チェックインに近いほど料率が高くなるよう設定してください" : "保存できませんでした");
    }
  };

  const update = (i: number, k: keyof Tier, v: number) => setTiers(sorted.map((t, j) => (j === i ? { ...t, [k]: v } : t)));

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-2">チェックインの何日前から</th>
            <th className="pb-2">キャンセル料（%）</th>
            <th className="pb-2">ゲストへの表示</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {sorted.map((t, i) => {
            const row = tierRows(sorted)[i];
            return (
              <tr key={i}>
                <td className="py-2">
                  <span className="flex items-center gap-1.5">
                    <input type="number" min={0} max={365} disabled={!canEdit} value={t.minDays} onChange={(e) => update(i, "minDays", Math.max(0, Number(e.target.value) || 0))} className="w-20 rounded-lg border border-line bg-panel px-2 py-1.5 text-ink disabled:opacity-60" />
                    <span className="text-xs text-muted">日前以上</span>
                  </span>
                </td>
                <td className="py-2">
                  <span className="flex items-center gap-1.5">
                    <input type="number" min={0} max={100} disabled={!canEdit} value={t.feePct} onChange={(e) => update(i, "feePct", Number(e.target.value))} className="w-20 rounded-lg border border-line bg-panel px-2 py-1.5 text-ink disabled:opacity-60" />
                    <span className="text-xs text-muted">%</span>
                  </span>
                </td>
                <td className="py-2 text-ink">
                  {tierLabel(row, "ja")} → <b>{feeLabel(t.feePct, "ja")}</b>
                  <span className="block text-[11px] text-muted">{tierLabel(row, "en")} → {feeLabel(t.feePct, "en")}</span>
                </td>
                <td className="py-2 text-right">
                  {canEdit && sorted.length > 1 && (
                    <button onClick={() => setTiers(sorted.filter((_, j) => j !== i))} className="rounded p-1 text-muted hover:text-rose-600" aria-label="削除">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {problems.length > 0 && (
        <ul className="list-disc rounded-lg bg-amber-50 px-6 py-2 text-xs text-amber-900">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setTiers([...sorted, { minDays: (sorted[0]?.minDays ?? 0) + 7, feePct: 0 }])} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink">
            <Plus className="h-3.5 w-3.5" /> 区分を追加
          </button>
          <button disabled={!dirty || problems.length > 0 || state === "saving"} onClick={() => save({ tiers: sorted })} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
            {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {state === "saved" && !dirty ? "保存しました" : "保存する"}
          </button>
          <button onClick={() => { setTiers(defaults); }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:text-ink">
            <RotateCcw className="h-3.5 w-3.5" /> 既定値（14日前まで無料／7日前まで30%／2〜6日前60%／前日・当日100%）に戻す
          </button>
          {err && <span className="text-xs text-rose-700">{err}</span>}
        </div>
      ) : (
        <p className="text-xs text-muted">変更できるのはマスターのみです。</p>
      )}
    </div>
  );
}
