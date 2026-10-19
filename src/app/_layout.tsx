import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PlayerBar } from "@/components/player-bar";
import { PlayerProvider } from "@/providers/player-provider";

function SearchButton() {
  return (
    <Link href="/search" style={styles.headerLink}>
      <Text style={styles.headerLinkText}>Поиск</Text>
    </Link>
  );
}

export default function RootLayout() {
  return (
    <PlayerProvider>
      <View style={styles.container}>
        <Stack>
          <Stack.Screen
            name="index"
            options={{ title: "Города", headerRight: () => <SearchButton /> }}
          />
          <Stack.Screen name="city/[id]" options={{ title: "" }} />
          <Stack.Screen name="search" options={{ title: "Поиск" }} />
        </Stack>
        <PlayerBar />
      </View>
    </PlayerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerLink: {
    paddingHorizontal: 4,
  },
  headerLinkText: {
    fontSize: 17,
    color: "#1d6fd8",
  },
});
