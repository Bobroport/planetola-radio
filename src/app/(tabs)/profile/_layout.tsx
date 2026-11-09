import { Stack } from "expo-router";

import { useI18n } from "@/i18n";

export default function ProfileLayout() {
  const { t } = useI18n();

  return (
    <Stack screenOptions={{ headerTitleAlign: "center", headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="index" options={{ title: t("tab.profile") }} />
      <Stack.Screen name="language" options={{ title: t("profile.language") }} />
    </Stack>
  );
}
