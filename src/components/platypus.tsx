import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { Boombox } from "@/components/boombox";
import { DanceNotes, useDanceRig, type CharacterProps } from "@/components/dance-rig";

const VIEWBOX = "0 0 200 200";
const TEAL = "#2fa89b";
const TEAL_DARK = "#1f7f76";
const BELLY = "#9fe0d6";
const ORANGE = "#f0943a";
const ORANGE_DARK = "#c9711f";
const PHONES = "#3b3b40";
const PHONES_PAD = "#e63946";

/**
 * Весёлый утконос в наушниках с магнитофоном: бирюзовый мех, оранжевый клюв,
 * плоский хвост-лопата и перепончатые лапы. Собственный рисунок, тот же скелет, что у бобра.
 */
export function Platypus({ size, player = null, dancing }: CharacterProps) {
  const rig = useDanceRig(size, player, dancing);
  const box = { width: size, height: size };

  return (
    <View style={box}>
      <Animated.View style={[StyleSheet.absoluteFill, rig.bodyStyle]}>
        {/* хвост-лопата */}
        <Animated.View
          style={[StyleSheet.absoluteFill, rig.tailStyle, { transformOrigin: "59% 75%" }]}
        >
          <Svg viewBox={VIEWBOX} width={size} height={size}>
            <G rotation={-16} origin="118, 150">
              <Ellipse cx={142} cy={158} rx={36} ry={15} fill={ORANGE_DARK} />
              <Ellipse cx={144} cy={156} rx={30} ry={10} fill={ORANGE} />
            </G>
          </Svg>
        </Animated.View>

        {/* лапы, тело, руки */}
        <Svg viewBox={VIEWBOX} width={size} height={size} style={StyleSheet.absoluteFill}>
          {/* перепончатые лапы: три пальца веером */}
          <Path d="M62 180 L58 190 M78 178 L78 191 M94 180 L98 190" stroke={ORANGE_DARK} strokeWidth={5} strokeLinecap="round" />
          <Path d="M102 180 L98 190 M118 178 L118 191 M134 180 L138 190" stroke={ORANGE_DARK} strokeWidth={5} strokeLinecap="round" />
          <Ellipse cx={78} cy={184} rx={18} ry={8} fill={ORANGE} />
          <Ellipse cx={118} cy={184} rx={18} ry={8} fill={ORANGE} />
          <Ellipse cx={98} cy={138} rx={46} ry={48} fill={TEAL} />
          <Ellipse cx={98} cy={146} rx={30} ry={34} fill={BELLY} />
          <Path
            d="M60 118 Q44 134 58 150"
            stroke={TEAL}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M136 118 Q152 134 138 150"
            stroke={TEAL}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>

        {/* магнитофон */}
        <Animated.View style={[StyleSheet.absoluteFill, rig.boomboxStyle]}>
          <Svg viewBox={VIEWBOX} width={size} height={size}>
            <Boombox accent="#4d5b8a" />
          </Svg>
        </Animated.View>

        {/* голова */}
        <Animated.View
          style={[StyleSheet.absoluteFill, rig.headStyle, { transformOrigin: "49% 55%" }]}
        >
          <Svg viewBox={VIEWBOX} width={size} height={size}>
            {/* дужка наушников за головой */}
            <Path d="M60 64 Q98 14 136 64" stroke={PHONES} strokeWidth={6} fill="none" strokeLinecap="round" />
            <Circle cx={98} cy={70} r={40} fill={TEAL} />
            {/* хохолок */}
            <Path d="M90 32 Q96 18 104 30 Q106 20 112 32" stroke={TEAL_DARK} strokeWidth={4} fill="none" strokeLinecap="round" />
            {/* глаза: большие и весёлые */}
            <Circle cx={80} cy={64} r={9} fill="#fff" />
            <Circle cx={116} cy={64} r={9} fill="#fff" />
            <Circle cx={82} cy={65} r={4.5} fill="#111" />
            <Circle cx={118} cy={65} r={4.5} fill="#111" />
            <Circle cx={83.8} cy={63.2} r={1.5} fill="#fff" />
            <Circle cx={119.8} cy={63.2} r={1.5} fill="#fff" />
            {/* брови домиком — радость */}
            <Path d="M72 52 Q80 48 88 52" stroke={TEAL_DARK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <Path d="M108 52 Q116 48 124 52" stroke={TEAL_DARK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            {/* широкий плоский клюв */}
            <Ellipse cx={98} cy={92} rx={34} ry={14} fill={ORANGE_DARK} />
            <Ellipse cx={98} cy={89} rx={32} ry={11} fill={ORANGE} />
            {/* улыбка на клюве */}
            <Path d="M70 92 Q98 108 126 92" stroke={ORANGE_DARK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <Circle cx={88} cy={84} r={2} fill={ORANGE_DARK} />
            <Circle cx={108} cy={84} r={2} fill={ORANGE_DARK} />
            {/* румянец */}
            <Circle cx={68} cy={76} r={5} fill="#ff8f7a" opacity={0.55} />
            <Circle cx={128} cy={76} r={5} fill="#ff8f7a" opacity={0.55} />
            {/* чашки наушников */}
            <Rect x={50} y={56} width={16} height={24} rx={6} fill={PHONES} />
            <Rect x={134} y={56} width={16} height={24} rx={6} fill={PHONES} />
            <Rect x={54} y={60} width={8} height={16} rx={3} fill={PHONES_PAD} />
            <Rect x={138} y={60} width={8} height={16} rx={3} fill={PHONES_PAD} />
          </Svg>
        </Animated.View>
      </Animated.View>

      <DanceNotes size={size} rig={rig} />
    </View>
  );
}
