import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Chip } from "@/components/chip";
import { cityName, countryName, type City, type Station } from "@/data/stations";
import { useI18n } from "@/i18n";
import { stationMeta, streamHost } from "@/lib/format";
import { useFavorites } from "@/providers/favorites-provider";

type Props = {
  station: Station;
  isActive: boolean;
  onPress: (station: Station) => void;
  /** Показать город и страну под названием (для поиска и избранных станций). */
  city?: City;
  /** Без города показать хотя бы страну (станции из полных страновых списков). */
  showCountry?: boolean;
};

const MAX_TAGS = 4;

export function StationRow({ station, isActive, onPress, city, showCountry }: Props) {
  const { language, t } = useI18n();
  const { isStationSaved, toggleStation } = useFavorites();
  const saved = isStationSaved(station.id);
  const meta = stationMeta(station);
  const tags = station.tags.slice(0, MAX_TAGS);
  const place = city
    ? `${cityName(city, language)} · ${countryName(city.countryCode, language)}`
    : showCountry
      ? countryName(station.countryCode, language)
      : null;

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
        <View style={styles.titleLine}>
          {isActive ? (
            <Ionicons name="volume-high" size={16} color="#1d6fd8" style={styles.playingIcon} />
          ) : null}
          <Text style={[styles.name, isActive && styles.nameActive]} numberOfLines={2}>
            {station.name}
          </Text>
        </View>
        {place ? <Text style={styles.place}>{place}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {tags.length > 0 ? (
          <View style={styles.chips}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                onPress={() =>
                  router.push({ pathname: "/search", params: { tag } })
                }
              />
            ))}
          </View>
        ) : null}
        <Text style={styles.host} numberOfLines={1}>
          {streamHost(station.streamUrl)}
        </Text>
      </View>
      <Pressable
        onPress={() => toggleStation(station)}
        hitSlop={10}
        style={({ pressed }) => [styles.star, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={saved ? t("station.remove") : t("station.add")}
        accessibilityState={{ selected: saved }}
      >
        <Ionicons
          name={saved ? "star" : "star-outline"}
          size={24}
          color={saved ? "#f5a524" : "#b0b0b4"}
        />
      </Pressable>
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
    gap: 4,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  playingIcon: {
    marginRight: 6,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  nameActive: {
    color: "#1d6fd8",
  },
  place: {
    fontSize: 13,
    color: "#555",
  },
  meta: {
    fontSize: 14,
    color: "#333",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  host: {
    fontSize: 11,
    color: "#aaa",
  },
  star: {
    marginLeft: 12,
    padding: 6,
  },
});
