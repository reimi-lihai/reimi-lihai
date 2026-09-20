import { requireAdmin } from "@/server/auth/session";
import { can, GRANTABLE, MASTER_ONLY, PERMISSIONS } from "@/server/auth/permissions";
import { listAdmins } from "@/server/modules/queries";
import { Card, PageTitle, When } from "@/components/admin/ui";
import { PermissionEditor, TimezoneForm } from "@/components/admin/client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdmin();
  const isMaster = can(me, "admins:manage");
  const admins = isMaster ? await listAdmins() : [];
  const grantable = GRANTABLE.map((k) => ({ key: k, label: PERMISSIONS[k] }));

  return (
    <>
      <PageTitle title="管理者・権限" sub="マスター1名＋通常管理者2名の体制。通常管理者には業務ごとに権限を付与します。" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {isMaster ? (
            admins.map((a) => (
              <Card
                key={a.id}
                title={
                  <span className="flex items-center gap-2">
                    {a.name}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${a.role === "master" ? "bg-[#f7c948]/40 text-amber-900" : "bg-brand/10 text-brand"}`}>{a.role === "master" ? "マスター" : "通常管理者"}</span>
                  </span>
                }
                action={<span className="text-xs text-muted">{a.email} · {a.timezone}</span>}
              >
                <p className="mb-3 text-xs text-muted">最終ログイン <When at={a.lastLoginAt} tz={me.timezone} compact /></p>
                {a.role === "master" ? (
                  <p className="text-sm text-ink">全権限（サイト設定・決済設定・売上・監査ログ・管理者管理を含む）</p>
                ) : (
                  <PermissionEditor userId={a.id} initial={a.permissions} grantable={grantable} isActive={a.isActive} />
                )}
              </Card>
            ))
          ) : (
            <Card title="あなたの権限">
              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                {grantable.map((g) => (
                  <li key={g.key} className={me.permissions.includes(g.key) ? "text-ink" : "text-muted line-through"}>{g.label}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted">権限の変更はマスターに依頼してください。</p>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card title="自分の表示タイムゾーン">
            <TimezoneForm timezone={me.timezone} mode={me.timezoneMode} />
          </Card>
          <Card title="マスター専用の権限">
            <ul className="space-y-1 text-sm text-ink">
              {Object.values(MASTER_ONLY).map((l) => <li key={l}>🔒 {l}</li>)}
            </ul>
            <p className="mt-3 text-xs text-muted">API側でも拒否されます（画面で隠すだけではありません）。</p>
          </Card>
        </div>
      </div>
    </>
  );
}
