import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

function subscribe(onChange: () => void): () => void {
  const subscription = AppState.addEventListener("change", onChange);
  return () => subscription.remove();
}

function getSnapshot(): boolean {
  return AppState.currentState === "active";
}

/**
 * true, пока приложение на экране. В фоне (экран заблокирован, другое приложение)
 * нужно останавливать всё, что тратит процессор и сеть ради невидимого интерфейса:
 * iOS завершает фоновые приложения с высокой нагрузкой примерно через минуту.
 */
export function useAppActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
