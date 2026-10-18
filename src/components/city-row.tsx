import { Pressable, StyleSheet, Text, View } from "react-native";

import type { City } from "@/data/stations";

type Props = {
  city: City;
  isPlayingHere: boolean;
  onPress: (city: City) => void;
};

export function CityRow({ city, isPlayingHere, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(city)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      <View style={styles.text}>
        <Text style={[styles.name, isPlayingHere && styles.nameActive]}>
          {city.name}
        </Text>
        <Text style={styles.country}>{city.country}</Text>
      </View>
      <Text style={styles.count}>{city.stations.length}</Text>
      <Text style={styles.chevron}>›</Text>
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
  country: {
    fontSize: 14,
    color: "#555",
  },
  count: {
    fontSize: 14,
    color: "#999",
    marginRight: 8,
  },
  chevron: {
    fontSize: 22,
    color: "#c4c4c6",
  },
});
