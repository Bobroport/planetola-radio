// Полные списки станций по странам (Европа, Россия, США), см. scripts/generate-countries.mjs.
// Файл страны разбирается при первом обращении, поэтому старт приложения они не замедляют.
import { COUNTRY_CATALOG, loadCountryFile } from "@/data/country-stations";
import type { Station } from "@/data/stations";

export { COUNTRY_CATALOG };

const loaded = new Map<string, Station[]>();
let allLoaded: Promise<void> | null = null;

/** Есть ли у страны полный список станций. */
export function hasCountryCatalog(countryCode: string): boolean {
  return COUNTRY_CATALOG.some((c) => c.countryCode === countryCode);
}

export function countryCatalogCount(countryCode: string): number {
  return COUNTRY_CATALOG.find((c) => c.countryCode === countryCode)?.count ?? 0;
}

/** Все станции страны по убыванию популярности; файл разбирается один раз и кэшируется. */
export function getCountryStations(countryCode: string): Station[] {
  const cached = loaded.get(countryCode);
  if (cached) return cached;
  const stations = loadCountryFile(countryCode)?.stations ?? [];
  loaded.set(countryCode, stations);
  return stations;
}

export function isAllCountryStationsLoaded(): boolean {
  return COUNTRY_CATALOG.every((c) => loaded.has(c.countryCode));
}

/** Разбирает все страновые файлы, уступая поток интерфейсу между странами. */
export function loadAllCountryStations(): Promise<void> {
  if (!allLoaded) {
    allLoaded = (async () => {
      for (const { countryCode } of COUNTRY_CATALOG) {
        if (loaded.has(countryCode)) continue;
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        getCountryStations(countryCode);
      }
    })();
  }
  return allLoaded;
}
