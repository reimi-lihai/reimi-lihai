import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/server/db/client";
import { cookieName, findPassByToken, guestView, sessionValue } from "@/server/modules/keys";

export const dynamic = "force-dynamic";

/** GET /api/guest/key/:token — key screen data. PINs / Wi-Fi only after verification. */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const db = await getDb();
  const row = await findPassByToken(db, params.token);
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const verified = cookies().get(cookieName(params.token))?.value === sessionValue(row.pass.id, params.token);
  return NextResponse.json({ ok: true, pass: await guestView(db, row, verified) }, { headers: { "Cache-Control": "no-store" } });
}
