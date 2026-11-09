import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { cityName, countryName, type City } from "@/data/stations";
import { useI18n } from "@/i18n";
import { flagEmoji } from "@/lib/format";

type Props = {
  city: City;
  isPlayingHere: boolean;
  onPress: (city: City) => void;
};

export function CityRow({ city, isPlayingHere, onPress }: Props) {
  const { language, t } = useI18n();

  return (
    <Pressable
      onPress={() => onPress(city)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      <Text style={styles.flag}>{flagEmoji(city.countryCode)}</Text>
      <View style={styles.text}>
        <View style={styles.titleLine}>
          {isPlayingHere ? (
            <Ionicons name="volume-high" size={16} color="#1d6fd8" style={styles.playingIcon} />
          ) : null}
          <Text style={[styles.name, isPlayingHere && styles.nameActive]}>
            {cityName(city, language)}
          </Text>
        </View>
        <Text style={styles.country}>
          {countryName(city.countryCode, language)} ·{" "}
          {t("count.stations", { count: city.stations.length })}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#c4c4c6" />
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
    gap: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
  flag: {
    fontSize: 28,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  playingIcon: {
    marginRight: 6,
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
});
