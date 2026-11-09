import type { AudioPlayer } from "expo-audio";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";

import { useAppActive } from "@/hooks/use-app-active";
import { useDanceEnergy } from "@/hooks/use-dance-energy";

type Props = {
  size: number;
  /** Плеер, с которого снимать звук. Без него бобёр танцует под свой ритм. */
  player?: AudioPlayer | null;
  /** Идёт ли музыка: без неё бобёр просто покачивается. */
  dancing: boolean;
};

const VIEWBOX = "0 0 200 200";
const BROWN = "#8b5a2b";
const DARK = "#3d2411";
const TAN = "#d8b48a";
const CAP = "#2d7dd2";
const CAP_DARK = "#2466b3";

export function Beaver({ size, player = null, dancing }: Props) {
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

  // В фоне бобра не видно: покадровый расчёт танца останавливаем, чтобы не тратить процессор.
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
    transform: [
      { rotate: `${Math.sin(phase.value + 0.6) * 8 * amp.value}deg` },
    ],
  }));

  const boomboxStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          Math.abs(Math.sin(phase.value + Math.PI / 2)) * size * 0.03 * amp.value,
      },
      { rotate: `${Math.sin(phase.value) * -4 * amp.value}deg` },
    ],
  }));

  const tailStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${Math.sin(phase.value * 0.5) * 14 * amp.value}deg` },
    ],
  }));

  const note1 = useNoteStyle(phase, amp, size, dancing, 0);
  const note2 = useNoteStyle(phase, amp, size, dancing, 0.5);

  const box = { width: size, height: size };

  return (
    <View style={box}>
      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        {/* хвост */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            tailStyle,
            { transformOrigin: "59% 75%" },
          ]}
        >
          <Svg viewBox={VIEWBOX} width={size} height={size}>
            <G rotation={-20} origin="118, 150">
              <Ellipse cx={140} cy={158} rx={34} ry={16} fill="#4a2c17" />
              <Path
                d="M112 152 L168 148 M114 158 L170 156 M118 164 L166 164 M126 146 L134 170 M140 144 L146 172 M154 144 L158 170"
                stroke="#2f1a0c"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </G>
          </Svg>
        </Animated.View>

        {/* ноги, тело, руки */}
        <Svg
          viewBox={VIEWBOX}
          width={size}
          height={size}
          style={StyleSheet.absoluteFill}
        >
          <Ellipse cx={78} cy={186} rx={16} ry={8} fill={DARK} />
          <Ellipse cx={118} cy={186} rx={16} ry={8} fill={DARK} />
          <Ellipse cx={98} cy={138} rx={46} ry={48} fill={BROWN} />
          <Ellipse cx={98} cy={146} rx={30} ry={34} fill={TAN} />
          <Path
            d="M60 118 Q44 134 58 150"
            stroke={BROWN}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M136 118 Q152 134 138 150"
            stroke={BROWN}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>

        {/* магнитофон */}
        <Animated.View style={[StyleSheet.absoluteFill, boomboxStyle]}>
          <Svg viewBox={VIEWBOX} width={size} height={size}>
            <Path d="M70 118 Q98 100 126 118" stroke="#444" strokeWidth={4} fill="none" />
            <Line x1={126} y1={120} x2={146} y2={98} stroke="#777" strokeWidth={2} strokeLinecap="round" />
            <Circle cx={146} cy={98} r={2} fill="#777" />
            <Rect x={52} y={118} width={92} height={46} rx={6} fill="#5c5c60" stroke="#2b2b2e" strokeWidth={2} />
            <Circle cx={72} cy={141} r={14} fill="#1f1f22" />
            <Circle cx={72} cy={141} r={9} fill="#3a3a3e" />
            <Circle cx={72} cy={141} r={3} fill="#1f1f22" />
            <Circle cx={124} cy={141} r={14} fill="#1f1f22" />
            <Circle cx={124} cy={141} r={9} fill="#3a3a3e" />
            <Circle cx={124} cy={141} r={3} fill="#1f1f22" />
            <Rect x={88} y={128} width={20} height={12} rx={2} fill="#2b2b2e" />
            <Circle cx={94} cy={134} r={2.5} fill="#888" />
            <Circle cx={102} cy={134} r={2.5} fill="#888" />
            <Rect x={88} y={146} width={20} height={10} rx={1.5} fill="#2b2b2e" />
            <Rect x={90} y={148} width={3} height={6} fill="#e63946" />
            <Rect x={94} y={148} width={3} height={6} fill="#aaa" />
            <Rect x={98} y={148} width={3} height={6} fill="#aaa" />
            <Rect x={102} y={148} width={3} height={6} fill="#aaa" />
            <Rect x={58} y={122} width={80} height={2} fill="#8a8a8e" />
          </Svg>
        </Animated.View>

        {/* голова */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            headStyle,
            { transformOrigin: "49% 55%" },
          ]}
        >
          <Svg viewBox={VIEWBOX} width={size} height={size}>
            <Circle cx={64} cy={50} r={10} fill={BROWN} />
            <Circle cx={132} cy={50} r={10} fill={BROWN} />
            <Circle cx={64} cy={50} r={5} fill={TAN} />
            <Circle cx={132} cy={50} r={5} fill={TAN} />
            <Circle cx={98} cy={72} r={40} fill={BROWN} />
            <Ellipse cx={98} cy={88} rx={22} ry={16} fill={TAN} />
            <Circle cx={82} cy={66} r={7} fill="#fff" />
            <Circle cx={114} cy={66} r={7} fill="#fff" />
            <Circle cx={84} cy={67} r={3.5} fill="#111" />
            <Circle cx={116} cy={67} r={3.5} fill="#111" />
            <Circle cx={85.5} cy={65.5} r={1.2} fill="#fff" />
            <Circle cx={117.5} cy={65.5} r={1.2} fill="#fff" />
            <Ellipse cx={98} cy={80} rx={7} ry={5} fill="#2a1a10" />
            <Path
              d="M86 90 Q98 100 110 90"
              stroke="#2a1a10"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
            />
            <Rect x={91} y={92} width={6} height={9} rx={1.5} fill="#fff" stroke="#c9c2b5" strokeWidth={0.8} />
            <Rect x={99} y={92} width={6} height={9} rx={1.5} fill="#fff" stroke="#c9c2b5" strokeWidth={0.8} />
            <Circle cx={72} cy={82} r={5} fill="#e8907a" opacity={0.6} />
            <Circle cx={124} cy={82} r={5} fill="#e8907a" opacity={0.6} />
            {/* кепка козырьком назад */}
            <Path d="M58 56 Q98 8 138 56 Z" fill={CAP} />
            <Path d="M60 50 Q98 34 136 50 L138 56 L58 56 Z" fill={CAP_DARK} />
            <Path d="M134 50 Q160 46 162 60 Q142 56 132 57 Z" fill={CAP} />
            <Circle cx={98} cy={32} r={4.5} fill="#ffd166" />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* нотки */}
      <Animated.View style={[styles.note, { left: size * 0.72, top: size * 0.2 }, note1]}>
        <Svg viewBox="0 0 24 24" width={size * 0.14} height={size * 0.14}>
          <Path d="M9 18 a3 3 0 1 0 0.01 0 M12 17 V4 l7 2 v3 l-7 -2" fill="#ff6b9a" stroke="#ff6b9a" strokeWidth={1.5} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.note, { left: size * 0.12, top: size * 0.3 }, note2]}>
        <Svg viewBox="0 0 24 24" width={size * 0.11} height={size * 0.11}>
          <Path d="M9 18 a3 3 0 1 0 0.01 0 M12 17 V4 l7 2 v3 l-7 -2" fill="#ffd166" stroke="#ffd166" strokeWidth={1.5} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Нотка всплывает над бобром и тает; offset сдвигает фазу, чтобы ноты шли вразнобой. */
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

const styles = StyleSheet.create({
  note: {
    position: "absolute",
  },
});
