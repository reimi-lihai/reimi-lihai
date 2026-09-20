/** Business settings stored in site_settings (key → jsonb), with safe defaults. */
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { siteSettings } from "../db/schema";
import { DEFAULT_CANCELLATION_TIERS, normalizeTiers, type CancellationTier } from "./pricing-engine";

export const CANCELLATION_KEY = "cancellation_policy";

export const tiersSchema = z
  .array(z.object({ minDays: z.number().int().min(0).max(365), feePct: z.number().int().min(0).max(100) }))
  .min(1)
  .max(10);

export async function getCancellationPolicy(db: Db): Promise<{ tiers: CancellationTier[]; isDefault: boolean; updatedAt: Date | null }> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, CANCELLATION_KEY));
  const parsed = row ? tiersSchema.safeParse((row.value as { tiers?: unknown }).tiers) : null;
  if (!parsed?.success) return { tiers: normalizeTiers(DEFAULT_CANCELLATION_TIERS), isDefault: true, updatedAt: null };
  return { tiers: normalizeTiers(parsed.data), isDefault: false, updatedAt: row!.updatedAt };
}

export async function setCancellationPolicy(db: Db, tiers: CancellationTier[], adminId: string) {
  const clean = normalizeTiers(tiers);
  const value = { tiers: clean };
  await db
    .insert(siteSettings)
    .values({ key: CANCELLATION_KEY, value, updatedBy: adminId })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedBy: adminId, updatedAt: new Date() } });
  return clean;
}

export async function resetCancellationPolicy(db: Db) {
  await db.delete(siteSettings).where(eq(siteSettings.key, CANCELLATION_KEY));
}
