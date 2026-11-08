# Сборка и публикация в TestFlight

Приложение собирается в облаке Expo (EAS Build) и отправляется в App Store Connect
командой EAS Submit. Mac и Xcode не нужны, всё делается с Windows.

Идентификатор приложения: `com.zokoz.radioapp` (поле `ios.bundleIdentifier` в `app.json`).
Менять его после первой сборки нельзя без новой записи в App Store Connect.

## Один раз

1. Войти в Expo (тот же аккаунт, что в Expo Go):

   ```bash
   npx eas-cli@latest login
   ```

2. Привязать проект к аккаунту Expo (создаст `extra.eas.projectId` в `app.json`):

   ```bash
   npx eas-cli@latest init
   ```

3. Проверить, что в учётной записи Apple Developer принято соглашение
   (developer.apple.com → Agreements). Без этого сборка не получит сертификаты.

## Каждый выпуск

1. Собрать iOS-сборку для магазина:

   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```

   При первом запуске EAS попросит войти в Apple ID и сам создаст сертификат
   распространения, provisioning profile и идентификатор приложения в Apple Developer.
   Соглашайтесь на предложения «Generate new…». Номер сборки (`buildNumber`)
   увеличивается автоматически (`autoIncrement` в `eas.json`). Сборка занимает 10–20 минут,
   ссылку на прогресс команда печатает сразу.

2. Отправить последнюю сборку в App Store Connect:

   ```bash
   npx eas-cli@latest submit --platform ios --latest
   ```

   Если записи приложения в App Store Connect ещё нет, EAS предложит создать её
   (имя берётся из `app.json`: «Бобёр Радио»; если имя занято, задайте другое).

   Можно сделать оба шага одной командой:

   ```bash
   npx eas-cli@latest build --platform ios --profile production --auto-submit
   ```

3. Через 10–15 минут после загрузки сборка появится в App Store Connect → TestFlight.
   Добавьте себя во внутренние тестировщики (Internal Testing → группа → ваш Apple ID),
   установите приложение TestFlight на iPhone и примите приглашение.

## Что уже настроено

- `ITSAppUsesNonExemptEncryption: false` — вопрос об экспортном шифровании при загрузке
  задаваться не будет (приложение использует только стандартный HTTPS).
- Фоновое воспроизведение (`UIBackgroundModes: audio`) включено плагином `expo-audio`;
  запрос доступа к микрофону на iOS отключён, он приложению не нужен.
- Версия приложения — `version` в `app.json` (сейчас `0.1.0`), её меняйте вручную
  перед заметным выпуском.

## Что стоит сделать перед публикацией в App Store (не для TestFlight)

- Своя иконка и заставка вместо шаблонных (`assets/images/icon.png`, `assets/expo.icon`,
  `splash-icon.png`).
- Политика конфиденциальности (ссылка обязательна в App Store Connect).
- Проверить права на потоки: App Review может попросить подтверждение, что станции
  разрешают ретрансляцию.
