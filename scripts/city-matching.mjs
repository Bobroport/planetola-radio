// Раскладка станций из полных страновых списков (src/data/country-stations/) по городам.
//
// У Radio Browser нет поля «город»: примерно у четверти станций есть координаты, у половины —
// произвольное поле state (регион, город, иногда адрес). Поэтому станция попадает в город,
// если она в GEO_RADIUS_KM от него, либо state/название содержат поисковый термин города
// из scripts/cities.mjs. Станции вне известных городов группируются по ближайшему городу
// справочника GeoNames и становятся новыми городами, когда их набирается достаточно и они
// от разных вещателей: иначе сеть из сотни потоков с одной точкой превращалась бы в город.

/** Радиус привязки к городу из cities.mjs — как GEO_RADIUS_M при выгрузке. */
const GEO_RADIUS_KM = 30;
/** Радиус привязки к городу GeoNames: из попавших берётся самый крупный, пригороды идут к центру. */
const NEW_CITY_RADIUS_KM = 25;
const MIN_STATIONS_FOR_NEW_CITY = 5;
/** Сеть из десятков потоков с одной точкой (0nradio, SomaFM) городом не считается. */
const MIN_BROADCASTERS_FOR_NEW_CITY = 5;
/** Центры регионов и столицы предпочтительнее районов при близком населении (Pensacola). */
const ADMIN_CENTER_WEIGHT = 1.5;
/** Поисковые термины короче не берём для поиска по названию станции: слишком много ложных. */
const MIN_NAME_TERM_LENGTH = 4;

/** Значения state в США чаще всего — штат; совпадение с одноимённым городом (Washington) ложное. */
const US_STATES = new Set(
  [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
  ].map((s) => s.toLowerCase()),
);

export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLong = toRad(b.long - a.long);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLong / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function broadcasterKey(station) {
  try {
    const host = new URL(station.homepage).hostname.replace(/^www\./, "");
    if (host) return host;
  } catch {
    // нет домашней страницы — вещатель считается отдельным
  }
  return station.id;
}

/** Ближайший город из cities.mjs в радиусе GEO_RADIUS_KM от точки. */
function nearestKnownCity(point, cities) {
  let best = null;
  let bestDistance = GEO_RADIUS_KM;
  for (const city of cities) {
    const d = distanceKm(city, point);
    if (d <= bestDistance) {
      best = city;
      bestDistance = d;
    }
  }
  return best;
}

function cityWeight(city) {
  const admin = city.featureCode === "PPLC" || city.featureCode.startsWith("PPLA");
  return city.population * (admin ? ADMIN_CENTER_WEIGHT : 1);
}

/** Самый крупный город GeoNames в радиусе NEW_CITY_RADIUS_KM от станции. */
function largestGeoNamesCityNear(station, geoCities) {
  let best = null;
  for (const city of geoCities) {
    if (Math.abs(city.lat - station.geo.lat) > 0.5) continue;
    if (distanceKm(city, station.geo) > NEW_CITY_RADIUS_KM) continue;
    if (!best || cityWeight(city) > cityWeight(best)) best = city;
  }
  return best;
}

function knownCityByText(station, cities) {
  const state = station.state.toLowerCase();
  const name = station.name.toLowerCase();
  for (const city of cities) {
    for (const term of city.search) {
      const t = term.toLowerCase();
      if (state && state.includes(t)) return city;
      if (t.length >= MIN_NAME_TERM_LENGTH && name.includes(t)) return city;
    }
  }
  return null;
}

/** Город GeoNames, чьё название (или вариант написания) целиком совпадает со state станции. */
function geoNamesCityByState(station, byName) {
  const state = station.state.trim().toLowerCase();
  if (!state) return null;
  if (station.countryCode === "US" && US_STATES.has(state)) return null;
  return byName.get(state) ?? null;
}

function indexGeoNamesByName(geoCities) {
  const byName = new Map();
  const put = (key, city) => {
    const k = key.trim().toLowerCase();
    if (k.length < MIN_NAME_TERM_LENGTH) return;
    const prev = byName.get(k);
    if (!prev || cityWeight(city) > cityWeight(prev)) byName.set(k, city);
  };
  for (const city of geoCities) {
    put(city.name, city);
    put(city.asciiName, city);
    for (const alt of city.alternateNames) put(alt, city);
  }
  return byName;
}

/**
 * Раскладывает станции одной страны по городам.
 * @param stations станции страны в формате приложения
 * @param cities города этой страны из cities.mjs (с lat, long, search)
 * @param geoCities города GeoNames этой страны
 * @returns { known: Map<cityId, Station[]>, candidates: Map<geonameId, { city, stations }> }
 */
export function assignStationsToCities(stations, cities, geoCities) {
  const byName = indexGeoNamesByName(geoCities);
  const known = new Map();
  const candidates = new Map();
  const toKnown = (city, station) => {
    if (!known.has(city.id)) known.set(city.id, []);
    known.get(city.id).push(station);
  };
  // Город GeoNames рядом с городом из cities.mjs (Пирей у Афин, «Bucuresti» у Бухареста)
  // отдельным городом не становится: его станции уходят в известный город.
  const toCandidate = (city, station) => {
    const known = nearestKnownCity(city, cities);
    if (known) {
      toKnown(known, station);
      return;
    }
    if (!candidates.has(city.id)) candidates.set(city.id, { city, stations: [] });
    candidates.get(city.id).stations.push(station);
  };

  for (const station of stations) {
    if (station.geo) {
      const city = nearestKnownCity(station.geo, cities);
      if (city) {
        toKnown(city, station);
        continue;
      }
      const geoCity = largestGeoNamesCityNear(station, geoCities);
      if (geoCity) {
        toCandidate(geoCity, station);
        continue;
      }
    }
    const byText = knownCityByText(station, cities);
    if (byText) {
      toKnown(byText, station);
      continue;
    }
    const byState = geoNamesCityByState(station, byName);
    if (byState) toCandidate(byState, station);
  }
  return { known, candidates };
}

/** Кандидат становится городом, когда станций и независимых вещателей достаточно. */
export function isViableNewCity({ stations }) {
  if (stations.length < MIN_STATIONS_FOR_NEW_CITY) return false;
  const broadcasters = new Set(stations.map(broadcasterKey));
  return broadcasters.size >= MIN_BROADCASTERS_FOR_NEW_CITY;
}

/** Идентификатор города из латинского названия: "Cluj-Napoca" -> "cluj-napoca". */
export function slugify(asciiName) {
  return asciiName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
