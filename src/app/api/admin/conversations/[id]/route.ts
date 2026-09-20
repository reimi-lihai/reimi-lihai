import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { conversations } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

const patch = z.object({
  status: z.enum(["received", "in_progress", "resolved"]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const PATCH = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requirePermission("chat");
  const p = patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const db = await getDb();
  const [c] = await db.update(conversations).set(p.data).where(eq(conversations.id, params.id)).returning();
  if (!c) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "conversation.update", entityType: "conversation", entityId: c.id, diff: p.data, ...requestMeta() });
  return NextResponse.json({ ok: true });
});
