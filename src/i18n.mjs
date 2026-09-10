import { languages } from "./data.mjs";
import ja from "./dictionaries/ja.mjs";
import en from "./dictionaries/en.mjs";
import zhHant from "./dictionaries/zh-Hant.mjs";
import zhHans from "./dictionaries/zh-Hans.mjs";
import ko from "./dictionaries/ko.mjs";

export const defaultLanguage = "ja";
export const storageKey = "reikai.language";
const supportedCodes = new Set(languages.map((language) => language.code));

export const dictionaries = {
  ja,
  en,
  "zh-Hant": zhHant,
  "zh-Hans": zhHans,
  ko
};

export function normalizeLanguage(code) {
  return supportedCodes.has(code) ? code : defaultLanguage;
}

export function getStoredLanguage(storage = globalThis.localStorage) {
  try {
    return normalizeLanguage(storage?.getItem(storageKey));
  } catch {
    return defaultLanguage;
  }
}

export function storeLanguage(code, storage = globalThis.localStorage) {
  const normalized = normalizeLanguage(code);
  try {
    storage?.setItem(storageKey, normalized);
  } catch {
    return normalized;
  }
  return normalized;
}

export function t(lang, key, params = {}) {
  const normalized = normalizeLanguage(lang);
  const value = readKey(dictionaries[normalized], key) ?? readKey(dictionaries[defaultLanguage], key) ?? key;
  if (typeof value !== "string") return key;
  return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
}

export function pickLocalized(value, lang) {
  if (!value || typeof value !== "object") return String(value ?? "");
  return value[normalizeLanguage(lang)] || value[defaultLanguage] || Object.values(value)[0] || "";
}

export function formatCurrency(amount, lang) {
  const locale = languages.find((language) => language.code === normalizeLanguage(lang))?.locale || "ja-JP";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateText, lang) {
  if (!dateText) return "";
  const locale = languages.find((language) => language.code === normalizeLanguage(lang))?.locale || "ja-JP";
  const [year, month, day] = dateText.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

function readKey(source, key) {
  return key.split(".").reduce((current, part) => current?.[part], source);
}
