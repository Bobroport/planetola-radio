/* eslint-disable react-hooks/refs -- обработчики жестов читают и пишут ref только в момент события, не при рендере; правило React Compiler этого не различает */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";

export type Rotation = { lambda: number; phi: number };

export type GlobeView = { rotation: Rotation; zoom: number };

type Options = {
  initial: GlobeView;
  baseRadius: number;
  minZoom: number;
  maxZoom: number;
  /** Вызывается не чаще кадра с актуальным положением шара. */
  onChange: (view: GlobeView) => void;
  /** Короткое нажатие: экранные координаты и положение шара в этот момент. */
  onTap: (x: number, y: number, view: GlobeView) => void;
  /** Пользователь начал вращать или масштабировать шар. */
  onInteract?: () => void;
};

const DEG = 180 / Math.PI;

function clampPhi(phi: number): number {
  return Math.max(-85, Math.min(85, phi));
}

/**
 * Вращение пальцем, масштаб щипком и нажатие по шару.
 * Положение хранится в ref и отдаётся наружу через requestAnimationFrame,
 * чтобы React не перерисовывал глобус на каждое событие жеста.
 */
export function useGlobeGestures({
  initial,
  baseRadius,
  minZoom,
  maxZoom,
  onChange,
  onTap,
  onInteract,
}: Options) {
  const view = useRef<GlobeView>(initial);
  const gestureStart = useRef<GlobeView>(initial);
  const frame = useRef<number | null>(null);

  const scheduleChange = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      onChange(view.current);
    });
  }, [onChange]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  /** Ставит шар в заданное положение программно (анимация перелёта). */
  const setView = useCallback(
    (next: GlobeView) => {
      view.current = next;
      onChange(next);
    },
    [onChange],
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(2)
      .onBegin(() => {
        gestureStart.current = view.current;
        onInteract?.();
      })
      .onUpdate((e) => {
        // Пиксели в градусы: чем крупнее масштаб, тем медленнее вращение.
        const degPerPx = (DEG / (baseRadius * view.current.zoom)) * 0.9;
        const start = gestureStart.current.rotation;
        view.current = {
          ...view.current,
          rotation: {
            lambda: start.lambda + e.translationX * degPerPx,
            phi: clampPhi(start.phi - e.translationY * degPerPx),
          },
        };
        scheduleChange();
      });

    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => {
        gestureStart.current = view.current;
        onInteract?.();
      })
      .onUpdate((e) => {
        view.current = {
          ...view.current,
          zoom: Math.max(minZoom, Math.min(maxZoom, gestureStart.current.zoom * e.scale)),
        };
        scheduleChange();
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(300)
      .onEnd((e) => {
        onTap(e.x, e.y, view.current);
      });

    return Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));
  }, [baseRadius, maxZoom, minZoom, onInteract, onTap, scheduleChange]);

  return { gesture, setView };
}
