/**
 * Admin sessions (demo auth).
 * Random token in an HttpOnly cookie; sha256(token) in admin_sessions.
 * Production: swap for Supabase Auth with mandatory TOTP — the rest of the app
 * only depends on getAdmin()/requireAdmin()/requirePermission().
 */
import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db/client";
import { adminSessions, adminUsers } from "../db/schema";
import { can, type Permission } from "./permissions";

export const ADMIN_COOKIE = "reimi_admin";
const TTL_MS = 12 * 3600_000;

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export type AdminUser = typeof adminUsers.$inferSelect;

export async function createSession(adminId: string): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);
  const h = headers();
  await db.insert(adminSessions).values({
    adminId,
    tokenHash: sha(token),
    expiresAt,
    ip: h.get("x-forwarded-for")?.split(",")[0] ?? null,
    userAgent: h.get("user-agent"),
  });
  return { token, expiresAt };
}

export async function destroySession(): Promise<void> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return;
  const db = await getDb();
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, sha(token)));
}

export async function getAdmin(): Promise<AdminUser | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ u: adminUsers })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminId))
    .where(and(eq(adminSessions.tokenHash, sha(token)), gt(adminSessions.expiresAt, new Date())));
  if (!row || !row.u.isActive) return null;
  return row.u;
}

/** For server components/pages: redirect to login if not signed in. */
export async function requireAdmin(perm?: Permission): Promise<AdminUser> {
  const u = await getAdmin();
  if (!u) redirect("/admin/login");
  if (perm && !can(u, perm)) redirect("/admin?denied=" + encodeURIComponent(perm));
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

/** For route handlers: throws HttpError(401/403). */
export async function requirePermission(perm?: Permission): Promise<AdminUser> {
  const u = await getAdmin();
  if (!u) throw new HttpError(401, "unauthorized");
  if (perm && !can(u, perm)) throw new HttpError(403, "forbidden");
  return u;
}

export function requestMeta() {
  const h = headers();
  return { ip: h.get("x-forwarded-for")?.split(",")[0] ?? null, userAgent: h.get("user-agent") };
}
