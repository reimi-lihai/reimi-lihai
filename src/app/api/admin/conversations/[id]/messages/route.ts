import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { conversations, messages } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

const body = z.object({ body: z.string().trim().min(1).max(4000) });

/** POST /api/admin/conversations/:id/messages — reply (stored verbatim, no translation). */
export const POST = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requirePermission("chat");
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const db = await getDb();
  const [c] = await db.select().from(conversations).where(eq(conversations.id, params.id));
  if (!c) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const [m] = await db.insert(messages).values({ conversationId: c.id, senderType: "admin", senderId: me.id, body: p.data.body }).returning();
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date(), status: c.status === "received" ? "in_progress" : c.status, assigneeId: c.assigneeId ?? me.id })
    .where(eq(conversations.id, c.id));
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "conversation.reply", entityType: "conversation", entityId: c.id, ...requestMeta() });
  return NextResponse.json({ ok: true, message: m });
});
