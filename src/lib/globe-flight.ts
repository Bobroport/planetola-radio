import { useSyncExternalStore } from "react";

/** Длительность перелёта к городу по запросу (кнопка глобуса, выбор станции). */
export const FLIGHT_DURATION_MS = 2500;

/** Точка на глобусе: широта и долгота в градусах. Город (`City`) тоже подходит. */
export type GlobePoint = { lat: number; long: number };

/** Запрос перелёта к точке; `at` отличает повторные запросы к той же точке. */
export type FlightRequest = GlobePoint & { at: number };

let request: FlightRequest | null = null;
/** Момент, когда закончится последний запрошенный перелёт (с небольшим запасом). */
let flightEndsAt = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): FlightRequest | null {
  return request;
}

/**
 * Просит экран глобуса подлететь к точке (городу станции или столице её страны). Хранится вне маршрута нарочно: навигация
 * с параметрами кладёт в стек второй экземпляр глобуса, а простой `navigate("/cities")`
 * возвращает к уже открытому.
 */
export function requestFlight(point: GlobePoint): void {
  request = { lat: point.lat, long: point.long, at: Date.now() };
  flightEndsAt = Date.now() + FLIGHT_DURATION_MS + 300;
  for (const listener of listeners) listener();
}

/**
 * Сколько ещё миллисекунд идёт перелёт (0, если шар стоит). Тяжёлую синхронную работу,
 * например освобождение старого плеера, на это время откладывают.
 */
export function flightBusyMs(): number {
  return Math.max(0, flightEndsAt - Date.now());
}

let focusedCityId: string | null = null;

/** Экран глобуса сообщает, какой город сейчас в центре шара (null, если никакой). */
export function setGlobeFocus(cityId: string | null): void {
  focusedCityId = cityId;
}

/** Город в центре шара: если это цель перелёта, лететь почти некуда. */
export function getGlobeFocus(): string | null {
  return focusedCityId;
}

export function useFlightRequest(): FlightRequest | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
