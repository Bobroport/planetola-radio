import Storage from "expo-sqlite/kv-store";
import {
  createContext,
  useCallback,
  useContext,
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
  favorites: FavoriteTrack[];
  isSaved: (track: NowPlaying, station: Station) => boolean;
  save: (track: NowPlaying, station: Station, city: City) => void;
  remove: (id: string) => void;
  toggle: (track: NowPlaying, station: Station, city: City) => void;
};

const STORAGE_KEY = "favorites.v1";

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function load(): FavoriteTrack[] {
  try {
    const json = Storage.getItemSync(STORAGE_KEY);
    if (!json) return [];
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as FavoriteTrack[]) : [];
  } catch (e) {
    console.warn("Не удалось прочитать избранное", e);
    return [];
  }
}

function persist(list: FavoriteTrack[]): void {
  try {
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Не удалось сохранить избранное", e);
  }
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteTrack[]>(load);

  const update = useCallback(
    (fn: (prev: FavoriteTrack[]) => FavoriteTrack[]) => {
      setFavorites((prev) => {
        const next = fn(prev);
        persist(next);
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

  const save = useCallback(
    (track: NowPlaying, station: Station, city: City) => {
      update((prev) => {
        if (findIndex(prev, track, station) !== -1) return prev;
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
    [findIndex, update],
  );

  const remove = useCallback(
    (id: string) => {
      update((prev) => prev.filter((f) => f.id !== id));
    },
    [update],
  );

  const toggle = useCallback(
    (track: NowPlaying, station: Station, city: City) => {
      update((prev) => {
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
    [findIndex, update],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, isSaved, save, remove, toggle }),
    [favorites, isSaved, save, remove, toggle],
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
