import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Station } from "@/data/stations";

type Props = {
  station: Station;
  isActive: boolean;
  onPress: (station: Station) => void;
};

export function StationRow({ station, isActive, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(station)}
      style={({ pressed }) => [
        styles.row,
        isActive && styles.rowActive,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.text}>
        <Text style={[styles.name, isActive && styles.nameActive]}>
          {station.name}
        </Text>
        <Text style={styles.city}>{station.city}</Text>
        <Text style={styles.url} numberOfLines={1}>
          {station.streamUrl}
        </Text>
      </View>
      {isActive ? <Text style={styles.badge}>▶</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  rowActive: {
    backgroundColor: "#e8f1fd",
  },
  rowPressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  nameActive: {
    color: "#1d6fd8",
  },
  city: {
    fontSize: 14,
    color: "#555",
  },
  url: {
    fontSize: 12,
    color: "#999",
  },
  badge: {
    fontSize: 18,
    color: "#1d6fd8",
    marginLeft: 12,
  },
});
