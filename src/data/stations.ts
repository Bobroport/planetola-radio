import data from "./stations.json";

export type Station = {
  id: string;
  name: string;
  streamUrl: string;
  homepage: string;
  favicon: string;
  codec: string;
  bitrate: number;
  tags: string[];
  languages: string[];
  languageCodes: string[];
  country: string;
  countryCode: string;
  state: string;
  geo: { lat: number; long: number } | null;
  votes: number;
  clickCount: number;
  clickTrend: number;
  lastChangeTime: string;
  lastCheckTime: string;
};

export type City = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  long: number;
  stations: Station[];
};

export const GENERATED_AT: string = data.generatedAt;
export const CITIES: City[] = data.cities;

export function getCity(id: string | undefined): City | undefined {
  return CITIES.find((city) => city.id === id);
}
