import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { PlayerBar } from "@/components/player-bar";
import { StationRow } from "@/components/station-row";
import { STATIONS, type Station } from "@/data/stations";

export default function Index() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [current, setCurrent] = useState<Station | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch((e: unknown) => {
      console.warn("setAudioModeAsync failed", e);
    });
  }, []);

  const handleSelect = useCallback(
    (station: Station) => {
      if (current?.id === station.id) {
        return;
      }
      setCurrent(station);
      player.replace(station.streamUrl);
      player.play();
    },
    [current, player],
  );

  const handleStop = useCallback(() => {
    player.pause();
    setCurrent(null);
  }, [player]);

  return (
    <View style={styles.container}>
      <FlatList
        data={STATIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StationRow
            station={item}
            isActive={current?.id === item.id}
            onPress={handleSelect}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
      />
      {current ? (
        <PlayerBar
          station={current}
          isBuffering={status.isBuffering || !status.isLoaded}
          error={status.error}
          onStop={handleStop}
        />
      ) : null}
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
