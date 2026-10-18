import { router } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";

import { CityRow } from "@/components/city-row";
import { CITIES, type City } from "@/data/stations";
import { usePlayer } from "@/providers/player-provider";

export default function Index() {
  const { current } = usePlayer();

  const openCity = (city: City) => {
    router.push({ pathname: "/city/[id]", params: { id: city.id } });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={CITIES}
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
});
