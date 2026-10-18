import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Station } from "@/data/stations";

type Props = {
  station: Station;
  isActive: boolean;
  onPress: (station: Station) => void;
};

function describe(station: Station): string {
  const parts: string[] = [];
  if (station.codec) {
    parts.push(
      station.bitrate > 0
        ? `${station.codec} ${station.bitrate} kbps`
        : station.codec,
    );
  }
  if (station.tags.length > 0) {
    parts.push(station.tags.slice(0, 3).join(", "));
  }
  return parts.join(" · ");
}

export function StationRow({ station, isActive, onPress }: Props) {
  const details = describe(station);

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
        {details ? (
          <Text style={styles.details} numberOfLines={1}>
            {details}
          </Text>
        ) : null}
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
  details: {
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
