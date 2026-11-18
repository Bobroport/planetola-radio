import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router, Stack, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { cityView, EarthGL, type Flight } from "@/components/earth-gl";
import {
  CITIES,
  cityName,
  countryName,
  getCity,
  type City,
  type Station,
} from "@/data/stations";
import { useAppActive } from "@/hooks/use-app-active";
import { useI18n } from "@/i18n";
import { flagEmoji } from "@/lib/format";
import {
  FLIGHT_DURATION_MS,
  requestFlight,
  setGlobeFocus,
  useFlightRequest,
  type GlobePoint,
} from "@/lib/globe-flight";
import { getStationPoint } from "@/lib/globe-navigation";
import { layout } from "@/lib/layout";
import { useFavorites, type ResolvedStation } from "@/providers/favorites-provider";
import { usePlayer } from "@/providers/player-provider";
import { useSettings } from "@/providers/settings-provider";

/** Стартовую страницу открываем один раз за запуск приложения. */
let startPageApplied = false;
/** Вступительный перелёт тоже один раз за запуск: после него глобус слушается кнопок и жестов. */
let introPlayed = false;
/** Цель вступления выбирается случайно, поэтому запоминается на весь запуск. */
let introTargetCache: IntroTarget | null = null;

const TOTAL_STATIONS = CITIES.reduce((n, c) => n + c.stations.length, 0);

/**
 * Вступление при запуске: шар показывает обе Америки и летит к цели. При самом первом запуске
 * это Амстердам с включением Radio Boven IJ, дальше — случайная избранная станция (она тоже
 * включается), а без избранного — случайный европейский город без станции.
 */
const INTRO_START = { rotation: { lambda: 90, phi: -20 }, zoom: 1 };
const FIRST_INTRO_CITY_ID = "amsterdam";
const FIRST_INTRO_STATION_ID = "c84d20ef-1b8b-4f8e-a809-e4297f570eb9"; // Radio Boven IJ
const INTRO_CITY_IDS = ["amsterdam", "paris", "lisbon", "london"];
const INTRO_ZOOM = 6;
const INTRO_DURATION_MS = 5000;

function openCity(city: City) {
  router.push({ pathname: "/cities/[id]", params: { id: city.id } });
}

/** Цель вступления: куда лететь, что включить по прилёте и из какого списка. */
type IntroTarget = { point: GlobePoint; station: Station | null; queue: Station[] };

function pickRandom<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

/** Куда лететь при запуске; null, если в данных нет ни одного подходящего города. */
function pickIntroTarget(
  firstLaunch: boolean,
  favoriteStationIds: string[],
  resolveStation: (stationId: string) => ResolvedStation | undefined,
): IntroTarget | null {
  if (firstLaunch) {
    const city = getCity(FIRST_INTRO_CITY_ID);
    if (!city) return null;
    const station =
      city.stations.find((s) => s.id === FIRST_INTRO_STATION_ID) ?? city.stations[0] ?? null;
    return { point: city, station, queue: city.stations };
  }
  // Избранная станция без города (из странового списка) ведёт в столицу своей страны.
  const favorites = favoriteStationIds.flatMap((id): IntroTarget[] => {
    const found = resolveStation(id);
    if (!found) return [];
    const point = found.city ?? getStationPoint(found.station);
    if (!point) return [];
    return [{ point, station: found.station, queue: found.city?.stations ?? [found.station] }];
  });
  const favorite = pickRandom(favorites);
  if (favorite) return favorite;
  const city = pickRandom(INTRO_CITY_IDS.flatMap((id) => getCity(id) ?? []));
  return city ? { point: city, station: null, queue: [] } : null;
}

export default function GlobeScreen() {
  const { language, t } = useI18n();
  const { current, play } = usePlayer();
  const { ready, startPage, startCityId, introSeen, setIntroSeen } = useSettings();
  const {
    ready: favoritesReady,
    stationIds,
    isStationSaved,
    toggleStation,
    resolveStation,
  } = useFavorites();
  // Кнопка глобуса и выбор станции просят подлететь к её городу или столице страны.
  const flightRequest = useFlightRequest();
  const [focused, setFocused] = useState<City | null>(null);
  const [introDone, setIntroDone] = useState(introPlayed);
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

  // Пока приложение не на экране (блокировка, другое приложение), станцию могли сменить
  // с экрана блокировки, наушников или CarPlay. При возврате шар перелетает от места, где
  // стоял, к станции, которая играет сейчас; промежуточные переключения не важны.
  const appActive = useAppActive();
  const isFocused = useIsFocused();
  const currentRef = useRef(current);
  const stationOnLeaveRef = useRef<string | null>(null);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  useEffect(() => {
    const now = currentRef.current;
    if (!appActive) {
      stationOnLeaveRef.current = now?.id ?? null;
      return;
    }
    if (!now || now.id === stationOnLeaveRef.current) return;
    const point = getStationPoint(now);
    if (point) requestFlight(point);
  }, [appActive]);

  const onSelectCity = useCallback((city: City) => openCity(city), []);
  const onFocusChange = useCallback((city: City | null) => {
    setFocused(city);
    // Список станций по этому признаку решает, нужен ли перелёт перед включением.
    setGlobeFocus(city?.id ?? null);
  }, []);

  // Цель выбирается один раз за запуск, когда прочитаны и настройки, и избранное.
  const introTarget = useMemo(() => {
    if (!ready || !favoritesReady) return null;
    introTargetCache ??= pickIntroTarget(!introSeen, stationIds, resolveStation);
    return introTargetCache;
  }, [ready, favoritesReady, introSeen, stationIds, resolveStation]);
  // Перелёт показываем при каждом запуске, который начинается с глобуса; при самом первом
  // запуске — всегда, потому что стартовую страницу тогда не открываем (см. эффект выше).
  const startsOnGlobe =
    startPage === "cities" ||
    (startPage === "city" && getCity(startCityId ?? undefined) === undefined);
  const showIntro = !introDone && introTarget !== null && (!introSeen || startsOnGlobe);
  const flight = useMemo<Flight | null>(() => {
    if (showIntro && introTarget) {
      return { to: cityView(introTarget.point, INTRO_ZOOM), durationMs: INTRO_DURATION_MS };
    }
    if (flightRequest) {
      return {
        to: cityView(flightRequest, INTRO_ZOOM),
        durationMs: FLIGHT_DURATION_MS,
        key: String(flightRequest.at),
      };
    }
    return null;
  }, [showIntro, introTarget, flightRequest]);
  const onFlightDone = useCallback(
    (completed: boolean) => {
      // Перелёты по кнопке глобуса и из списков станций вступления не касаются.
      if (!showIntro || !introTarget) return;
      introPlayed = true;
      setIntroDone(true);
      if (!introSeen) setIntroSeen(true);
      // Перелёт прервал жест: пользователь взял управление, станцию не навязываем.
      if (!completed || !introTarget.station) return;
      play(introTarget.station, introTarget.queue);
    },
    [showIntro, introSeen, introTarget, play, setIntroSeen],
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
      {/* Приложение заперто в светлой теме (userInterfaceStyle в app.json), строка состояния
          по умолчанию тёмная; у глобуса тёмный заголовок, поэтому пока он в фокусе, просим светлую. */}
      {isFocused ? <StatusBar style="light" /> : null}
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
        {/* Шар монтируем после чтения настроек и избранного: стартовое положение задаётся один раз. */}
        {size && ready && favoritesReady ? (
          <EarthGL
            width={size.width}
            height={size.height}
            initialView={showIntro ? INTRO_START : undefined}
            flight={flight}
            onFlightDone={onFlightDone}
            onFocusChange={onFocusChange}
            onSelectCity={onSelectCity}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        {focused ? (
          <Pressable
            onPress={() => openCity(focused)}
            style={({ pressed }) => [styles.cardRow, layout.content, pressed && styles.pressed]}
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
          <View style={[styles.cardRow, layout.content]}>
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
