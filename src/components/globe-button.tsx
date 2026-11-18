import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";

import { useI18n } from "@/i18n";
import { getStationPoint, openGlobe } from "@/lib/globe-navigation";
import { usePlayer } from "@/providers/player-provider";

/**
 * Кнопка в правом углу заголовка: открывает глобус и подлетает к городу играющей станции,
 * а если у станции нет города — к столице её страны.
 */
export function GlobeButton({ color = "#1d6fd8" }: { color?: string }) {
  const { t } = useI18n();
  const { current } = usePlayer();

  const open = () => openGlobe(current ? getStationPoint(current) : undefined);

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
