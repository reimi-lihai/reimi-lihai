import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, ClipboardList, Gauge, JapaneseYen, KeyRound, ListChecks, MessagesSquare, ScrollText, Settings, Tags, Users } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { can, type Permission } from "@/server/auth/permissions";
import { LiveClocks, LogoutButton } from "@/components/admin/client";
import { NavLink } from "./NavLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "管理画面", robots: { index: false } };

const NAV: { href: string; label: string; icon: typeof Gauge; perm?: Permission; master?: boolean }[] = [
  { href: "/admin", label: "ダッシュボード", icon: Gauge },
  { href: "/admin/calendar", label: "カレンダー", icon: CalendarDays, perm: "reservations:read" },
  { href: "/admin/reservations", label: "予約一覧", icon: ClipboardList, perm: "reservations:read" },
  { href: "/admin/pricing", label: "料金", icon: Tags, perm: "reservations:read" },
  { href: "/admin/inbox", label: "チャット", icon: MessagesSquare, perm: "chat" },
  { href: "/admin/tasks", label: "タスク", icon: ListChecks, perm: "tasks" },
  { href: "/admin/keys", label: "スマートキー", icon: KeyRound, master: true },
  { href: "/admin/sales", label: "売上", icon: JapaneseYen, perm: "sales:read" },
  { href: "/admin/users", label: "管理者・権限", icon: Users },
  { href: "/admin/settings", label: "設定", icon: Settings, perm: "reservations:read" },
  { href: "/admin/audit", label: "監査ログ", icon: ScrollText, perm: "audit:read" },
];

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const me = await requireAdmin();
  const nav = NAV.filter((n) => (!n.perm || can(me, n.perm)) && (!n.master || me.role === "master"));
  return (
    <div className="min-h-[100dvh] bg-surface lg:flex">
      <aside className="flex flex-col bg-[#0c285c] text-white lg:sticky lg:top-0 lg:h-[100dvh] lg:w-60 lg:shrink-0">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f7c948] text-[#0c285c]">
            <KeyRound className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-bold">REIMI Admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href}>
              <n.icon className="h-4 w-4 shrink-0" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-3 lg:block">
          <div className="px-3 pb-2">
            <p className="truncate text-sm font-semibold">{me.name}</p>
            <p className="text-[11px] text-white/60">{me.role === "master" ? "マスター" : "通常管理者"} · {me.timezone}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line/70 bg-surface/85 px-4 py-3 backdrop-blur lg:px-8">
          <p className="text-xs text-muted">
            時刻はすべて <b className="text-ink">{me.timezone}</b> で表示
            {me.timezone !== "Asia/Tokyo" && "（物件の現地時刻 JST を併記）"}
          </p>
          <LiveClocks tz={me.timezone} />
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
        <p className="px-8 pb-6 text-[11px] text-muted">
          <Link href="/" className="underline">公開サイト</Link> · デモデータ（組み込みDB）
        </p>
      </div>
    </div>
  );
}
