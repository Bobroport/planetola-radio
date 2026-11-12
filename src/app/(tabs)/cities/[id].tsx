import { router, Stack, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { LinkRow } from "@/components/link-row";
import { StationRow } from "@/components/station-row";
import { countryCatalogCount, hasCountryCatalog } from "@/data/countries";
import { cityName, countryName, getCity } from "@/data/stations";
import { useI18n } from "@/i18n";
import { flagEmoji } from "@/lib/format";
import { usePlayer } from "@/providers/player-provider";

export default function CityScreen() {
  const { language, t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const city = getCity(id);
  const { current, play } = usePlayer();

  if (!city) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: "" }} />
        <Text style={styles.emptyText}>{t("city.notFound")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: `${flagEmoji(city.countryCode)} ${cityName(city, language)}` }}
      />
      <FlatList
        data={city.stations}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          hasCountryCatalog(city.countryCode) ? (
            <LinkRow
              icon="flag-outline"
              title={t("country.allStations", {
                country: countryName(city.countryCode, language),
              })}
              subtitle={t("count.stations", { count: countryCatalogCount(city.countryCode) })}
              onPress={() =>
                router.push({
                  pathname: "/cities/country/[code]",
                  params: { code: city.countryCode },
                })
              }
            />
          ) : null
        }
        renderItem={({ item }) => (
          <StationRow
            station={item}
            isActive={current?.id === item.id}
            onPress={(station) => play(station, city.stations)}
          />
        )}
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
    paddingVertical: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginLeft: 16,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
  },
});
