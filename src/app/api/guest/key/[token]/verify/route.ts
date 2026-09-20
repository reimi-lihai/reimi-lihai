import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { checkIdentity, cookieName, findPassByToken, guestView, logKeyEvent, passState, sessionValue } from "@/server/modules/keys";
import { requestMeta } from "@/server/auth/session";
import { rateLimit } from "@/server/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/guest/key/:token/verify  { surname }
 * One-time identity check so a forwarded / photographed QR alone can't open the door.
 * 5 attempts per 15 min per pass.
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const db = await getDb();
  const row = await findPassByToken(db, params.token);
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const { ip } = requestMeta();

  if (!rateLimit(`verify:${row.pass.id}`, 5, 15 * 60_000)) {
    await logKeyEvent(db, { passId: row.pass.id, action: "verify", result: "denied", reason: "locked", ip });
    return NextResponse.json({ ok: false, error: "locked" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { surname?: unknown };
  const input = typeof body.surname === "string" ? body.surname.slice(0, 100) : "";
  if (!checkIdentity(row, input)) {
    await logKeyEvent(db, { passId: row.pass.id, action: "verify", result: "denied", reason: "mismatch", ip });
    return NextResponse.json({ ok: false, error: "mismatch" }, { status: 401 });
  }
  await logKeyEvent(db, { passId: row.pass.id, action: "verify", result: "success", ip });

  const res = NextResponse.json({ ok: true, pass: await guestView(db, row, true) });
  const state = passState(row.pass);
  if (state === "active" || state === "upcoming") {
    res.cookies.set(cookieName(params.token), sessionValue(row.pass.id, params.token), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: row.pass.validUntil,
    });
  }
  return res;
}
