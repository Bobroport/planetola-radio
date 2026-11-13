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
   (имя берётся из `app.json`: «Planetola Radio FM»; если имя занято, задайте другое).

   Можно сделать оба шага одной командой:

   ```bash
   npx eas-cli@latest build --platform ios --profile production --auto-submit
   ```

3. Через 10–15 минут после загрузки сборка появится в App Store Connect → TestFlight.
   Добавьте себя во внутренние тестировщики (Internal Testing → группа → ваш Apple ID),
   установите приложение TestFlight на iPhone и примите приглашение.

## Название

Приложение называется «Planetola Radio FM» (`name` и `ios.infoPlist.CFBundleDisplayName` в `app.json`).
Запись в App Store Connect создавалась под именем «Бобёр Радио»: название там меняется вручную
(App Store Connect → приложение → App Information → Name), сборка его не обновляет.

## Идентификаторы

- App Store Connect: https://appstoreconnect.apple.com/apps/6832317886/testflight/ios (ASC App ID `6832317886`)
- Проект EAS: https://expo.dev/accounts/zokoz/projects/radio-app
- Команда Apple Developer: `57232A7L38` (Ivan Bartashov, Individual)
- Первая сборка 0.1.0 (1) загружена 8 ноября 2026
- Версия 1.0 (сборка 9) отправлена на проверку 11 ноября 2026; в тот же день отклонена по Guideline 2.1
  (Information Needed: запись экрана и описание сервисов). Ответ — `store/review-notes.md`.
- Версия 1.0 одобрена и опубликована 13 ноября 2026 (Ready for Distribution).
- Версия 1.1 (города из GeoNames, чёрный список «charts», фоновое обновление названия трека)
  начата 13 ноября 2026: `version` в `app.json` поднята до `1.1`, страницу версии 1.1 в App Store
  Connect нужно создать плюсом рядом с «iOS App» до выбора сборки.

## Что уже настроено

- `ITSAppUsesNonExemptEncryption: false` — вопрос об экспортном шифровании при загрузке
  задаваться не будет (приложение использует только стандартный HTTPS).
- Фоновое воспроизведение (`UIBackgroundModes: audio`) включено плагином `expo-audio`;
  запрос доступа к микрофону на iOS отключён, он приложению не нужен.
- Патч `patches/expo-audio+57.0.5.patch` (кнопки «следующий/предыдущий» на экране блокировки,
  в CarPlay, на наушниках и руле) применяется при `npm install` в облаке EAS. В Expo Go он не
  действует, поэтому проверять эти кнопки нужно в TestFlight-сборке: включить станцию из города или
  избранного, заблокировать телефон и нажать «следующий» на экране блокировки или в наушниках.
- Версия приложения — `version` в `app.json` (сейчас `1.1`), её меняйте вручную
  перед заметным выпуском. В уже выпущенную версию новые сборки добавить нельзя.

## Что стоит сделать перед публикацией в App Store (не для TestFlight)

- Своя иконка и заставка вместо шаблонных (`assets/images/icon.png`, `assets/expo.icon`,
  `splash-icon.png`).
- Политика конфиденциальности (ссылка обязательна в App Store Connect).
- Проверить права на потоки: App Review может попросить подтверждение, что станции
  разрешают ретрансляцию.

## Публикация в App Store (все страны)

Чеклист для первого релиза. Всё, кроме сборки, делается в App Store Connect:
https://appstoreconnect.apple.com/apps/6832317886

### В проекте

1. Версия в `app.json` (`version`) должна совпадать с версией страницы в App Store Connect (сейчас `1.1`), иначе сборку нельзя выбрать. Собрать и отправить:
   `npx eas-cli@latest build --platform ios --profile production --auto-submit`.
2. Убедиться, что сборка прошла обработку и видна в TestFlight.

### Обязательные материалы

3. **Политика конфиденциальности** — публичный URL, без него форма не отправляется.
   Страницы готовы в папке `site/` (см. `site/README.md`): после пуша на GitHub и включения Pages
   (Settings → Pages → Source: GitHub Actions) адреса будут:
   - Privacy Policy URL: `https://bobroport.github.io/planetola-radio/privacy.html`
   - Support URL: `https://bobroport.github.io/planetola-radio/support.html`
   Адрес поддержки задан в `site/config.js`.
   Приложение не собирает личных данных: имя пользователя и избранное хранятся только на устройстве.
   Сетевые запросы идут к радиостанциям (поток и название трека) и к Radio Browser (счётчик запусков
   станции без идентификаторов). Это и надо описать.
4. **URL поддержки** — любая страница с контактом (можно та же, что и политика).
5. **Скриншоты.** Обязателен слот «iPhone with Dynamic Island (medium display)»: 1206×2622 или 1179×2556,
   комплект в `store/screenshots/iphone-medium/`. Слот «large display» (1320×2868) необязателен,
   комплект в `store/screenshots/iphone-large/`. Сюжеты: глобус, список станций, плеер с бобром, профиль.
   iPad не нужен: `supportsTablet` выключен.
   Необязательные баннеры раздела Header and Search Results на странице версии: `store/marketing/header-5244x2950.png` (Header)
   и `store/marketing/search-results-3840x2560.png` (Search Results),
   рисуется скриптом из графики иконки (шар с материками, точки городов, ноты).
6. **Описание, подзаголовок, ключевые слова, What's New** — тексты в `store/listing.en.md` и `store/listing.ru.md`. Локализовать страницу
   хотя бы на русский; остальные языки интерфейса в магазине описывать не обязательно.
7. **Категория**: Music (вторичная — Entertainment). **Авторские права**: имя разработчика и год.
   **Content Rights** (App Information): «Yes, this app has the necessary rights to its third-party content» —
   станции сами публикуют потоки в открытом каталоге Radio Browser. Без этого пункта и категории
   кнопка Add for Review не работает.

### Анкеты

8. **App Privacy**: «Data Not Collected» — никакие данные не собираются и не привязываются к пользователю.
9. **Возрастной рейтинг** (App Information → Age Rating, анкета из 7 шагов): везде None/No, кроме
   Profanity or Crude Humor и Mature or Suggestive Themes — Infrequent (эфир станций не модерируется).
   Итог для 1.0 — 9+. Override не нужен.
10. **Export Compliance**: уже отвечено в сборке (`ITSAppUsesNonExemptEncryption: false`).
11. **Digital Services Act** (Business → Agreements, плашка Complete Compliance Requirements): объявить
    себя не трейдером (бесплатное приложение без рекламы и покупок). Без этого приложение не показывают в ЕС.

### Доступность

12. **Pricing and Availability**: цена Free, в разделе Availability выбрать все страны и регионы
    (для новых приложений по умолчанию отмечены все; проверить, что ничего не снято).
    Для бесплатного приложения дополнительные налоговые и банковские формы не нужны.

### Отправка на проверку

13. На странице версии выбрать сборку из TestFlight, заполнить «What's New».
14. В **App Review Notes** заранее ответить на вопрос о правах на потоки (Guideline 5.2.3):
    приложение воспроизводит публичные интернет-потоки, которые сами станции публикуют в открытом
    каталоге Radio Browser; ничего не скачивается и не записывается; фоновый режим `audio`
    используется только для воспроизведения.
15. Выбрать способ выпуска: вручную после одобрения или автоматически. Проверка обычно занимает
    1–3 дня; при отказе ответ приходит в Resolution Center, туда же отвечают.
16. Первую подачу Apple обычно возвращает с запросом Guideline 2.1 (Information Needed): нужна запись
    экрана с физического iPhone (с запуска приложения, весь основной сценарий) и ответы на шесть вопросов
    о назначении, доступе, внешних сервисах, регионах и правах. Готовый текст — `store/review-notes.md`,
    видео прикладывается в Attachment раздела App Review Information, затем Resubmit.

### После выпуска

- Новые версии: поднять `version`, собрать с `--auto-submit`, в App Store Connect создать новую
  версию, выбрать сборку, заполнить «What's New», отправить на проверку.
- TestFlight-сборки продолжают работать параллельно с магазином. Внешнее тестирование доступно
  для версии, которая ещё не отправлена на проверку; как только она ушла в App Review, внешняя
  бета для неё закрывается.
