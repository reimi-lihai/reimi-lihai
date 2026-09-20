import { redirect } from "next/navigation";
import { asc, desc, eq, like } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { auditLogs, guestAccessPasses, lockDevices, properties, reservations, unlockEvents } from "@/server/db/schema";
import { DEFAULT_KEY_UI, getKeyUi } from "@/server/modules/key-settings";
import { TEST_SLUG, getTestStatus } from "@/server/modules/key-test";
import { formatInTz } from "@/server/time";
import { Badge, Card, PageTitle, When, loc } from "@/components/admin/ui";
import { DoorControl, KeyDesignStudio, TestKeyPanel, type DoorRow } from "@/components/admin/keys";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = { verify: "本人確認", unlock: "解錠", lock: "施錠" };

export default async function KeysPage() {
  const me = await requireAdmin();
  if (me.role !== "master") redirect("/admin?denied=master");
  const db = await getDb();

  const [{ ui }, test, doorRows, guestEvents, adminEvents] = await Promise.all([
    getKeyUi(db),
    getTestStatus(db),
    db
      .select({ d: lockDevices, p: properties })
      .from(lockDevices)
      .innerJoin(properties, eq(properties.id, lockDevices.propertyId))
      .orderBy(asc(properties.createdAt), asc(lockDevices.sortOrder)),
    db
      .select({ e: unlockEvents, code: reservations.code, door: lockDevices.name })
      .from(unlockEvents)
      .innerJoin(guestAccessPasses, eq(guestAccessPasses.id, unlockEvents.passId))
      .innerJoin(reservations, eq(reservations.id, guestAccessPasses.reservationId))
      .leftJoin(lockDevices, eq(lockDevices.id, unlockEvents.lockDeviceId))
      .orderBy(desc(unlockEvents.occurredAt))
      .limit(30),
    db.select().from(auditLogs).where(like(auditLogs.action, "lock.remote_%")).orderBy(desc(auditLogs.occurredAt)).limit(30),
  ]);

  const doors: DoorRow[] = doorRows.map(({ d, p }) => ({
    id: d.id,
    name: loc(d.name),
    property: loc(p.name),
    provider: d.provider,
    battery: d.batteryLevel,
    lastSeen: d.lastSeenAt ? formatInTz(d.lastSeenAt, me.timezone) : null,
    isTest: p.slug === TEST_SLUG,
  }));

  type Ev = { at: Date; who: string; action: string; door: string; result: string; reason: string | null };
  const events: Ev[] = [
    ...guestEvents.map(({ e, code, door }) => ({
      at: e.occurredAt,
      who: `ゲスト（${code}）`,
      action: ACTION_LABEL[e.action] ?? e.action,
      door: door ? loc(door) : "—",
      result: e.result,
      reason: e.reason,
    })),
    ...adminEvents.map((a) => {
      const d = (a.diff ?? {}) as { door?: string; ok?: boolean };
      return {
        at: a.occurredAt,
        who: `管理者（${a.actorLabel ?? "—"}）`,
        action: a.action === "lock.remote_lock" ? "遠隔施錠" : "遠隔解錠",
        door: d.door ?? "—",
        result: d.ok === false ? "error" : "success",
        reason: null,
      };
    }),
  ]
    .sort((a, b) => +b.at - +a.at)
    .slice(0, 30);

  return (
    <>
      <PageTitle
        title="スマートキー"
        sub="ゲスト用の鍵画面の見た目確認・設定と、鍵の動作確認ができます（マスター専用）。変更と操作はすべて記録されます。"
      />

      <KeyDesignStudio saved={ui} defaults={DEFAULT_KEY_UI} />

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="スマホで実際に試す（テストキー）">
          <TestKeyPanel exists={!!test} activeUntil={test?.pass ? test.pass.validUntil.toISOString() : null} />
        </Card>
        <Card title="鍵の遠隔操作">
          <DoorControl doors={doors} />
        </Card>
      </div>

      <Card title="操作履歴（最新30件）" className="mt-6">
        {events.length === 0 ? (
          <p className="text-sm text-muted">まだ操作はありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2">日時</th>
                  <th className="pb-2">操作した人</th>
                  <th className="pb-2">操作</th>
                  <th className="pb-2">ドア</th>
                  <th className="pb-2">結果</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {events.map((e, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3">
                      <When at={e.at} tz={me.timezone} compact />
                    </td>
                    <td className="py-2 pr-3 text-ink">{e.who}</td>
                    <td className="py-2 pr-3 text-ink">{e.action}</td>
                    <td className="py-2 pr-3 text-ink">{e.door}</td>
                    <td className="py-2">
                      <Badge status={e.result} />
                      {e.reason && <span className="ml-1.5 text-[11px] text-muted">{REASON[e.reason] ?? e.reason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

const REASON: Record<string, string> = {
  mismatch: "姓が不一致",
  locked: "試行回数超過",
  rate_limited: "回数制限",
  remote_disabled: "アプリ解錠停止中",
  pass_upcoming: "開始前",
  pass_expired: "期限切れ",
  pass_revoked: "失効済み",
};
