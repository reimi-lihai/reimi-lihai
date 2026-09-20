import { NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { getDb } from "@/server/db/client";
import { requestMeta, requireMasterApi } from "@/server/auth/session";
import { TEST_CODE, TEST_SURNAME, issueTestKey, removeKeyTest } from "@/server/modules/key-test";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

const body = z.object({ mode: z.enum(["active", "upcoming"]).default("active") });

/** POST /api/admin/keys/test — issue a test guest key (demo doors) and return URL + QR. */
export const POST = handle(async (req: Request) => {
  const me = await requireMasterApi();
  const p = body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const db = await getDb();
  const t = await issueTestKey(db, me.id, p.data.mode);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const url = `${origin}/key/${t.token}`;
  const qrSvg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#0c285cff", light: "#ffffffff" } });
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "access_pass.issue_test", entityType: "reservation", entityId: TEST_CODE, diff: { passId: t.passId, mode: p.data.mode }, ...requestMeta() });
  return NextResponse.json({ ok: true, url, qrSvg, surname: TEST_SURNAME, validFrom: t.validFrom, validUntil: t.validUntil });
});

/** DELETE /api/admin/keys/test — remove the whole test set. */
export const DELETE = handle(async () => {
  const me = await requireMasterApi();
  const db = await getDb();
  await removeKeyTest(db);
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "access_pass.test_removed", entityType: "reservation", entityId: TEST_CODE, ...requestMeta() });
  return NextResponse.json({ ok: true });
});
