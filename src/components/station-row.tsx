import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Chip } from "@/components/chip";
import type { City, Station } from "@/data/stations";

type Props = {
  station: Station;
  isActive: boolean;
  onPress: (station: Station) => void;
  /** Показать город и страну под названием (для результатов поиска). */
  city?: City;
};

const MAX_TAGS = 4;
const MAX_LANGUAGES = 2;

function formatCodec(station: Station): string {
  return station.bitrate > 0
    ? `${station.codec} ${station.bitrate} kbps`
    : station.codec;
}

export function StationRow({ station, isActive, onPress, city }: Props) {
  const tags = station.tags.slice(0, MAX_TAGS);
  const languages = station.languages.slice(0, MAX_LANGUAGES);

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
          <Text style={[styles.name, isActive && styles.nameActive]}>
            {station.name}
          </Text>
          {isActive ? <Text style={styles.badge}>▶</Text> : null}
        </View>
        {city ? (
          <Text style={styles.place}>
            {city.name} · {city.country}
          </Text>
        ) : null}
        <View style={styles.chips}>
          {station.codec ? (
            <Chip
              label={formatCodec(station)}
              onPress={() =>
                router.push({
                  pathname: "/search",
                  params: { codec: station.codec.startsWith("AAC") ? "AAC" : "MP3" },
                })
              }
            />
          ) : null}
          {languages.map((lang) => (
            <Chip
              key={`lang-${lang}`}
              label={lang}
              onPress={() =>
                router.push({ pathname: "/search", params: { language: lang } })
              }
            />
          ))}
          {tags.map((tag) => (
            <Chip
              key={`tag-${tag}`}
              label={`#${tag}`}
              onPress={() =>
                router.push({ pathname: "/search", params: { tag } })
              }
            />
          ))}
        </View>
        <Text style={styles.url} numberOfLines={1}>
          {station.streamUrl}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
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
    gap: 4,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
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
