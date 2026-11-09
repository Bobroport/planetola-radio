import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EarthGL } from "@/components/earth-gl";
import { CITIES, cityName, countryName, getCity, type City } from "@/data/stations";
import { useI18n } from "@/i18n";
import { flagEmoji } from "@/lib/format";
import { usePlayer } from "@/providers/player-provider";
import { useSettings } from "@/providers/settings-provider";

/** Стартовую страницу открываем один раз за запуск приложения. */
let startPageApplied = false;

const TOTAL_STATIONS = CITIES.reduce((n, c) => n + c.stations.length, 0);

function openCity(city: City) {
  router.push({ pathname: "/cities/[id]", params: { id: city.id } });
}

export default function GlobeScreen() {
  const { language, t } = useI18n();
  const { current } = usePlayer();
  const { ready, startPage, startCityId } = useSettings();
  const [focused, setFocused] = useState<City | null>(null);
  // Размер известен только после первого onLayout; до этого шар не монтируем,
  // иначе GL-контекст создаётся дважды.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!ready || startPageApplied) return;
    startPageApplied = true;
    const startCity = startPage === "city" ? getCity(startCityId ?? undefined) : undefined;
    if (startCity) {
      openCity(startCity);
    } else if (startPage === "list") {
      router.push("/cities/list");
    } else if (startPage === "playlist") {
      router.navigate("/stations");
    }
  }, [ready, startPage, startCityId]);

  const onSelectCity = useCallback((city: City) => openCity(city), []);
  const playingCity =
    current !== null
      ? CITIES.find((c) => c.stations.some((s) => s.id === current.id))
      : undefined;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t("globe.title"),
          headerStyle: { backgroundColor: "#0b1020" },
          headerTintColor: "#fff",
          headerRight: () => (
            <Link href="/cities/list" style={styles.headerLink}>
              <Ionicons name="list" size={24} color="#fff" />
            </Link>
          ),
        }}
      />
      <View
        style={styles.globeArea}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          const rw = Math.round(w);
          const rh = Math.round(h);
          if (rw > 0 && rh > 0) {
            setSize((prev) =>
              prev && prev.width === rw && prev.height === rh ? prev : { width: rw, height: rh },
            );
          }
        }}
      >
        {size ? (
          <EarthGL
            width={size.width}
            height={size.height}
            onFocusChange={setFocused}
            onSelectCity={onSelectCity}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        {focused ? (
          <Pressable
            onPress={() => openCity(focused)}
            style={({ pressed }) => [styles.cardRow, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.cardFlag}>{flagEmoji(focused.countryCode)}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{cityName(focused, language)}</Text>
              <Text style={styles.cardSubtitle}>
                {countryName(focused.countryCode, language)} ·{" "}
                {t("count.stations", { count: focused.stations.length })}
                {playingCity?.id === focused.id ? ` · ${t("city.nowPlaying")}` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#9cc0ff" />
          </Pressable>
        ) : (
          <View style={styles.cardRow}>
            <Ionicons name="earth" size={22} color="#9cc0ff" />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{t("globe.spin")}</Text>
              <Text style={styles.cardSubtitle}>
                {t("globe.hint")} · {t("count.cities", { count: CITIES.length })} ·{" "}
                {t("count.stations", { count: TOTAL_STATIONS })}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1020",
  },
  globeArea: {
    flex: 1,
    overflow: "hidden",
  },
  headerLink: {
    paddingHorizontal: 4,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#121a33",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#2a3a66",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
  },
  pressed: {
    opacity: 0.7,
  },
  cardFlag: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#9cc0ff",
  },
});
