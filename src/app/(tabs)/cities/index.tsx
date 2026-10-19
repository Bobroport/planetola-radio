import { router } from "expo-router";
import { useEffect } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";

import { CityRow } from "@/components/city-row";
import { CITY_SECTIONS, getCity, type City } from "@/data/stations";
import { usePlayer } from "@/providers/player-provider";
import { useSettings } from "@/providers/settings-provider";

/** Стартовую страницу открываем один раз за запуск приложения. */
let startPageApplied = false;

export default function CitiesScreen() {
  const { current } = usePlayer();
  const { ready, startPage, startCityId } = useSettings();

  useEffect(() => {
    if (!ready || startPageApplied) return;
    startPageApplied = true;
    if (startPage === "city" && startCityId && getCity(startCityId)) {
      router.push({ pathname: "/cities/[id]", params: { id: startCityId } });
    } else if (startPage === "playlist") {
      router.navigate("/favorites");
    }
  }, [ready, startPage, startCityId]);

  const openCity = (city: City) => {
    router.push({ pathname: "/cities/[id]", params: { id: city.id } });
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={CITY_SECTIONS}
        keyExtractor={(item) => item.id}
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
          <Text style={styles.sectionHeader}>{section.title}</Text>
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
