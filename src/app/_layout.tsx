import { Stack } from "expo-router";
import { Profiler, type ProfilerOnRenderCallback } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { FavoritesProvider } from "@/providers/favorites-provider";
import { PlayerProvider } from "@/providers/player-provider";
import { SettingsProvider } from "@/providers/settings-provider";

/** Проходы отрисовки дольше этого попадают в лог Metro рядом со строками [audio-timing]. */
const SLOW_RENDER_MS = 50;

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  if (actualDuration >= SLOW_RENDER_MS) {
    console.log(`[render-timing] ${id} ${phase}: ${Math.round(actualDuration)} ms`);
  }
};

export default function RootLayout() {
  const tree = (
    <GestureHandlerRootView style={styles.container}>
      <SettingsProvider>
        <PlayerProvider>
          <FavoritesProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
          </FavoritesProvider>
        </PlayerProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
  // Profiler работает только в dev-сборке; в production React его игнорирует.
  return __DEV__ ? (
    <Profiler id="app" onRender={onRender}>
      {tree}
    </Profiler>
  ) : (
    tree
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
