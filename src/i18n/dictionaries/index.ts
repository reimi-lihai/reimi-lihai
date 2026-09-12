import type { Locale } from "../config";
import type { Dictionary } from "./_types";
import ja from "./ja";
import en from "./en";
import zhHant from "./zh-Hant";
import zhHans from "./zh-Hans";
import ko from "./ko";

export type { Dictionary };

export const dictionaries: Record<Locale, Dictionary> = {
  ja,
  en,
  "zh-Hant": zhHant,
  "zh-Hans": zhHans,
  ko,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? ja;
}

export { ja };
