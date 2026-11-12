import countryNamesData from "./country-names.json";
import data from "./stations.json";

export type Station = {
  id: string;
  name: string;
  streamUrl: string;
  homepage: string;
  codec: string;
  bitrate: number;
  tags: string[];
  languages: string[];
  /** Город или регион, как его указал владелец станции в Radio Browser. */
  state: string;
  geo: { lat: number; long: number } | null;
  votes: number;
  clickCount: number;
  /** Код страны ISO 3166-1: у станций из городов совпадает с кодом города. */
  countryCode: string;
};

export type City = {
  id: string;
  /** Название города. Интерфейс на русском берёт `ru`, на остальных языках `en`. */
  name: { en: string; ru: string };
  countryCode: string;
  /** Ключ части света: `europe`, `asia`… Перевод — по ключу `region.<ключ>`. */
  region: string;
  lat: number;
  long: number;
  stations: Station[];
};

export const GENERATED_AT: string = data.generatedAt;
export const CITIES: City[] = data.cities;

/** Названия стран по языку интерфейса и коду страны; готовятся скриптом из данных Unicode. */
const COUNTRY_NAMES: Record<string, Record<string, string>> = countryNamesData;

export function cityName(city: City, language: string): string {
  return language === "ru" ? city.name.ru : city.name.en;
}

export function countryName(countryCode: string, language: string): string {
  return (
    COUNTRY_NAMES[language]?.[countryCode] ??
    COUNTRY_NAMES.en?.[countryCode] ??
    countryCode
  );
}

export type CitySection = { region: string; data: City[] };

/** Города, сгруппированные по частям света в порядке появления в данных. */
export const CITY_SECTIONS: CitySection[] = CITIES.reduce<CitySection[]>(
  (sections, city) => {
    const last = sections[sections.length - 1];
    if (last && last.region === city.region) {
      last.data.push(city);
    } else {
      sections.push({ region: city.region, data: [city] });
    }
    return sections;
  },
  [],
);

export function getCity(id: string | undefined): City | undefined {
  return CITIES.find((city) => city.id === id);
}

/** Город, в списке которого лежит станция. */
export function getCityOfStation(stationId: string): City | undefined {
  return CITIES.find((city) => city.stations.some((s) => s.id === stationId));
}

export function getStation(
  stationId: string,
): { station: Station; city: City } | undefined {
  for (const city of CITIES) {
    const station = city.stations.find((s) => s.id === stationId);
    if (station) {
      return { station, city };
    }
  }
  return undefined;
}
