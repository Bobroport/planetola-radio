// Генерирует src/data/stations.json: топ станций для крупнейших городов мира
// из открытой базы Radio Browser (https://api.radio-browser.info).
//
// Запуск: npm run generate-stations

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USER_AGENT = "radio-app-generator/1.0";
const FALLBACK_SERVER = "https://de1.api.radio-browser.info";
const GEO_RADIUS_M = 30_000;
const STATIONS_PER_CITY = 15;
const REQUEST_DELAY_MS = 150;
const ALLOWED_CODECS = ["MP3", "AAC"];

/** Крупнейшие города мира. search — варианты названия для поиска по полям state и name. */
const CITIES = [
  { id: "tokyo", name: "Токио", country: "Япония", countryCode: "JP", lat: 35.68, long: 139.69, search: ["Tokyo", "東京"] },
  { id: "delhi", name: "Дели", country: "Индия", countryCode: "IN", lat: 28.61, long: 77.21, search: ["Delhi"] },
  { id: "shanghai", name: "Шанхай", country: "Китай", countryCode: "CN", lat: 31.23, long: 121.47, search: ["Shanghai", "上海"] },
  { id: "dhaka", name: "Дакка", country: "Бангладеш", countryCode: "BD", lat: 23.81, long: 90.41, search: ["Dhaka"] },
  { id: "sao-paulo", name: "Сан-Паулу", country: "Бразилия", countryCode: "BR", lat: -23.55, long: -46.63, search: ["São Paulo", "Sao Paulo"] },
  { id: "cairo", name: "Каир", country: "Египет", countryCode: "EG", lat: 30.04, long: 31.24, search: ["Cairo", "القاهرة"] },
  { id: "mexico-city", name: "Мехико", country: "Мексика", countryCode: "MX", lat: 19.43, long: -99.13, search: ["Mexico City", "Ciudad de México", "CDMX"] },
  { id: "beijing", name: "Пекин", country: "Китай", countryCode: "CN", lat: 39.9, long: 116.4, search: ["Beijing", "北京"] },
  { id: "mumbai", name: "Мумбаи", country: "Индия", countryCode: "IN", lat: 19.08, long: 72.88, search: ["Mumbai", "Bombay"] },
  { id: "osaka", name: "Осака", country: "Япония", countryCode: "JP", lat: 34.69, long: 135.5, search: ["Osaka", "大阪"] },
  { id: "chongqing", name: "Чунцин", country: "Китай", countryCode: "CN", lat: 29.56, long: 106.55, search: ["Chongqing", "重庆"] },
  { id: "karachi", name: "Карачи", country: "Пакистан", countryCode: "PK", lat: 24.86, long: 67.01, search: ["Karachi"] },
  { id: "kinshasa", name: "Киншаса", country: "ДР Конго", countryCode: "CD", lat: -4.44, long: 15.27, search: ["Kinshasa"] },
  { id: "lagos", name: "Лагос", country: "Нигерия", countryCode: "NG", lat: 6.52, long: 3.38, search: ["Lagos"] },
  { id: "istanbul", name: "Стамбул", country: "Турция", countryCode: "TR", lat: 41.01, long: 28.98, search: ["Istanbul", "İstanbul"] },
  { id: "buenos-aires", name: "Буэнос-Айрес", country: "Аргентина", countryCode: "AR", lat: -34.6, long: -58.38, search: ["Buenos Aires"] },
  { id: "kolkata", name: "Калькутта", country: "Индия", countryCode: "IN", lat: 22.57, long: 88.36, search: ["Kolkata", "Calcutta"] },
  { id: "manila", name: "Манила", country: "Филиппины", countryCode: "PH", lat: 14.6, long: 120.98, search: ["Manila"] },
  { id: "guangzhou", name: "Гуанчжоу", country: "Китай", countryCode: "CN", lat: 23.13, long: 113.26, search: ["Guangzhou", "广州"] },
  { id: "lahore", name: "Лахор", country: "Пакистан", countryCode: "PK", lat: 31.55, long: 74.34, search: ["Lahore"] },
  { id: "bangalore", name: "Бангалор", country: "Индия", countryCode: "IN", lat: 12.97, long: 77.59, search: ["Bangalore", "Bengaluru"] },
  { id: "rio-de-janeiro", name: "Рио-де-Жанейро", country: "Бразилия", countryCode: "BR", lat: -22.91, long: -43.17, search: ["Rio de Janeiro"] },
  { id: "shenzhen", name: "Шэньчжэнь", country: "Китай", countryCode: "CN", lat: 22.54, long: 114.06, search: ["Shenzhen", "深圳"] },
  { id: "moscow", name: "Москва", country: "Россия", countryCode: "RU", lat: 55.75, long: 37.62, search: ["Moscow", "Москва"] },
  { id: "chennai", name: "Ченнаи", country: "Индия", countryCode: "IN", lat: 13.08, long: 80.27, search: ["Chennai", "Madras"] },
  { id: "bogota", name: "Богота", country: "Колумбия", countryCode: "CO", lat: 4.71, long: -74.07, search: ["Bogotá", "Bogota"] },
  { id: "jakarta", name: "Джакарта", country: "Индонезия", countryCode: "ID", lat: -6.21, long: 106.85, search: ["Jakarta"] },
  { id: "lima", name: "Лима", country: "Перу", countryCode: "PE", lat: -12.05, long: -77.04, search: ["Lima"] },
  { id: "paris", name: "Париж", country: "Франция", countryCode: "FR", lat: 48.86, long: 2.35, search: ["Paris"] },
  { id: "bangkok", name: "Бангкок", country: "Таиланд", countryCode: "TH", lat: 13.76, long: 100.5, search: ["Bangkok", "กรุงเทพ"] },
  { id: "hyderabad", name: "Хайдарабад", country: "Индия", countryCode: "IN", lat: 17.39, long: 78.49, search: ["Hyderabad"] },
  { id: "seoul", name: "Сеул", country: "Южная Корея", countryCode: "KR", lat: 37.57, long: 126.98, search: ["Seoul", "서울"] },
  { id: "london", name: "Лондон", country: "Великобритания", countryCode: "GB", lat: 51.51, long: -0.13, search: ["London"] },
  { id: "tehran", name: "Тегеран", country: "Иран", countryCode: "IR", lat: 35.69, long: 51.39, search: ["Tehran", "تهران"] },
  { id: "ho-chi-minh", name: "Хошимин", country: "Вьетнам", countryCode: "VN", lat: 10.82, long: 106.63, search: ["Ho Chi Minh", "Saigon", "Sài Gòn"] },
  { id: "luanda", name: "Луанда", country: "Ангола", countryCode: "AO", lat: -8.84, long: 13.23, search: ["Luanda"] },
  { id: "kuala-lumpur", name: "Куала-Лумпур", country: "Малайзия", countryCode: "MY", lat: 3.14, long: 101.69, search: ["Kuala Lumpur"] },
  { id: "hong-kong", name: "Гонконг", country: "Гонконг", countryCode: "HK", lat: 22.32, long: 114.17, search: ["Hong Kong", "香港"] },
  { id: "new-york", name: "Нью-Йорк", country: "США", countryCode: "US", lat: 40.71, long: -74.01, search: ["New York"] },
  { id: "riyadh", name: "Эр-Рияд", country: "Саудовская Аравия", countryCode: "SA", lat: 24.71, long: 46.68, search: ["Riyadh", "الرياض"] },
  { id: "baghdad", name: "Багдад", country: "Ирак", countryCode: "IQ", lat: 33.31, long: 44.37, search: ["Baghdad", "بغداد"] },
  { id: "santiago", name: "Сантьяго", country: "Чили", countryCode: "CL", lat: -33.45, long: -70.67, search: ["Santiago"] },
  { id: "madrid", name: "Мадрид", country: "Испания", countryCode: "ES", lat: 40.42, long: -3.7, search: ["Madrid"] },
  { id: "toronto", name: "Торонто", country: "Канада", countryCode: "CA", lat: 43.65, long: -79.38, search: ["Toronto"] },
  { id: "dar-es-salaam", name: "Дар-эс-Салам", country: "Танзания", countryCode: "TZ", lat: -6.79, long: 39.28, search: ["Dar es Salaam"] },
  { id: "johannesburg", name: "Йоханнесбург", country: "ЮАР", countryCode: "ZA", lat: -26.2, long: 28.04, search: ["Johannesburg"] },
  { id: "khartoum", name: "Хартум", country: "Судан", countryCode: "SD", lat: 15.5, long: 32.56, search: ["Khartoum", "الخرطوم"] },
  { id: "saint-petersburg", name: "Санкт-Петербург", country: "Россия", countryCode: "RU", lat: 59.93, long: 30.32, search: ["Petersburg", "Санкт-Петербург"] },
  { id: "singapore", name: "Сингапур", country: "Сингапур", countryCode: "SG", lat: 1.35, long: 103.82, search: ["Singapore"] },
  { id: "los-angeles", name: "Лос-Анджелес", country: "США", countryCode: "US", lat: 34.05, long: -118.24, search: ["Los Angeles"] },
  { id: "nairobi", name: "Найроби", country: "Кения", countryCode: "KE", lat: -1.29, long: 36.82, search: ["Nairobi"] },
  { id: "dubai", name: "Дубай", country: "ОАЭ", countryCode: "AE", lat: 25.2, long: 55.27, search: ["Dubai", "دبي"] },
  { id: "kyiv", name: "Киев", country: "Украина", countryCode: "UA", lat: 50.45, long: 30.52, search: ["Kyiv", "Kiev", "Київ"] },
  { id: "berlin", name: "Берлин", country: "Германия", countryCode: "DE", lat: 52.52, long: 13.41, search: ["Berlin"] },
  { id: "rome", name: "Рим", country: "Италия", countryCode: "IT", lat: 41.9, long: 12.5, search: ["Rome", "Roma"] },
  { id: "chicago", name: "Чикаго", country: "США", countryCode: "US", lat: 41.88, long: -87.63, search: ["Chicago"] },
  { id: "sydney", name: "Сидней", country: "Австралия", countryCode: "AU", lat: -33.87, long: 151.21, search: ["Sydney"] },
  { id: "melbourne", name: "Мельбурн", country: "Австралия", countryCode: "AU", lat: -37.81, long: 144.96, search: ["Melbourne"] },
];

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
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      await sleep(REQUEST_DELAY_MS);
      return await res.json();
    } catch (e) {
      if (attempt === 3) throw e;
      console.warn("  повтор " + attempt + ": " + url.search + " (" + e.message + ")");
      await sleep(1000 * attempt);
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

function toStation(s) {
  const tags = String(s.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
  return {
    id: s.stationuuid,
    name: s.name.trim(),
    streamUrl: s.url_resolved || s.url,
    homepage: s.homepage || "",
    favicon: s.favicon || "",
    codec: String(s.codec || "").toUpperCase(),
    bitrate: s.bitrate || 0,
    tags,
    votes: s.votes || 0,
    clickCount: s.clickcount || 0,
  };
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

  const cities = [];
  for (const city of CITIES) {
    const stations = await fetchCity(server, city);
    console.log(city.name.padEnd(18) + String(stations.length).padStart(3) + " станций");
    if (stations.length === 0) continue;
    const { search: _search, ...rest } = city;
    cities.push({ ...rest, stations });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "https://www.radio-browser.info",
    cities,
  };

  const outPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/data/stations.json");
  await writeFile(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  const total = cities.reduce((n, c) => n + c.stations.length, 0);
  console.log("\nЗаписано " + cities.length + " городов, " + total + " станций -> " + path.relative(process.cwd(), outPath));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
