import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  type AudioPlayer,
  type AudioSample,
} from "expo-audio";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";

import { useAppActive } from "@/hooks/use-app-active";

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
/** Анализируем не каждый сэмпл подряд: этого хватает для плавного танца и бережёт процессор. */
const MIN_ANALYSE_INTERVAL_MS = 60;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function analyse(sample: AudioSample): { level: number; bright: number } | null {
  const frames = sample.channels[0]?.frames;
  if (!frames || frames.length < 8) {
    return null;
  }
  // Каждый второй кадр: для оценки громкости и яркости точности достаточно.
  let sumSquares = 0;
  let zeroCrossings = 0;
  let count = 0;
  let prevPositive = frames[0] >= 0;
  for (let i = 0; i < frames.length; i += 2) {
    const f = frames[i];
    sumSquares += f * f;
    const positive = f >= 0;
    if (positive !== prevPositive) {
      zeroCrossings++;
      prevPositive = positive;
    }
    count++;
  }
  const rms = Math.sqrt(sumSquares / count);
  return {
    level: clamp01(rms * LEVEL_GAIN),
    // Прореживание вдвое занижает число пересечений примерно вдвое — компенсируем.
    bright: clamp01((zeroCrossings / count) * BRIGHT_GAIN * 0.5),
  };
}

/**
 * Снимает с плеера PCM-сэмплы и превращает их в два числа для анимации.
 *
 * Сэмплирование включено только пока `enabled` и приложение на экране, и выключается
 * при размонтировании: штатный `useAudioSampleListener` его не выключает, и поток
 * сэмплов продолжал бы идти в JS в фоне, из-за чего iOS завершает приложение.
 * Если сэмплов нет, hasSamples остаётся false и бобёр танцует под «свой» ритм.
 */
export function useDanceEnergy(player: AudioPlayer | null, enabled: boolean): DanceEnergy {
  const level = useSharedValue(0);
  const bright = useSharedValue(0.5);
  const hasSamples = useSharedValue(false);
  const appActive = useAppActive();
  // На Android Visualizer требует разрешение на микрофон; без него сэмплирование не включаем.
  const [permitted, setPermitted] = useState(Platform.OS !== "android");

  useEffect(() => {
    if (Platform.OS !== "android" || !player || !enabled) {
      return;
    }
    let cancelled = false;
    (async () => {
      let { granted } = await getRecordingPermissionsAsync();
      if (!granted) {
        granted = (await requestRecordingPermissionsAsync()).granted;
      }
      if (!cancelled) setPermitted(granted);
    })().catch(() => {
      // Без разрешения бобёр танцует без анализа звука.
    });
    return () => {
      cancelled = true;
    };
  }, [player, enabled]);

  useEffect(() => {
    if (!player || !enabled || !appActive || !permitted) {
      return;
    }
    if (!player.isAudioSamplingSupported) {
      return;
    }
    let lastAnalysed = 0;
    player.setAudioSamplingEnabled(true);
    const subscription = player.addListener("audioSampleUpdate", (sample) => {
      const now = Date.now();
      if (now - lastAnalysed < MIN_ANALYSE_INTERVAL_MS) return;
      lastAnalysed = now;
      const result = analyse(sample);
      if (!result) return;
      level.value = level.value * 0.5 + result.level * 0.5;
      bright.value = bright.value * 0.85 + result.bright * 0.15;
      hasSamples.value = true;
    });
    return () => {
      subscription.remove();
      player.setAudioSamplingEnabled(false);
      hasSamples.value = false;
    };
  }, [player, enabled, appActive, permitted, level, bright, hasSamples]);

  return { level, bright, hasSamples };
}
