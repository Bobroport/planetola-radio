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
import { registerClick } from "@/lib/radio-browser";

type PlayerContextValue = {
  current: Station | null;
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

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch((e: unknown) => {
      console.warn("setAudioModeAsync failed", e);
    });
  }, []);

  const play = useCallback(
    (station: Station) => {
      if (current?.id === station.id) {
        return;
      }
      setCurrent(station);
      player.replace(station.streamUrl);
      player.play();
      registerClick(station.id);
    },
    [current, player],
  );

  const stop = useCallback(() => {
    player.pause();
    setCurrent(null);
  }, [player]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      current,
      isBuffering: status.isBuffering || !status.isLoaded,
      error: status.error,
      play,
      stop,
    }),
    [current, status.isBuffering, status.isLoaded, status.error, play, stop],
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
