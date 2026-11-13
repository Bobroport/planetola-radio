// Справочник городов GeoNames (https://www.geonames.org, лицензия CC BY 4.0) с английскими
// и русскими названиями. Нужен generate-stations.mjs, чтобы раскладывать станции страновых
// списков по городам и заводить города, которых нет в scripts/cities.mjs.
//
// Файл cities15000.zip (все населённые пункты от 15 тысяч жителей, ~2 МБ) скачивается один
// раз в scripts/.cache/geonames/. Названия на языках лежат в пострановых архивах
// alternatenames/<код>.zip (до 23 МБ у США); из них сохраняются только английские и русские
// названия городов справочника, сам архив не хранится.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

import { USER_AGENT } from "./station-utils.mjs";

const CITIES_ZIP_URL = "https://download.geonames.org/export/dump/cities15000.zip";
const ALTERNATE_NAMES_URL = "https://download.geonames.org/export/dump/alternatenames/";
const NAME_LANGUAGES = ["en", "ru"];

/**
 * Файл с именем `fileName` из zip-архива. Node не умеет распаковывать zip сам, а архивы
 * GeoNames простые: один-два файла, сжатие deflate.
 */
function unzipFile(buffer, fileName) {
  // В конце архива лежит запись End of Central Directory, в ней — смещение каталога.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip: не найден конец каталога");
  const entries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  for (let i = 0; i < entries; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("zip: повреждён каталог");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeader = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;
    if (name !== fileName) continue;
    if (buffer.readUInt32LE(localHeader) !== 0x04034b50) throw new Error("zip: повреждён заголовок " + name);
    const localNameLength = buffer.readUInt16LE(localHeader + 26);
    const localExtraLength = buffer.readUInt16LE(localHeader + 28);
    const start = localHeader + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(start, start + compressedSize);
    if (method === 0) return data;
    if (method === 8) return inflateRawSync(data);
    throw new Error("zip: неизвестный метод сжатия " + method + " у " + name);
  }
  throw new Error("zip: в архиве нет файла " + fileName);
}

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error("HTTP " + res.status + " при загрузке " + url);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Города GeoNames: { id, name, asciiName, alternateNames, lat, long, countryCode, population }.
 * Только населённые пункты (коды PPL*), чтобы не привязывать станции к районам и озёрам.
 */
export async function loadGeoNamesCities(cacheDir) {
  const dir = path.join(cacheDir, "geonames");
  await mkdir(dir, { recursive: true });
  const txtPath = path.join(dir, "cities15000.txt");
  let text;
  try {
    text = await readFile(txtPath, "utf8");
  } catch {
    console.log("Скачиваем справочник городов GeoNames…");
    const zip = await download(CITIES_ZIP_URL);
    text = unzipFile(zip, "cities15000.txt").toString("utf8");
    await writeFile(txtPath, text, "utf8");
  }
  const cities = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    const f = line.split("\t");
    if (!f[7]?.startsWith("PPL")) continue;
    cities.push({
      id: f[0],
      name: f[1],
      asciiName: f[2],
      alternateNames: f[3] ? f[3].split(",") : [],
      lat: Number(f[4]),
      long: Number(f[5]),
      /** PPLC — столица, PPLA… — центр региона, PPL — прочие, PPLX — район города. */
      featureCode: f[7],
      countryCode: f[8],
      population: Number(f[14]) || 0,
    });
  }
  return cities;
}

/**
 * Английские и русские названия городов справочника одной страны из архива alternatenames.
 * Возвращает { [geonameId]: { en: Row[], ru: Row[] } }, где Row — { name, preferred, short };
 * исторические и просторечные варианты отброшены. Результат кэшируется по стране.
 */
async function loadAlternateNames(countryCode, cityIds, cacheDir) {
  const cachePath = path.join(cacheDir, "geonames", "names-" + countryCode + ".json");
  try {
    return JSON.parse(await readFile(cachePath, "utf8"));
  } catch {
    // кэша нет — качаем архив страны
  }
  console.log("Скачиваем названия городов GeoNames для " + countryCode + "…");
  const zip = await download(ALTERNATE_NAMES_URL + countryCode + ".zip");
  const text = unzipFile(zip, countryCode + ".txt").toString("utf8");
  const names = {};
  for (const line of text.split("\n")) {
    // alternateNameId, geonameid, isolanguage, name, isPreferred, isShort, isColloquial, isHistoric
    const f = line.split("\t");
    if (!cityIds.has(f[1]) || !NAME_LANGUAGES.includes(f[2])) continue;
    if (f[6] === "1" || f[7] === "1") continue;
    const entry = (names[f[1]] ??= { en: [], ru: [] });
    entry[f[2]].push({ name: f[3], preferred: f[4] === "1", short: f[5] === "1" });
  }
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(names), "utf8");
  return names;
}

function pickName(rows) {
  if (!rows || rows.length === 0) return undefined;
  return (rows.find((r) => r.preferred) ?? rows.find((r) => !r.short) ?? rows[0]).name;
}

/**
 * Названия городов для приложения: { [geonameId]: { en, ru } }. Английское — предпочтительное
 * английское из GeoNames, иначе основное название справочника; русское — так же, иначе английское.
 */
export async function loadCityNames(geoCities, cacheDir) {
  const byCountry = new Map();
  for (const city of geoCities) {
    if (!byCountry.has(city.countryCode)) byCountry.set(city.countryCode, []);
    byCountry.get(city.countryCode).push(city);
  }
  const result = {};
  for (const [countryCode, cities] of byCountry) {
    const names = await loadAlternateNames(countryCode, new Set(cities.map((c) => c.id)), cacheDir);
    for (const city of cities) {
      const en = pickName(names[city.id]?.en) ?? city.name;
      result[city.id] = { en, ru: pickName(names[city.id]?.ru) ?? en };
    }
  }
  return result;
}
