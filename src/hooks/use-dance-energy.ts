import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  useAudioSampleListener,
  type AudioPlayer,
  type AudioSample,
} from "expo-audio";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";

export type DanceEnergy = {
  /** Громкость 0..1 (сглаженный RMS). */
  level: SharedValue<number>;
  /** «Яркость» тембра 0..1: доля пересечений нуля, грубая оценка высоких частот. */
  bright: SharedValue<number>;
  /** Приходят ли сэмплы вообще (на iOS живой поток может их не давать). */
  hasSamples: SharedValue<boolean>;
};

const LEVEL_GAIN = 4;
const BRIGHT_GAIN = 6;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function analyse(sample: AudioSample): { level: number; bright: number } | null {
  const frames = sample.channels[0]?.frames;
  if (!frames || frames.length < 8) {
    return null;
  }
  let sumSquares = 0;
  let zeroCrossings = 0;
  let prevPositive = frames[0] >= 0;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    sumSquares += f * f;
    const positive = f >= 0;
    if (positive !== prevPositive) {
      zeroCrossings++;
      prevPositive = positive;
    }
  }
  const rms = Math.sqrt(sumSquares / frames.length);
  return {
    level: clamp01(rms * LEVEL_GAIN),
    bright: clamp01((zeroCrossings / frames.length) * BRIGHT_GAIN),
  };
}

/**
 * Снимает с плеера PCM-сэмплы и превращает их в два числа для анимации.
 * Если сэмплов нет (нет разрешения, платформа не поддерживает, живой поток
 * на iOS), hasSamples остаётся false и бобёр танцует под «свой» ритм.
 */
export function useDanceEnergy(player: AudioPlayer | null): DanceEnergy {
  const level = useSharedValue(0);
  const bright = useSharedValue(0.5);
  const hasSamples = useSharedValue(false);

  useEffect(() => {
    if (Platform.OS !== "android" || !player) {
      return;
    }
    let cancelled = false;
    (async () => {
      let { granted } = await getRecordingPermissionsAsync();
      if (!granted) {
        granted = (await requestRecordingPermissionsAsync()).granted;
      }
      if (granted && !cancelled) {
        // Visualizer создаётся только при включении, а хук включил сэмплирование
        // до выдачи разрешения — перезапускаем.
        player.setAudioSamplingEnabled(false);
        player.setAudioSamplingEnabled(true);
      }
    })().catch(() => {
      // Без разрешения бобёр танцует без анализа звука.
    });
    return () => {
      cancelled = true;
    };
  }, [player]);

  useAudioSampleListener(player ?? FAKE_PLAYER, (sample) => {
    const result = analyse(sample);
    if (!result) return;
    level.value = level.value * 0.5 + result.level * 0.5;
    bright.value = bright.value * 0.85 + result.bright * 0.15;
    hasSamples.value = true;
  });

  return { level, bright, hasSamples };
}

/** Заглушка для случая без плеера: сэмплирование не поддерживается, хук ничего не делает. */
const FAKE_PLAYER = {
  id: -1,
  isAudioSamplingSupported: false,
} as unknown as AudioPlayer;
