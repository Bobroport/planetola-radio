import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router, Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { cityView, EarthGL, type Flight } from "@/components/earth-gl";
import { CITIES, cityName, countryName, getCity, type City } from "@/data/stations";
import { useI18n } from "@/i18n";
import { flagEmoji } from "@/lib/format";
import { useFlightRequest } from "@/lib/globe-flight";
import { useFavorites } from "@/providers/favorites-provider";
import { usePlayer } from "@/providers/player-provider";
import { useSettings } from "@/providers/settings-provider";

/** Стартовую страницу открываем один раз за запуск приложения. */
let startPageApplied = false;

const TOTAL_STATIONS = CITIES.reduce((n, c) => n + c.stations.length, 0);

/** Вступление при первом запуске: шар показывает обе Америки, летит к Амстердаму и включает станцию. */
const INTRO_START = { rotation: { lambda: 90, phi: -20 }, zoom: 1 };
const INTRO_CITY_ID = "amsterdam";
const INTRO_STATION_ID = "c84d20ef-1b8b-4f8e-a809-e4297f570eb9"; // Radio Boven IJ
const INTRO_ZOOM = 6;
const INTRO_DURATION_MS = 5000;
/** Перелёт к городу играющей станции по кнопке глобуса в заголовке. */
const FLY_DURATION_MS = 2500;

function openCity(city: City) {
  router.push({ pathname: "/cities/[id]", params: { id: city.id } });
}

export default function GlobeScreen() {
  const { language, t } = useI18n();
  const { current, play } = usePlayer();
  const { ready, startPage, startCityId, introSeen, setIntroSeen } = useSettings();
  const { isStationSaved, toggleStation } = useFavorites();
  // Кнопка глобуса и выбор станции просят подлететь к её городу.
  const flightRequest = useFlightRequest();
  const [focused, setFocused] = useState<City | null>(null);
  // Размер известен только после первого onLayout; до этого шар не монтируем,
  // иначе GL-контекст создаётся дважды.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!ready || startPageApplied) return;
    startPageApplied = true;
    // В запуск со вступлением стартовую страницу не открываем: перелёт должен быть на виду.
    if (!introSeen) return;
    const startCity = startPage === "city" ? getCity(startCityId ?? undefined) : undefined;
    if (startCity) {
      openCity(startCity);
    } else if (startPage === "list") {
      router.push("/cities/list");
    } else if (startPage === "playlist") {
      router.navigate("/stations");
    }
  }, [ready, introSeen, startPage, startCityId]);

  const onSelectCity = useCallback((city: City) => openCity(city), []);

  const introCity = getCity(INTRO_CITY_ID);
  const showIntro = ready && !introSeen && introCity !== undefined;
  const flyToCity = getCity(flightRequest?.cityId);
  const flight = useMemo<Flight | null>(() => {
    if (showIntro && introCity) {
      return { to: cityView(introCity, INTRO_ZOOM), durationMs: INTRO_DURATION_MS };
    }
    if (flyToCity) {
      return {
        to: cityView(flyToCity, INTRO_ZOOM),
        durationMs: FLY_DURATION_MS,
        key: String(flightRequest?.at),
      };
    }
    return null;
  }, [showIntro, introCity, flyToCity, flightRequest?.at]);
  const onFlightDone = useCallback(
    (completed: boolean) => {
      // Автозапуск станции относится только к вступлению.
      if (!showIntro) return;
      setIntroSeen(true);
      // Перелёт прервал жест: пользователь взял управление, станцию не навязываем.
      if (!completed || !introCity) return;
      const station =
        introCity.stations.find((s) => s.id === INTRO_STATION_ID) ?? introCity.stations[0];
      if (station) play(station, introCity.stations);
    },
    [showIntro, introCity, play, setIntroSeen],
  );
  const playingCity =
    current !== null
      ? CITIES.find((c) => c.stations.some((s) => s.id === current.id))
      : undefined;
  /** Играющая станция, если она из города в фокусе: для неё в карточке звезда избранного. */
  const focusedStation = current && playingCity && playingCity.id === focused?.id ? current : null;
  const focusedSaved = focusedStation ? isStationSaved(focusedStation.id) : false;

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
        {/* Шар монтируем после чтения настроек: стартовое положение задаётся один раз. */}
        {size && ready ? (
          <EarthGL
            width={size.width}
            height={size.height}
            initialView={showIntro ? INTRO_START : undefined}
            flight={flight}
            onFlightDone={onFlightDone}
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
            {focusedStation ? (
              <Pressable
                onPress={() => toggleStation(focusedStation)}
                hitSlop={10}
                style={({ pressed }) => [styles.star, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={focusedSaved ? t("station.remove") : t("station.add")}
                accessibilityState={{ selected: focusedSaved }}
              >
                <Ionicons
                  name={focusedSaved ? "star" : "star-outline"}
                  size={26}
                  color={focusedSaved ? "#f5a524" : "#9cc0ff"}
                />
              </Pressable>
            ) : null}
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
  star: {
    padding: 4,
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
