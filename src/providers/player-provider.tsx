import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioMetadata,
  type AudioPlayer,
} from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cityName, countryName, getCityOfStation, type Station } from "@/data/stations";
import { useAppActive } from "@/hooks/use-app-active";
import { useI18n } from "@/i18n";
import { fetchNowPlaying, type NowPlaying } from "@/lib/icy";
import { registerClick } from "@/lib/radio-browser";

/** Как часто перечитывать название трека из потока. */
const NOW_PLAYING_INTERVAL_MS = 15_000;
const NOW_PLAYING_TIMEOUT_MS = 10_000;
/** Обложка для экрана блокировки и CarPlay: иконка приложения с нашего сайта. */
const ARTWORK_URL = "https://bobroport.github.io/planetola-radio/icon.png";

/** Чего хочет пользователь. Нужно, чтобы отличить прерывание системой от паузы по его воле. */
type Intent = "playing" | "paused" | "stopped";

type PlayerContextValue = {
  player: AudioPlayer;
  current: Station | null;
  nowPlaying: NowPlaying | null;
  /** Первый опрос метаданных завершён: если nowPlaying всё ещё null, станция их не шлёт. */
  nowPlayingChecked: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  error: string | null;
  /** Включить станцию. `queue` — список, из которого её выбрали: по нему ходят «вперёд/назад». */
  play: (station: Station, queue?: Station[]) => void;
  pause: () => void;
  /** Продолжить после паузы: живой поток подключается заново. */
  resume: () => void;
  next: () => void;
  previous: () => void;
  /** Есть куда переключаться кнопками «вперёд/назад». */
  hasQueue: boolean;
  stop: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

/** Экран блокировки и CarPlay: «Станция» / «Исполнитель — Трек», а без трека — город и страна. */
function lockScreenMetadata(
  station: Station,
  nowPlaying: NowPlaying | null,
  language: string,
): AudioMetadata {
  const city = getCityOfStation(station.id);
  const country = countryName(station.countryCode, language);
  const place = city ? `${cityName(city, language)} · ${country}` : country;
  const track = nowPlaying
    ? nowPlaying.artist
      ? `${nowPlaying.artist} — ${nowPlaying.title}`
      : nowPlaying.title
    : null;
  return {
    title: station.name,
    artist: track ?? place,
    albumTitle: track ? place : undefined,
    artworkUrl: ARTWORK_URL,
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const { language } = useI18n();
  const [current, setCurrent] = useState<Station | null>(null);
  const [queue, setQueue] = useState<Station[]>([]);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [nowPlayingChecked, setNowPlayingChecked] = useState(false);
  const appActive = useAppActive();
  const intentRef = useRef<Intent>("stopped");
  const wasPlayingRef = useRef(false);
  const interruptedRef = useRef(false);
  const nowPlayingRef = useRef<NowPlaying | null>(null);

  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch((e: unknown) => {
      console.warn("setAudioModeAsync failed", e);
    });
  }, []);

  /** Подключает поток станции (заново) и выводит её на экран блокировки. */
  const startStream = useCallback(
    (station: Station) => {
      wasPlayingRef.current = false;
      interruptedRef.current = false;
      player.replace(station.streamUrl);
      player.play();
      // showNextPrevious понимает только наш патч expo-audio (patches/): в Expo Go опция
      // игнорируется, кнопки «следующий/предыдущий» есть лишь в сборках EAS.
      player.setActiveForLockScreen(
        true,
        lockScreenMetadata(station, nowPlayingRef.current, language),
        { isLiveStream: true, showNextPrevious: true },
      );
    },
    [player, language],
  );

  // Название трека на экране блокировки обновляется вместе с ICY-метаданными.
  useEffect(() => {
    if (!current) return;
    player.updateLockScreenMetadata(lockScreenMetadata(current, nowPlaying, language));
  }, [player, current, nowPlaying, language]);

  // Опрос ICY-метаданных текущей станции. В фоне не опрашиваем: название трека там не видно,
  // а лишняя сеть и процессор в фоне на iOS заканчиваются завершением приложения.
  useEffect(() => {
    if (!current || !appActive) {
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
          setNowPlayingChecked(true);
        }
      } catch (e) {
        // Станция не отдаёт метаданные или сеть недоступна — оставляем прошлое значение.
        if (__DEV__) {
          console.log("ICY metadata failed", streamUrl, e);
        }
        if (!cancelled) {
          setNowPlayingChecked(true);
        }
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
  }, [current, appActive]);

  // Прерывание (звонок, наушники, пауза с экрана блокировки): система ставит плеер на паузу,
  // а при возобновлении лишь вызывает play() на старом соединении, которое у живого потока
  // к тому времени мертво. Поэтому любой выход из такой паузы переподключает поток.
  useEffect(() => {
    if (!current || intentRef.current !== "playing") return;
    const active = status.playing || status.isBuffering;
    if (status.playing) {
      wasPlayingRef.current = true;
    }
    if (!active) {
      if (wasPlayingRef.current) {
        wasPlayingRef.current = false;
        interruptedRef.current = true;
      }
      return;
    }
    if (interruptedRef.current) {
      startStream(current);
    }
  }, [current, status.playing, status.isBuffering, startStream]);

  const start = useCallback(
    (station: Station) => {
      intentRef.current = "playing";
      setCurrent(station);
      setNowPlaying(null);
      setNowPlayingChecked(false);
      nowPlayingRef.current = null;
      startStream(station);
      registerClick(station.id);
    },
    [startStream],
  );

  const play = useCallback(
    (station: Station, list?: Station[]) => {
      if (list) {
        setQueue(list);
      } else if (current?.id !== station.id) {
        setQueue([]);
      }
      const alreadyOn =
        current?.id === station.id &&
        intentRef.current === "playing" &&
        (status.playing || status.isBuffering);
      if (alreadyOn) {
        return;
      }
      start(station);
    },
    [current, status.playing, status.isBuffering, start],
  );

  const pause = useCallback(() => {
    intentRef.current = "paused";
    player.pause();
  }, [player]);

  const resume = useCallback(() => {
    if (!current) return;
    intentRef.current = "playing";
    startStream(current);
  }, [current, startStream]);

  const step = useCallback(
    (delta: 1 | -1) => {
      if (!current || queue.length < 2) return;
      const index = queue.findIndex((s) => s.id === current.id);
      if (index === -1) return;
      const target = queue[(index + delta + queue.length) % queue.length];
      if (target && target.id !== current.id) {
        start(target);
      }
    },
    [current, queue, start],
  );

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  // Кнопки «следующий/предыдущий» с экрана блокировки, CarPlay, наушников и руля.
  // Событие шлёт патченный expo-audio (patches/); в Expo Go оно просто не приходит.
  useEffect(() => {
    const subscription = player.addListener("remoteCommand", ({ command }) => {
      if (command === "next") next();
      else if (command === "previous") previous();
    });
    return () => subscription.remove();
  }, [player, next, previous]);

  const stop = useCallback(() => {
    intentRef.current = "stopped";
    wasPlayingRef.current = false;
    interruptedRef.current = false;
    player.pause();
    player.clearLockScreenControls();
    setCurrent(null);
    setQueue([]);
    setNowPlaying(null);
    setNowPlayingChecked(false);
  }, [player]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      player,
      current,
      nowPlaying,
      nowPlayingChecked,
      isPlaying: status.playing && !status.isBuffering,
      isBuffering: status.isBuffering || !status.isLoaded,
      error: status.error,
      play,
      pause,
      resume,
      next,
      previous,
      hasQueue: queue.length > 1,
      stop,
    }),
    [
      player,
      current,
      nowPlaying,
      nowPlayingChecked,
      status.playing,
      status.isBuffering,
      status.isLoaded,
      status.error,
      play,
      pause,
      resume,
      next,
      previous,
      queue.length,
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
