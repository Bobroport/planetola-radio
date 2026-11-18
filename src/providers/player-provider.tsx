import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioMetadata,
  type AudioPlayer,
  type AudioStatus,
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
import { timed } from "@/lib/audio-timing";
import { flightBusyMs } from "@/lib/globe-flight";
import { fetchNowPlaying, type NowPlaying } from "@/lib/icy";
import { registerClick } from "@/lib/radio-browser";

/** Как часто перечитывать название трека из потока: на экране и в фоне (экран блокировки, CarPlay). */
const NOW_PLAYING_INTERVAL_MS = 15_000;
const NOW_PLAYING_BACKGROUND_INTERVAL_MS = 30_000;
const NOW_PLAYING_TIMEOUT_MS = 10_000;
/** Обложка для экрана блокировки и CarPlay: иконка приложения с нашего сайта. */
const ARTWORK_URL = "https://bobroport.github.io/planetola-radio/icon.png";

/** Варианты таймера сна, минуты. */
export const SLEEP_TIMER_MINUTES = [15, 30, 45, 60] as const;

/** Через сколько освобождать заменённый плеер, если глобус не занят перелётом. */
const RETIRE_DELAY_MS = 300;

type PlayerStatus = Pick<AudioStatus, "playing" | "isBuffering" | "isLoaded" | "error">;

/** Состояние плеера, от которого ещё не пришло ни одного события: поток подключается. */
const IDLE_STATUS: PlayerStatus = {
  playing: false,
  isBuffering: false,
  isLoaded: false,
  error: null,
};

/**
 * Снимает заменённый плеер с эфира. Глушим, а не ставим на паузу: `pause()` из JS через
 * 100 мс выключает аудиосессию, если ничего не играет, а новый плеер в этот момент ещё
 * буферизуется, и в фоне iOS усыпила бы приложение. Освобождение разбирает живой поток
 * синхронно в потоке JS (до нескольких секунд), поэтому ждёт конца перелёта глобуса.
 */
function retirePlayer(player: AudioPlayer): void {
  try {
    timed("mute old player", () => {
      player.muted = true;
    });
  } catch {
    // Плеер уже освобождён (Fast Refresh в разработке): глушить нечего.
    return;
  }
  const release = () => {
    const busy = flightBusyMs();
    if (busy > 0) {
      setTimeout(release, busy);
      return;
    }
    try {
      timed("release old player", () => player.release());
    } catch (e) {
      console.warn("Не удалось освободить плеер", e);
    }
  };
  setTimeout(release, RETIRE_DELAY_MS);
}

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
  /**
   * Включить станцию. `queue` — список, из которого её выбрали: по нему ходят «вперёд/назад».
   * С `delayMs` станция сразу становится текущей, прежняя замолкает, а поток подключается
   * через указанное время: смена живого потока на секунды занимает поток JS, и перелёт
   * глобуса, начатый одновременно с ней, замирает.
   */
  play: (station: Station, queue?: Station[], options?: { delayMs?: number }) => void;
  pause: () => void;
  /** Продолжить после паузы: живой поток подключается заново. */
  resume: () => void;
  next: () => void;
  previous: () => void;
  /** Есть куда переключаться кнопками «вперёд/назад». */
  hasQueue: boolean;
  stop: () => void;
  /** Момент (Date.now()), когда таймер сна остановит плеер; null — таймер выключен. */
  sleepTimerEndsAt: number | null;
  /** Завести таймер сна на столько минут или выключить его (null). */
  setSleepTimer: (minutes: number | null) => void;
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
  // На каждое подключение потока создаётся новый плеер (см. startStream): `replace` на
  // играющем живом потоке на секунды занимает поток JS, а свежий плеер подключается сразу.
  // При размонтировании плеер не освобождаем: провайдер живёт всё время работы приложения,
  // а Fast Refresh перезапускает эффекты и освободил бы плеер, который ещё в состоянии.
  const [player, setPlayer] = useState<AudioPlayer>(() => createAudioPlayer(null));
  const playerRef = useRef(player);
  const statusSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const [statusEvent, setStatusEvent] = useState<AudioStatus | null>(null);
  // События прежнего плеера к новому не относятся: до первого своего события он «подключается».
  const status: PlayerStatus =
    statusEvent && statusEvent.id === player.id ? statusEvent : IDLE_STATUS;
  const { language } = useI18n();
  const [current, setCurrent] = useState<Station | null>(null);
  const [queue, setQueue] = useState<Station[]>([]);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [nowPlayingChecked, setNowPlayingChecked] = useState(false);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);
  const appActive = useAppActive();
  const intentRef = useRef<Intent>("stopped");
  const wasPlayingRef = useRef(false);
  const interruptedRef = useRef(false);
  const nowPlayingRef = useRef<NowPlaying | null>(null);
  /** Отложенное подключение потока (см. `play` с `delayMs`): таймер и досрочный запуск. */
  const pendingRef = useRef<{ timer: ReturnType<typeof setTimeout>; fire: () => void } | null>(
    null,
  );
  /** Станция выбрана, но её поток ещё не подключали: панель показывает загрузку. */
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

  const cancelPending = useCallback(() => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    }
    setConnecting(false);
  }, []);

  useEffect(
    () => () => {
      if (pendingRef.current) clearTimeout(pendingRef.current.timer);
    },
    [],
  );

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch((e: unknown) => {
      console.warn("setAudioModeAsync failed", e);
    });
  }, []);

  const onStatus = useCallback((next: AudioStatus) => {
    // Плеер шлёт состояние дважды в секунду; перерисовка нужна только при смене этих полей.
    setStatusEvent((prev) =>
      prev &&
      prev.id === next.id &&
      prev.playing === next.playing &&
      prev.isBuffering === next.isBuffering &&
      prev.isLoaded === next.isLoaded &&
      prev.error === next.error
        ? prev
        : next,
    );
  }, []);

  /** Подключает поток станции (заново) в новом плеере и выводит её на экран блокировки. */
  const startStream = useCallback(
    (station: Station) => {
      wasPlayingRef.current = false;
      interruptedRef.current = false;
      const previous = playerRef.current;
      const next = timed("create player", () => createAudioPlayer(station.streamUrl));
      // Подписка сразу при создании, а не в эффекте: ранняя ошибка потока не потеряется.
      statusSubscriptionRef.current?.remove();
      statusSubscriptionRef.current = next.addListener("playbackStatusUpdate", onStatus);
      timed("play", () => next.play());
      // Кнопки «следующий/предыдущий» у одиночного плеера включает наш патч expo-audio
      // (patches/): в Expo Go они не появляются, в сборках EAS шлют событие remoteCommand.
      timed("lock screen", () =>
        next.setActiveForLockScreen(
          true,
          lockScreenMetadata(station, nowPlayingRef.current, language),
          { isLiveStream: true, showNextTrack: true, showPreviousTrack: true },
        ),
      );
      playerRef.current = next;
      setPlayer(next);
      retirePlayer(previous);
    },
    [language, onStatus],
  );

  // Название трека на экране блокировки обновляется вместе с ICY-метаданными.
  useEffect(() => {
    if (!current) return;
    player.updateLockScreenMetadata(lockScreenMetadata(current, nowPlaying, language));
  }, [player, current, nowPlaying, language]);

  // Опрос ICY-метаданных текущей станции. В фоне тоже: название трека показывают экран
  // блокировки и CarPlay, но реже, чтобы не жечь батарею. Каждое соединение обрывается
  // через abort (см. src/lib/icy.ts), поэтому ресурсы в фоне не копятся.
  useEffect(() => {
    if (!current) {
      return;
    }
    const streamUrl = current.streamUrl;
    const intervalMs = appActive ? NOW_PLAYING_INTERVAL_MS : NOW_PLAYING_BACKGROUND_INTERVAL_MS;
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
        // Отмена через abort (сменили станцию) — штатный выход, в лог не пишем.
        if (__DEV__ && !controller?.signal.aborted) {
          console.log("ICY metadata failed", streamUrl, e);
        }
        if (!cancelled) {
          setNowPlayingChecked(true);
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) {
          timer = setTimeout(poll, intervalMs);
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
    // Пока поток новой станции отложен, тишина — наша пауза, а не прерывание.
    if (!current || intentRef.current !== "playing" || pendingRef.current) return;
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
    (station: Station, delayMs = 0) => {
      cancelPending();
      intentRef.current = "playing";
      setCurrent(station);
      setNowPlaying(null);
      setNowPlayingChecked(false);
      nowPlayingRef.current = null;
      if (delayMs > 0) {
        wasPlayingRef.current = false;
        interruptedRef.current = false;
        // Глушим, а не ставим на паузу: см. retirePlayer.
        playerRef.current.muted = true;
        setConnecting(true);
        const fire = () => {
          if (pendingRef.current) clearTimeout(pendingRef.current.timer);
          pendingRef.current = null;
          setConnecting(false);
          startStream(station);
        };
        pendingRef.current = { timer: setTimeout(fire, delayMs), fire };
      } else {
        startStream(station);
      }
      registerClick(station.id);
    },
    [cancelPending, startStream],
  );

  // Приложение ушло в фон, пока поток отложен: подключаем сразу. Таймер в фоне может
  // не сработать, а с молчащим плеером iOS приложение быстро приостановит.
  useEffect(() => {
    if (!appActive) pendingRef.current?.fire();
  }, [appActive]);

  const play = useCallback(
    (station: Station, list?: Station[], options?: { delayMs?: number }) => {
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
      start(station, options?.delayMs ?? 0);
    },
    [current, status.playing, status.isBuffering, start],
  );

  const pause = useCallback(() => {
    cancelPending();
    intentRef.current = "paused";
    player.pause();
  }, [cancelPending, player]);

  const resume = useCallback(() => {
    if (!current) return;
    cancelPending();
    intentRef.current = "playing";
    startStream(current);
  }, [cancelPending, current, startStream]);

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
    cancelPending();
    intentRef.current = "stopped";
    wasPlayingRef.current = false;
    interruptedRef.current = false;
    player.pause();
    player.clearLockScreenControls();
    setCurrent(null);
    setQueue([]);
    setNowPlaying(null);
    setNowPlayingChecked(false);
    setSleepTimerEndsAt(null);
  }, [cancelPending, player]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerEndsAt(minutes === null ? null : Date.now() + minutes * 60_000);
  }, []);

  // Таймер сна. Срок хранится как момент времени, а не как оставшиеся секунды: если в фоне
  // JS-таймер опоздал, при возврате в приложение эффект перезапустится (appActive в
  // зависимостях) и остановит плеер сразу.
  useEffect(() => {
    if (sleepTimerEndsAt === null) return;
    const delay = Math.max(0, sleepTimerEndsAt - Date.now());
    const timer = setTimeout(stop, delay);
    return () => clearTimeout(timer);
  }, [sleepTimerEndsAt, stop, appActive]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      player,
      current,
      nowPlaying,
      nowPlayingChecked,
      isPlaying: !connecting && status.playing && !status.isBuffering,
      isBuffering: connecting || status.isBuffering || !status.isLoaded,
      error: status.error,
      play,
      pause,
      resume,
      next,
      previous,
      hasQueue: queue.length > 1,
      stop,
      sleepTimerEndsAt,
      setSleepTimer,
    }),
    [
      player,
      current,
      nowPlaying,
      nowPlayingChecked,
      connecting,
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
      sleepTimerEndsAt,
      setSleepTimer,
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
