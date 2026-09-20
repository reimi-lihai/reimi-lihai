import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { adminUsers } from "@/server/db/schema";
import { verifyPassword } from "@/server/auth/password";
import { ADMIN_COOKIE, createSession, requestMeta } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/rateLimit";

export const dynamic = "force-dynamic";

const body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  timezone: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const meta = requestMeta();
  if (!rateLimit(`login:${meta.ip ?? "?"}`, 10, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  const db = await getDb();
  const [u] = await db.select().from(adminUsers).where(eq(adminUsers.email, parsed.data.email.toLowerCase()));
  if (!u || !u.isActive || !verifyPassword(parsed.data.password, u.passwordHash)) {
    await audit(db, { actorType: "system", action: "auth.login_failed", entityType: "admin_user", entityId: parsed.data.email, ...meta });
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  // Timezone auto-follow: an admin logging in from Toronto sees Toronto time.
  const tz = parsed.data.timezone;
  const validTz = tz && Intl.supportedValuesOf("timeZone").includes(tz) ? tz : null;
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date(), ...(u.timezoneMode === "auto" && validTz ? { timezone: validTz } : {}) })
    .where(eq(adminUsers.id, u.id));

  const { token, expiresAt } = await createSession(u.id);
  await audit(db, { actorType: "admin", actorId: u.id, actorLabel: u.name, action: "auth.login", entityType: "admin_user", entityId: u.id, diff: { timezone: validTz }, ...meta });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return res;
}
