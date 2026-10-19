import { CITIES, type City, type Station } from "@/data/stations";

export type StationWithCity = { station: Station; city: City };

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

/** Все станции без дублей: станция из двух соседних городов учитывается один раз. */
export const ALL_STATIONS: StationWithCity[] = (() => {
  const seen = new Set<string>();
  const list: StationWithCity[] = [];
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

/** Теги, встречающиеся хотя бы у 5 станций, по убыванию частоты. */
export const TOP_TAGS: Counted[] = countValues((s) => s.tags, 5).slice(0, 40);

/** Языки, встречающиеся хотя бы у 3 станций. */
export const TOP_LANGUAGES: Counted[] = countValues(
  (s) => s.languages,
  3,
).slice(0, 25);

function normalize(text: string): string {
  return text.trim().toLowerCase();
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

export function searchStations(f: SearchFilters): StationWithCity[] {
  const query = normalize(f.query);
  const words = query.length > 0 ? query.split(/\s+/) : [];

  return ALL_STATIONS.filter(({ station, city }) => {
    if (!matchesCodec(station, f.codec)) return false;
    if (f.minBitrate > 0 && station.bitrate < f.minBitrate) return false;
    if (f.tags.some((t) => !station.tags.includes(t))) return false;
    if (f.languages.some((l) => !station.languages.includes(l))) return false;
    if (words.length === 0) return true;

    const haystack = [
      station.name,
      station.state,
      city.name,
      city.country,
      ...station.tags,
      ...station.languages,
    ]
      .join(" ")
      .toLowerCase();
    return words.every((w) => haystack.includes(w));
  }).sort((a, b) => b.station.clickCount - a.station.clickCount);
}
