/**
 * Guest smart-key screen settings (master-editable, stored in site_settings).
 * Applies to every guest key page immediately — no redeploy.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { siteSettings } from "../db/schema";

export const KEY_UI_KEY = "guest_key_ui";

export const keyUiSchema = z.object({
  /** false = emergency stop: remote unlock/lock disabled for all guests (door code still shown) */
  remoteEnabled: z.boolean(),
  /** press-and-hold duration before unlocking (ms) */
  holdMs: z.number().int().min(500).max(3000),
  /** countdown shown after unlocking until the lock re-locks itself (s) */
  relockSec: z.number().int().min(3).max(60),
  /** show a "lock now" button while unlocked */
  manualLock: z.boolean(),
  showPin: z.boolean(),
  showWifi: z.boolean(),
  showSupport: z.boolean(),
});

export type KeyUiSettings = z.infer<typeof keyUiSchema>;

export const DEFAULT_KEY_UI: KeyUiSettings = {
  remoteEnabled: true,
  holdMs: 1200,
  relockSec: 8,
  manualLock: true,
  showPin: true,
  showWifi: true,
  showSupport: true,
};

export async function getKeyUi(db: Db): Promise<{ ui: KeyUiSettings; isDefault: boolean; updatedAt: Date | null }> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, KEY_UI_KEY));
  if (!row) return { ui: DEFAULT_KEY_UI, isDefault: true, updatedAt: null };
  // merge so settings added later get their defaults
  const parsed = keyUiSchema.safeParse({ ...DEFAULT_KEY_UI, ...(row.value as object) });
  return { ui: parsed.success ? parsed.data : DEFAULT_KEY_UI, isDefault: false, updatedAt: row.updatedAt };
}

export async function setKeyUi(db: Db, ui: KeyUiSettings, adminId: string) {
  await db
    .insert(siteSettings)
    .values({ key: KEY_UI_KEY, value: ui, updatedBy: adminId })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: ui, updatedBy: adminId, updatedAt: new Date() } });
  return ui;
}
