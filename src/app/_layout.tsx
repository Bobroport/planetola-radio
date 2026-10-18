import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { PlayerBar } from "@/components/player-bar";
import { PlayerProvider } from "@/providers/player-provider";

export default function RootLayout() {
  return (
    <PlayerProvider>
      <View style={styles.container}>
        <Stack>
          <Stack.Screen name="index" options={{ title: "Города" }} />
          <Stack.Screen name="city/[id]" options={{ title: "" }} />
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
});
