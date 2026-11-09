import { ar } from "./ar";
import { cs } from "./cs";
import { da } from "./da";
import { de } from "./de";
import { el } from "./el";
import { en, type Dictionary } from "./en";
import { es } from "./es";
import { es419 } from "./es-419";
import { fr } from "./fr";
import { he } from "./he";
import { hi } from "./hi";
import { hr } from "./hr";
import { id } from "./id";
import { it } from "./it";
import { ja } from "./ja";
import { ko } from "./ko";
import { nb } from "./nb";
import { nl } from "./nl";
import { pl } from "./pl";
import { pt } from "./pt";
import { ptBR } from "./pt-BR";
import { ro } from "./ro";
import { ru } from "./ru";
import { sv } from "./sv";
import { tr } from "./tr";
import { uk } from "./uk";
import { zhHans } from "./zh-Hans";
import { zhHant } from "./zh-Hant";

/** Словари по коду языка. Коды совпадают с `languages.json`. */
export const DICTIONARIES: Record<string, Dictionary> = {
  ar,
  cs,
  da,
  de,
  el,
  en,
  es,
  "es-419": es419,
  fr,
  he,
  hi,
  hr,
  id,
  it,
  ja,
  ko,
  nb,
  nl,
  pl,
  pt,
  "pt-BR": ptBR,
  ro,
  ru,
  sv,
  tr,
  uk,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};
