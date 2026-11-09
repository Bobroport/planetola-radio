import type { Dictionary } from "./en";
import { es } from "./es";

/** Латиноамериканский испанский: общий словарь с отличиями в лексике и обращении. */
export const es419: Dictionary = {
  ...es,
  "tab.stations": "Estaciones",
  "count.stations": "Estaciones: {count}",
  "region.middleEast": "Medio Oriente",
  "player.onAir": "Al aire",
  "player.noTrackInfo": "Esta estación no envía el título de las canciones",
  "station.add": "Agregar a estaciones favoritas",
  "station.remove": "Quitar de estaciones favoritas",
  "search.all": "Todas las estaciones: {count}",
  "stations.title": "Estaciones favoritas",
  "stations.empty": "Aún no tienes estaciones favoritas. Toca la estrella junto a una estación para agregarla aquí.",
  "profile.start.cityHint": "Abrir directamente las estaciones de la ciudad elegida",
  "profile.start.stations": "Estaciones favoritas",
  "profile.start.stationsHint": "Abrir directamente tus estaciones favoritas",
  "profile.start.city": "Una ciudad específica",
  "profile.dataSource": "Datos de estaciones: Radio Browser, actualizados el {date}",
};
