import { router } from "expo-router";

import { getCountryPoint } from "@/data/capitals";
import { getCityOfStation, type Station } from "@/data/stations";
import {
  FLIGHT_DURATION_MS,
  getGlobeFocus,
  requestFlight,
  type GlobePoint,
} from "@/lib/globe-flight";

/**
 * Запасной режим: подключать поток только после приземления. Нужен был, пока станции
 * переключались через `replace` одного плеера и перелёт замирал на 1–3 секунды. Теперь
 * каждая станция получает новый плеер (см. player-provider), и поток подключается сразу,
 * параллельно перелёту. Включить обратно, если замер `[audio-timing]` покажет, что и
 * создание плеера занимает поток JS; когда подтвердится обратное, режим можно удалить.
 */
const CONNECT_AFTER_LANDING = false;
/** Запас после перелёта: последний кадр и карточка города успевают отрисоваться. */
const AFTER_FLIGHT_MARGIN_MS = 200;

/**
 * Где станция на глобусе: её город, а для станций без города (страновые списки) —
 * столица страны. undefined, если о стране ничего не известно.
 */
export function getStationPoint(station: Station): GlobePoint | undefined {
  return getCityOfStation(station.id) ?? getCountryPoint(station.countryCode);
}

/**
 * Открывает глобус и, если указана точка, подлетает к ней. `navigate` без параметров
 * возвращает к уже открытому экрану глобуса, а не кладёт его поверх.
 *
 * Перелёт запрашивается на следующем кадре: переключение вкладки и смена станции
 * перерисовывают списки, плеер и сам экран глобуса (~200 мс на iPad), и запущенная до
 * этого анимация первым же кадром опаздывала на это время. React завершает отрисовку
 * до колбэков requestAnimationFrame, так что к старту перелёта поток JS уже свободен.
 */
export function openGlobe(point?: GlobePoint): void {
  router.navigate("/cities");
  if (point) requestAnimationFrame(() => requestFlight(point));
}

/**
 * Перелёт к станции (её городу или столице страны) и её включение. `start` получает
 * задержку подключения потока (`play` с `delayMs`): обычно 0, поток подключается
 * параллельно перелёту. В запасном режиме (`CONNECT_AFTER_LANDING`) задержка равна
 * длительности перелёта, кроме случая, когда город станции уже в центре шара.
 */
export function flyToStationAndPlay(station: Station, start: (delayMs: number) => void): void {
  const point = getStationPoint(station);
  if (!point) {
    start(0);
    return;
  }
  const wait = CONNECT_AFTER_LANDING && getGlobeFocus() !== getCityOfStation(station.id)?.id;
  // Сначала станция, потом экран: обе перерисовки попадают в один проход React до перелёта.
  start(wait ? FLIGHT_DURATION_MS + AFTER_FLIGHT_MARGIN_MS : 0);
  openGlobe(point);
}
