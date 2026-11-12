import Storage from "expo-sqlite/kv-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { countryName, getStation, type City, type Station } from "@/data/stations";
import type { NowPlaying } from "@/lib/icy";

export type FavoriteTrack = {
  id: string;
  title: string;
  artist: string | null;
  raw: string;
  stationId: string;
  stationName: string;
  /** Пустая строка, если станция взята из полного списка страны, а не из города. */
  cityId: string;
  cityName: string;
  /** ISO 8601, момент сохранения. */
  savedAt: string;
  /** Снимок станции на момент сохранения; у записей старых версий его нет. */
  station?: Station;
};

export type ResolvedStation = { station: Station; city?: City };

type FavoritesContextValue = {
  /** Сохранённые треки, новые сверху. */
  favorites: FavoriteTrack[];
  isSaved: (track: NowPlaying, station: Station) => boolean;
  toggle: (track: NowPlaying, station: Station, city?: City) => void;
  remove: (id: string) => void;
  /** Плейлист: id избранных станций в порядке добавления. */
  stationIds: string[];
  isStationSaved: (stationId: string) => boolean;
  toggleStation: (station: Station) => void;
  /** Станция по id: из данных городов, иначе из снимка, сохранённого вместе со звёздочкой. */
  resolveStation: (stationId: string) => ResolvedStation | undefined;
};

const TRACKS_KEY = "favorites.v1";
const STATIONS_KEY = "favorite-stations.v1";
/** Снимки избранных станций: нужны станциям из страновых списков, которых нет в городах. */
const SNAPSHOTS_KEY = "favorite-station-snapshots.v1";

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

async function loadJson<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): Promise<T> {
  try {
    const json = await Storage.getItemAsync(key);
    if (!json) return fallback;
    const parsed: unknown = JSON.parse(json);
    return isValid(parsed) ? parsed : fallback;
  } catch (e) {
    console.warn(`Не удалось прочитать ${key}`, e);
    return fallback;
  }
}

const isArray = <T,>(value: unknown): value is T[] => Array.isArray(value);
const isRecord = <T,>(value: unknown): value is Record<string, T> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function persistJson(key: string, value: unknown): void {
  Storage.setItemAsync(key, JSON.stringify(value)).catch((e: unknown) => {
    console.warn(`Не удалось сохранить ${key}`, e);
  });
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteTrack[]>([]);
  const [stationIds, setStationIds] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, Station>>({});

  // Читаем сохранённое после монтирования, чтобы не ходить в SQLite во время рендера.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadJson<FavoriteTrack[]>(TRACKS_KEY, [], isArray),
      loadJson<string[]>(STATIONS_KEY, [], isArray),
      loadJson<Record<string, Station>>(SNAPSHOTS_KEY, {}, isRecord),
    ]).then(([tracks, stations, saved]) => {
      if (cancelled) return;
      if (tracks.length > 0) {
        setFavorites((prev) => (prev.length === 0 ? tracks : prev));
      }
      if (stations.length > 0) {
        setStationIds((prev) => (prev.length === 0 ? stations : prev));
      }
      if (Object.keys(saved).length > 0) {
        setSnapshots((prev) => (Object.keys(prev).length === 0 ? saved : prev));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateTracks = useCallback(
    (fn: (prev: FavoriteTrack[]) => FavoriteTrack[]) => {
      setFavorites((prev) => {
        const next = fn(prev);
        persistJson(TRACKS_KEY, next);
        return next;
      });
    },
    [],
  );

  const findIndex = useCallback(
    (list: FavoriteTrack[], track: NowPlaying, station: Station) =>
      list.findIndex(
        (f) => f.raw === track.raw && f.stationId === station.id,
      ),
    [],
  );

  const isSaved = useCallback(
    (track: NowPlaying, station: Station) =>
      findIndex(favorites, track, station) !== -1,
    [favorites, findIndex],
  );

  const toggle = useCallback(
    (track: NowPlaying, station: Station, city?: City) => {
      updateTracks((prev) => {
        const index = findIndex(prev, track, station);
        if (index !== -1) {
          return prev.filter((_, i) => i !== index);
        }
        const entry: FavoriteTrack = {
          id: makeId(),
          title: track.title,
          artist: track.artist,
          raw: track.raw,
          stationId: station.id,
          stationName: station.name,
          cityId: city?.id ?? "",
          // Запасное название на случай, если город исчезнет из данных; на экране
          // показывается название по cityId на текущем языке.
          cityName: city ? city.name.en : countryName(station.countryCode, "en"),
          savedAt: new Date().toISOString(),
          station,
        };
        return [entry, ...prev];
      });
    },
    [findIndex, updateTracks],
  );

  const remove = useCallback(
    (id: string) => {
      updateTracks((prev) => prev.filter((f) => f.id !== id));
    },
    [updateTracks],
  );

  const isStationSaved = useCallback(
    (stationId: string) => stationIds.includes(stationId),
    [stationIds],
  );

  const toggleStation = useCallback(
    (station: Station) => {
      const adding = !stationIds.includes(station.id);
      const nextIds = adding
        ? [...stationIds, station.id]
        : stationIds.filter((id) => id !== station.id);
      const nextSnapshots = { ...snapshots };
      if (adding) {
        nextSnapshots[station.id] = station;
      } else {
        delete nextSnapshots[station.id];
      }
      setStationIds(nextIds);
      setSnapshots(nextSnapshots);
      persistJson(STATIONS_KEY, nextIds);
      persistJson(SNAPSHOTS_KEY, nextSnapshots);
    },
    [stationIds, snapshots],
  );

  const resolveStation = useCallback(
    (stationId: string): ResolvedStation | undefined => {
      const found = getStation(stationId);
      if (found) return found;
      const snapshot = snapshots[stationId];
      return snapshot ? { station: snapshot } : undefined;
    },
    [snapshots],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isSaved,
      toggle,
      remove,
      stationIds,
      isStationSaved,
      toggleStation,
      resolveStation,
    }),
    [favorites, isSaved, toggle, remove, stationIds, isStationSaved, toggleStation, resolveStation],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used inside FavoritesProvider");
  }
  return ctx;
}
