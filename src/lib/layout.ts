import { StyleSheet } from "react-native";

/**
 * Наибольшая ширина колонки с содержимым. На iPhone экран уже, и ограничение не
 * срабатывает; на iPad и внутреннем экране складного iPhone списки, плеер и панель
 * вкладок не растягиваются на всю ширину, а стоят по центру.
 */
export const CONTENT_MAX_WIDTH = 720;

export const layout = StyleSheet.create({
  /**
   * Колонка содержимого: во всю ширину, но не шире `CONTENT_MAX_WIDTH`, по центру.
   * Для списков ставится в `contentContainerStyle`, чтобы прокрутка работала по всей
   * ширине экрана, а полоса прокрутки оставалась у края.
   */
  content: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
  },
});
