import { Stack } from "expo-router";

import { GlobeButton } from "@/components/globe-button";
import { useI18n } from "@/i18n";

export default function ProfileLayout() {
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
      <Stack.Screen name="index" options={{ title: t("tab.profile") }} />
      <Stack.Screen name="language" options={{ title: t("profile.language") }} />
    </Stack>
  );
}
