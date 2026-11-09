import { useCallback } from "react";

import { useSettings } from "@/providers/settings-provider";

import { DICTIONARIES } from "./translations";
import { en, type TranslationKey } from "./translations/en";

export type { TranslationKey } from "./translations/en";
export { DEFAULT_LANGUAGE, getLanguage, isLanguage, LANGUAGES, type LanguageInfo } from "./languages";

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

/** Строка на нужном языке с подстановкой `{имя}`; если перевода нет, берётся английский. */
export function translate(language: string, key: TranslationKey, params?: TranslateParams): string {
  const template = DICTIONARIES[language]?.[key] ?? en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Ключ перевода для региона из данных (`europe` → `region.europe`). */
export function regionKey(region: string): TranslationKey {
  const key = `region.${region}`;
  return key in en ? (key as TranslationKey) : "region.europe";
}

/** Текущий язык интерфейса и функция перевода. Перерисовывает компонент при смене языка. */
export function useI18n(): { language: string; t: Translate } {
  const { language } = useSettings();
  const t = useCallback<Translate>((key, params) => translate(language, key, params), [language]);
  return { language, t };
}
