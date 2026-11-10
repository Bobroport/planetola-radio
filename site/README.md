# Сайт приложения

Статичные страницы для App Store Connect: политика конфиденциальности и поддержка,
на английском и русском. Без сборки и зависимостей: любой файл открывается прямо в браузере.

- `index.html` — ссылки на обе страницы.
- `privacy.html`, `privacy.ru.html` — политика конфиденциальности.
- `support.html`, `support.ru.html` — поддержка и частые вопросы.
- `config.js` — **единственное место с адресом поддержки**: замените `SUPPORT_EMAIL` на реальный
  адрес, он подставится на всех страницах. Пока плейсхолдер не заменён, вместо ссылки показывается
  текст «адрес будет опубликован здесь».
- `icon.png` — копия иконки приложения.

## Публикация через GitHub Pages

1. Запушить репозиторий на GitHub (ветка `main`).
2. В настройках репозитория: Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` при каждом пуше в `main` выкладывает папку `site/`.
4. Адреса страниц: `https://bobroport.github.io/planetola-radio/privacy.html` и
   `https://bobroport.github.io/planetola-radio/support.html`. Их нужно вписать в App Store Connect
   (App Information → Privacy Policy URL, Support URL) и в `RELEASE.md`.

Если менять дату политики, она указана в заголовке `privacy.html` и `privacy.ru.html`.
