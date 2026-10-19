import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Beaver } from "@/components/beaver";
import { getCityOfStation } from "@/data/stations";
import { useFavorites } from "@/providers/favorites-provider";
import { usePlayer } from "@/providers/player-provider";

export function PlayerBar() {
  const {
    player,
    current,
    nowPlaying,
    nowPlayingChecked,
    isPlaying,
    isBuffering,
    error,
    stop,
  } = usePlayer();
  const { isSaved, toggle } = useFavorites();

  if (!current) {
    return null;
  }

  let statusText = "В эфире";
  if (error) {
    statusText = `Ошибка: ${error}`;
  } else if (isBuffering) {
    statusText = "Загрузка…";
  }

  const trackText = nowPlaying
    ? nowPlaying.artist
      ? `${nowPlaying.artist} — ${nowPlaying.title}`
      : nowPlaying.title
    : null;
  const saved = nowPlaying ? isSaved(nowPlaying, current) : false;
  const city = getCityOfStation(current.id);
  const canSave = nowPlaying !== null && city !== undefined;

  return (
    <View style={styles.bar}>
      <View style={styles.beaver}>
        <Beaver size={64} player={player} dancing={isPlaying} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {current.name}
        </Text>
        {trackText ? (
          <Text style={styles.track} numberOfLines={1}>
            {trackText}
          </Text>
        ) : (
          <Text style={styles.trackHint} numberOfLines={1}>
            {nowPlayingChecked
              ? "Станция не передаёт название трека"
              : "Узнаём, что играет…"}
          </Text>
        )}
        <Text
          style={[styles.status, error ? styles.statusError : null]}
          numberOfLines={1}
        >
          {statusText}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          if (nowPlaying && city) toggle(nowPlaying, current, city);
        }}
        disabled={!canSave}
        hitSlop={8}
        style={({ pressed }) => [
          styles.iconButton,
          !canSave && styles.disabled,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={saved ? "Убрать трек из избранного" : "Трек в избранное"}
        accessibilityState={{ selected: saved }}
      >
        <Ionicons
          name={saved ? "heart" : "heart-outline"}
          size={26}
          color={saved ? "#ff375f" : "#fff"}
        />
      </Pressable>
      <Pressable
        onPress={stop}
        hitSlop={8}
        style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Стоп"
      >
        <Ionicons name="stop" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1d1d1f",
  },
  beaver: {
    marginRight: 8,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  track: {
    color: "#e6e6e8",
    fontSize: 14,
  },
  trackHint: {
    color: "#8e8e93",
    fontSize: 13,
    fontStyle: "italic",
  },
  status: {
    color: "#b5b5b8",
    fontSize: 13,
  },
  statusError: {
    color: "#ff6b6b",
  },
  iconButton: {
    marginLeft: 8,
    padding: 6,
  },
  disabled: {
    opacity: 0.3,
  },
  pressed: {
    opacity: 0.7,
  },
  stop: {
    marginLeft: 4,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff3b30",
  },
});
