// Генерирует полные списки станций по странам (Европа, Россия, США) из Radio Browser:
// src/data/country-stations/<код>.json и индекс src/data/country-stations/index.ts.
// Остальные страны представлены только городами в stations.json.
//
// Запуск: npm run generate-countries (флаг --fresh качает заново, минуя кэш)

import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  dedupeByUrl,
  fetchJson,
  isExcludedName,
  isPlayable,
  pickServer,
  toStation,
} from "./station-utils.mjs";

/** Вся Европа (не только ЕС) плюс Россия и США. Коды ISO 3166-1, как в Radio Browser. */
export const COUNTRY_CODES = [
  "AD", "AL", "AT", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR",
  "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT",
  "NL", "NO", "PL", "PT", "RO", "RS", "SE", "SI", "SK", "SM", "UA", "VA", "XK",
  "RU",
  "US",
];

const PAGE_SIZE = 5000;

async function fetchCountry(server, code) {
  const found = new Map();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = new URL("/json/stations/bycountrycodeexact/" + code, server);
    url.searchParams.set("hidebroken", "true");
    url.searchParams.set("order", "clickcount");
    url.searchParams.set("reverse", "true");
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));
    const page = await fetchJson(url);
    for (const s of page) {
      if (isPlayable(s)) found.set(s.stationuuid, s);
    }
    if (page.length < PAGE_SIZE) break;
  }
  const sorted = [...found.values()].sort((a, b) => b.clickcount - a.clickcount || b.votes - a.votes);
  return dedupeByUrl(sorted).map((s) => toStation(s, code));
}

function indexSource(entries) {
  const lines = [
    "// Сгенерировано scripts/generate-countries.mjs — не править руками.",
    "// Полные списки станций по странам. Файл страны разбирается при первом обращении,",
    "// поэтому на старт приложения эти данные не влияют.",
    'import type { Station } from "@/data/stations";',
    "",
    "export type CountryFile = { countryCode: string; stations: Station[] };",
    "",
    "/** Страны с полным каталогом и число станций в каждой, по коду страны. */",
    "export const COUNTRY_CATALOG: { countryCode: string; count: number }[] = [",
    ...entries.map((e) => `  { countryCode: "${e.code}", count: ${e.count} },`),
    "];",
    "",
    "const LOADERS: Record<string, () => CountryFile> = {",
    ...entries.map((e) => `  ${e.code}: () => require("./${e.code}.json") as CountryFile,`),
    "};",
    "",
    "export function loadCountryFile(countryCode: string): CountryFile | undefined {",
    "  return LOADERS[countryCode]?.();",
    "}",
    "",
  ];
  return lines.join("\n");
}

async function main() {
  const server = await pickServer();
  console.log("Сервер:", server);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const cacheDir = path.join(scriptDir, ".cache", "countries");
  const outDir = path.resolve(scriptDir, "../src/data/country-stations");
  await mkdir(cacheDir, { recursive: true });
  await mkdir(outDir, { recursive: true });
  const fresh = process.argv.includes("--fresh");

  const entries = [];
  let totalBytes = 0;
  for (const code of COUNTRY_CODES) {
    const cachePath = path.join(cacheDir, code + ".json");
    let stations = null;
    if (!fresh) {
      try {
        stations = JSON.parse(await readFile(cachePath, "utf8"));
      } catch {
        stations = null;
      }
    }
    const fromCache = stations !== null;
    if (!fromCache) {
      stations = await fetchCountry(server, code);
      await writeFile(cachePath, JSON.stringify(stations), "utf8");
    }
    // Кэш мог быть собран до расширения чёрного списка названий.
    stations = stations.filter((s) => !isExcludedName(s.name));
    if (stations.length === 0) {
      console.log(code + "  нет станций, пропуск");
      continue;
    }
    const json = JSON.stringify({ countryCode: code, stations });
    await writeFile(path.join(outDir, code + ".json"), json + "\n", "utf8");
    totalBytes += json.length;
    entries.push({ code, count: stations.length });
    console.log(code + "  " + String(stations.length).padStart(5) + " станций" + (fromCache ? " (кэш)" : ""));
  }

  // Убираем файлы стран, которых больше нет в списке.
  for (const file of await readdir(outDir)) {
    const code = file.replace(/\.json$/, "");
    if (file.endsWith(".json") && !entries.some((e) => e.code === code)) {
      await unlink(path.join(outDir, file));
      console.log("удалён устаревший " + file);
    }
  }

  entries.sort((a, b) => a.code.localeCompare(b.code));
  await writeFile(path.join(outDir, "index.ts"), indexSource(entries), "utf8");
  const total = entries.reduce((n, e) => n + e.count, 0);
  console.log(
    "\nЗаписано " + entries.length + " стран, " + total + " станций, " +
      (totalBytes / 1024 / 1024).toFixed(1) + " МБ -> " + path.relative(process.cwd(), outDir),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
