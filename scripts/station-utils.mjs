// Общие помощники скриптов выгрузки из Radio Browser (https://api.radio-browser.info):
// выбор сервера, запросы с повторами, фильтр играбельных станций и приведение к формату приложения.

export const USER_AGENT = "radio-app-generator/1.0";
const FALLBACK_SERVER = "https://de1.api.radio-browser.info";
const REQUEST_DELAY_MS = 150;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;
const ALLOWED_CODECS = ["MP3", "AAC"];

/** Станции с таким названием не берём: их потоки, как правило, не открываются. */
const EXCLUDED_NAME = /^0R\b/i;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function pickServer() {
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

/** GET с повторами; после MAX_ATTEMPTS неудач возвращает пустой список, а не падает. */
export async function fetchJson(url) {
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

export function isExcludedName(name) {
  return EXCLUDED_NAME.test(String(name || "").trim());
}

export function isPlayable(s, { allowHttp = false } = {}) {
  if (s.lastcheckok !== 1 || s.hls === 1) return false;
  if (isExcludedName(s.name)) return false;
  const url = s.url_resolved || s.url;
  if (!url) return false;
  if (!url.startsWith("https://") && !(allowHttp && url.startsWith("http://"))) return false;
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

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/** Запись Radio Browser -> объект Station приложения. Лишние поля выкинуты ради размера. */
export function toStation(s, countryCode) {
  const hasGeo = typeof s.geo_lat === "number" && typeof s.geo_long === "number";
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
    countryCode,
  };
}

/** Убирает дубли по адресу потока, оставляя первую (самую популярную) запись. */
export function dedupeByUrl(list) {
  const seen = new Set();
  return list.filter((s) => {
    const url = s.url_resolved || s.url;
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}
