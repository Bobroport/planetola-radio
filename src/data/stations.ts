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
};

export type City = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  /** Часть света для группировки списка, например «Европа». */
  region: string;
  lat: number;
  long: number;
  stations: Station[];
};

export const GENERATED_AT: string = data.generatedAt;
export const CITIES: City[] = data.cities;

export type CitySection = { title: string; data: City[] };

/** Города, сгруппированные по частям света в порядке появления в данных. */
export const CITY_SECTIONS: CitySection[] = CITIES.reduce<CitySection[]>(
  (sections, city) => {
    const last = sections[sections.length - 1];
    if (last && last.title === city.region) {
      last.data.push(city);
    } else {
      sections.push({ title: city.region, data: [city] });
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
