import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { LaunchOverlay } from "@/components/launch-overlay";
import { FavoritesProvider } from "@/providers/favorites-provider";
import { PlayerProvider } from "@/providers/player-provider";
import { SettingsProvider } from "@/providers/settings-provider";

export default function RootLayout() {
  return (
    <SettingsProvider>
      <PlayerProvider>
        <FavoritesProvider>
          <View style={styles.container}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
            <LaunchOverlay />
          </View>
        </FavoritesProvider>
      </PlayerProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
