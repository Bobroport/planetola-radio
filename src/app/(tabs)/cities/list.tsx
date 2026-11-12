import { router } from "expo-router";
import { SectionList, StyleSheet, Text, View } from "react-native";

import { CityRow } from "@/components/city-row";
import { LinkRow } from "@/components/link-row";
import { CITY_SECTIONS, type City } from "@/data/stations";
import { regionKey, useI18n } from "@/i18n";
import { usePlayer } from "@/providers/player-provider";

export default function CityListScreen() {
  const { t } = useI18n();
  const { current } = usePlayer();

  const openCity = (city: City) => {
    router.push({ pathname: "/cities/[id]", params: { id: city.id } });
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={CITY_SECTIONS}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <LinkRow
            icon="earth-outline"
            title={t("cities.countries")}
            subtitle={t("cities.countriesHint")}
            onPress={() => router.push("/cities/countries")}
          />
        }
        renderItem={({ item }) => (
          <CityRow
            city={item}
            isPlayingHere={
              current !== null && item.stations.some((s) => s.id === current.id)
            }
            onPress={openCity}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{t(regionKey(section.region))}</Text>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        stickySectionHeadersEnabled
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
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    backgroundColor: "#f2f2f4",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginLeft: 56,
  },
});
