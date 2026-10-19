import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";

import { Beaver } from "@/components/beaver";

const SHOW_MS = 2200;

/** Заставка с танцующим бобром при запуске приложения. */
export function LaunchOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), SHOW_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      exiting={FadeOut.duration(400)}
      style={styles.overlay}
      pointerEvents="none"
    >
      <Beaver size={220} dancing />
      <Text style={styles.title}>Радио</Text>
      <Text style={styles.subtitle}>Станции крупнейших городов мира</Text>
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6efe4",
    gap: 8,
  },
  title: {
    marginTop: 16,
    fontSize: 32,
    fontWeight: "700",
    color: "#3d2411",
  },
  subtitle: {
    fontSize: 15,
    color: "#7a6250",
  },
});
