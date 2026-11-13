// Генерирует src/data/stations.json: топ станций для крупнейших городов мира
// из открытой базы Radio Browser (https://api.radio-browser.info).
//
// Для стран с полным списком станций (src/data/country-stations/, см. generate-countries.mjs)
// станции дополнительно раскладываются по городам: к городам из cities.mjs добавляются все
// их станции из списка страны, а скопления станций вне известных городов становятся новыми
// городами по справочнику GeoNames (scripts/city-matching.mjs). Поэтому сначала
// `npm run generate-countries`, затем `npm run generate-stations`.
//
// Запуск: npm run generate-stations

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CITIES } from "./cities.mjs";
import {
  assignStationsToCities,
  isViableNewCity,
  slugify,
} from "./city-matching.mjs";
import { EXTRA_STATIONS } from "./extra-stations.mjs";
import { loadCityNames, loadGeoNamesCities } from "./geonames.mjs";
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

/**
 * Английские названия, которые нельзя получить из id простым «Title Case»,
 * и поправки к английским названиям GeoNames для городов, заведённых автоматически.
 */
const ENGLISH_NAME_OVERRIDES = {
  patra: "Patras",
  xanthi: "Xanthi",
  pyrgos: "Pyrgos",
  ibiza: "Ibiza",
  ruse: "Ruse",
  "halle-saale": "Halle (Saale)",
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

  const allCities = await addCountryStations(cities, scriptDir, cacheDir);

  const output = {
    generatedAt: new Date().toISOString(),
    source: "https://www.radio-browser.info",
    cities: allCities,
  };

  const outPath = path.resolve(scriptDir, "../src/data/stations.json");
  await writeFile(outPath, JSON.stringify(output) + "\n", "utf8");
  const total = allCities.reduce((n, c) => n + c.stations.length, 0);
  console.log("\nЗаписано " + allCities.length + " городов, " + total + " станций -> " + path.relative(process.cwd(), outPath));
}

/** Часть света для города, заведённого автоматически: как у городов той же страны. */
const REGION_BY_COUNTRY = { US: "northAmerica", RU: "cis", UA: "cis", BY: "cis", MD: "cis" };

function regionOf(countryCode) {
  const sample = CITIES.find((c) => c.countryCode === countryCode);
  if (sample) return REGION_KEYS[sample.region] ?? "europe";
  return REGION_BY_COUNTRY[countryCode] ?? "europe";
}

function byPopularity(a, b) {
  return b.clickCount - a.clickCount || b.votes - a.votes;
}

/** Без дублей по id и адресу потока (в формате приложения); `taken` уже заняты закреплёнными. */
function dedupeStations(list, taken) {
  const ids = new Set(taken.map((s) => s.id));
  const urls = new Set(taken.map((s) => s.streamUrl));
  return list.filter((s) => {
    if (ids.has(s.id) || urls.has(s.streamUrl)) return false;
    ids.add(s.id);
    urls.add(s.streamUrl);
    return true;
  });
}

/**
 * Дополняет города станциями из страновых списков и заводит новые города.
 * Возвращает полный список городов: прежние в прежнем порядке, новые — после них
 * в своей части света, по убыванию числа станций.
 */
async function addCountryStations(cities, scriptDir, cacheDir) {
  const countryDir = path.resolve(scriptDir, "../src/data/country-stations");
  let files;
  try {
    files = (await readdir(countryDir)).filter((f) => /^[A-Z]{2}\.json$/.test(f));
  } catch {
    files = [];
  }
  if (files.length === 0) {
    console.warn("\nСтрановых списков нет (npm run generate-countries), раскладка по городам пропущена.");
    return cities;
  }

  const geoCities = await loadGeoNamesCities(cacheDir);
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const newCities = new Map();
  let added = 0;
  console.log("");

  for (const file of files) {
    const { countryCode, stations } = JSON.parse(await readFile(path.join(countryDir, file), "utf8"));
    const knownCities = CITIES.filter((c) => c.countryCode === countryCode && cityById.has(c.id));
    const geoOfCountry = geoCities.filter((c) => c.countryCode === countryCode);
    const { known, candidates } = assignStationsToCities(stations, knownCities, geoOfCountry);

    for (const [cityId, list] of known) {
      const city = cityById.get(cityId);
      // Закреплённые станции остаются в начале, остальные — по популярности.
      const pinnedIds = new Set(EXTRA_STATIONS.filter((e) => e.cityId === cityId).map((e) => e.uuid));
      const pinned = city.stations.filter((s) => pinnedIds.has(s.id));
      const rest = city.stations.filter((s) => !pinnedIds.has(s.id));
      const before = city.stations.length;
      city.stations = [...pinned, ...dedupeStations([...rest, ...list].sort(byPopularity), pinned)];
      added += city.stations.length - before;
    }

    for (const candidate of candidates.values()) {
      if (!isViableNewCity(candidate)) continue;
      const { city, stations: list } = candidate;
      newCities.set(city.id, {
        geoName: city,
        countryCode,
        stations: dedupeStations(list.sort(byPopularity), []),
      });
    }
  }

  const names = await loadCityNames([...newCities.values()].map((c) => c.geoName), cacheDir);
  const usedIds = new Set(cities.map((c) => c.id));
  const created = [];
  for (const { geoName, countryCode, stations } of newCities.values()) {
    let id = slugify(geoName.asciiName);
    if (!id || usedIds.has(id)) id = id + "-" + countryCode.toLowerCase();
    usedIds.add(id);
    const name = names[geoName.id];
    created.push({
      id,
      name: { en: ENGLISH_NAME_OVERRIDES[id] ?? name.en, ru: name.ru },
      countryCode,
      region: regionOf(countryCode),
      lat: Math.round(geoName.lat * 100) / 100,
      long: Math.round(geoName.long * 100) / 100,
      stations,
    });
  }
  created.sort((a, b) => b.stations.length - a.stations.length);
  for (const city of created) {
    console.log("  + " + city.name.en.padEnd(18) + String(city.stations.length).padStart(3) + " станций (" + city.countryCode + ")");
  }
  console.log("Из страновых списков добавлено " + added + " станций в прежние города, новых городов: " + created.length);

  // Группировка по частям света в приложении идёт по соседним записям, поэтому новые города
  // ставятся следом за прежними своей части света.
  const regionOrder = [];
  for (const city of cities) {
    if (!regionOrder.includes(city.region)) regionOrder.push(city.region);
  }
  const rank = (city) => {
    const i = regionOrder.indexOf(city.region);
    return i === -1 ? regionOrder.length : i;
  };
  return [...cities, ...created].sort((a, b) => rank(a) - rank(b));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
