import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { requestMeta, requireMasterApi } from "@/server/auth/session";
import { DEFAULT_KEY_UI, getKeyUi, keyUiSchema, setKeyUi } from "@/server/modules/key-settings";
import { audit } from "@/server/audit";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET/PUT /api/admin/keys/settings — guest key screen settings (master only). */
export const GET = handle(async () => {
  await requireMasterApi();
  const s = await getKeyUi(await getDb());
  return NextResponse.json({ ok: true, ...s, defaults: DEFAULT_KEY_UI });
});

export const PUT = handle(async (req: Request) => {
  const me = await requireMasterApi();
  const p = keyUiSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const db = await getDb();
  const before = await getKeyUi(db);
  const ui = await setKeyUi(db, p.data, me.id);
  await audit(db, { actorType: "admin", actorId: me.id, actorLabel: me.name, action: "settings.guest_key_ui", entityType: "site_settings", entityId: "guest_key_ui", diff: { before: before.ui, after: ui }, ...requestMeta() });
  return NextResponse.json({ ok: true, ui });
});
