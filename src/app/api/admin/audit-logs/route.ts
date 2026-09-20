import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";
import { requirePermission } from "@/server/auth/session";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/audit-logs[?format=csv] — master only. CSV has a UTF-8 BOM for Excel. */
export const GET = handle(async (req: Request) => {
  await requirePermission("audit:read");
  const db = await getDb();
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.occurredAt)).limit(5000);
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["occurred_at_utc", "actor", "action", "entity_type", "entity_id", "ip", "diff"].join(","),
      ...rows.map((r) => [r.occurredAt.toISOString(), r.actorLabel ?? r.actorType, r.action, r.entityType, r.entityId, r.ip, JSON.stringify(r.diff ?? "")].map(esc).join(",")),
    ];
    return new Response("﻿" + lines.join("\r\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="audit-logs.csv"' },
    });
  }
  return NextResponse.json({ ok: true, logs: rows });
});
