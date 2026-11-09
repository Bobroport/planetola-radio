import { Stack } from "expo-router";

import { useI18n } from "@/i18n";

export default function CitiesLayout() {
  const { t } = useI18n();

  return (
    <Stack screenOptions={{ headerTitleAlign: "center", headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="index" options={{ title: t("globe.title") }} />
      <Stack.Screen name="list" options={{ title: t("cities.title") }} />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}
