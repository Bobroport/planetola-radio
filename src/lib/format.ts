import type { Station } from "@/data/stations";

/** "RU" -> 🇷🇺 */
export function flagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** Основные параметры станции одной строкой: "128 kbps · MP3 · english". */
export function stationMeta(station: Station): string {
  const parts: string[] = [];
  if (station.bitrate > 0) parts.push(`${station.bitrate} kbps`);
  if (station.codec) parts.push(station.codec);
  if (station.languages.length > 0) {
    parts.push(station.languages.slice(0, 2).join(", "));
  }
  return parts.join(" · ");
}

/** Хост потока без протокола и пути: "stream.radioparadise.com". */
export function streamHost(streamUrl: string): string {
  return streamUrl.replace(/^https?:\/\//, "").split("/")[0];
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
