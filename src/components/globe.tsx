import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { CITIES, type City } from "@/data/stations";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedText = Animated.createAnimatedComponent(SvgText);

type Props = {
  size: number;
  /** Оборотов в секунду. */
  speed?: number;
};

const TILT = 0.4;
const MERIDIAN_STEP = 30;
const PARALLELS = [-60, -30, 0, 30, 60];
const SAMPLES = 48;
const LABEL_DEPTH = 0.72;

type Point = { x: number; y: number; z: number };

/** Точка на сфере радиуса r с центром (cx, cy), повёрнутой на theta вокруг оси и наклонённой на TILT. */
function project(
  latDeg: number,
  lonDeg: number,
  theta: number,
  cx: number,
  cy: number,
  r: number,
): Point {
  "worklet";
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180 + theta;
  const x0 = Math.cos(lat) * Math.sin(lon);
  const y0 = Math.sin(lat);
  const z0 = Math.cos(lat) * Math.cos(lon);
  const y1 = y0 * Math.cos(TILT) - z0 * Math.sin(TILT);
  const z1 = y0 * Math.sin(TILT) + z0 * Math.cos(TILT);
  return { x: cx + r * x0, y: cy - r * y1, z: z1 };
}

/** Линия сетки: только видимая половина, с разрывами там, где уходит за горизонт. */
function graticulePath(
  theta: number,
  cx: number,
  cy: number,
  r: number,
): string {
  "worklet";
  let d = "";
  const addLine = (points: Point[]) => {
    let pen = false;
    for (const p of points) {
      if (p.z > 0) {
        d += `${pen ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
        pen = true;
      } else {
        pen = false;
      }
    }
  };
  for (let lon = 0; lon < 360; lon += MERIDIAN_STEP) {
    const pts: Point[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      pts.push(project(-90 + (180 * i) / SAMPLES, lon, theta, cx, cy, r));
    }
    addLine(pts);
  }
  for (const lat of PARALLELS) {
    const pts: Point[] = [];
    for (let i = 0; i <= SAMPLES * 2; i++) {
      pts.push(project(lat, (360 * i) / (SAMPLES * 2), theta, cx, cy, r));
    }
    addLine(pts);
  }
  return d;
}

function CityDot({
  city,
  theta,
  cx,
  cy,
  r,
  maxStations,
}: {
  city: City;
  theta: SharedValue<number>;
  cx: number;
  cy: number;
  r: number;
  maxStations: number;
}) {
  const baseRadius = 2.5 + 4 * Math.sqrt(city.stations.length / maxStations);
  const label = `${city.name} · ${city.stations.length}`;

  const dotProps = useAnimatedProps(() => {
    const p = project(city.lat, city.long, theta.value, cx, cy, r);
    const visible = p.z > 0;
    return {
      cx: p.x,
      cy: p.y,
      r: visible ? baseRadius * (0.6 + 0.4 * p.z) : 0,
      opacity: visible ? 0.4 + 0.6 * p.z : 0,
    };
  });

  const labelProps = useAnimatedProps(() => {
    const p = project(city.lat, city.long, theta.value, cx, cy, r);
    const t = (p.z - LABEL_DEPTH) / (1 - LABEL_DEPTH);
    return {
      x: p.x + baseRadius + 4,
      y: p.y + 4,
      opacity: t > 0 ? Math.min(1, t * 2) : 0,
    };
  });

  return (
    <>
      <AnimatedCircle animatedProps={dotProps} fill="#ffd166" />
      <AnimatedText
        animatedProps={labelProps}
        fill="#fff"
        fontSize={11}
        fontWeight="600"
      >
        {label}
      </AnimatedText>
    </>
  );
}

export function Globe({ size, speed = 0.06 }: Props) {
  const theta = useSharedValue(0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const maxStations = Math.max(...CITIES.map((c) => c.stations.length));

  useFrameCallback((frame) => {
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    theta.value = (theta.value + dt * speed * Math.PI * 2) % (Math.PI * 2);
  });

  const gridProps = useAnimatedProps(() => ({
    d: graticulePath(theta.value, cx, cy, r),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="ocean" cx="40%" cy="35%" r="70%">
            <Stop offset="0" stopColor="#2f6fd6" />
            <Stop offset="1" stopColor="#0d2a66" />
          </RadialGradient>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0.8" stopColor="#4f8cff" stopOpacity={0} />
            <Stop offset="1" stopColor="#4f8cff" stopOpacity={0.6} />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={r * 1.1} fill="url(#glow)" />
        <Circle cx={cx} cy={cy} r={r} fill="url(#ocean)" />
        <AnimatedPath
          animatedProps={gridProps}
          stroke="#9cc0ff"
          strokeWidth={0.8}
          strokeOpacity={0.45}
          fill="none"
        />
        {CITIES.map((city) => (
          <CityDot
            key={city.id}
            city={city}
            theta={theta}
            cx={cx}
            cy={cy}
            r={r}
            maxStations={maxStations}
          />
        ))}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#bcd4ff"
          strokeWidth={1}
          strokeOpacity={0.5}
        />
      </Svg>
    </View>
  );
}

