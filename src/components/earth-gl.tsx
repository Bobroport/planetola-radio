import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import * as THREE from "three";

import { CITIES, type City } from "@/data/stations";
import { useAppActive } from "@/hooks/use-app-active";
import { useI18n, type TranslateParams, type TranslationKey } from "@/i18n";
import { useGlobeGestures, type GlobeView } from "@/hooks/use-globe-gestures";
import {
  createRenderer,
  loadTextureFromAsset,
  supportsWebGL2,
} from "@/lib/three-renderer";

/** Перелёт камеры: из текущего положения в `to` за `durationMs`. */
export type Flight = {
  to: GlobeView;
  durationMs: number;
  /** Отличает повторный запрос того же перелёта: новый объект с новым ключом летит заново. */
  key?: string;
};

type Props = {
  width: number;
  height: number;
  /** Положение шара при появлении на экране; по умолчанию Европа и Ближний Восток. */
  initialView?: GlobeView;
  /** Перелёт начинается, как только текстура загружена. Объект должен быть стабильным. */
  flight?: Flight | null;
  /** Перелёт закончился: `completed` false, если его прервал жест или уход приложения в фон. */
  onFlightDone?: (completed: boolean) => void;
  /** Город, оказавшийся ближе всех к центру шара (null, если далеко). */
  onFocusChange: (city: City | null) => void;
  /** Нажатие на точку города. */
  onSelectCity: (city: City) => void;
};

type Scene = {
  gl: ExpoWebGLRenderingContext;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  globe: THREE.Group;
  earth: THREE.Mesh;
  markers: THREE.InstancedMesh;
  focusMarker: THREE.Mesh;
  raycaster: THREE.Raycaster;
  /** Пикселей буфера на одну точку layout (плотность экрана). */
  pixelScale: number;
  /** Масштаб, под который сейчас рассчитаны размеры маркеров. */
  markersZoom: number;
  dirty: boolean;
  /** До этого момента (Date.now()) рисуем каждый кадр: буфер мог быть пересоздан нативно. */
  renderUntil: number;
  /** Идентификатор запрошенного кадра или null, если кадр не запрошен. */
  frame: number | null;
  /** Приложение на экране. В фоне кадры не запрашиваем вообще. */
  active: boolean;
};

/** Сколько рисовать непрерывно после события, которое могло пересоздать буфер кадра. */
const SETTLE_MS = 700;

/**
 * Запрашивает один кадр, если он ещё не запрошен.
 *
 * Постоянного цикла requestAnimationFrame здесь быть не должно: в React Native это таймер
 * на 1 мс, и в фоне (экран заблокирован, играет музыка) он срабатывает без привязки к кадрам
 * дисплея, до тысячи раз в секунду. iOS завершает такое приложение примерно через минуту.
 */
function requestFrame(scene: Scene): void {
  if (scene.frame !== null || !scene.active) return;
  scene.frame = requestAnimationFrame(() => {
    scene.frame = null;
    if (!scene.active) return;
    const settling = Date.now() < scene.renderUntil;
    if (scene.dirty || settling) {
      scene.dirty = false;
      scene.renderer.render(scene.scene, scene.camera);
      scene.gl.endFrameEXP();
    }
    if (settling) requestFrame(scene);
  });
}

/** Сцена изменилась: нужен новый кадр. */
function markDirty(scene: Scene): void {
  scene.dirty = true;
  requestFrame(scene);
}

function keepRendering(scene: Scene, ms: number = SETTLE_MS): void {
  scene.renderUntil = Math.max(scene.renderUntil, Date.now() + ms);
  markDirty(scene);
}

const MIN_ZOOM = 1;
/** 10,5× — втрое больше прежнего максимума 3,5×. */
const MAX_ZOOM = 10.5;
/** Расстояние от камеры до поверхности шара при масштабе 1 (радиус шара = 1). */
const SURFACE_DISTANCE_AT_ZOOM_1 = 2.35;
/** В радианах: ближе этого к центру город считается «в фокусе». */
const FOCUS_RADIUS = 0.14;
const INITIAL_VIEW: GlobeView = { rotation: { lambda: -30, phi: -40 }, zoom: 1 };

/** Положение шара, при котором город стоит в центре экрана. */
export function cityView(city: City, zoom: number): GlobeView {
  return { rotation: { lambda: -city.long, phi: -city.lat }, zoom };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Доля отрезка [start, end] прогресса t, с плавным разгоном и торможением. */
function phase(t: number, start: number, end: number): number {
  return easeInOut(Math.max(0, Math.min(1, (t - start) / (end - start))));
}

/** Дальше этого угла между началом и концом перелёта шар сначала отдаляется до минимума. */
const ZOOM_OUT_ANGLE = (25 * Math.PI) / 180;

function logLerp(a: number, b: number, t: number): number {
  return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
}

/**
 * Промежуточное положение перелёта: сначала шар в основном вращается, потом приближается.
 * Долгота идёт по короткой дуге, масштаб меняется в логарифме, чтобы приближение было равномерным.
 * Если лететь далеко из приближенного вида, шар по пути отдаляется, иначе поверхность мелькает.
 */
function interpolateView(from: GlobeView, to: GlobeView, t: number): GlobeView {
  const r = phase(t, 0, 0.7);
  const angle = viewCenterDirection(from).angleTo(viewCenterDirection(to));
  const midZoom = angle > ZOOM_OUT_ANGLE ? MIN_ZOOM : Math.min(from.zoom, to.zoom);
  const zoomOut = logLerp(from.zoom, midZoom, phase(t, 0, 0.4));
  const zoom = logLerp(zoomOut, to.zoom, phase(t, 0.35, 1));
  let dLambda = (to.rotation.lambda - from.rotation.lambda) % 360;
  if (dLambda > 180) dLambda -= 360;
  if (dLambda < -180) dLambda += 360;
  return {
    rotation: {
      lambda: from.rotation.lambda + dLambda * r,
      phi: from.rotation.phi + (to.rotation.phi - from.rotation.phi) * r,
    },
    zoom,
  };
}
const RAD = Math.PI / 180;
/** Радиус шара в условных единицах сцены; радиус изображения в пикселях вычисляется от него. */
const EARTH_RADIUS = 1;
const MARKER_ALTITUDE = 1.004;

const EARTH_TEXTURE = require("../../assets/textures/earth-blue-marble-5400.jpg");

const MAX_STATIONS = Math.max(...CITIES.map((c) => c.stations.length));

/** Точка на сфере: долгота 0 смотрит на камеру (+Z), север — вверх (+Y). */
function latLongToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const latR = lat * RAD;
  const lonR = lon * RAD;
  return new THREE.Vector3(
    radius * Math.cos(latR) * Math.sin(lonR),
    radius * Math.sin(latR),
    radius * Math.cos(latR) * Math.cos(lonR),
  );
}

const CITY_DIRECTIONS = CITIES.map((c) => latLongToVector3(c.lat, c.long, 1));
const CITY_POSITIONS = CITIES.map((c) => latLongToVector3(c.lat, c.long, MARKER_ALTITUDE));
const MARKER_COLOR = 0xff8c42;

/** Базовый радиус маркера при масштабе 1; при приближении делится на zoom, чтобы на экране не расти. */
function markerScale(city: City, zoom: number): number {
  return (0.004 + 0.008 * Math.sqrt(city.stations.length / MAX_STATIONS)) / zoom;
}

const scratchMatrix = new THREE.Matrix4();
const scratchQuaternion = new THREE.Quaternion();
const scratchScale = new THREE.Vector3();

function updateMarkerScales(markers: THREE.InstancedMesh, zoom: number): void {
  for (let i = 0; i < CITIES.length; i++) {
    const s = markerScale(CITIES[i], zoom);
    scratchScale.set(s, s, s);
    scratchMatrix.compose(CITY_POSITIONS[i], scratchQuaternion, scratchScale);
    markers.setMatrixAt(i, scratchMatrix);
  }
  markers.instanceMatrix.needsUpdate = true;
}

/** Расстояние камеры от центра шара для данного масштаба. */
function cameraDistance(zoom: number): number {
  // Расстояние до поверхности обратно пропорционально зуму, поэтому видимое увеличение
  // растёт линейно: зум 10,5 показывает ровно втрое крупнее, чем 3,5.
  return EARTH_RADIUS + SURFACE_DISTANCE_AT_ZOOM_1 / zoom;
}

/** Направление «в зрителя» в локальных координатах шара для текущего поворота. */
function viewCenterDirection(view: GlobeView): THREE.Vector3 {
  return latLongToVector3(-view.rotation.phi, -view.rotation.lambda, 1);
}

function nearestCity(direction: THREE.Vector3, maxAngle: number): City | null {
  let best: City | null = null;
  let bestAngle = maxAngle;
  for (let i = 0; i < CITIES.length; i++) {
    const angle = direction.angleTo(CITY_DIRECTIONS[i]);
    if (angle < bestAngle) {
      bestAngle = angle;
      best = CITIES[i];
    }
  }
  return best;
}

const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    gl_FragColor = vec4(0.35, 0.6, 1.0, 1.0) * intensity;
  }
`;

export function EarthGL({
  width,
  height,
  initialView = INITIAL_VIEW,
  flight = null,
  onFlightDone,
  onFocusChange,
  onSelectCity,
}: Props) {
  const sceneRef = useRef<Scene | null>(null);
  const viewRef = useRef<GlobeView>(initialView);
  /** Идущий перелёт; жест пользователя его прерывает. */
  const flightRef = useRef<{ cancel: () => void } | null>(null);
  const onFlightDoneRef = useRef(onFlightDone);
  const focusedIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  // Ошибку храним ключом перевода, а не готовой строкой: язык можно сменить на лету.
  const [error, setError] = useState<{ key: TranslationKey; params?: TranslateParams } | null>(
    null,
  );
  const { t } = useI18n();

  const applyView = useCallback((scene: Scene, view: GlobeView) => {
    // Rx(lat) · Ry(-lon): сначала поворот вокруг Y выводит нужную долготу вперёд, потом наклон по широте.
    scene.globe.rotation.set(-view.rotation.phi * RAD, view.rotation.lambda * RAD, 0, "XYZ");
    scene.camera.position.set(0, 0, cameraDistance(view.zoom));
    scene.camera.lookAt(0, 0, 0);
    if (scene.markersZoom !== view.zoom) {
      scene.markersZoom = view.zoom;
      updateMarkerScales(scene.markers, view.zoom);
      scene.focusMarker.scale.setScalar(scene.focusMarker.userData.baseScale / view.zoom);
    }
    markDirty(scene);
  }, []);

  const updateFocus = useCallback(
    (view: GlobeView) => {
      const city = nearestCity(viewCenterDirection(view), FOCUS_RADIUS / Math.sqrt(view.zoom));
      const id = city?.id ?? null;
      if (id === focusedIdRef.current) return;
      focusedIdRef.current = id;
      const scene = sceneRef.current;
      if (scene) {
        scene.focusMarker.visible = city !== null;
        if (city) {
          scene.focusMarker.position.copy(
            latLongToVector3(city.lat, city.long, MARKER_ALTITUDE),
          );
          // Базовый размер при масштабе 1 запоминаем, чтобы applyView делил его на текущий zoom.
          scene.focusMarker.userData.baseScale = markerScale(city, 1) * 1.8;
          scene.focusMarker.scale.setScalar(scene.focusMarker.userData.baseScale / view.zoom);
        }
        markDirty(scene);
      }
      onFocusChange(city);
    },
    [onFocusChange],
  );

  const onChange = useCallback(
    (view: GlobeView) => {
      viewRef.current = view;
      const scene = sceneRef.current;
      if (scene) applyView(scene, view);
      updateFocus(view);
    },
    [applyView, updateFocus],
  );

  const onTap = useCallback(
    (x: number, y: number, view: GlobeView) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const ndc = new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1);
      scene.raycaster.setFromCamera(ndc, scene.camera);
      const hit = scene.raycaster.intersectObject(scene.earth, false)[0];
      if (!hit) return;
      // Точка на поверхности в локальных координатах шара → ближайший город.
      const local = scene.globe.worldToLocal(hit.point.clone()).normalize();
      const city = nearestCity(local, 0.03 + 0.11 / view.zoom);
      if (city) onSelectCity(city);
    },
    [width, height, onSelectCity],
  );

  const onInteract = useCallback(() => {
    flightRef.current?.cancel();
  }, []);

  const { gesture, setView } = useGlobeGestures({
    initial: initialView,
    baseRadius: Math.min(width, height) * 0.46,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    onChange,
    onTap,
    onInteract,
  });

  useEffect(() => {
    onFlightDoneRef.current = onFlightDone;
  }, [onFlightDone]);

  // Перелёт камеры: цикл requestAnimationFrame ограничен длительностью перелёта
  // и обрывается, как только приложение уходит в фон (см. requestFrame).
  useEffect(() => {
    if (!ready || !flight) return;
    const from = viewRef.current;
    const startedAt = Date.now();
    let frame: number | null = null;
    let finished = false;
    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      flightRef.current = null;
    };
    const finish = (completed: boolean) => {
      if (finished) return;
      finished = true;
      stop();
      onFlightDoneRef.current?.(completed);
    };
    const step = () => {
      frame = null;
      const scene = sceneRef.current;
      if (finished) return;
      if (!scene || !scene.active) {
        setView(flight.to);
        finish(false);
        return;
      }
      const t = Math.min(1, (Date.now() - startedAt) / flight.durationMs);
      setView(interpolateView(from, flight.to, t));
      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        finish(true);
      }
    };
    flightRef.current = { cancel: () => finish(false) };
    frame = requestAnimationFrame(step);
    return () => {
      finished = true;
      stop();
    };
  }, [ready, flight, setView]);

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      if (__DEV__) {
        console.log(
          `EarthGL: GL-контекст создан, буфер ${gl.drawingBufferWidth}×${gl.drawingBufferHeight}`,
        );
      }
      if (!supportsWebGL2(gl)) {
        setError({ key: "globe.noWebGL" });
        return;
      }
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = createRenderer({
          gl,
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
          clearColor: 0x0b1020,
          antialias: true,
        });
      } catch (e) {
        setError({
          key: "globe.rendererError",
          params: { message: e instanceof Error ? e.message : String(e) },
        });
        return;
      }
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        40,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        100,
      );

      scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6);
      sun.position.set(-4, 3, 6);
      scene.add(sun);

      const globe = new THREE.Group();
      scene.add(globe);

      const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        specular: 0x1a2a44,
        shininess: 14,
      });
      // 160×112 сегментов: при зуме 10× граней сферы не видно.
      const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 160, 112), material);
      // У SphereGeometry нулевой меридиан текстуры лежит на +X, а latLongToVector3 кладёт его на +Z.
      // Поворот сферы на -90° вокруг Y совмещает карту с маркерами городов.
      earth.rotation.y = -Math.PI / 2;
      globe.add(earth);

      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_RADIUS * 1.035, 64, 48),
        new THREE.ShaderMaterial({
          vertexShader: ATMOSPHERE_VERTEX,
          fragmentShader: ATMOSPHERE_FRAGMENT,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
        }),
      );
      scene.add(atmosphere);

      const markers = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 10, 8),
        new THREE.MeshBasicMaterial({ color: MARKER_COLOR }),
        CITIES.length,
      );
      updateMarkerScales(markers, viewRef.current.zoom);
      globe.add(markers);

      const focusMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      focusMarker.visible = false;
      focusMarker.userData.baseScale = markerScale(CITIES[0], 1) * 1.8;
      globe.add(focusMarker);

      const state: Scene = {
        gl,
        renderer,
        scene,
        camera,
        globe,
        earth,
        markers,
        focusMarker,
        raycaster: new THREE.Raycaster(),
        // width здесь — размер layout на момент создания контекста (замыкание useCallback).
        pixelScale: gl.drawingBufferWidth / Math.max(1, width),
        markersZoom: viewRef.current.zoom,
        dirty: true,
        renderUntil: 0,
        frame: null,
        active: AppState.currentState === "active",
      };
      sceneRef.current = state;
      applyView(state, viewRef.current);
      updateFocus(viewRef.current);
      // Экран ещё укладывается, буфер кадра может смениться — рисуем первые секунды без пропусков.
      keepRendering(state, 2000);

      loadTextureFromAsset(gl, renderer, EARTH_TEXTURE)
        .then((texture) => {
          // Контекст мог быть пересоздан, пока текстура качалась.
          if (sceneRef.current !== state) return;
          material.map = texture;
          material.needsUpdate = true;
          keepRendering(state);
          setReady(true);
        })
        .catch((e: unknown) => {
          if (sceneRef.current !== state) return;
          const message = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
          console.warn(`Не удалось загрузить текстуру Земли: ${message}`);
          // Шар остаётся однотонным, но приложение работает.
          setReady(true);
        });
    },
    [applyView, updateFocus, width],
  );

  // В фоне шар не рисуем и кадры не запрашиваем; при возврате перерисовываем,
  // потому что система могла выбросить содержимое буфера.
  const appActive = useAppActive();
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.active = appActive;
    if (appActive) {
      keepRendering(scene);
    } else if (scene.frame !== null) {
      cancelAnimationFrame(scene.frame);
      scene.frame = null;
    }
  }, [appActive]);

  useEffect(
    () => () => {
      const scene = sceneRef.current;
      if (!scene) return;
      if (scene.frame !== null) cancelAnimationFrame(scene.frame);
      scene.renderer.dispose();
      sceneRef.current = null;
    },
    [],
  );

  // Экран меняет размер несколько раз при старте (шапка и панель вкладок укладываются).
  // Контекст не пересоздаём, а подгоняем размер кадра и пропорции камеры.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const scale = scene.pixelScale;
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    scene.renderer.setSize(w, h, false);
    scene.camera.aspect = w / h;
    scene.camera.updateProjectionMatrix();
    keepRendering(scene);
  }, [width, height]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height }} collapsable={false}>
        <GLView style={{ width, height }} onContextCreate={onContextCreate} />
        {error ? (
          <View style={styles.loading} pointerEvents="none">
            <Text style={styles.errorText}>{t(error.key, error.params)}</Text>
          </View>
        ) : !ready ? (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color="#9cc0ff" />
            <Text style={styles.loadingText}>{t("globe.loading")}</Text>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  loading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: "#9cc0ff",
    fontSize: 13,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
