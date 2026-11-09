import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { LANGUAGES, type LanguageInfo } from "@/i18n";
import { useSettings } from "@/providers/settings-provider";

const ACCENT = "#34a853";

/** Выбор языка интерфейса: название на самом языке и по-английски, как в системных настройках. */
export default function LanguageScreen() {
  const { language, setLanguage } = useSettings();

  const choose = (item: LanguageInfo) => {
    setLanguage(item.code);
    router.back();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={LANGUAGES}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => {
          const selected = item.code === language;
          return (
            <Pressable
              onPress={() => choose(item)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${item.native}, ${item.english}`}
            >
              <View style={styles.text}>
                <Text style={[styles.native, selected && styles.selected]}>{item.native}</Text>
                {item.native !== item.english ? (
                  <Text style={styles.english}>{item.english}</Text>
                ) : null}
              </View>
              {selected ? <Ionicons name="checkmark" size={24} color={ACCENT} /> : null}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    paddingBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  native: {
    fontSize: 18,
    color: "#111",
  },
  selected: {
    color: ACCENT,
  },
  english: {
    fontSize: 13,
    color: "#8e8e93",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginLeft: 16,
  },
});
