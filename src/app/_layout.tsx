import { Stack } from "expo-router";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { FavoritesProvider } from "@/providers/favorites-provider";
import { PlayerProvider } from "@/providers/player-provider";
import { SettingsProvider } from "@/providers/settings-provider";

export default function RootLayout() {
  return (
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
