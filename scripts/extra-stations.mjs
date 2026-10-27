// Станции, которые добавляются в город вручную по UUID из Radio Browser,
// независимо от популярности и фильтров.
// UUID можно найти так: https://de1.api.radio-browser.info/json/stations/search?name=<название>
// streamUrl — необязательная замена адреса потока (например, https вместо http из базы).

export const EXTRA_STATIONS = [
  {
    cityId: "amsterdam",
    uuid: "c84d20ef-1b8b-4f8e-a809-e4297f570eb9", // Radio Boven IJ — локальное радио Амстердам-Норд
    streamUrl: "https://server-67.stream-server.nl:8774/rbij.mp3",
    allowHttp: false,
  },
];
