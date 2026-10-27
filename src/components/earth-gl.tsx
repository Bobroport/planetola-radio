import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer, TextureLoader } from "expo-three";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import * as THREE from "three";

import { CITIES, type City } from "@/data/stations";
import { useGlobeGestures, type GlobeView } from "@/hooks/use-globe-gestures";

type Props = {
  width: number;
  height: number;
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
  dirty: boolean;
  frame: number | null;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3.5;
/** В радианах: ближе этого к центру город считается «в фокусе». */
const FOCUS_RADIUS = 0.14;
const INITIAL_VIEW: GlobeView = { rotation: { lambda: -30, phi: -40 }, zoom: 1 };
const RAD = Math.PI / 180;
/** Радиус шара в условных единицах сцены; радиус изображения в пикселях вычисляется от него. */
const EARTH_RADIUS = 1;
const MARKER_ALTITUDE = 1.004;

const EARTH_TEXTURE = require("../../assets/textures/earth-blue-marble-2048.jpg");

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

function markerScale(city: City): number {
  return 0.008 + 0.016 * Math.sqrt(city.stations.length / MAX_STATIONS);
}

/** Расстояние камеры от центра шара для данного масштаба. */
function cameraDistance(zoom: number): number {
  return 1.25 + 2.1 / zoom;
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

export function EarthGL({ width, height, onFocusChange, onSelectCity }: Props) {
  const sceneRef = useRef<Scene | null>(null);
  const viewRef = useRef<GlobeView>(INITIAL_VIEW);
  const focusedIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  const applyView = useCallback((scene: Scene, view: GlobeView) => {
    // Rx(lat) · Ry(-lon): сначала поворот вокруг Y выводит нужную долготу вперёд, потом наклон по широте.
    scene.globe.rotation.set(-view.rotation.phi * RAD, view.rotation.lambda * RAD, 0, "XYZ");
    scene.camera.position.set(0, 0, cameraDistance(view.zoom));
    scene.camera.lookAt(0, 0, 0);
    scene.dirty = true;
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
          const s = markerScale(city) * 1.8;
          scene.focusMarker.scale.setScalar(s);
        }
        scene.dirty = true;
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

  const gesture = useGlobeGestures({
    initial: INITIAL_VIEW,
    baseRadius: Math.min(width, height) * 0.46,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    onChange,
    onTap,
  });

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      const renderer = new Renderer({
        gl,
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight,
        clearColor: 0x0b1020,
        antialias: true,
      });
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
      const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 96, 64), material);
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
        new THREE.MeshBasicMaterial({ color: 0xffd166 }),
        CITIES.length,
      );
      const matrix = new THREE.Matrix4();
      CITIES.forEach((city, i) => {
        const s = markerScale(city);
        matrix.compose(
          latLongToVector3(city.lat, city.long, MARKER_ALTITUDE),
          new THREE.Quaternion(),
          new THREE.Vector3(s, s, s),
        );
        markers.setMatrixAt(i, matrix);
      });
      markers.instanceMatrix.needsUpdate = true;
      globe.add(markers);

      const focusMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      focusMarker.visible = false;
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
        dirty: true,
        frame: null,
      };
      sceneRef.current = state;
      applyView(state, viewRef.current);
      updateFocus(viewRef.current);

      new TextureLoader().load(EARTH_TEXTURE, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
        state.dirty = true;
        setReady(true);
      });

      const loop = () => {
        state.frame = requestAnimationFrame(loop);
        if (!state.dirty) return;
        state.dirty = false;
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      loop();
    },
    [applyView, updateFocus],
  );

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

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height }} collapsable={false}>
        <GLView
          key={`${width}x${height}`}
          style={{ width, height }}
          onContextCreate={onContextCreate}
        />
        {!ready ? (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color="#9cc0ff" />
            <Text style={styles.loadingText}>Загружаем Землю…</Text>
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
});
