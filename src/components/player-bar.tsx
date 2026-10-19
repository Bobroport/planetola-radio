import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Beaver } from "@/components/beaver";
import { getCityOfStation } from "@/data/stations";
import { useFavorites } from "@/providers/favorites-provider";
import { usePlayer } from "@/providers/player-provider";

export function PlayerBar() {
  const insets = useSafeAreaInsets();
  const { player, current, nowPlaying, isPlaying, isBuffering, error, stop } =
    usePlayer();
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

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
        ) : null}
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
        disabled={!nowPlaying || !city}
        style={({ pressed }) => [
          styles.heart,
          (!nowPlaying || !city) && styles.heartDisabled,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={saved ? "Убрать из избранного" : "В избранное"}
        accessibilityState={{ selected: saved }}
      >
        <Text style={[styles.heartText, saved && styles.heartSaved]}>
          {saved ? "♥" : "♡"}
        </Text>
      </Pressable>
      <Pressable
        onPress={stop}
        style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Стоп"
      >
        <Text style={styles.stopText}>Стоп</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#1d1d1f",
  },
  beaver: {
    marginRight: 10,
    marginTop: -6,
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
  status: {
    color: "#b5b5b8",
    fontSize: 13,
  },
  statusError: {
    color: "#ff6b6b",
  },
  heart: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heartDisabled: {
    opacity: 0.3,
  },
  heartText: {
    color: "#fff",
    fontSize: 26,
  },
  heartSaved: {
    color: "#ff375f",
  },
  pressed: {
    opacity: 0.7,
  },
  stop: {
    marginLeft: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#ff3b30",
  },
  stopText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
