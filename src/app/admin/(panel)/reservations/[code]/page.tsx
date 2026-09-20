import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, KeyRound, ListChecks, Mail, MessagesSquare, Phone, ScrollText } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { reservationDetail } from "@/server/modules/queries";
import { passState } from "@/server/modules/keys";
import { nightsBetween } from "@/server/time";
import { Badge, CATEGORY_LABEL, Card, COUNTRY_FLAG, When, loc, yen } from "@/components/admin/ui";
import { CancelPanel, IssueKeyPanel, RefundForm, ReplyBox, ReservationStatusSelect } from "@/components/admin/client";

export const dynamic = "force-dynamic";

export default async function ReservationDetail({ params }: { params: { code: string } }) {
  const me = await requireAdmin("reservations:read");
  const d = await reservationDetail(params.code);
  if (!d) notFound();
  const { r, p, c } = d;
  const tz = me.timezone;
  const active = d.passes.find((x) => x.status === "active");
  const activeState = active ? passState(active) : null;
  const price = r.priceSnapshot as { nights?: number; nightly?: number; cleaningFee?: number; serviceFee?: number; taxes?: number; total?: number };

  return (
    <>
      <Link href="/admin/reservations" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-brand">
        <ArrowLeft className="h-3.5 w-3.5" /> 予約一覧
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-ink">{r.code}</h1>
            <Badge status={r.status} />
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">{r.kind === "stay" ? "宿泊" : "内見"}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{loc(p.name)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ReservationStatusSelect code={r.code} status={r.status} canEdit={can(me, "reservations:write")} />
          {r.kind === "stay" && r.status !== "cancelled" && (
            <CancelPanel code={r.code} canCancel={can(me, "reservations:write")} canRefund={can(me, "payments:refund")} />
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="予約内容">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              {r.kind === "stay" ? (
                <>
                  <Item label="チェックイン">
                    {r.checkIn} {p.checkInTime}（現地）
                  </Item>
                  <Item label="チェックアウト">
                    {r.checkOut} {p.checkOutTime}（現地）
                  </Item>
                  <Item label="泊数・人数">
                    {nightsBetween(r.checkIn!, r.checkOut!)}泊 · 大人{r.adults}
                    {r.children ? ` · 子ども${r.children}` : ""}
                  </Item>
                </>
              ) : (
                <Item label="内見日時"><When at={r.startsAt} tz={tz} /></Item>
              )}
              <Item label="予約経路">{r.source}{r.utmSource ? ` / utm_source=${r.utmSource}` : ""}</Item>
              <Item label="予約日時"><When at={r.createdAt} tz={tz} /></Item>
              <Item label="ゲストの言語">{r.locale}</Item>
              {r.note && <Item label="メモ">{r.note}</Item>}
              {r.arrivalTime && <Item label="到着予定">{r.arrivalTime}</Item>}
              {r.messagingId && <Item label="メッセージアプリID">{r.messagingId}</Item>}
              {r.guestNote && <Item label="ゲストからの要望">{r.guestNote}</Item>}
              {r.status === "pending_payment" && r.holdExpiresAt && <Item label="仮押さえ期限"><When at={r.holdExpiresAt} tz={tz} /></Item>}
            </dl>
            {price.total ? (
              <div className="mt-5 rounded-xl bg-surface p-4 text-sm">
                <Row l={`宿泊料（${price.nights}泊）`} v={price.nightly} />
                <Row l="清掃料" v={price.cleaningFee} />
                <Row l="サービス料" v={price.serviceFee} />
                <Row l="税" v={price.taxes} />
                <div className="mt-2 flex justify-between border-t border-line pt-2 font-bold text-ink">
                  <span>合計</span>
                  <span className="tabular-nums">{yen(price.total)}</span>
                </div>
                <p className="mt-2 text-[11px] text-muted">予約時点の料金スナップショット（後から料金ルールを変えても変わりません）</p>
              </div>
            ) : null}
          </Card>

          {r.kind === "stay" && (
            <Card
              title={
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-brand" /> ゲスト用スマートキー
                </span>
              }
              action={active ? <Badge status={activeState!} /> : <Badge status="expired">未発行</Badge>}
            >
              {active && (
                <div className="mb-4 grid gap-3 rounded-xl bg-surface p-4 text-sm sm:grid-cols-3">
                  <Item label="有効期間 開始"><When at={active.validFrom} tz={tz} /></Item>
                  <Item label="有効期間 終了"><When at={active.validUntil} tz={tz} /></Item>
                  <Item label="最終利用"><When at={active.lastUsedAt} tz={tz} /></Item>
                </div>
              )}
              <IssueKeyPanel code={r.code} activePassId={active?.id ?? null} canIssue={can(me, "keys")} guestEmail={c.email} />

              {d.credentials.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold text-muted">予約期間限定の暗証番号（通信障害時のバックアップ）</p>
                  <div className="flex flex-wrap gap-2">
                    {d.credentials.map(({ c: cr, d: dev }) => (
                      <div key={cr.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                        <span className="text-xs text-muted">{loc(dev.name)}</span>
                        <span className="ml-2 font-mono font-bold tracking-widest text-ink">
                          {can(me, "keys") ? cr.pinCode.replace(/^(\d{2})\d+(\d{2})$/, "$1••$2") : "••••••"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold text-muted">解錠ログ（直近）</p>
                {d.keyEvents.length ? (
                  <ul className="divide-y divide-line/60 text-sm">
                    {d.keyEvents.map(({ e, door }) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-ink">
                          {e.action === "verify" ? "本人確認" : `${e.action === "lock" ? "施錠" : "解錠"} ${door ? loc(door) : ""}`}
                          {e.reason && <span className="ml-2 text-xs text-muted">{e.reason}</span>}
                        </span>
                        <span className="flex items-center gap-3">
                          <When at={e.occurredAt} tz={tz} compact />
                          <Badge status={e.result} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">まだ利用されていません</p>
                )}
              </div>
            </Card>
          )}

          {d.conversations.map((cv) => (
            <Card
              key={cv.id}
              title={
                <span className="flex items-center gap-2">
                  <MessagesSquare className="h-4 w-4 text-brand" /> チャット · {CATEGORY_LABEL[cv.category]}
                </span>
              }
              action={<Badge status={cv.status} />}
            >
              <div className="space-y-2">
                {d.messages.filter((m) => m.conversationId === cv.id).map((m) => (
                  <div key={m.id} className={`flex ${m.senderType === "admin" ? "justify-end" : ""}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.senderType === "admin" ? "bg-brand text-white" : "bg-surface text-ink"}`}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${m.senderType === "admin" ? "text-white/70" : "text-muted"}`}>
                        <When at={m.createdAt} tz={tz} compact />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <ReplyBox conversationId={cv.id} guestLocale={r.locale} canChat={can(me, "chat")} />
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card title="ゲスト">
            <p className="text-lg font-bold text-ink">
              {COUNTRY_FLAG[c.country ?? ""] ?? ""} {c.givenName} {c.familyName}
            </p>
            <div className="mt-3 space-y-1.5 text-sm text-ink">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted" /> {c.email}</p>
              {c.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted" /> {c.phone}</p>}
            </div>
            {c.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.tags.map((t) => (
                  <span key={t} className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                    {{ stay_only: "宿泊のみ", viewed_property: "不動産内見済み", medical_beauty: "医療・美容目的" }[t] ?? t}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card title={<span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-brand" /> 決済</span>}>
            {d.payments.length ? (
              <ul className="space-y-2 text-sm">
                {d.payments.map((pm) => (
                  <li key={pm.id} className="rounded-lg bg-surface p-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-ink">{pm.kind === "charge" ? "カード決済" : pm.kind === "preauth" ? "プレオーソリ" : "デポジット"}</span>
                      <span className="tabular-nums text-ink">{yen(pm.amount)}</span>
                    </div>
                    <p className="mt-1 flex items-center justify-between text-xs text-muted">
                      <span className="font-mono">{pm.stripePaymentIntentId}</span>
                      <span>{pm.amountRefunded ? `返金 ${yen(pm.amountRefunded)}` : pm.status}</span>
                    </p>
                    {can(me, "payments:refund") && <RefundForm paymentId={pm.id} max={pm.amountCaptured - pm.amountRefunded} />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">決済はまだありません</p>
            )}
            {!can(me, "payments:refund") && <p className="mt-2 text-[11px] text-muted">返金操作の権限はありません</p>}
          </Card>

          <Card title={<span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-brand" /> 連動タスク</span>}>
            {d.tasks.length ? (
              <ul className="space-y-2 text-sm">
                {d.tasks.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-2">
                    <span className="text-ink">{t.title}<span className="block text-xs text-muted"><When at={t.dueAt} tz={tz} compact /></span></span>
                    <Badge status={t.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">タスクはありません</p>
            )}
          </Card>

          <Card title={<span className="flex items-center gap-2"><ScrollText className="h-4 w-4 text-brand" /> 変更履歴</span>}>
            {d.history.length ? (
              <ul className="space-y-2 text-xs">
                {d.history.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span className="text-ink">{h.actorLabel ?? (h.actorType === "system" ? "システム" : "ゲスト")} · {h.action}</span>
                    <When at={h.occurredAt} tz={tz} compact />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">記録はまだありません</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

function Row({ l, v }: { l: string; v?: number }) {
  if (!v) return null;
  return (
    <div className="flex justify-between py-0.5 text-ink">
      <span className="text-muted">{l}</span>
      <span className="tabular-nums">{yen(v)}</span>
    </div>
  );
}
