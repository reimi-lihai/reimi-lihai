import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { listConversations } from "@/server/modules/queries";
import { Badge, CATEGORY_LABEL, COUNTRY_FLAG, PageTitle, When } from "@/components/admin/ui";
import { ConversationStatus, ReplyBox } from "@/components/admin/client";

export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: { id?: string; status?: string } }) {
  const me = await requireAdmin("chat");
  const all = await listConversations();
  const list = searchParams.status ? all.filter((x) => x.c.status === searchParams.status) : all;
  const current = all.find((x) => x.c.id === searchParams.id) ?? list[0];
  const canChat = can(me, "chat");

  return (
    <>
      <PageTitle title="チャット インボックス" sub="ゲストの原文をそのまま表示します（自動翻訳なし）。カテゴリで担当者を自動振り分け。" />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="rounded-2xl border border-line/80 bg-panel">
          <div className="flex gap-1 border-b border-line/70 p-2 text-xs font-semibold">
            {[["", "すべて"], ["received", "受付済み"], ["in_progress", "対応中"], ["resolved", "解決済み"]].map(([v, l]) => (
              <Link key={v} href={`/admin/inbox${v ? `?status=${v}` : ""}`} className={`rounded-lg px-2.5 py-1.5 ${(searchParams.status ?? "") === v ? "bg-brand text-white" : "text-ink hover:bg-surface"}`}>{l}</Link>
            ))}
          </div>
          <ul className="max-h-[70vh] divide-y divide-line/60 overflow-y-auto">
            {list.map(({ c, cust, r, a, messages }) => {
              const last = messages[messages.length - 1];
              const selected = current?.c.id === c.id;
              return (
                <li key={c.id}>
                  <Link href={`/admin/inbox?id=${c.id}${searchParams.status ? `&status=${searchParams.status}` : ""}`} className={`block px-4 py-3 ${selected ? "bg-brand/5" : "hover:bg-surface"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-ink">{COUNTRY_FLAG[cust?.country ?? ""] ?? ""} {cust?.givenName} {cust?.familyName}</span>
                      <Badge status={c.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">{last?.body}</p>
                    <p className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>{CATEGORY_LABEL[c.category]}{r ? ` · ${r.code}` : ""}</span>
                      <span>{a?.name ?? "未割当"}</span>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {current ? (
          <div className="flex flex-col rounded-2xl border border-line/80 bg-panel">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-5 py-3">
              <div>
                <p className="font-bold text-ink">{current.cust?.givenName} {current.cust?.familyName}</p>
                <p className="text-xs text-muted">
                  {CATEGORY_LABEL[current.c.category]} · 担当 {current.a?.name ?? "未割当"}
                  {current.r && (<> · <Link href={`/admin/reservations/${current.r.code}`} className="font-semibold text-brand">{current.r.code}</Link></>)}
                </p>
              </div>
              <ConversationStatus id={current.c.id} status={current.c.status} canChat={canChat} />
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-5">
              {current.messages.map((m) => (
                <div key={m.id} className={`flex ${m.senderType === "admin" ? "justify-end" : ""}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${m.senderType === "admin" ? "bg-brand text-white" : "bg-surface text-ink"}`}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${m.senderType === "admin" ? "text-white/70" : "text-muted"}`}><When at={m.createdAt} tz={me.timezone} compact /></p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4">
              <ReplyBox conversationId={current.c.id} guestLocale={current.cust?.preferredLocale ?? "en"} canChat={canChat} />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-line/80 bg-panel p-10 text-center text-sm text-muted">会話はありません</div>
        )}
      </div>
    </>
  );
}
