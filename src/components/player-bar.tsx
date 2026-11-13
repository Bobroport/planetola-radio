import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";

import { Beaver } from "@/components/beaver";
import { getCityOfStation, type Station } from "@/data/stations";
import { useAppActive } from "@/hooks/use-app-active";
import { useI18n } from "@/i18n";
import { useFavorites } from "@/providers/favorites-provider";
import { SLEEP_TIMER_MINUTES, usePlayer } from "@/providers/player-provider";

/** Оставшееся время таймера сна в виде «мм:сс»; тикает раз в секунду, пока приложение на экране. */
function useCountdown(endsAt: number | null): string | null {
  const appActive = useAppActive();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null || !appActive) return;
    const tick = () => setNow(Date.now());
    // Первый тик сразу (после возврата из фона значение устарело), дальше раз в секунду.
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [endsAt, appActive]);

  if (endsAt === null) return null;
  const seconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Битрейт и кодек станции: «128 kbps · MP3». */
function technicalInfo(station: Station): string {
  const parts: string[] = [];
  if (station.bitrate > 0) parts.push(`${station.bitrate} kbps`);
  if (station.codec) parts.push(station.codec);
  return parts.join(" · ");
}

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
    sleepTimerEndsAt,
    setSleepTimer,
  } = usePlayer();
  const { isSaved, toggle } = useFavorites();
  const [expanded, setExpanded] = useState(false);
  const [pickingTimer, setPickingTimer] = useState(false);
  const countdown = useCountdown(sleepTimerEndsAt);

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
  const info = technicalInfo(current);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
    setPickingTimer(false);
  };

  const chooseTimer = (minutes: number | null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSleepTimer(minutes);
    setPickingTimer(false);
  };

  const controls = (
    <>
      {hasQueue ? (
        <Pressable
          onPress={previous}
          hitSlop={6}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("player.previous")}
        >
          <Ionicons name="play-skip-back" size={expanded ? 26 : 22} color="#fff" />
        </Pressable>
      ) : null}
      <Pressable
        onPress={paused ? resume : pause}
        hitSlop={6}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={paused ? t("player.play") : t("player.pause")}
      >
        <Ionicons name={paused ? "play" : "pause"} size={expanded ? 34 : 28} color="#fff" />
      </Pressable>
      {hasQueue ? (
        <Pressable
          onPress={next}
          hitSlop={6}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("player.next")}
        >
          <Ionicons name="play-skip-forward" size={expanded ? 26 : 22} color="#fff" />
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
          size={expanded ? 28 : 24}
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
    </>
  );

  if (!expanded) {
    return (
      <View style={styles.bar}>
        <Pressable
          onPress={toggleExpanded}
          style={styles.summary}
          accessibilityRole="button"
          accessibilityLabel={t("player.expand")}
        >
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
            <View style={styles.statusRow}>
              <Ionicons name="chevron-up" size={12} color="#8e8e93" />
              <Text
                style={[styles.status, error ? styles.statusError : null]}
                numberOfLines={1}
              >
                {statusText}
              </Text>
              {countdown ? (
                <>
                  <Ionicons name="moon" size={11} color="#b5b5b8" />
                  <Text style={styles.status}>{countdown}</Text>
                </>
              ) : null}
            </View>
          </View>
        </Pressable>
        {controls}
      </View>
    );
  }

  return (
    <View style={[styles.bar, styles.barExpanded]}>
      <Pressable
        onPress={toggleExpanded}
        style={styles.summary}
        accessibilityRole="button"
        accessibilityLabel={t("player.collapse")}
      >
        <View style={styles.beaver}>
          <Beaver size={96} player={player} dancing={isPlaying} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, styles.nameExpanded]} numberOfLines={2}>
            {current.name}
          </Text>
          {trackText ? (
            <Text style={[styles.track, styles.trackExpanded]} numberOfLines={4}>
              {trackText}
            </Text>
          ) : (
            <Text style={styles.trackHint} numberOfLines={2}>
              {nowPlayingChecked ? t("player.noTrackInfo") : t("player.findingTrack")}
            </Text>
          )}
          {info ? (
            <Text style={styles.technical} numberOfLines={1}>
              {info}
            </Text>
          ) : null}
          <View style={styles.statusRow}>
            <Ionicons name="chevron-down" size={12} color="#8e8e93" />
            <Text
              style={[styles.status, error ? styles.statusError : null]}
              numberOfLines={2}
            >
              {statusText}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.controls}>{controls}</View>
      {pickingTimer ? (
        <View style={styles.timerRow}>
          <Ionicons name="moon" size={18} color="#b5b5b8" />
          {SLEEP_TIMER_MINUTES.map((minutes) => (
            <Pressable
              key={minutes}
              onPress={() => chooseTimer(minutes)}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.chipLabel}>{t("player.minutes", { count: minutes })}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => chooseTimer(null)}
            style={({ pressed }) => [styles.chip, styles.chipOff, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.chipLabel}>{t("player.sleepTimerOff")}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.timerRow}>
          <Pressable
            onPress={() => setPickingTimer(true)}
            style={({ pressed }) => [styles.timerButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t("player.sleepTimer")}
          >
            <Ionicons name={countdown ? "moon" : "moon-outline"} size={18} color="#fff" />
            <Text style={styles.timerLabel} numberOfLines={1}>
              {countdown ? t("player.sleepIn", { time: countdown }) : t("player.sleepTimer")}
            </Text>
          </Pressable>
          {countdown ? (
            <Pressable
              onPress={() => chooseTimer(null)}
              hitSlop={6}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t("player.sleepTimerOff")}
            >
              <Ionicons name="close-circle" size={22} color="#b5b5b8" />
            </Pressable>
          ) : null}
        </View>
      )}
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
  barExpanded: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  summary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
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
  nameExpanded: {
    fontSize: 18,
  },
  track: {
    color: "#e6e6e8",
    fontSize: 14,
  },
  trackExpanded: {
    fontSize: 15,
    lineHeight: 20,
  },
  trackHint: {
    color: "#8e8e93",
    fontSize: 13,
    fontStyle: "italic",
  },
  technical: {
    color: "#b5b5b8",
    fontSize: 13,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  status: {
    color: "#b5b5b8",
    fontSize: 13,
    flexShrink: 1,
  },
  statusError: {
    color: "#ff6b6b",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 32,
  },
  timerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#2c2c2e",
  },
  timerLabel: {
    color: "#fff",
    fontSize: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#2c2c2e",
  },
  chipOff: {
    backgroundColor: "#3a3a3c",
  },
  chipLabel: {
    color: "#fff",
    fontSize: 14,
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
