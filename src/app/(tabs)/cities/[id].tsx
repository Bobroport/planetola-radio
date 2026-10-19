import { Stack, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { StationRow } from "@/components/station-row";
import { getCity } from "@/data/stations";
import { flagEmoji } from "@/lib/format";
import { usePlayer } from "@/providers/player-provider";

export default function CityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const city = getCity(id);
  const { current, play } = usePlayer();

  if (!city) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: "Город" }} />
        <Text style={styles.emptyText}>Город не найден</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: `${flagEmoji(city.countryCode)} ${city.name}` }}
      />
      <FlatList
        data={city.stations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StationRow
            station={item}
            isActive={current?.id === item.id}
            onPress={play}
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
