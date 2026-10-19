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

import type { City, Station } from "@/data/stations";
import type { NowPlaying } from "@/lib/icy";

export type FavoriteTrack = {
  id: string;
  title: string;
  artist: string | null;
  raw: string;
  stationId: string;
  stationName: string;
  cityId: string;
  cityName: string;
  /** ISO 8601, момент сохранения. */
  savedAt: string;
};

type FavoritesContextValue = {
  /** Сохранённые треки, новые сверху. */
  favorites: FavoriteTrack[];
  isSaved: (track: NowPlaying, station: Station) => boolean;
  toggle: (track: NowPlaying, station: Station, city: City) => void;
  remove: (id: string) => void;
  /** Плейлист: id избранных станций в порядке добавления. */
  stationIds: string[];
  isStationSaved: (stationId: string) => boolean;
  toggleStation: (stationId: string) => void;
};

const TRACKS_KEY = "favorites.v1";
const STATIONS_KEY = "favorite-stations.v1";

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const json = await Storage.getItemAsync(key);
    if (!json) return fallback;
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch (e) {
    console.warn(`Не удалось прочитать ${key}`, e);
    return fallback;
  }
}

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

  // Читаем сохранённое после монтирования, чтобы не ходить в SQLite во время рендера.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadJson<FavoriteTrack[]>(TRACKS_KEY, []),
      loadJson<string[]>(STATIONS_KEY, []),
    ]).then(([tracks, stations]) => {
      if (cancelled) return;
      if (tracks.length > 0) {
        setFavorites((prev) => (prev.length === 0 ? tracks : prev));
      }
      if (stations.length > 0) {
        setStationIds((prev) => (prev.length === 0 ? stations : prev));
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
    (track: NowPlaying, station: Station, city: City) => {
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
          cityId: city.id,
          cityName: city.name,
          savedAt: new Date().toISOString(),
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

  const toggleStation = useCallback((stationId: string) => {
    setStationIds((prev) => {
      const next = prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId];
      persistJson(STATIONS_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isSaved,
      toggle,
      remove,
      stationIds,
      isStationSaved,
      toggleStation,
    }),
    [favorites, isSaved, toggle, remove, stationIds, isStationSaved, toggleStation],
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
