import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { getStation } from "@/data/stations";
import {
  useFavorites,
  type FavoriteTrack,
} from "@/providers/favorites-provider";
import { usePlayer } from "@/providers/player-provider";

function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FavoriteRow({
  item,
  isPlayingStation,
  onPlay,
  onRemove,
}: {
  item: FavoriteTrack;
  isPlayingStation: boolean;
  onPlay: (item: FavoriteTrack) => void;
  onRemove: (id: string) => void;
}) {
  const canPlay = getStation(item.stationId) !== undefined;

  return (
    <Pressable
      onPress={() => onPlay(item)}
      disabled={!canPlay}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      <View style={styles.text}>
        <Text style={styles.title}>{item.title}</Text>
        {item.artist ? <Text style={styles.artist}>{item.artist}</Text> : null}
        <Text
          style={[styles.station, isPlayingStation && styles.stationActive]}
          numberOfLines={1}
        >
          {item.stationName} · {item.cityName}
        </Text>
        <Text style={styles.time}>{formatSavedAt(item.savedAt)}</Text>
      </View>
      <Pressable
        onPress={() => onRemove(item.id)}
        hitSlop={8}
        style={({ pressed }) => [styles.remove, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel="Удалить из избранного"
      >
        <Text style={styles.removeText}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

export default function FavoritesScreen() {
  const { favorites, remove } = useFavorites();
  const { current, play } = usePlayer();

  const playStation = (item: FavoriteTrack) => {
    const found = getStation(item.stationId);
    if (found) play(found.station);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FavoriteRow
            item={item}
            isPlayingStation={current?.id === item.stationId}
            onPlay={playStation}
            onRemove={remove}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Пока пусто. Нажмите ♡ в плеере, когда играет понравившийся трек.
          </Text>
        }
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  rowPressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  artist: {
    fontSize: 15,
    color: "#333",
  },
  station: {
    fontSize: 13,
    color: "#555",
  },
  stationActive: {
    color: "#1d6fd8",
  },
  time: {
    fontSize: 12,
    color: "#999",
  },
  remove: {
    marginLeft: 12,
    padding: 8,
  },
  removeText: {
    fontSize: 18,
    color: "#999",
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
