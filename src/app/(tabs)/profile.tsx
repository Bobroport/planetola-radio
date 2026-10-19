import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Beaver } from "@/components/beaver";
import { CITIES, GENERATED_AT } from "@/data/stations";
import { flagEmoji, formatDateTime } from "@/lib/format";
import { useFavorites } from "@/providers/favorites-provider";
import { useSettings, type StartPage } from "@/providers/settings-provider";

const START_OPTIONS: { value: StartPage; label: string; hint: string }[] = [
  { value: "cities", label: "Список городов", hint: "Как сейчас: выбираете город вручную" },
  { value: "city", label: "Конкретный город", hint: "Сразу открывать станции выбранного города" },
  { value: "playlist", label: "Плейлист", hint: "Сразу открывать избранные станции" },
];

function OptionRow({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={selected ? "#1d6fd8" : "#b0b0b4"}
      />
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        {hint ? <Text style={styles.optionHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const settings = useSettings();
  const { favorites, stationIds } = useFavorites();

  const greeting = settings.name.trim()
    ? `Привет, ${settings.name.trim()}!`
    : "Привет!";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Beaver size={96} dancing={false} />
        <View style={styles.heroText}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.stats}>
            В плейлисте {stationIds.length} станций, сохранено треков:{" "}
            {favorites.length}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Имя</Text>
      <TextInput
        value={settings.name}
        onChangeText={settings.setName}
        placeholder="Как вас зовут?"
        placeholderTextColor="#999"
        autoCapitalize="words"
        style={styles.input}
      />

      <Text style={styles.sectionTitle}>Стартовая страница</Text>
      <View style={styles.card}>
        {START_OPTIONS.map((option, index) => (
          <View key={option.value}>
            {index > 0 ? <View style={styles.separator} /> : null}
            <OptionRow
              label={option.label}
              hint={option.hint}
              selected={settings.startPage === option.value}
              onPress={() => settings.setStartPage(option.value)}
            />
          </View>
        ))}
      </View>

      {settings.startPage === "city" ? (
        <>
          <Text style={styles.sectionTitle}>Какой город открывать</Text>
          <View style={styles.card}>
            {CITIES.map((city, index) => (
              <View key={city.id}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <OptionRow
                  label={`${flagEmoji(city.countryCode)} ${city.name}`}
                  selected={settings.startCityId === city.id}
                  onPress={() => settings.setStartCityId(city.id)}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.footer}>
        База станций: Radio Browser, обновлена {formatDateTime(GENERATED_AT)}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f8",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
  },
  stats: {
    fontSize: 14,
    color: "#555",
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
    color: "#888",
    textTransform: "uppercase",
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    fontSize: 16,
    color: "#111",
  },
  card: {
    borderRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 16,
    color: "#111",
  },
  optionHint: {
    fontSize: 13,
    color: "#777",
  },
  pressed: {
    opacity: 0.7,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginLeft: 48,
  },
  footer: {
    marginTop: 16,
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});
