// Генерирует src/data/stations.json: топ станций для крупнейших городов мира
// из открытой базы Radio Browser (https://api.radio-browser.info).
//
// Запуск: npm run generate-stations

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CITIES } from "./cities.mjs";

const USER_AGENT = "radio-app-generator/1.0";
const FALLBACK_SERVER = "https://de1.api.radio-browser.info";
const GEO_RADIUS_M = 30_000;
const STATIONS_PER_CITY = 40;
const REQUEST_DELAY_MS = 150;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;
const ALLOWED_CODECS = ["MP3", "AAC"];

// Список городов вынесен в scripts/cities.mjs

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pickServer() {
  try {
    const res = await fetch("https://all.api.radio-browser.info/json/servers", {
      headers: { "User-Agent": USER_AGENT },
    });
    const servers = await res.json();
    const names = [...new Set(servers.map((s) => s.name))];
    if (names.length > 0) {
      return "https://" + names[Math.floor(Math.random() * names.length)];
    }
  } catch (e) {
    console.warn("Не удалось получить список серверов, используем запасной:", e.message);
  }
  return FALLBACK_SERVER;
}

async function search(server, params) {
  const url = new URL("/json/stations/search", server);
  url.searchParams.set("hidebroken", "true");
  url.searchParams.set("limit", "500");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      await sleep(REQUEST_DELAY_MS);
      return await res.json();
    } catch (e) {
      const reason = e.cause?.message || e.message;
      if (attempt === MAX_ATTEMPTS) {
        console.warn("  пропуск после " + MAX_ATTEMPTS + " попыток: " + url.search + " (" + reason + ")");
        return [];
      }
      console.warn("  повтор " + attempt + ": " + url.search + " (" + reason + ")");
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  return [];
}

function isPlayable(s) {
  if (s.lastcheckok !== 1 || s.hls === 1) return false;
  const url = s.url_resolved || s.url;
  if (!url || !url.startsWith("https://")) return false;
  const codec = String(s.codec || "").toUpperCase();
  return ALLOWED_CODECS.some((c) => codec.startsWith(c));
}

/** "#english, Español,english" -> ["english", "español"] */
function splitList(value) {
  const seen = new Set();
  return String(value || "")
    .split(",")
    .map((t) => t.trim().replace(/^#+/, "").toLowerCase())
    .filter((t) => t && !seen.has(t) && seen.add(t));
}

function toStation(s) {
  const hasGeo = typeof s.geo_lat === "number" && typeof s.geo_long === "number";
  // Только то, что использует приложение: поля вроде favicon и дат проверки выкинуты ради размера.
  return {
    id: s.stationuuid,
    name: s.name.trim(),
    streamUrl: s.url_resolved || s.url,
    homepage: s.homepage || "",
    codec: String(s.codec || "").toUpperCase(),
    bitrate: s.bitrate || 0,
    tags: splitList(s.tags).slice(0, 6),
    languages: splitList(s.language).slice(0, 3),
    state: (s.state || "").trim(),
    geo: hasGeo ? { lat: round3(s.geo_lat), long: round3(s.geo_long) } : null,
    votes: s.votes || 0,
    clickCount: s.clickcount || 0,
  };
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
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

  const seenUrls = new Set();
  return [...found.values()]
    .sort((a, b) => b.clickcount - a.clickcount || b.votes - a.votes)
    .filter((s) => {
      const url = s.url_resolved || s.url;
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    })
    .slice(0, STATIONS_PER_CITY)
    .map(toStation);
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
    console.log(
      city.name.padEnd(18) + String(stations.length).padStart(3) + " станций" + (fromCache ? " (кэш)" : ""),
    );
    if (stations.length === 0) continue;
    const { search: _search, ...rest } = city;
    cities.push({ ...rest, stations });
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
