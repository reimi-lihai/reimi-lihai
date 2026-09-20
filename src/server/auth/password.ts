import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** scrypt password hash: scrypt$<salt>$<hash>. Production: Supabase Auth (+TOTP) replaces this. */
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(pw, salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const a = scryptSync(pw, salt, 32);
  const b = Buffer.from(hash, "base64url");
  return a.length === b.length && timingSafeEqual(a, b);
}
