// Генерирует SVG иконки «Земной шар с нотками» в трёх вариантах и записывает HTML для рендера.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topo = require("world-atlas/land-110m.json");
const land = feature(topo, topo.objects.land);

const SIZE = 1024;
const outDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

/**
 * variant: "icon" — непрозрачный квадрат (iOS, общий);
 *          "foreground" — прозрачный фон, шар в безопасной зоне (Android adaptive);
 *          "mono" — белые силуэты на прозрачном (Android monochrome).
 */
function build(variant) {
  const transparent = variant !== "icon";
  const mono = variant === "mono";
  const cx = SIZE / 2;
  const cy = SIZE / 2 + (variant === "icon" ? 30 : 20);
  // Для adaptive-иконки содержимое должно помещаться в круг ~66% стороны.
  const r = variant === "icon" ? 330 : 200;

  const projection = geoOrthographic()
    .rotate([-18, -28])
    .scale(r)
    .translate([cx, cy])
    .clipAngle(90);
  const pathOf = geoPath(projection);
  const landPath = pathOf(land) ?? "";
  const gridPath = pathOf(geoGraticule10()) ?? "";

  // Нотки: восьмые с флажком, одна пара с перекладиной. Координаты относительно шара.
  const noteScale = r / 330;
  const notes = [
    { x: cx + r * 0.62, y: cy - r * 0.98, s: 1.0 * noteScale, rot: 12, pair: false },
    { x: cx + r * 1.05, y: cy - r * 0.42, s: 0.72 * noteScale, rot: -8, pair: true },
    { x: cx - r * 0.92, y: cy - r * 0.78, s: 0.6 * noteScale, rot: -14, pair: false },
  ];

  const noteColor = mono ? "#ffffff" : "#ffd166";
  const noteStroke = mono ? "none" : "#5a3d00";

  function note({ x, y, s, rot, pair }) {
    // Головка — наклонный эллипс, штиль вверх, флажок или перекладина.
    const head = (dx) =>
      `<ellipse cx="${dx}" cy="0" rx="42" ry="30" transform="rotate(-22 ${dx} 0)" fill="${noteColor}" stroke="${noteStroke}" stroke-width="${mono ? 0 : 6}"/>`;
    const stem = (dx) => `<rect x="${dx + 30}" y="-190" width="16" height="200" rx="6" fill="${noteColor}"/>`;
    const flag = `<path d="M46 -190 C 120 -170, 130 -110, 70 -70 C 110 -115, 95 -150, 46 -160 Z" fill="${noteColor}"/>`;
    const beam = `<path d="M30 -190 L 176 -215 L 176 -170 L 30 -145 Z" fill="${noteColor}"/>`;
    const body = pair ? `${head(0)}${stem(0)}${head(130)}${stem(130)}${beam}` : `${head(0)}${stem(0)}${flag}`;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${body}</g>`;
  }

  const defs = `
    <defs>
      <radialGradient id="bg" cx="50%" cy="38%" r="75%">
        <stop offset="0" stop-color="#1b2a5e"/>
        <stop offset="1" stop-color="#070b1c"/>
      </radialGradient>
      <radialGradient id="ocean" cx="36%" cy="30%" r="78%">
        <stop offset="0" stop-color="#4a9ae8"/>
        <stop offset="0.6" stop-color="#1f5fc4"/>
        <stop offset="1" stop-color="#0a2358"/>
      </radialGradient>
      <radialGradient id="land" cx="36%" cy="30%" r="78%">
        <stop offset="0" stop-color="#8fd36f"/>
        <stop offset="0.65" stop-color="#4f9a46"/>
        <stop offset="1" stop-color="#245a2a"/>
      </radialGradient>
      <radialGradient id="shade" cx="36%" cy="30%" r="72%">
        <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
      </radialGradient>
      <radialGradient id="halo" cx="50%" cy="50%" r="50%">
        <stop offset="0.78" stop-color="#6fb2ff" stop-opacity="0"/>
        <stop offset="0.9" stop-color="#6fb2ff" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#6fb2ff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="spec" cx="30%" cy="22%" r="30%">
        <stop offset="0" stop-color="#fff" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="globeClip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    </defs>`;

  let globe;
  if (mono) {
    globe = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-width="26"/>
      <path d="${landPath}" fill="#fff"/>`;
  } else {
    globe = `
      <circle cx="${cx}" cy="${cy}" r="${r * 1.25}" fill="url(#halo)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#ocean)"/>
      <g clip-path="url(#globeClip)">
        <path d="${gridPath}" stroke="#bfe0ff" stroke-width="2" stroke-opacity="0.22" fill="none"/>
        <path d="${landPath}" fill="url(#land)" stroke="#1d4a22" stroke-width="3" stroke-opacity="0.6"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#shade)"/>
        <ellipse cx="${cx - r * 0.36}" cy="${cy - r * 0.46}" rx="${r * 0.42}" ry="${r * 0.28}" fill="url(#spec)"/>
      </g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#9cc8ff" stroke-width="4" stroke-opacity="0.5"/>`;
  }

  const background = transparent ? "" : `<rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${defs}${background}${globe}${notes.map(note).join("")}</svg>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:${transparent ? "transparent" : "#000"};}</style></head><body>${svg}</body></html>`;
  writeFileSync(path.join(outDir, `${variant}.html`), html);
  writeFileSync(path.join(outDir, `${variant}.svg`), svg);
  console.log("written", variant);
}

for (const v of ["icon", "foreground", "mono"]) build(v);
