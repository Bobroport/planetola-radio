/** Английский словарь — эталон: его ключи определяют тип всех остальных словарей. */
export const en = {
  "tab.cities": "Cities",
  "tab.search": "Search",
  "tab.stations": "Stations",
  "tab.tracks": "Tracks",
  "tab.profile": "Profile",

  "globe.title": "Globe",
  "globe.spin": "Spin the globe",
  "globe.hint": "Bring a city to the center or tap a dot",
  "globe.loading": "Loading Earth…",
  "globe.noWebGL": "This device doesn't support WebGL 2, so the 3D globe is unavailable.",
  "globe.rendererError": "Couldn't create the 3D renderer: {message}",

  "count.cities": "Cities: {count}",
  "count.stations": "Stations: {count}",
  "count.tracks": "Tracks: {count}",

  "city.nowPlaying": "now playing",
  "city.notFound": "City not found",
  "cities.title": "Cities",

  "region.cis": "Russia and neighbors",
  "region.europe": "Europe",
  "region.middleEast": "Middle East",
  "region.asia": "Asia",
  "region.africa": "Africa",
  "region.northAmerica": "North America",
  "region.southAmerica": "South America",
  "region.oceania": "Australia and Oceania",

  "player.onAir": "On air",
  "player.loading": "Loading…",
  "player.error": "Error: {message}",
  "player.findingTrack": "Finding out what's playing…",
  "player.noTrackInfo": "This station doesn't send track titles",
  "player.saveTrack": "Like this track",
  "player.unsaveTrack": "Remove from liked tracks",
  "player.stop": "Stop",

  "station.add": "Add to favorite stations",
  "station.remove": "Remove from favorite stations",

  "search.placeholder": "Name, city, tag, language…",
  "search.codec": "Codec",
  "search.bitrate": "Bitrate",
  "search.language": "Language",
  "search.tags": "Tags",
  "search.found": "Found: {count}",
  "search.all": "All stations: {count}",
  "search.reset": "Reset",
  "search.empty": "Nothing found",

  "stations.title": "Favorite stations",
  "stations.empty": "No favorite stations yet. Tap the star next to a station to add it here.",

  "tracks.title": "Liked tracks",
  "tracks.empty": "Nothing here yet. Tap the heart in the player when you like a track.",
  "tracks.remove": "Remove from liked tracks",

  "profile.hello": "Hello!",
  "profile.helloName": "Hello, {name}!",
  "profile.name": "Name",
  "profile.namePlaceholder": "What's your name?",
  "profile.language": "Language",
  "profile.startPage": "Start page",
  "profile.start.globe": "Globe",
  "profile.start.globeHint": "Spin the globe and pick a city on the map",
  "profile.start.list": "City list",
  "profile.start.listHint": "Cities grouped by region as a text list",
  "profile.start.city": "A specific city",
  "profile.start.cityHint": "Open the stations of a chosen city right away",
  "profile.start.stations": "Favorite stations",
  "profile.start.stationsHint": "Open your favorite stations right away",
  "profile.whichCity": "Which city to open",
  "profile.cityPlaceholder": "Start typing a city name",
  "profile.dataSource": "Station data: Radio Browser, updated {date}",
};

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;
