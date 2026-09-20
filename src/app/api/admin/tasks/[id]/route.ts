import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { tasks } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

const patch = z.object({ status: z.enum(["todo", "doing", "done"]) });

export const PATCH = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requirePermission("tasks");
  const p = patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const db = await getDb();
  const [t] = await db.update(tasks).set(p.data).where(eq(tasks.id, params.id)).returning();
  if (!t) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "task.update", entityType: "task", entityId: t.id, diff: { status: p.data.status, title: t.title }, ...requestMeta() });
  return NextResponse.json({ ok: true });
});
