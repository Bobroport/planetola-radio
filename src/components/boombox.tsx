import { Circle, G, Line, Path, Rect } from "react-native-svg";

/**
 * Магнитофон в руках персонажа, в координатах общего viewBox 0 0 200 200.
 * Рисуется внутри `<Svg>` вызывающего компонента; `accent` — цвет корпуса.
 */
export function Boombox({ accent = "#5c5c60" }: { accent?: string }) {
  return (
    <G>
      <Path d="M70 118 Q98 100 126 118" stroke="#444" strokeWidth={4} fill="none" />
      <Line x1={126} y1={120} x2={146} y2={98} stroke="#777" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={146} cy={98} r={2} fill="#777" />
      <Rect x={52} y={118} width={92} height={46} rx={6} fill={accent} stroke="#2b2b2e" strokeWidth={2} />
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
    </G>
  );
}
