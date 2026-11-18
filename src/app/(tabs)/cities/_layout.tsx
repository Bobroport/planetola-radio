import { Stack } from "expo-router";

import { GlobeButton } from "@/components/globe-button";
import { useI18n } from "@/i18n";

export default function CitiesLayout() {
  const { t } = useI18n();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        // expo-router 58 на iOS 26 делает заголовок прозрачным, и списки уезжают под него.
        headerTransparent: false,
        headerBackButtonDisplayMode: "minimal",
        headerRight: () => <GlobeButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: t("globe.title") }} />
      <Stack.Screen name="list" options={{ title: t("cities.title") }} />
      <Stack.Screen name="[id]" options={{ title: "" }} />
      <Stack.Screen name="countries" options={{ title: t("countries.title") }} />
      <Stack.Screen name="country/[code]" options={{ title: "" }} />
    </Stack>
  );
}
