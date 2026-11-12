import { COUNTRY_CATALOG, getCountryStations } from "@/data/countries";
import { CITIES, countryName, type City, type Station } from "@/data/stations";

/** Станция в результатах: из города (с городом) или из полного списка страны (без города). */
export type StationHit = { station: Station; city?: City };

type IndexedHit = StationHit & { haystack: string };

export type Codec = "MP3" | "AAC";

export type SearchFilters = {
  query: string;
  tags: string[];
  languages: string[];
  codec: Codec | null;
  minBitrate: number;
};

export const EMPTY_FILTERS: SearchFilters = {
  query: "",
  tags: [],
  languages: [],
  codec: null,
  minBitrate: 0,
};

export const BITRATE_OPTIONS = [64, 128, 192, 320] as const;
export const CODEC_OPTIONS: Codec[] = ["MP3", "AAC"];

/** Станции городов без дублей: станция из двух соседних городов учитывается один раз. */
export const ALL_STATIONS: StationHit[] = (() => {
  const seen = new Set<string>();
  const list: StationHit[] = [];
  for (const city of CITIES) {
    for (const station of city.stations) {
      if (seen.has(station.id)) continue;
      seen.add(station.id);
      list.push({ station, city });
    }
  }
  return list;
})();

type Counted = { value: string; count: number };

function countValues(pick: (s: Station) => string[], min: number): Counted[] {
  const counts = new Map<string, number>();
  for (const { station } of ALL_STATIONS) {
    for (const value of pick(station)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= min)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
}

/** Теги, встречающиеся хотя бы у 5 станций городов, по убыванию частоты. */
export const TOP_TAGS: Counted[] = countValues((s) => s.tags, 5).slice(0, 40);

/** Языки, встречающиеся хотя бы у 3 станций городов. */
export const TOP_LANGUAGES: Counted[] = countValues(
  (s) => s.languages,
  3,
).slice(0, 25);

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** Текст для поиска считается один раз на станцию: название, регион, город, страна, теги, языки. */
function indexHit(hit: StationHit): IndexedHit {
  const { station, city } = hit;
  const haystack = [
    station.name,
    station.state,
    city?.name.en ?? "",
    city?.name.ru ?? "",
    countryName(station.countryCode, "en"),
    ...station.tags,
    ...station.languages,
  ]
    .join(" ")
    .toLowerCase();
  return { station, city, haystack };
}

const CITY_INDEX: IndexedHit[] = ALL_STATIONS.map(indexHit);

let countryIndex: IndexedHit[] | null = null;

/** Станции страновых списков, которых нет в городах. Строится один раз после разбора файлов. */
function getCountryIndex(): IndexedHit[] {
  if (countryIndex) return countryIndex;
  const known = new Set(ALL_STATIONS.map((hit) => hit.station.id));
  const list: IndexedHit[] = [];
  for (const { countryCode } of COUNTRY_CATALOG) {
    for (const station of getCountryStations(countryCode)) {
      if (!known.has(station.id)) list.push(indexHit({ station }));
    }
  }
  countryIndex = list;
  return list;
}

export function isCodec(value: string | undefined): value is Codec {
  return value === "MP3" || value === "AAC";
}

/** AAC и AAC+ считаем одним кодеком. */
function matchesCodec(station: Station, codec: Codec | null): boolean {
  return codec === null || station.codec.startsWith(codec);
}

export function hasActiveFilters(f: SearchFilters): boolean {
  return (
    normalize(f.query).length > 0 ||
    f.tags.length > 0 ||
    f.languages.length > 0 ||
    f.codec !== null ||
    f.minBitrate > 0
  );
}

/**
 * Поиск по станциям. Текст ищется в названии станции, тегах, языках вещания и в названиях
 * города и страны: на английском, на русском и на текущем языке интерфейса.
 * `includeCountries` подключает полные страновые списки (их нужно сначала разобрать,
 * см. `loadAllCountryStations`).
 */
export function searchStations(
  f: SearchFilters,
  language: string,
  includeCountries: boolean,
): StationHit[] {
  const query = normalize(f.query);
  const words = query.length > 0 ? query.split(/\s+/) : [];
  const localizedCountry = new Map<string, string>();

  const matches = ({ station, haystack }: IndexedHit): boolean => {
    if (!matchesCodec(station, f.codec)) return false;
    if (f.minBitrate > 0 && station.bitrate < f.minBitrate) return false;
    if (f.tags.some((t) => !station.tags.includes(t))) return false;
    if (f.languages.some((l) => !station.languages.includes(l))) return false;
    if (words.length === 0) return true;

    let country = localizedCountry.get(station.countryCode);
    if (country === undefined) {
      country = countryName(station.countryCode, language).toLowerCase();
      localizedCountry.set(station.countryCode, country);
    }
    return words.every((w) => haystack.includes(w) || country.includes(w));
  };

  const results: StationHit[] = [];
  for (const hit of CITY_INDEX) {
    if (matches(hit)) results.push(hit);
  }
  if (includeCountries) {
    for (const hit of getCountryIndex()) {
      if (matches(hit)) results.push(hit);
    }
  }
  return results.sort((a, b) => b.station.clickCount - a.station.clickCount);
}
