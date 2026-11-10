import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { cityName, getCity, getStation } from "@/data/stations";
import { useI18n } from "@/i18n";
import { formatDateTime } from "@/lib/format";
import {
  useFavorites,
  type FavoriteTrack,
} from "@/providers/favorites-provider";
import { usePlayer } from "@/providers/player-provider";

const COPIED_HINT_MS = 1500;

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
  const { language, t } = useI18n();
  const canPlay = getStation(item.stationId) !== undefined;
  // Название города берём из данных на текущем языке; сохранённое — запасной вариант.
  const city = getCity(item.cityId);
  const place = city ? cityName(city, language) : item.cityName;

  // После копирования на полторы секунды показываем «Скопировано» вместо даты.
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_HINT_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyTitle = () => {
    const text = item.artist ? `${item.artist} — ${item.title}` : item.title;
    Clipboard.setStringAsync(text)
      .then(() => setCopied(true))
      .catch((e: unknown) => console.warn("Не удалось скопировать в буфер", e));
  };

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
          {item.stationName} · {place}
        </Text>
        {copied ? (
          <Text style={styles.copied}>{t("tracks.copied")}</Text>
        ) : (
          <Text style={styles.time}>{formatDateTime(item.savedAt, language)}</Text>
        )}
      </View>
      <Pressable
        onPress={copyTitle}
        hitSlop={10}
        style={({ pressed }) => [styles.action, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={t("tracks.copy")}
      >
        <Ionicons
          name={copied ? "checkmark" : "copy-outline"}
          size={22}
          color={copied ? "#34a853" : "#1d6fd8"}
        />
      </Pressable>
      <Pressable
        onPress={() => onRemove(item.id)}
        hitSlop={10}
        style={({ pressed }) => [styles.action, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={t("tracks.remove")}
      >
        <Ionicons name="close" size={22} color="#999" />
      </Pressable>
    </Pressable>
  );
}

/** Понравившиеся треки: то, что пользователь отметил сердцем в плеере. */
export default function LikedTracksScreen() {
  const { t } = useI18n();
  const { favorites, remove } = useFavorites();
  const { current, play } = usePlayer();

  const playTrackStation = (item: FavoriteTrack) => {
    const found = getStation(item.stationId);
    if (found) play(found.station);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
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
        ListEmptyComponent={<Text style={styles.empty}>{t("tracks.empty")}</Text>}
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
  copied: {
    fontSize: 12,
    color: "#34a853",
    fontWeight: "600",
  },
  action: {
    marginLeft: 4,
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
