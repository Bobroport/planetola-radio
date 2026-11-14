import { Stack } from "expo-router";

import { GlobeButton } from "@/components/globe-button";
import { useI18n } from "@/i18n";

export default function ProfileLayout() {
  const { t } = useI18n();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerBackButtonDisplayMode: "minimal",
        headerRight: () => <GlobeButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: t("tab.profile") }} />
      <Stack.Screen name="language" options={{ title: t("profile.language") }} />
    </Stack>
  );
}
