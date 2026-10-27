import {
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
  type GeoProjection,
} from "d3-geo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { CITIES, type City } from "@/data/stations";
import { LAND } from "@/data/world";
import {
  useGlobeGestures,
  type GlobeView,
  type Rotation,
} from "@/hooks/use-globe-gestures";

type Props = {
  width: number;
  height: number;
  /** Город, оказавшийся ближе всех к центру шара (null, если далеко). */
  onFocusChange: (city: City | null) => void;
  /** Нажатие на точку города. */
  onSelectCity: (city: City) => void;
};

type Dot = { city: City; x: number; y: number; r: number; dist: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 3.5;
/** В радианах: ближе этого к центру город считается «в фокусе». */
const FOCUS_RADIUS = 0.14;
const TAP_RADIUS_PX = 22;
const INITIAL_VIEW: GlobeView = { rotation: { lambda: -30, phi: -40 }, zoom: 1 };

const GRATICULE = geoGraticule10();
const MAX_STATIONS = Math.max(...CITIES.map((c) => c.stations.length));

function dotRadius(city: City, zoom: number): number {
  return (2.2 + 3.5 * Math.sqrt(city.stations.length / MAX_STATIONS)) * Math.sqrt(zoom);
}

function makeProjection(
  rotation: Rotation,
  zoom: number,
  baseRadius: number,
  cx: number,
  cy: number,
): GeoProjection {
  return geoOrthographic()
    .rotate([rotation.lambda, rotation.phi])
    .scale(baseRadius * zoom)
    .translate([cx, cy])
    .clipAngle(90);
}

/** Города на видимой половине шара с экранными координатами. */
function visibleDots(projection: GeoProjection, rotation: Rotation, zoom: number): Dot[] {
  const center: [number, number] = [-rotation.lambda, -rotation.phi];
  const dots: Dot[] = [];
  for (const city of CITIES) {
    const lonLat: [number, number] = [city.long, city.lat];
    const dist = geoDistance(lonLat, center);
    if (dist >= Math.PI / 2) continue;
    const p = projection(lonLat);
    if (!p) continue;
    dots.push({ city, x: p[0], y: p[1], r: dotRadius(city, zoom), dist });
  }
  return dots;
}

export function WorldGlobe({ width, height, onFocusChange, onSelectCity }: Props) {
  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = Math.min(width, height) * 0.46;

  const [view, setView] = useState<GlobeView>(INITIAL_VIEW);

  const onTap = useCallback(
    (x: number, y: number, at: GlobeView) => {
      const proj = makeProjection(at.rotation, at.zoom, baseRadius, cx, cy);
      let best: { city: City; d2: number } | null = null;
      for (const d of visibleDots(proj, at.rotation, at.zoom)) {
        const dx = d.x - x;
        const dy = d.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= TAP_RADIUS_PX * TAP_RADIUS_PX && (!best || d2 < best.d2)) {
          best = { city: d.city, d2 };
        }
      }
      if (best) onSelectCity(best.city);
    },
    [baseRadius, cx, cy, onSelectCity],
  );

  const gesture = useGlobeGestures({
    initial: INITIAL_VIEW,
    baseRadius,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    onChange: setView,
    onTap,
  });

  const { rotation, zoom } = view;

  const { landPath, graticulePath, dots, focused } = useMemo(() => {
    const projection = makeProjection(rotation, zoom, baseRadius, cx, cy);
    const path = geoPath(projection);
    const visible = visibleDots(projection, rotation, zoom);
    let nearest: Dot | null = null;
    for (const d of visible) {
      if (d.dist < FOCUS_RADIUS && (!nearest || d.dist < nearest.dist)) nearest = d;
    }
    return {
      landPath: path(LAND) ?? "",
      graticulePath: path(GRATICULE) ?? "",
      dots: visible,
      focused: nearest,
    };
  }, [rotation, zoom, baseRadius, cx, cy]);

  const focusedId = focused?.city.id ?? null;
  const lastReportedFocus = useRef<string | null>(null);
  useEffect(() => {
    if (lastReportedFocus.current === focusedId) return;
    lastReportedFocus.current = focusedId;
    onFocusChange(focused?.city ?? null);
  }, [focusedId, focused, onFocusChange]);

  const sphereRadius = baseRadius * zoom;

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height }} collapsable={false}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <RadialGradient id="ocean" cx="38%" cy="32%" r="75%">
              <Stop offset="0" stopColor="#3b82d6" />
              <Stop offset="1" stopColor="#0a2250" />
            </RadialGradient>
            <RadialGradient id="shade" cx="38%" cy="32%" r="72%">
              <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000" stopOpacity={0.55} />
            </RadialGradient>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0.82" stopColor="#5b9cff" stopOpacity={0} />
              <Stop offset="1" stopColor="#5b9cff" stopOpacity={0.5} />
            </RadialGradient>
          </Defs>
          <Circle cx={cx} cy={cy} r={sphereRadius * 1.08} fill="url(#halo)" />
          <Circle cx={cx} cy={cy} r={sphereRadius} fill="url(#ocean)" />
          <Path d={graticulePath} stroke="#9cc0ff" strokeWidth={0.5} strokeOpacity={0.35} fill="none" />
          <Path d={landPath} fill="#6fae5c" stroke="#3f7a35" strokeWidth={0.6} />
          <Circle cx={cx} cy={cy} r={sphereRadius} fill="url(#shade)" />
          {dots.map((d) => {
            const isFocused = d.city.id === focusedId;
            return (
              <Circle
                key={d.city.id}
                cx={d.x}
                cy={d.y}
                r={isFocused ? d.r * 1.6 : d.r}
                fill={isFocused ? "#ffffff" : "#ffd166"}
                stroke={isFocused ? "#ff8c42" : "#5a3d00"}
                strokeWidth={isFocused ? 2 : 0.6}
                opacity={0.55 + 0.45 * (1 - d.dist / (Math.PI / 2))}
              />
            );
          })}
          {focused ? (
            <SvgText
              x={focused.x}
              y={focused.y - focused.r * 1.6 - 8}
              fill="#fff"
              fontSize={13}
              fontWeight="700"
              textAnchor="middle"
            >
              {focused.city.name}
            </SvgText>
          ) : null}
          {/* прицел в центре */}
          <Circle
            cx={cx}
            cy={cy}
            r={FOCUS_RADIUS * sphereRadius}
            fill="none"
            stroke="#fff"
            strokeOpacity={0.25}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </Svg>
      </View>
    </GestureDetector>
  );
}
