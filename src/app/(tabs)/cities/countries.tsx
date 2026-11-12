import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { COUNTRY_CATALOG } from "@/data/countries";
import { countryName } from "@/data/stations";
import { useI18n } from "@/i18n";
import { flagEmoji } from "@/lib/format";
import { usePlayer } from "@/providers/player-provider";

type CountryItem = { countryCode: string; count: number; name: string };

/** Страны с полными списками станций, по алфавиту текущего языка. */
export default function CountriesScreen() {
  const { language, t } = useI18n();
  const { current } = usePlayer();

  const countries: CountryItem[] = COUNTRY_CATALOG.map((c) => ({
    ...c,
    name: countryName(c.countryCode, language),
  })).sort((a, b) => a.name.localeCompare(b.name));

  const openCountry = (countryCode: string) => {
    router.push({ pathname: "/cities/country/[code]", params: { code: countryCode } });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={countries}
        keyExtractor={(item) => item.countryCode}
        renderItem={({ item }) => {
          const isPlayingHere = current?.countryCode === item.countryCode;
          return (
            <Pressable
              onPress={() => openCountry(item.countryCode)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.flag}>{flagEmoji(item.countryCode)}</Text>
              <View style={styles.text}>
                <View style={styles.titleLine}>
                  {isPlayingHere ? (
                    <Ionicons
                      name="volume-high"
                      size={16}
                      color="#1d6fd8"
                      style={styles.playingIcon}
                    />
                  ) : null}
                  <Text style={[styles.name, isPlayingHere && styles.nameActive]}>{item.name}</Text>
                </View>
                <Text style={styles.count}>{t("count.stations", { count: item.count })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#c4c4c6" />
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    paddingBottom: 8,
  },
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
  count: {
    fontSize: 14,
    color: "#555",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginLeft: 56,
  },
});
