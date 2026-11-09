import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Beaver } from "@/components/beaver";
import { CITIES, cityName, countryName, GENERATED_AT } from "@/data/stations";
import { getLanguage, useI18n, type TranslationKey } from "@/i18n";
import { flagEmoji, formatDateTime } from "@/lib/format";
import { useFavorites } from "@/providers/favorites-provider";
import { useSettings, type StartPage } from "@/providers/settings-provider";

const MAX_CITY_OPTIONS = 8;

const START_OPTIONS: { value: StartPage; label: TranslationKey; hint: TranslationKey }[] = [
  { value: "cities", label: "profile.start.globe", hint: "profile.start.globeHint" },
  { value: "list", label: "profile.start.list", hint: "profile.start.listHint" },
  { value: "city", label: "profile.start.city", hint: "profile.start.cityHint" },
  { value: "playlist", label: "profile.start.stations", hint: "profile.start.stationsHint" },
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
  const { language, t } = useI18n();
  const settings = useSettings();
  const { favorites, stationIds } = useFavorites();
  const [cityQuery, setCityQuery] = useState("");

  const name = settings.name.trim();
  const greeting = name ? t("profile.helloName", { name }) : t("profile.hello");
  const currentLanguage = getLanguage(language);

  // Выбранный город всегда наверху, остальные по фильтру, не больше MAX_CITY_OPTIONS.
  // Ищем по английскому и русскому названию и по названию страны на текущем языке.
  const query = cityQuery.trim().toLowerCase();
  const selectedCity = CITIES.find((c) => c.id === settings.startCityId);
  const cityOptions = [
    ...(selectedCity ? [selectedCity] : []),
    ...CITIES.filter(
      (c) =>
        c.id !== settings.startCityId &&
        (query.length === 0 ||
          c.name.en.toLowerCase().includes(query) ||
          c.name.ru.toLowerCase().includes(query) ||
          countryName(c.countryCode, language).toLowerCase().includes(query)),
    ).slice(0, MAX_CITY_OPTIONS),
  ];

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
            {t("count.stations", { count: stationIds.length })} ·{" "}
            {t("count.tracks", { count: favorites.length })}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t("profile.name")}</Text>
      <TextInput
        value={settings.name}
        onChangeText={settings.setName}
        placeholder={t("profile.namePlaceholder")}
        placeholderTextColor="#999"
        autoCapitalize="words"
        style={styles.input}
      />

      <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
      <Pressable
        onPress={() => router.push("/profile/language")}
        style={({ pressed }) => [styles.card, styles.linkRow, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${t("profile.language")}: ${currentLanguage.native}`}
      >
        <Ionicons name="language" size={22} color="#1d6fd8" />
        <Text style={styles.linkLabel}>{currentLanguage.native}</Text>
        <Ionicons name="chevron-forward" size={20} color="#c4c4c6" />
      </Pressable>

      <Text style={styles.sectionTitle}>{t("profile.startPage")}</Text>
      <View style={styles.card}>
        {START_OPTIONS.map((option, index) => (
          <View key={option.value}>
            {index > 0 ? <View style={styles.separator} /> : null}
            <OptionRow
              label={t(option.label)}
              hint={t(option.hint)}
              selected={settings.startPage === option.value}
              onPress={() => settings.setStartPage(option.value)}
            />
          </View>
        ))}
      </View>

      {settings.startPage === "city" ? (
        <>
          <Text style={styles.sectionTitle}>{t("profile.whichCity")}</Text>
          <TextInput
            value={cityQuery}
            onChangeText={setCityQuery}
            placeholder={t("profile.cityPlaceholder")}
            placeholderTextColor="#999"
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={styles.input}
          />
          <View style={styles.card}>
            {cityOptions.map((city, index) => (
              <View key={city.id}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <OptionRow
                  label={`${flagEmoji(city.countryCode)} ${cityName(city, language)}`}
                  hint={countryName(city.countryCode, language)}
                  selected={settings.startCityId === city.id}
                  onPress={() => settings.setStartCityId(city.id)}
                />
              </View>
            ))}
            {cityOptions.length === 0 ? (
              <Text style={styles.emptyHint}>{t("search.empty")}</Text>
            ) : null}
          </View>
        </>
      ) : null}

      <Text style={styles.footer}>
        {t("profile.dataSource", { date: formatDateTime(GENERATED_AT, language) })}
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
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  linkLabel: {
    flex: 1,
    fontSize: 16,
    color: "#111",
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
  emptyHint: {
    padding: 14,
    color: "#777",
    textAlign: "center",
  },
  footer: {
    marginTop: 16,
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});
