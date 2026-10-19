import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";

import { Beaver } from "@/components/beaver";
import { Globe } from "@/components/globe";
import { CITIES } from "@/data/stations";

const SHOW_MS = 4500;

const TOTAL_STATIONS = CITIES.reduce((n, c) => n + c.stations.length, 0);

/** Заставка при запуске: вращающийся глобус с городами и бобёр. Нажатие пропускает. */
export function LaunchOverlay() {
  const [visible, setVisible] = useState(true);
  const { width } = useWindowDimensions();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), SHOW_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  const globeSize = Math.min(width - 32, 360);

  return (
    <Animated.View exiting={FadeOut.duration(500)} style={styles.overlay}>
      <Pressable style={styles.fill} onPress={() => setVisible(false)}>
        <Text style={styles.title}>Радио</Text>
        <Text style={styles.subtitle}>
          {CITIES.length} городов · {TOTAL_STATIONS} станций
        </Text>
        <Globe size={globeSize} />
        <View style={styles.footer}>
          <Beaver size={88} dancing />
          <Text style={styles.hint}>Нажмите, чтобы пропустить</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#0b1020",
  },
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
  },
  subtitle: {
    fontSize: 15,
    color: "#9cc0ff",
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  hint: {
    fontSize: 13,
    color: "#6f7fa6",
  },
});
