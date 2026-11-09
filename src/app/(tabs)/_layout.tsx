import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlayerBar } from "@/components/player-bar";
import { useI18n } from "@/i18n";

type IconName = ComponentProps<typeof Ionicons>["name"];
type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const ACTIVE = "#1d6fd8";
const INACTIVE = "#8e8e93";

function icon(active: IconName, inactive: IconName) {
  return function TabIcon({
    color,
    size,
    focused,
  }: {
    color: ColorValue;
    size: number;
    focused: boolean;
  }) {
    return (
      <Ionicons name={focused ? active : inactive} size={size} color={color} />
    );
  };
}

/** Своя панель вкладок: плеер сидит прямо над кнопками и виден на любом экране. */
function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View>
      <PlayerBar />
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? ACTIVE : INACTIVE;
          const label =
            typeof options.title === "string" ? options.title : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              {options.tabBarIcon?.({ focused, color, size: 24 })}
              {/* В части языков подписи длиннее: уменьшаем шрифт, а не обрезаем слово. */}
              <Text
                style={[styles.label, { color }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerTitleAlign: "center" }}
    >
      <Tabs.Screen
        name="cities"
        options={{
          title: t("tab.cities"),
          headerShown: false,
          tabBarIcon: icon("radio", "radio-outline"),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: t("tab.search"), tabBarIcon: icon("search", "search-outline") }}
      />
      {/* Избранные станции и понравившиеся треки — два соседних раздела. */}
      <Tabs.Screen
        name="stations"
        options={{
          title: t("tab.stations"),
          headerTitle: t("stations.title"),
          tabBarIcon: icon("star", "star-outline"),
        }}
      />
      <Tabs.Screen
        name="tracks"
        options={{
          title: t("tab.tracks"),
          headerTitle: t("tracks.title"),
          tabBarIcon: icon("heart", "heart-outline"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tab.profile"),
          headerShown: false,
          tabBarIcon: icon("person", "person-outline"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    paddingTop: 6,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 11,
  },
});
