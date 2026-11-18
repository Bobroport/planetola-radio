import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Приложение запущено в Expo Go, а не в собственной сборке. Нужно там, где поведение
 * зависит от Info.plist самого Expo Go (например, у него `UIViewControllerBasedStatusBarAppearance`
 * выключен, и опция `statusBarStyle` нативного стека там даёт ошибку).
 */
export const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
