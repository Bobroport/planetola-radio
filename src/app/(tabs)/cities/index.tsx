import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { WorldGlobe } from "@/components/world-globe";
import { CITIES, getCity, type City } from "@/data/stations";
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
  const { current } = usePlayer();
  const { ready, startPage, startCityId } = useSettings();
  const { width } = useWindowDimensions();
  const [focused, setFocused] = useState<City | null>(null);
  const [size, setSize] = useState({ width, height: width });

  useEffect(() => {
    if (!ready || startPageApplied) return;
    startPageApplied = true;
    if (startPage === "city" && startCityId && getCity(startCityId)) {
      openCity(getCity(startCityId) as City);
    } else if (startPage === "list") {
      router.push("/cities/list");
    } else if (startPage === "playlist") {
      router.navigate("/favorites");
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
          title: "Глобус",
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
          if (w > 0 && h > 0) setSize({ width: w, height: h });
        }}
      >
        <WorldGlobe
          width={size.width}
          height={size.height}
          onFocusChange={setFocused}
          onSelectCity={onSelectCity}
        />
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
              <Text style={styles.cardTitle}>{focused.name}</Text>
              <Text style={styles.cardSubtitle}>
                {focused.country} · {focused.stations.length} станций
                {playingCity?.id === focused.id ? " · сейчас играет" : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#9cc0ff" />
          </Pressable>
        ) : (
          <View style={styles.cardRow}>
            <Ionicons name="earth" size={22} color="#9cc0ff" />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Вращайте шар</Text>
              <Text style={styles.cardSubtitle}>
                Подведите город к центру или нажмите на точку · {CITIES.length} городов,{" "}
                {TOTAL_STATIONS} станций
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
