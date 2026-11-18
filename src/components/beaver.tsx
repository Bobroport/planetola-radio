import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { Boombox } from "@/components/boombox";
import { DanceNotes, useDanceRig, type CharacterProps } from "@/components/dance-rig";

const VIEWBOX = "0 0 200 200";
const BROWN = "#8b5a2b";
const DARK = "#3d2411";
const TAN = "#d8b48a";
const CAP = "#2d7dd2";
const CAP_DARK = "#2466b3";

/** Бобёр в кепке с магнитофоном: персонаж по умолчанию. */
export function Beaver({ size, player = null, dancing }: CharacterProps) {
  const rig = useDanceRig(size, player, dancing);
  const box = { width: size, height: size };

  return (
    <View style={box}>
      <Animated.View style={[StyleSheet.absoluteFill, rig.bodyStyle]}>
        {/* хвост */}
        <Animated.View
          style={[StyleSheet.absoluteFill, rig.tailStyle, { transformOrigin: "59% 75%" }]}
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
        <Svg viewBox={VIEWBOX} width={size} height={size} style={StyleSheet.absoluteFill}>
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
        <Animated.View style={[StyleSheet.absoluteFill, rig.boomboxStyle]}>
          <Svg viewBox={VIEWBOX} width={size} height={size}>
            <Boombox />
          </Svg>
        </Animated.View>

        {/* голова */}
        <Animated.View
          style={[StyleSheet.absoluteFill, rig.headStyle, { transformOrigin: "49% 55%" }]}
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

      <DanceNotes size={size} rig={rig} />
    </View>
  );
}
