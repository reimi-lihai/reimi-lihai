import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb } from "@/server/db/client";
import { reservations } from "@/server/db/schema";
import { requestMeta, requirePermission } from "@/server/auth/session";
import { issuePass } from "@/server/modules/keys";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reservations/:code/access-passes
 * Issues a new guest key (previous one is revoked). The raw token is returned
 * ONCE here — only its hash is stored — so the admin sends it right away.
 */
export const POST = handle(async (req: Request, { params }: { params: { code: string } }) => {
  const me = await requirePermission("keys");
  const db = await getDb();
  const [r] = await db.select().from(reservations).where(eq(reservations.code, params.code));
  if (!r) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  try {
    const { token, passId } = await issuePass(db, { reservationId: r.id, adminId: me.id });
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const url = `${origin}/key/${token}`;
    const qrSvg = await QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      color: { dark: "#0c285cff", light: "#ffffffff" },
    });
    await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "access_pass.issue", entityType: "reservation", entityId: r.code, diff: { passId }, ...requestMeta() });
    return NextResponse.json({ ok: true, passId, url, qrSvg });
  } catch (e) {
    const code = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false, error: code }, { status: 409 });
  }
});
