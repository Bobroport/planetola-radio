import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, type ColorValue } from "react-native";

import { getCityOfStation } from "@/data/stations";
import { useI18n } from "@/i18n";
import { openGlobe } from "@/lib/globe-navigation";
import { usePlayer } from "@/providers/player-provider";

/** Кнопка в правом углу заголовка: открывает глобус и подлетает к городу играющей станции. */
export function GlobeButton({ color = "#1d6fd8" }: { color?: ColorValue }) {
  const { t } = useI18n();
  const { current } = usePlayer();

  const open = () => openGlobe(current ? getCityOfStation(current.id) : undefined);

  return (
    <Pressable
      onPress={open}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t("globe.title")}
    >
      <Ionicons name="earth" size={24} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.6,
  },
});
