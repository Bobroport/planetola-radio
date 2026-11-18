import type { AudioPlayer } from "expo-audio";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { useAppActive } from "@/hooks/use-app-active";
import { useDanceEnergy } from "@/hooks/use-dance-energy";

/** Общие свойства персонажей (`Beaver`, `Platypus`). */
export type CharacterProps = {
  size: number;
  /** Плеер, с которого снимать звук. Без него персонаж танцует под свой ритм. */
  player?: AudioPlayer | null;
  /** Идёт ли музыка: без неё персонаж просто покачивается. */
  dancing: boolean;
};

/**
 * Танцевальный «скелет», общий для всех персонажей: фаза и размах движения считаются
 * покадрово из громкости и тембра потока, а тело, голова, магнитофон и хвост получают
 * готовые анимированные стили. Персонаж лишь рисует части в SVG.
 */
export function useDanceRig(size: number, player: AudioPlayer | null, dancing: boolean) {
  const energy = useDanceEnergy(player, dancing);
  const phase = useSharedValue(0);
  const amp = useSharedValue(0.2);

  const frameCallback = useFrameCallback((frame) => {
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    const live = energy.hasSamples.value;
    const bpm = dancing ? (live ? 84 + energy.bright.value * 96 : 112) : 48;
    const target = dancing ? (live ? 0.3 + energy.level.value * 0.7 : 0.6) : 0.2;
    amp.value += (target - amp.value) * Math.min(1, dt * 6);
    phase.value = (phase.value + dt * (bpm / 60) * Math.PI * 2) % (Math.PI * 2);
  });

  // В фоне персонажа не видно: покадровый расчёт танца останавливаем, чтобы не тратить процессор.
  const appActive = useAppActive();
  useEffect(() => {
    frameCallback.setActive(appActive);
  }, [appActive, frameCallback]);

  const bodyStyle = useAnimatedStyle(() => {
    const s = Math.sin(phase.value);
    return {
      transform: [
        { translateY: -Math.abs(s) * size * 0.06 * amp.value },
        { rotate: `${s * 7 * amp.value}deg` },
        { scaleY: 1 - Math.cos(phase.value * 2) * 0.035 * amp.value },
      ],
    };
  });

  const headStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.sin(phase.value + 0.6) * 8 * amp.value}deg` }],
  }));

  const boomboxStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.abs(Math.sin(phase.value + Math.PI / 2)) * size * 0.03 * amp.value },
      { rotate: `${Math.sin(phase.value) * -4 * amp.value}deg` },
    ],
  }));

  const tailStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.sin(phase.value * 0.5) * 14 * amp.value}deg` }],
  }));

  const note1 = useNoteStyle(phase, amp, size, dancing, 0);
  const note2 = useNoteStyle(phase, amp, size, dancing, 0.5);

  return { bodyStyle, headStyle, boomboxStyle, tailStyle, note1, note2 };
}

/** Нотка всплывает над персонажем и тает; offset сдвигает фазу, чтобы ноты шли вразнобой. */
function useNoteStyle(
  phase: SharedValue<number>,
  amp: SharedValue<number>,
  size: number,
  dancing: boolean,
  offset: number,
) {
  return useAnimatedStyle(() => {
    const t = (phase.value / (Math.PI * 2) + offset) % 1;
    const visible = dancing ? Math.min(1, amp.value * 1.4) : 0;
    return {
      opacity: visible * (1 - t) * 0.9,
      transform: [
        { translateY: -t * size * 0.25 },
        { translateX: Math.sin(t * Math.PI * 2 + offset * 7) * size * 0.04 },
      ],
    };
  });
}

type NotesProps = {
  size: number;
  rig: Pick<ReturnType<typeof useDanceRig>, "note1" | "note2">;
};

/** Две нотки над персонажем. Кладутся поверх тела, вне его анимации. */
export function DanceNotes({ size, rig }: NotesProps) {
  return (
    <>
      <Animated.View style={[styles.note, { left: size * 0.72, top: size * 0.2 }, rig.note1]}>
        <Svg viewBox="0 0 24 24" width={size * 0.14} height={size * 0.14}>
          <Path d={NOTE} fill="#ff6b9a" stroke="#ff6b9a" strokeWidth={1.5} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.note, { left: size * 0.12, top: size * 0.3 }, rig.note2]}>
        <Svg viewBox="0 0 24 24" width={size * 0.11} height={size * 0.11}>
          <Path d={NOTE} fill="#ffd166" stroke="#ffd166" strokeWidth={1.5} />
        </Svg>
      </Animated.View>
    </>
  );
}

const NOTE = "M9 18 a3 3 0 1 0 0.01 0 M12 17 V4 l7 2 v3 l-7 -2";

const styles = StyleSheet.create({
  note: {
    position: "absolute",
  },
});
