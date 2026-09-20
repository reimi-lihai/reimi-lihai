"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

const DEMO = [
  { email: "master@reimi.example", label: "マスター", sub: "全権限・大阪" },
  { email: "osaka@reimi.example", label: "通常管理者", sub: "大阪 / JST" },
  { email: "toronto@reimi.example", label: "通常管理者", sub: "トロント / EDT" },
];
const DEMO_PW = "reimi-demo-2026";

export function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const login = async (e?: React.FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    const c = creds ?? { email, password };
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else setErr(res.status === 429 ? "試行回数が多すぎます。10分後にお試しください" : "メールアドレスまたはパスワードが違います");
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4" style={{ background: "linear-gradient(160deg,#0c285c,#146cd6)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#f7c948", color: "#0c285c" }}>
            <KeyRound className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold">REIMI Admin</span>
        </div>
        <form onSubmit={login} className="rounded-2xl bg-white p-6 shadow-2xl">
          <h1 className="text-lg font-bold text-[#0c285c]">管理画面にログイン</h1>
          <label className="mt-4 block text-xs font-semibold text-slate-600">メールアドレス</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#146cd6]" />
          <label className="mt-3 block text-xs font-semibold text-slate-600">パスワード</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#146cd6]" />
          {err && <p className="mt-2 text-xs font-medium text-rose-700">{err}</p>}
          <button disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#146cd6] py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} ログイン
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-400">本番では Supabase Auth ＋ 二要素認証（TOTP）に置き換わります</p>
        </form>
        {demo && (
          <div className="mt-4 rounded-2xl bg-white/10 p-4 text-white ring-1 ring-white/20">
            <p className="mb-2 text-xs font-semibold text-white/80">デモアカウントでログイン（パスワード: {DEMO_PW}）</p>
            <div className="grid gap-2">
              {DEMO.map((d) => (
                <button key={d.email} disabled={busy} onClick={() => login(undefined, { email: d.email, password: DEMO_PW })} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-left text-sm hover:bg-white/20">
                  <span className="font-bold">{d.label}</span>
                  <span className="text-xs text-white/70">{d.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
