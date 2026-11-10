# Исходники иконки

Иконка «Земной шар с нотками» рисуется кодом: очертания материков берутся из Natural Earth
(пакет `world-atlas`), проекция ортографическая (`d3-geo`), ноты и свечение — SVG от руки.

- `icon.svg` — квадрат 1024×1024 с фоном, из него `assets/images/icon.png` (iOS и общий).
- `android-foreground.svg` — шар с нотами на прозрачном фоне, уменьшен под безопасную зону
  adaptive-иконки; из него `android-icon-foreground.png` и `splash-icon.png`.
- `android-monochrome.svg` — белые силуэты для монохромной иконки Android.
- Фон adaptive-иконки — сплошной `#0b1020` (`android-icon-background.png`).

## Перегенерировать

Зависимости для рендера в проект не входят, ставятся во временную папку:

```bash
mkdir icon-tools && cd icon-tools && npm init -y && npm install d3-geo topojson-client world-atlas sharp
cp ../assets/icon-src/make-icon.mjs . && node make-icon.mjs   # пишет icon/foreground/mono .svg и .html
```

PNG получаются скриншотом HTML в headless-браузере (Edge или Chrome), 1024×1024,
с флагом `--default-background-color=00000000` для прозрачных вариантов, затем копируются в
`assets/images/`. Favicon — уменьшенная до 64 px копия `icon.png`.
