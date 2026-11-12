import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Beaver } from "@/components/beaver";
import { getCityOfStation } from "@/data/stations";
import { useI18n } from "@/i18n";
import { useFavorites } from "@/providers/favorites-provider";
import { usePlayer } from "@/providers/player-provider";

export function PlayerBar() {
  const { t } = useI18n();
  const {
    player,
    current,
    nowPlaying,
    nowPlayingChecked,
    isPlaying,
    isBuffering,
    error,
    pause,
    resume,
    next,
    previous,
    hasQueue,
    stop,
  } = usePlayer();
  const { isSaved, toggle } = useFavorites();

  if (!current) {
    return null;
  }

  const paused = !isPlaying && !isBuffering;
  let statusText = t("player.onAir");
  if (error) {
    statusText = t("player.error", { message: error });
  } else if (isBuffering) {
    statusText = t("player.loading");
  } else if (paused) {
    statusText = t("player.paused");
  }

  const trackText = nowPlaying
    ? nowPlaying.artist
      ? `${nowPlaying.artist} — ${nowPlaying.title}`
      : nowPlaying.title
    : null;
  const saved = nowPlaying ? isSaved(nowPlaying, current) : false;
  // У станций из полных страновых списков города нет: трек сохраняется со страной.
  const city = getCityOfStation(current.id);
  const canSave = nowPlaying !== null;

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
            {nowPlayingChecked ? t("player.noTrackInfo") : t("player.findingTrack")}
          </Text>
        )}
        <Text
          style={[styles.status, error ? styles.statusError : null]}
          numberOfLines={1}
        >
          {statusText}
        </Text>
      </View>
      {hasQueue ? (
        <Pressable
          onPress={previous}
          hitSlop={6}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("player.previous")}
        >
          <Ionicons name="play-skip-back" size={22} color="#fff" />
        </Pressable>
      ) : null}
      <Pressable
        onPress={paused ? resume : pause}
        hitSlop={6}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={paused ? t("player.play") : t("player.pause")}
      >
        <Ionicons name={paused ? "play" : "pause"} size={28} color="#fff" />
      </Pressable>
      {hasQueue ? (
        <Pressable
          onPress={next}
          hitSlop={6}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("player.next")}
        >
          <Ionicons name="play-skip-forward" size={22} color="#fff" />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => {
          if (nowPlaying) toggle(nowPlaying, current, city);
        }}
        disabled={!canSave}
        hitSlop={6}
        style={({ pressed }) => [
          styles.iconButton,
          !canSave && styles.disabled,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={saved ? t("player.unsaveTrack") : t("player.saveTrack")}
        accessibilityState={{ selected: saved }}
      >
        <Ionicons
          name={saved ? "heart" : "heart-outline"}
          size={24}
          color={saved ? "#ff375f" : "#fff"}
        />
      </Pressable>
      <Pressable
        onPress={stop}
        hitSlop={6}
        style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t("player.stop")}
      >
        <Ionicons name="stop" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#1d1d1f",
  },
  beaver: {
    marginRight: 6,
  },
  info: {
    flex: 1,
    gap: 2,
    marginRight: 4,
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
    padding: 5,
  },
  disabled: {
    opacity: 0.3,
  },
  pressed: {
    opacity: 0.7,
  },
  stop: {
    marginLeft: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff3b30",
  },
});
