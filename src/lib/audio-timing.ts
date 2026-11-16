/**
 * Dev-замер синхронных вызовов плеера. Они выполняются в потоке JS, из которого рисуется
 * и перелёт глобуса: вызов на сотни миллисекунд виден как замершая анимация. Строки
 * `[audio-timing]` в логе Metro показывают, какой именно вызов тормозит.
 */
export function timed<T>(label: string, fn: () => T): T {
  if (!__DEV__) return fn();
  const startedAt = performance.now();
  try {
    return fn();
  } finally {
    console.log(`[audio-timing] ${label}: ${Math.round(performance.now() - startedAt)} ms`);
  }
}
