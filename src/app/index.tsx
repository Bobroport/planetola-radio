import { Redirect } from "expo-router";

/** Корневой путь "/" ведёт на вкладку городов внутри группы (tabs). */
export default function Index() {
  return <Redirect href="/cities" />;
}
