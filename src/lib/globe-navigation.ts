import { router } from "expo-router";

import { getCityOfStation, type City, type Station } from "@/data/stations";
import { requestFlight } from "@/lib/globe-flight";

/**
 * Пауза между началом перелёта и подключением потока. Запуск потока занимает поток JS
 * на заметное время (активация аудиосессии, создание плеера), и начатый до него перелёт
 * первые кадры просто не рисует; за это время глобус успевает появиться и сдвинуться.
 */
const PLAY_AFTER_FLIGHT_START_MS = 400;

/**
 * Открывает глобус и, если указан город, подлетает к нему. `navigate` без параметров
 * возвращает к уже открытому экрану глобуса, а не кладёт его поверх.
 */
export function openGlobe(city?: City): void {
  if (city) requestFlight(city.id);
  router.navigate("/cities");
}

/**
 * Перелёт к городу станции, а затем `start` (подключение потока). Станции без города
 * (страновые списки) глобус не открывают, и `start` вызывается сразу.
 */
export function flyToStationAndPlay(station: Station, start: () => void): void {
  const city = getCityOfStation(station.id);
  if (!city) {
    start();
    return;
  }
  openGlobe(city);
  setTimeout(start, PLAY_AFTER_FLIGHT_START_MS);
}
