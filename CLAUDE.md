# radio-app

Простое радио-приложение: список интернет-радиостанций и плеер.

## Стек

- **Expo SDK 57** (`expo` ~57), React Native 0.86, React 19.
- **TypeScript** в строгом режиме (`"strict": true` в `tsconfig.json`). Никаких `any`, `// @ts-ignore` и неявных типов.
- **Expo Router** — файловая навигация. Экраны лежат только в `src/app/`, `_layout.tsx` описывает навигатор. Структура: корневой Stack (`index.tsx` — редирект с `/` на `/cities`) → группа `(tabs)` с вкладками Города (`cities/` — свой Stack: список и `[id]`), Поиск, Избранное, Профиль. Панель вкладок своя (`(tabs)/_layout.tsx`), плеер `PlayerBar` рендерится внутри неё над кнопками. Пакет `@react-navigation/bottom-tabs` не ставить: expo-router 57 несёт свою копию, вторая ломает типы и контексты.
- Настройки пользователя (имя, стартовая страница) — `src/providers/settings-provider.tsx`, избранные треки и плейлист станций — `src/providers/favorites-provider.tsx`; оба хранят JSON в `expo-sqlite/kv-store`.
- Остальной код (компоненты, хуки, данные, утилиты) — в `src/` вне `src/app/`. Алиас `@/*` указывает на `./src/*`.
- Персонаж приложения — бобёр с магнитофоном (`src/components/beaver.tsx`): нарисован на `react-native-svg`, анимирован `react-native-reanimated`. Громкость и тембр для танца считаются в `src/hooks/use-dance-energy.ts` из PCM-сэмплов `useAudioSampleListener`; без сэмплов бобёр танцует под свой ритм.
- Главный экран — трёхмерный глобус `src/components/earth-gl.tsx` на `expo-gl` + `three` (через `expo-three`: `Renderer`, `TextureLoader`): сфера с текстурой NASA Blue Marble (`assets/textures/earth-blue-marble-2048.jpg`, источник и лицензия в `assets/textures/README.md`), освещение, свечение атмосферы шейдером, маркеры городов как InstancedMesh, нажатие через Raycaster по сфере → ближайший город. Жесты (вращение, щипок, нажатие) в `src/hooks/use-globe-gestures.ts` через `react-native-gesture-handler`; положение шара живёт в ref и применяется к сцене напрямую, React не перерисовывается; кадр запрашивается только когда сцена помечена dirty, постоянного цикла отрисовки нет. Версию `three` держать в пределах peer-зависимости `expo-three` (сейчас ^0.166). Рендерер создавать только через `createRenderer` из `src/lib/three-renderer.ts`: three r163+ бракует контекст expo-gl как WebGL 1 (ложно, из-за наследования классов-заглушек), хелпер обходит проверку. Текстуры в GPU грузить только через `loadTextureFromAsset` оттуда же (шестиаргументный `texImage2D` expo-gl без UNPACK_FLIP_Y, переворот UV-матрицей): стандартный загрузчик expo-three/three роняет приложение нативно. Текстовый список городов остался на экране `cities/list`.
- Воспроизведение аудио — `expo-audio`. Состояние плеера живёт в `src/providers/player-provider.tsx`, панель плеера рендерится в корневом `_layout.tsx` под навигатором.
- Данные станций — статичный `src/data/stations.json` (около 200 городов, до 40 станций на город, ~2 МБ), сгенерированный скриптом `scripts/generate-stations.mjs` из открытой базы Radio Browser (https://api.radio-browser.info). Список городов с координатами и регионами — `scripts/cities.mjs`, закреплённые вручную станции (по UUID, с возможной заменой адреса потока) — `scripts/extra-stations.mjs`. Руками JSON не править: меняй города или фильтры и перегенерируй командой `npm run generate-stations` (20 минут; результаты по городам кэшируются в `scripts/.cache/`, флаг `--fresh` качает заново). Вся база Radio Browser (~62 тыс. станций) в бандл не влезает; для неё нужен онлайн-запрос к API.

## Правила

1. **Expo-библиотеки приоритетнее сторонних.** Если задачу решает модуль из экосистемы Expo (`expo-audio`, `expo-image`, `expo-haptics` и т. д.), используй его, а не аналог из npm.
2. **Только то, что работает в Expo Go.** Приложение тестируется в Expo Go, поэтому нельзя добавлять библиотеки с нативным кодом, которого нет в Expo Go. Перед добавлением зависимости проверь, что она входит в состав Expo Go для SDK 57.
3. **Устанавливай зависимости через `npx expo install <package>`**, а не `npm install` — так подбирается версия, совместимая с SDK.
4. **Не доверяй памяти про Expo API.** Перед использованием любого Expo/React Native API сверяйся с документацией версии SDK: `https://docs.expo.dev/versions/v57.0.0/`.
5. **Папки `ios/` и `android/` не создавать и не править вручную** — нативная конфигурация только через `app.json` и config-плагины.
6. **Перед завершением задачи** запускай `npx expo lint` и `npx tsc --noEmit`; оба должны проходить без ошибок.
7. **После добавления нового файла-экрана в `src/app/`** выполни `npx expo customize tsconfig.json`: это перегенерирует типизированные маршруты в `.expo/types/router.d.ts`, иначе `tsc` не узнает новый путь (`expo start` делает то же самое, но запускать dev-сервер ради этого не нужно).

## Фон и ресурсы (важно для iOS)

iOS завершает фоновое приложение, если оно около минуты держит высокую нагрузку. Поэтому:

- Никаких постоянных циклов `requestAnimationFrame`. В React Native это таймер на 1 мс: на экране он идёт по кадрам дисплея, а в фоне срабатывает до тысячи раз в секунду. Кадр запрашивать только по изменению (см. `requestFrame`/`markDirty` в `src/components/earth-gl.tsx`) и только пока приложение активно.
- Бесконечный HTTP-поток закрывать только через `AbortController.abort()`. `reader.cancel()` в `expo/fetch` на iOS соединение не рвёт, а лишь перестаёт отдавать данные в JS (`src/lib/icy.ts` делает abort в `finally`).
- Сэмплирование звука (`setAudioSamplingEnabled`) включать только пока оно нужно на экране и выключать в cleanup. Штатный `useAudioSampleListener` его не выключает, вместо него `src/hooks/use-dance-energy.ts`.
- Всё, что работает ради интерфейса (опрос названия трека, анализ звука), останавливать в фоне через `useAppActive()` из `src/hooks/use-app-active.ts`.

## Сборка и TestFlight

Публикация идёт через EAS Build и EAS Submit с Windows, пошагово в `RELEASE.md`. Идентификатор `com.zokoz.radioapp` в `app.json` после первой сборки не менять. Перед сборкой `npx expo-doctor` должен проходить полностью; дубликат `react` из `expo-three` подавлен через `overrides` в `package.json`.

## Команды

```bash
npx expo start          # dev-сервер, затем открыть в Expo Go
npx expo lint           # линтер
npx tsc --noEmit        # проверка типов
npx expo-doctor         # диагностика зависимостей
npm run generate-stations  # перегенерировать src/data/stations.json
```
