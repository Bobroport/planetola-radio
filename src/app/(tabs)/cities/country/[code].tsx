import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from "react-native";

import { StationRow } from "@/components/station-row";
import { getCountryStations, hasCountryCatalog } from "@/data/countries";
import { countryName, type Station } from "@/data/stations";
import { useI18n } from "@/i18n";
import { flagEmoji } from "@/lib/format";
import { usePlayer } from "@/providers/player-provider";

/** Все станции страны из полного списка, с фильтром по названию, региону и тегам. */
export default function CountryScreen() {
  const { language, t } = useI18n();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { current, play } = usePlayer();
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState<Station[] | null>(null);

  const countryCode = code && hasCountryCatalog(code) ? code : null;

  // Файл страны разбирается после первого кадра, чтобы заголовок появился сразу.
  useEffect(() => {
    if (!countryCode) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const list = getCountryStations(countryCode);
      if (!cancelled) setStations(list);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [countryCode]);

  if (!countryCode) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: "" }} />
        <Text style={styles.emptyText}>{t("country.notFound")}</Text>
      </View>
    );
  }

  const needle = query.trim().toLowerCase();
  const visible =
    stations === null
      ? []
      : needle.length === 0
        ? stations
        : stations.filter((s) =>
            [s.name, s.state, ...s.tags].join(" ").toLowerCase().includes(needle),
          );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: `${flagEmoji(countryCode)} ${countryName(countryCode, language)}` }}
      />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={15}
        ListHeaderComponent={
          <View style={styles.header}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("country.filter")}
              placeholderTextColor="#999"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={styles.input}
            />
            <Text style={styles.summary}>
              {stations === null
                ? t("player.loading")
                : t("count.stations", { count: visible.length })}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <StationRow station={item} isActive={current?.id === item.id} onPress={play} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          stations === null ? (
            <ActivityIndicator style={styles.spinner} />
          ) : (
            <Text style={styles.emptyText}>{t("search.empty")}</Text>
          )
        }
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
    paddingBottom: 4,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  input: {
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f1f2f4",
    fontSize: 16,
    color: "#111",
  },
  summary: {
    marginHorizontal: 16,
    fontSize: 13,
    color: "#555",
  },
  spinner: {
    marginTop: 32,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginLeft: 16,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    padding: 24,
    textAlign: "center",
    fontSize: 16,
    color: "#555",
  },
});
