import { CITIES } from "@/data/stations";
import type { GlobePoint } from "@/lib/globe-flight";

/**
 * Столицы стран, у которых есть полный список станций (`src/data/country-stations/`):
 * станции из такого списка могут не иметь города на глобусе, и перелёт к ним ведёт
 * в столицу. Координаты центра города, градусы. При добавлении страны в
 * `npm run generate-countries` допиши сюда её столицу.
 */
const CAPITALS: Record<string, GlobePoint> = {
  AD: { lat: 42.5063, long: 1.5218 }, // Андорра-ла-Велья
  AL: { lat: 41.3275, long: 19.8187 }, // Тирана
  AT: { lat: 48.2082, long: 16.3738 }, // Вена
  BA: { lat: 43.8563, long: 18.4131 }, // Сараево
  BE: { lat: 50.8503, long: 4.3517 }, // Брюссель
  BG: { lat: 42.6977, long: 23.3219 }, // София
  BY: { lat: 53.9006, long: 27.559 }, // Минск
  CH: { lat: 46.948, long: 7.4474 }, // Берн
  CY: { lat: 35.1856, long: 33.3823 }, // Никосия
  CZ: { lat: 50.0755, long: 14.4378 }, // Прага
  DE: { lat: 52.52, long: 13.405 }, // Берлин
  DK: { lat: 55.6761, long: 12.5683 }, // Копенгаген
  EE: { lat: 59.437, long: 24.7536 }, // Таллин
  ES: { lat: 40.4168, long: -3.7038 }, // Мадрид
  FI: { lat: 60.1699, long: 24.9384 }, // Хельсинки
  FR: { lat: 48.8566, long: 2.3522 }, // Париж
  GB: { lat: 51.5074, long: -0.1278 }, // Лондон
  GR: { lat: 37.9838, long: 23.7275 }, // Афины
  HR: { lat: 45.815, long: 15.9819 }, // Загреб
  HU: { lat: 47.4979, long: 19.0402 }, // Будапешт
  IE: { lat: 53.3498, long: -6.2603 }, // Дублин
  IS: { lat: 64.1466, long: -21.9426 }, // Рейкьявик
  IT: { lat: 41.9028, long: 12.4964 }, // Рим
  LI: { lat: 47.141, long: 9.5209 }, // Вадуц
  LT: { lat: 54.6872, long: 25.2797 }, // Вильнюс
  LU: { lat: 49.6116, long: 6.1319 }, // Люксембург
  LV: { lat: 56.9496, long: 24.1052 }, // Рига
  MC: { lat: 43.7384, long: 7.4246 }, // Монако
  MD: { lat: 47.0105, long: 28.8638 }, // Кишинёв
  ME: { lat: 42.4304, long: 19.2594 }, // Подгорица
  MK: { lat: 41.9981, long: 21.4254 }, // Скопье
  MT: { lat: 35.8989, long: 14.5146 }, // Валлетта
  NL: { lat: 52.3676, long: 4.9041 }, // Амстердам
  NO: { lat: 59.9139, long: 10.7522 }, // Осло
  PL: { lat: 52.2297, long: 21.0122 }, // Варшава
  PT: { lat: 38.7223, long: -9.1393 }, // Лиссабон
  RO: { lat: 44.4268, long: 26.1025 }, // Бухарест
  RS: { lat: 44.7866, long: 20.4489 }, // Белград
  RU: { lat: 55.7558, long: 37.6173 }, // Москва
  KZ: { lat: 51.1694, long: 71.4491 }, // Астана
  IN: { lat: 28.6139, long: 77.209 }, // Нью-Дели
  CN: { lat: 39.9042, long: 116.4074 }, // Пекин
  NZ: { lat: -41.2865, long: 174.7762 }, // Веллингтон
  SE: { lat: 59.3293, long: 18.0686 }, // Стокгольм
  SI: { lat: 46.0569, long: 14.5058 }, // Любляна
  SK: { lat: 48.1486, long: 17.1077 }, // Братислава
  US: { lat: 38.9072, long: -77.0369 }, // Вашингтон
  VA: { lat: 41.9029, long: 12.4534 }, // Ватикан
  XK: { lat: 42.6629, long: 21.1655 }, // Приштина
};

/**
 * Точка на глобусе для станции без города: столица её страны, а если столицы в таблице
 * нет — город этой страны с наибольшим числом станций.
 */
export function getCountryPoint(countryCode: string): GlobePoint | undefined {
  const capital = CAPITALS[countryCode.toUpperCase()];
  if (capital) return capital;
  let largest: (typeof CITIES)[number] | undefined;
  for (const city of CITIES) {
    if (city.countryCode !== countryCode) continue;
    if (!largest || city.stations.length > largest.stations.length) largest = city;
  }
  return largest;
}
