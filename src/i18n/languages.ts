import languages from "./languages.json";

export type LanguageInfo = {
  /** Код BCP 47: он же ключ словаря и локаль для дат. */
  code: string;
  /** Название языка на нём самом. */
  native: string;
  /** Название языка по-английски. */
  english: string;
};

/** Языки интерфейса в порядке показа на экране выбора. */
export const LANGUAGES: LanguageInfo[] = languages;

export const DEFAULT_LANGUAGE = "en";

export function isLanguage(code: unknown): code is string {
  return typeof code === "string" && LANGUAGES.some((l) => l.code === code);
}

export function getLanguage(code: string): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE)!;
}
