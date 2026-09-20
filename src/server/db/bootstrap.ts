/**
 * Production bootstrap: creates the first master admin on an empty database.
 *
 * Set ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD (and optionally
 * ADMIN_BOOTSTRAP_NAME) in Vercel, deploy, log in once, then remove the
 * password variable. Does nothing once any admin exists. No demo data is
 * ever inserted into a DATABASE_URL database.
 */
import { adminUsers } from "./schema";
import { hashPassword } from "../auth/password";
import { ALL_PERMISSIONS } from "../auth/permissions";
import type { Db } from "./client";

export async function bootstrapMasterAdmin(db: Db): Promise<void> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;
  if (password.length < 12) {
    console.warn("[bootstrap] ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters — skipped");
    return;
  }
  const existing = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  if (existing.length) return;
  await db.insert(adminUsers).values({
    email,
    name: process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "マスター管理者",
    role: "master",
    permissions: [...ALL_PERMISSIONS],
    timezone: "Asia/Tokyo",
    passwordHash: hashPassword(password),
  });
  console.info(`[bootstrap] created master admin ${email}`);
}
