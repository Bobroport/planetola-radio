// Генерирует src/data/stations.json: топ станций для крупнейших городов мира
// из открытой базы Radio Browser (https://api.radio-browser.info).
//
// Запуск: npm run generate-stations

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CITIES } from "./cities.mjs";
import { EXTRA_STATIONS } from "./extra-stations.mjs";
import {
  dedupeByUrl,
  fetchJson,
  isExcludedName,
  isPlayable,
  pickServer,
  sleep,
  toStation,
} from "./station-utils.mjs";

const GEO_RADIUS_M = 30_000;
const STATIONS_PER_CITY = 40;
const REQUEST_DELAY_MS = 150;

// Список городов вынесен в scripts/cities.mjs, общие помощники — в scripts/station-utils.mjs

async function search(server, params) {
  const url = new URL("/json/stations/search", server);
  url.searchParams.set("hidebroken", "true");
  url.searchParams.set("limit", "500");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return fetchJson(url);
}

async function fetchCity(server, city) {
  const found = new Map();
  const add = (list) => {
    for (const s of list) {
      if (isPlayable(s)) found.set(s.stationuuid, s);
    }
  };

  add(await search(server, { geo_lat: city.lat, geo_long: city.long, geo_distance: GEO_RADIUS_M }));
  for (const term of city.search) {
    add(await search(server, { state: term, countrycode: city.countryCode }));
    add(await search(server, { name: term, countrycode: city.countryCode }));
  }

  const sorted = [...found.values()].sort((a, b) => b.clickcount - a.clickcount || b.votes - a.votes);
  return dedupeByUrl(sorted)
    .slice(0, STATIONS_PER_CITY)
    .map((s) => toStation(s, city.countryCode));
}

/** Русские заголовки регионов из cities.mjs → ключи, по которым приложение берёт перевод. */
const REGION_KEYS = {
  "Россия и ближнее зарубежье": "cis",
  "Европа": "europe",
  "Ближний Восток": "middleEast",
  "Азия": "asia",
  "Африка": "africa",
  "Северная Америка": "northAmerica",
  "Южная Америка": "southAmerica",
  "Австралия и Океания": "oceania",
};

/** Английские названия, которые нельзя получить из id простым «Title Case». */
const ENGLISH_NAME_OVERRIDES = {
  "rostov-on-don": "Rostov-on-Don",
  "sao-paulo": "São Paulo",
  "rio-de-janeiro": "Rio de Janeiro",
  brasilia: "Brasília",
  bogota: "Bogotá",
  medellin: "Medellín",
  cordoba: "Córdoba",
  asuncion: "Asunción",
  "san-jose": "San José",
  "ho-chi-minh": "Ho Chi Minh City",
  xian: "Xi'an",
  "dar-es-salaam": "Dar es Salaam",
  yaounde: "Yaoundé",
  krakow: "Kraków",
};

function englishName(id) {
  return (
    ENGLISH_NAME_OVERRIDES[id] ??
    id
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

/** Закреплённые станции города ставятся в начало списка; кэш на них не влияет. */
async function withExtras(server, city, stations) {
  const extras = EXTRA_STATIONS.filter((e) => e.cityId === city.id);
  if (extras.length === 0) return stations;
  const pinned = [];
  for (const extra of extras) {
    const found = await fetchJson(new URL("/json/stations/byuuid/" + extra.uuid, server));
    const s = found[0]
      ? { ...found[0], url_resolved: extra.streamUrl || found[0].url_resolved }
      : null;
    if (!s || !isPlayable(s, { allowHttp: extra.allowHttp })) {
      console.warn("  закреплённая станция пропущена (нет в базе или не играет): " + extra.uuid);
      continue;
    }
    pinned.push(toStation(s, city.countryCode));
    await sleep(REQUEST_DELAY_MS);
  }
  const pinnedIds = new Set(pinned.map((s) => s.id));
  return [...pinned, ...stations.filter((s) => !pinnedIds.has(s.id))];
}

async function main() {
  const server = await pickServer();
  console.log("Сервер:", server);

  // Кэш по городам: повторный запуск не качает уже выгруженное. `--fresh` игнорирует кэш.
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const cacheDir = path.join(scriptDir, ".cache");
  await mkdir(cacheDir, { recursive: true });
  const fresh = process.argv.includes("--fresh");

  const cities = [];
  for (const city of CITIES) {
    const cachePath = path.join(cacheDir, city.id + ".json");
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
      stations = await fetchCity(server, city);
      await writeFile(cachePath, JSON.stringify(stations), "utf8");
    }
    // Кэш мог быть собран до появления countryCode и фильтра названий: приводим к текущему формату.
    stations = stations
      .filter((s) => !isExcludedName(s.name))
      .map((s) => ({ ...s, countryCode: city.countryCode }));
    stations = await withExtras(server, city, stations);
    console.log(
      city.name.padEnd(18) + String(stations.length).padStart(3) + " станций" + (fromCache ? " (кэш)" : ""),
    );
    if (stations.length === 0) continue;
    cities.push({
      id: city.id,
      // Названия города: английское и русское. Остальные языки интерфейса показывают английское.
      name: { en: englishName(city.id), ru: city.name },
      countryCode: city.countryCode,
      region: REGION_KEYS[city.region] ?? "europe",
      lat: city.lat,
      long: city.long,
      stations,
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "https://www.radio-browser.info",
    cities,
  };

  const outPath = path.resolve(scriptDir, "../src/data/stations.json");
  await writeFile(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  const total = cities.reduce((n, c) => n + c.stations.length, 0);
  console.log("\nЗаписано " + cities.length + " городов, " + total + " станций -> " + path.relative(process.cwd(), outPath));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
