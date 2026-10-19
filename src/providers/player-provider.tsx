import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Station } from "@/data/stations";
import { fetchNowPlaying, type NowPlaying } from "@/lib/icy";
import { registerClick } from "@/lib/radio-browser";

/** Как часто перечитывать название трека из потока. */
const NOW_PLAYING_INTERVAL_MS = 15_000;
const NOW_PLAYING_TIMEOUT_MS = 10_000;

type PlayerContextValue = {
  current: Station | null;
  nowPlaying: NowPlaying | null;
  isBuffering: boolean;
  error: string | null;
  play: (station: Station) => void;
  stop: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [current, setCurrent] = useState<Station | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch((e: unknown) => {
      console.warn("setAudioModeAsync failed", e);
    });
  }, []);

  // Опрос ICY-метаданных текущей станции.
  useEffect(() => {
    if (!current) {
      return;
    }
    const streamUrl = current.streamUrl;
    let cancelled = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      controller = new AbortController();
      const timeout = setTimeout(
        () => controller?.abort(),
        NOW_PLAYING_TIMEOUT_MS,
      );
      try {
        const result = await fetchNowPlaying(streamUrl, controller.signal);
        if (!cancelled) {
          setNowPlaying((prev) =>
            prev?.raw === result?.raw ? prev : result,
          );
        }
      } catch {
        // Станция не отдаёт метаданные или сеть недоступна — оставляем прошлое значение.
      } finally {
        clearTimeout(timeout);
        if (!cancelled) {
          timer = setTimeout(poll, NOW_PLAYING_INTERVAL_MS);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
    };
  }, [current]);

  const play = useCallback(
    (station: Station) => {
      if (current?.id === station.id) {
        return;
      }
      setCurrent(station);
      setNowPlaying(null);
      player.replace(station.streamUrl);
      player.play();
      registerClick(station.id);
    },
    [current, player],
  );

  const stop = useCallback(() => {
    player.pause();
    setCurrent(null);
    setNowPlaying(null);
  }, [player]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      current,
      nowPlaying,
      isBuffering: status.isBuffering || !status.isLoaded,
      error: status.error,
      play,
      stop,
    }),
    [
      current,
      nowPlaying,
      status.isBuffering,
      status.isLoaded,
      status.error,
      play,
      stop,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used inside PlayerProvider");
  }
  return ctx;
}
