import type { Db } from "./db/client";
import { auditLogs } from "./db/schema";

export interface AuditInput {
  actorType: "admin" | "guest" | "system";
  actorId?: string | null;
  actorLabel?: string | null;
  action: string; // e.g. "reservation.update", "access_pass.issue"
  entityType?: string;
  entityId?: string;
  diff?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/** Append one audit record. Never throws into the caller's flow. */
export async function audit(db: Db, input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      actorLabel: input.actorLabel ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      diff: (input.diff ?? null) as never,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
