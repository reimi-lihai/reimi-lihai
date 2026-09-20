import { NextResponse } from "next/server";
import { ADMIN_COOKIE, destroySession, getAdmin, requestMeta } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  const u = await getAdmin();
  await destroySession();
  if (u) await audit(await getDb(), { actorType: "admin", actorId: u.id, actorLabel: u.name, action: "auth.logout", ...requestMeta() });
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
