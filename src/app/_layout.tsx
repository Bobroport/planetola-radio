import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { LaunchOverlay } from "@/components/launch-overlay";
import { PlayerBar } from "@/components/player-bar";
import { FavoritesProvider } from "@/providers/favorites-provider";
import { PlayerProvider } from "@/providers/player-provider";

function HeaderLinks() {
  return (
    <View style={styles.headerLinks}>
      <Link href="/favorites" style={styles.headerLink}>
        <Text style={styles.headerLinkText}>♥</Text>
      </Link>
      <Link href="/search" style={styles.headerLink}>
        <Text style={styles.headerLinkText}>Поиск</Text>
      </Link>
    </View>
  );
}

export default function RootLayout() {
  return (
    <PlayerProvider>
      <FavoritesProvider>
        <View style={styles.container}>
          <Stack>
            <Stack.Screen
              name="index"
              options={{ title: "Города", headerRight: () => <HeaderLinks /> }}
            />
            <Stack.Screen name="city/[id]" options={{ title: "" }} />
            <Stack.Screen name="search" options={{ title: "Поиск" }} />
            <Stack.Screen name="favorites" options={{ title: "Избранное" }} />
          </Stack>
          <PlayerBar />
          <LaunchOverlay />
        </View>
      </FavoritesProvider>
    </PlayerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerLink: {
    paddingHorizontal: 4,
  },
  headerLinkText: {
    fontSize: 17,
    color: "#1d6fd8",
  },
});
