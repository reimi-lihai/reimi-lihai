import test from "node:test";
import assert from "node:assert/strict";
import { formatCurrency, normalizeLanguage, pickLocalized, t } from "../src/i18n.mjs";

test("i18n falls back to Japanese when language or key is missing", () => {
  assert.equal(normalizeLanguage("fr"), "ja");
  assert.equal(t("fr", "common.booking"), "宿泊予約");
  assert.equal(t("en", "missing.key"), "missing.key");
});

test("pickLocalized chooses requested language and then Japanese", () => {
  assert.equal(pickLocalized({ ja: "日本語", en: "English" }, "en"), "English");
  assert.equal(pickLocalized({ ja: "日本語" }, "ko"), "日本語");
});

test("formatCurrency formats Japanese yen without decimals", () => {
  assert.equal(formatCurrency(72600, "ja"), "￥72,600");
});
