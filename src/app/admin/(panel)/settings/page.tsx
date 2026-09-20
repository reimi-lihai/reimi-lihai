import { requireAdmin } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getDb } from "@/server/db/client";
import { getCancellationPolicy } from "@/server/modules/settings";
import { DEFAULT_CANCELLATION_TIERS, cancellationFee } from "@/server/modules/pricing-engine";
import { Card, PageTitle, When, yen } from "@/components/admin/ui";
import { CancellationPolicyEditor } from "@/components/admin/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireAdmin("reservations:read");
  const policy = await getCancellationPolicy(await getDb());
  const canEdit = can(me, "settings:payments");
  const examples = [20, 10, 4, 1, 0].map((d) => ({ d, ...cancellationFee(100000, `2026-01-${String(1 + d).padStart(2, "0")}`, "2026-01-01", policy.tiers) }));

  return (
    <>
      <PageTitle title="設定" sub="サイト全体に関わる設定です。変更は監査ログに記録されます。" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="キャンセルポリシー"
          action={
            <span className="text-xs text-muted">
              {policy.isDefault ? "既定値を使用中" : <>最終更新 <When at={policy.updatedAt} tz={me.timezone} compact /></>}
            </span>
          }
        >
          <p className="mb-4 text-sm text-muted">
            チェックイン日（物件の現地日付）から何日前にキャンセルしたかで料率が決まります。料率はお支払い総額に対する割合です。
            変更は<b>これから行うキャンセル</b>に適用され、公開サイトのキャンセルポリシーページにも自動で反映されます。
          </p>
          <CancellationPolicyEditor initial={policy.tiers} defaults={DEFAULT_CANCELLATION_TIERS} canEdit={canEdit} />
        </Card>
        <Card title="計算例（お支払い ¥100,000）">
          <ul className="space-y-2 text-sm">
            {examples.map((e) => (
              <li key={e.d} className="flex justify-between">
                <span className="text-ink">{e.d === 0 ? "当日" : e.d === 1 ? "前日" : `${e.d}日前`}にキャンセル</span>
                <span className="tabular-nums text-muted">
                  {e.feePct}% → 返金 <b className="text-ink">{yen(e.refund)}</b>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
