import { Stack } from "expo-router";

export default function CitiesLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="index" options={{ title: "Города" }} />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}
