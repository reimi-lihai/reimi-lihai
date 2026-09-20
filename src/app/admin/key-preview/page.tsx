import type { Metadata, Viewport } from "next";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { getKeyUi, keyUiSchema } from "@/server/modules/key-settings";
import { isLocale } from "@/i18n/config";
import { localDate, zonedToUtc } from "@/server/time";
import { GuestKey, type KeyPreview, type PassView } from "@/components/key/GuestKey";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Smart Key Preview", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#0c285c" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const flag = (v: string | undefined, d: boolean) => (v === "1" ? true : v === "0" ? false : d);
const num = (v: string | undefined, d: number) => (v && /^\d+$/.test(v) ? Number(v) : d);

/**
 * /admin/key-preview — the guest smart-key screen with sample data, for the
 * master's look & feel check (embedded in 管理画面 → スマートキー). Nothing is
 * sent to a lock; unsaved settings can be previewed via query params.
 */
export default async function KeyPreviewPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const saved = (await getKeyUi(await getDb())).ui;
  const q = (k: string) => one(searchParams[k]);

  const parsed = keyUiSchema.safeParse({
    remoteEnabled: flag(q("remote"), saved.remoteEnabled),
    holdMs: num(q("hold"), saved.holdMs),
    relockSec: num(q("relock"), saved.relockSec),
    manualLock: flag(q("mlock"), saved.manualLock),
    showPin: flag(q("pin"), saved.showPin),
    showWifi: flag(q("wifi"), saved.showWifi),
    showSupport: flag(q("support"), saved.showSupport),
  });
  const ui = parsed.success ? parsed.data : saved;

  const state = q("state") ?? "active";
  const lang = q("lang");
  const doors = q("doors") === "1" ? 1 : 2;
  const outcome = (["success", "error", "limited"] as const).find((o) => o === q("outcome")) ?? "success";

  // realistic stay window: check-in 15:00 → check-out 11:00 (JST)
  const now = Date.now();
  const at = (days: number, time: string) => +zonedToUtc(localDate("Asia/Tokyo", days), time, "Asia/Tokyo");
  const window =
    state === "upcoming"
      ? { from: now + 3 * 3600_000 + 12 * 60_000, until: at(2, "11:00") } // countdown needs a start in the near future
      : state === "expired"
      ? { from: at(-3, "15:00"), until: at(-1, "11:00") }
      : { from: at(-1, "15:00"), until: at(1, "11:00") };

  const pass: PassView = {
    reservationCode: "REI-1024",
    guestName: state === "verify" ? null : "CHEN",
    propertyName: "麗海 心斎橋ステイ",
    unitName: "302",
    timezone: "Asia/Tokyo",
    validFrom: new Date(window.from).toISOString(),
    validUntil: new Date(window.until).toISOString(),
    state: state === "upcoming" ? "upcoming" : state === "expired" ? "expired" : "active",
    verified: state !== "verify",
    doors: [
      { id: "entrance", name: { ja: "エントランス", en: "Entrance", "zh-Hant": "大門", "zh-Hans": "大门", ko: "현관" }, pin: "482915" },
      { id: "room", name: { ja: "お部屋", en: "Room", "zh-Hant": "房間", "zh-Hans": "房间", ko: "객실" }, pin: "730264" },
    ].slice(0, doors),
    wifi: { ssid: "REIMI-302", password: "osaka-stay-2026" },
    ui,
  };

  const preview: KeyPreview = { pass, locale: isLocale(lang ?? null) ? (lang as KeyPreview["locale"]) : "ja", outcome };
  return <GuestKey token="preview" preview={preview} />;
}
