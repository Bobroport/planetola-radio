const API_SERVER = "https://de1.api.radio-browser.info";
const USER_AGENT = "radio-app/1.0";

/**
 * Radio Browser просит сообщать о каждом запуске станции —
 * так обновляется её популярность в базе. Ошибки игнорируем.
 */
export function registerClick(stationId: string): void {
  fetch(`${API_SERVER}/json/url/${stationId}`, {
    headers: { "User-Agent": USER_AGENT },
  }).catch(() => {
    // Сеть недоступна или сервер не ответил — для воспроизведения это не важно.
  });
}
