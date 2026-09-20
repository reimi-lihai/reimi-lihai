import { requireAdmin } from "@/server/auth/session";
import { listAudit } from "@/server/modules/queries";
import { PageTitle, When } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const me = await requireAdmin("audit:read");
  const rows = await listAudit(300);
  return (
    <>
      <PageTitle title="監査ログ" sub="誰が・いつ・何をしたか。追記専用（DBトリガーで更新・削除を禁止）。">
        <a href="/api/admin/audit-logs?format=csv" className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink hover:border-brand">CSVエクスポート</a>
      </PageTitle>
      <div className="overflow-x-auto rounded-2xl border border-line/80 bg-panel">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line/70 text-left text-xs font-semibold text-muted">
              <th className="px-4 py-3">日時</th>
              <th className="px-4 py-3">操作者</th>
              <th className="px-4 py-3">操作</th>
              <th className="px-4 py-3">対象</th>
              <th className="px-4 py-3">詳細</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-2.5"><When at={l.occurredAt} tz={me.timezone} /></td>
                <td className="px-4 py-2.5 text-ink">{l.actorLabel ?? l.actorType}</td>
                <td className="px-4 py-2.5"><code className="rounded bg-surface px-1.5 py-0.5 text-xs text-ink">{l.action}</code></td>
                <td className="px-4 py-2.5 text-xs text-muted">{l.entityType} {l.entityId}</td>
                <td className="max-w-[320px] truncate px-4 py-2.5 font-mono text-[11px] text-muted">{l.diff ? JSON.stringify(l.diff) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
