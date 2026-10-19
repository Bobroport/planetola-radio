import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Chip } from "@/components/chip";
import { StationRow } from "@/components/station-row";
import { getStation } from "@/data/stations";
import { formatDateTime } from "@/lib/format";
import {
  useFavorites,
  type FavoriteTrack,
} from "@/providers/favorites-provider";
import { usePlayer } from "@/providers/player-provider";

type Section = "stations" | "tracks";

function TrackRow({
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
        <Text style={styles.time}>{formatDateTime(item.savedAt)}</Text>
      </View>
      <Pressable
        onPress={() => onRemove(item.id)}
        hitSlop={10}
        style={({ pressed }) => [styles.remove, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel="Удалить из избранного"
      >
        <Ionicons name="close" size={22} color="#999" />
      </Pressable>
    </Pressable>
  );
}

export default function FavoritesScreen() {
  const [section, setSection] = useState<Section>("stations");
  const { favorites, remove, stationIds } = useFavorites();
  const { current, play } = usePlayer();

  const playlist = stationIds
    .map((id) => getStation(id))
    .filter((found) => found !== undefined);

  const playTrackStation = (item: FavoriteTrack) => {
    const found = getStation(item.stationId);
    if (found) play(found.station);
  };

  const header = (
    <View style={styles.segments}>
      <Chip
        label={`Плейлист · ${playlist.length}`}
        selected={section === "stations"}
        onPress={() => setSection("stations")}
      />
      <Chip
        label={`Треки · ${favorites.length}`}
        selected={section === "tracks"}
        onPress={() => setSection("tracks")}
      />
    </View>
  );

  if (section === "stations") {
    return (
      <View style={styles.container}>
        <FlatList
          data={playlist}
          keyExtractor={({ station }) => station.id}
          ListHeaderComponent={header}
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
          ListEmptyComponent={
            <Text style={styles.empty}>
              Плейлист пуст. Нажмите ☆ рядом со станцией, чтобы добавить её сюда.
            </Text>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <TrackRow
            item={item}
            isPlayingStation={current?.id === item.stationId}
            onPlay={playTrackStation}
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
    paddingBottom: 8,
    flexGrow: 1,
  },
  segments: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
