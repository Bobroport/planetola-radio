# radio-app

Простое радио-приложение: список интернет-радиостанций и плеер.

## Стек

- **Expo SDK 57** (`expo` ~57), React Native 0.86, React 19.
- **TypeScript** в строгом режиме (`"strict": true` в `tsconfig.json`). Никаких `any`, `// @ts-ignore` и неявных типов.
- **Expo Router** — файловая навигация. Экраны лежат только в `src/app/`, `_layout.tsx` описывает навигатор. Структура: корневой Stack → группа `(tabs)` с вкладками Города (`cities/` — свой Stack: список и `[id]`), Поиск, Избранное, Профиль. Панель вкладок своя (`(tabs)/_layout.tsx`), плеер `PlayerBar` рендерится внутри неё над кнопками. Пакет `@react-navigation/bottom-tabs` не ставить: expo-router 57 несёт свою копию, вторая ломает типы и контексты.
- Настройки пользователя (имя, стартовая страница) — `src/providers/settings-provider.tsx`, избранные треки и плейлист станций — `src/providers/favorites-provider.tsx`; оба хранят JSON в `expo-sqlite/kv-store`.
- Остальной код (компоненты, хуки, данные, утилиты) — в `src/` вне `src/app/`. Алиас `@/*` указывает на `./src/*`.
- Персонаж приложения — бобёр с магнитофоном (`src/components/beaver.tsx`): нарисован на `react-native-svg`, анимирован `react-native-reanimated`. Громкость и тембр для танца считаются в `src/hooks/use-dance-energy.ts` из PCM-сэмплов `useAudioSampleListener`; без сэмплов бобёр танцует под свой ритм.
- Воспроизведение аудио — `expo-audio`. Состояние плеера живёт в `src/providers/player-provider.tsx`, панель плеера рендерится в корневом `_layout.tsx` под навигатором.
- Данные станций — статичный `src/data/stations.json`, сгенерированный скриптом `scripts/generate-stations.mjs` из открытой базы Radio Browser (https://api.radio-browser.info). Руками JSON не править: меняй список городов или фильтры в скрипте и перегенерируй командой `npm run generate-stations`.

## Правила

1. **Expo-библиотеки приоритетнее сторонних.** Если задачу решает модуль из экосистемы Expo (`expo-audio`, `expo-image`, `expo-haptics` и т. д.), используй его, а не аналог из npm.
2. **Только то, что работает в Expo Go.** Приложение тестируется в Expo Go, поэтому нельзя добавлять библиотеки с нативным кодом, которого нет в Expo Go. Перед добавлением зависимости проверь, что она входит в состав Expo Go для SDK 57.
3. **Устанавливай зависимости через `npx expo install <package>`**, а не `npm install` — так подбирается версия, совместимая с SDK.
4. **Не доверяй памяти про Expo API.** Перед использованием любого Expo/React Native API сверяйся с документацией версии SDK: `https://docs.expo.dev/versions/v57.0.0/`.
5. **Папки `ios/` и `android/` не создавать и не править вручную** — нативная конфигурация только через `app.json` и config-плагины.
6. **Перед завершением задачи** запускай `npx expo lint` и `npx tsc --noEmit`; оба должны проходить без ошибок.
7. **После добавления нового файла-экрана в `src/app/`** выполни `npx expo customize tsconfig.json`: это перегенерирует типизированные маршруты в `.expo/types/router.d.ts`, иначе `tsc` не узнает новый путь (`expo start` делает то же самое, но запускать dev-сервер ради этого не нужно).

## Команды

```bash
npx expo start          # dev-сервер, затем открыть в Expo Go
npx expo lint           # линтер
npx tsc --noEmit        # проверка типов
npx expo-doctor         # диагностика зависимостей
npm run generate-stations  # перегенерировать src/data/stations.json
```
