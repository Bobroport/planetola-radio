import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePlayer } from "@/providers/player-provider";

export function PlayerBar() {
  const insets = useSafeAreaInsets();
  const { current, isBuffering, error, stop } = usePlayer();

  if (!current) {
    return null;
  }

  let statusText = "В эфире";
  if (error) {
    statusText = `Ошибка: ${error}`;
  } else if (isBuffering) {
    statusText = "Загрузка…";
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {current.name}
        </Text>
        <Text
          style={[styles.status, error ? styles.statusError : null]}
          numberOfLines={1}
        >
          {statusText}
        </Text>
      </View>
      <Pressable
        onPress={stop}
        style={({ pressed }) => [styles.stop, pressed && styles.stopPressed]}
        accessibilityRole="button"
        accessibilityLabel="Стоп"
      >
        <Text style={styles.stopText}>Стоп</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#1d1d1f",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  status: {
    color: "#b5b5b8",
    fontSize: 13,
  },
  statusError: {
    color: "#ff6b6b",
  },
  stop: {
    marginLeft: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#ff3b30",
  },
  stopPressed: {
    opacity: 0.7,
  },
  stopText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
