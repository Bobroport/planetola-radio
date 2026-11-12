import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  onPress: () => void;
};

/** Строка-ссылка в начале списка: иконка, заголовок, подпись и шеврон. */
export function LinkRow({ icon, title, subtitle, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      <View style={styles.icon}>
        <Ionicons name={icon} size={22} color="#1d6fd8" />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#c4c4c6" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#f2f6fd",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  rowPressed: {
    opacity: 0.7,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dde9fb",
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1d6fd8",
  },
  subtitle: {
    fontSize: 13,
    color: "#555",
  },
});
