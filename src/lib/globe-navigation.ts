import { router } from "expo-router";

import { getCityOfStation, type City, type Station } from "@/data/stations";
import { requestFlight } from "@/lib/globe-flight";

/**
 * Открывает глобус и, если указан город, подлетает к нему. `navigate` без параметров
 * возвращает к уже открытому экрану глобуса, а не кладёт его поверх.
 */
export function openGlobe(city?: City): void {
  if (city) requestFlight(city.id);
  router.navigate("/cities");
}

/** Перелёт к городу станции; станции без города (страновые списки) глобус не открывают. */
export function flyToStation(station: Station): void {
  const city = getCityOfStation(station.id);
  if (city) openGlobe(city);
}
