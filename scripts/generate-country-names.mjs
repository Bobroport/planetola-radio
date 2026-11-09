// Генерирует src/data/country-names.json: названия стран на всех языках интерфейса.
// Источник — данные Unicode CLDR, встроенные в Node (Intl.DisplayNames). Сети не требует.
// Hermes в приложении Intl.DisplayNames не поддерживает, поэтому таблица готовится заранее.
//
// Запускается в конце `npm run generate-stations`.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const languages = JSON.parse(await readFile(path.join(root, "src/i18n/languages.json"), "utf8"));
const stations = JSON.parse(await readFile(path.join(root, "src/data/stations.json"), "utf8"));

const countryCodes = [...new Set(stations.cities.map((c) => c.countryCode))].sort();

const output = {};
for (const { code } of languages) {
  const names = new Intl.DisplayNames([code], { type: "region" });
  output[code] = Object.fromEntries(countryCodes.map((cc) => [cc, names.of(cc) ?? cc]));
}

const outPath = path.join(root, "src/data/country-names.json");
await writeFile(outPath, JSON.stringify(output, null, 1) + "\n", "utf8");
console.log(
  `Названия стран: ${countryCodes.length} стран × ${languages.length} языков -> ${path.relative(root, outPath)}`,
);
