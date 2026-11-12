import { useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Chip } from "@/components/chip";
import { StationRow } from "@/components/station-row";
import { isAllCountryStationsLoaded, loadAllCountryStations } from "@/data/countries";
import { useI18n } from "@/i18n";
import {
  BITRATE_OPTIONS,
  CODEC_OPTIONS,
  EMPTY_FILTERS,
  hasActiveFilters,
  isCodec,
  searchStations,
  TOP_LANGUAGES,
  TOP_TAGS,
  type SearchFilters,
} from "@/lib/search";
import { usePlayer } from "@/providers/player-provider";

type Params = { tag?: string; language?: string; codec?: string };

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export default function SearchScreen() {
  const { language, t } = useI18n();
  const params = useLocalSearchParams<Params>();
  const { current, play } = usePlayer();

  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...EMPTY_FILTERS,
    tags: params.tag ? [params.tag] : [],
    languages: params.language ? [params.language] : [],
    codec: isCodec(params.codec) ? params.codec : null,
  }));

  // Полные страновые списки подключаются к поиску, как только разобраны; до этого ищем по городам.
  const [catalogReady, setCatalogReady] = useState(isAllCountryStationsLoaded);
  useEffect(() => {
    if (catalogReady) return;
    let cancelled = false;
    loadAllCountryStations().then(() => {
      if (!cancelled) setCatalogReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogReady]);

  const results = searchStations(filters, language, catalogReady);
  const active = hasActiveFilters(filters);

  // Выбранные теги/языки, которых нет в топе, показываем первыми, чтобы их можно было снять.
  const tagOptions = [
    ...filters.tags.filter((tag) => !TOP_TAGS.some((x) => x.value === tag)),
    ...TOP_TAGS.map((x) => x.value),
  ];
  const languageOptions = [
    ...filters.languages.filter(
      (l) => !TOP_LANGUAGES.some((x) => x.value === l),
    ),
    ...TOP_LANGUAGES.map((x) => x.value),
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={({ station }) => station.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <TextInput
              value={filters.query}
              onChangeText={(query) => setFilters({ ...filters, query })}
              placeholder={t("search.placeholder")}
              placeholderTextColor="#999"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={styles.input}
            />

            <FilterRow label={t("search.codec")}>
              {CODEC_OPTIONS.map((codec) => (
                <Chip
                  key={codec}
                  label={codec}
                  selected={filters.codec === codec}
                  onPress={() =>
                    setFilters({
                      ...filters,
                      codec: filters.codec === codec ? null : codec,
                    })
                  }
                />
              ))}
            </FilterRow>

            <FilterRow label={t("search.bitrate")}>
              {BITRATE_OPTIONS.map((kbps) => (
                <Chip
                  key={kbps}
                  label={`${kbps}+`}
                  selected={filters.minBitrate === kbps}
                  onPress={() =>
                    setFilters({
                      ...filters,
                      minBitrate: filters.minBitrate === kbps ? 0 : kbps,
                    })
                  }
                />
              ))}
            </FilterRow>

            <FilterRow label={t("search.language")}>
              {languageOptions.map((lang) => (
                <Chip
                  key={lang}
                  label={lang}
                  selected={filters.languages.includes(lang)}
                  onPress={() =>
                    setFilters({
                      ...filters,
                      languages: toggle(filters.languages, lang),
                    })
                  }
                />
              ))}
            </FilterRow>

            <FilterRow label={t("search.tags")}>
              {tagOptions.map((tag) => (
                <Chip
                  key={tag}
                  label={`#${tag}`}
                  selected={filters.tags.includes(tag)}
                  onPress={() =>
                    setFilters({ ...filters, tags: toggle(filters.tags, tag) })
                  }
                />
              ))}
            </FilterRow>

            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {t(active ? "search.found" : "search.all", { count: results.length })}
                {catalogReady ? "" : ` · ${t("search.loading")}`}
              </Text>
              {active ? (
                <Chip label={t("search.reset")} onPress={() => setFilters(EMPTY_FILTERS)} />
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <StationRow
            station={item.station}
            city={item.city}
            showCountry
            isActive={current?.id === item.station.id}
            onPress={play}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.empty}>{t("search.empty")}</Text>
        }
      />
    </View>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.filterChips}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
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
  filterRow: {
    gap: 4,
  },
  filterLabel: {
    marginHorizontal: 16,
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
  },
  filterChips: {
    paddingHorizontal: 16,
    gap: 6,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 4,
  },
  summaryText: {
    fontSize: 13,
    color: "#555",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginLeft: 16,
  },
  empty: {
    padding: 24,
    textAlign: "center",
    color: "#555",
  },
});
