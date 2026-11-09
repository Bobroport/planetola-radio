import { FlatList, StyleSheet, Text, View } from "react-native";

import { StationRow } from "@/components/station-row";
import { getStation } from "@/data/stations";
import { useI18n } from "@/i18n";
import { useFavorites } from "@/providers/favorites-provider";
import { usePlayer } from "@/providers/player-provider";

/** Избранные станции: то, что пользователь отметил звёздочкой. */
export default function FavoriteStationsScreen() {
  const { t } = useI18n();
  const { stationIds } = useFavorites();
  const { current, play } = usePlayer();

  const stations = stationIds
    .map((id) => getStation(id))
    .filter((found) => found !== undefined);

  return (
    <View style={styles.container}>
      <FlatList
        data={stations}
        keyExtractor={({ station }) => station.id}
        renderItem={({ item }) => (
          <StationRow
            station={item.station}
            city={item.city}
            isActive={current?.id === item.station.id}
            onPress={play}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t("stations.empty")}</Text>}
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
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginLeft: 16,
  },
  empty: {
    padding: 24,
    textAlign: "center",
    color: "#555",
    lineHeight: 22,
  },
});
