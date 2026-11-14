import { useSyncExternalStore } from "react";

/** Запрос перелёта к городу; `at` отличает повторные запросы к тому же городу. */
export type FlightRequest = { cityId: string; at: number };

let request: FlightRequest | null = null;
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
 * Просит экран глобуса подлететь к городу. Хранится вне маршрута нарочно: навигация
 * с параметрами кладёт в стек второй экземпляр глобуса, а простой `navigate("/cities")`
 * возвращает к уже открытому.
 */
export function requestFlight(cityId: string): void {
  request = { cityId, at: Date.now() };
  for (const listener of listeners) listener();
}

export function useFlightRequest(): FlightRequest | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
