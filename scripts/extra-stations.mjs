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
  {
    cityId: "nuuk",
    uuid: "500614c3-98ff-46e5-8a96-8b2398a9ee8a", // KNR — общественное радио Гренландии
    allowHttp: false,
  },
  {
    cityId: "bethel",
    uuid: "2c4613de-c7fa-4405-95bd-d3363391274d", // KYUK-AM 640 — общественное радио Бетела, Аляска
    allowHttp: false,
  },
  {
    cityId: "bethel",
    uuid: "4bbc4f2d-80fe-4e75-a074-b42aed10704b", // KYUK-FM
    allowHttp: false,
  },
  {
    cityId: "yellowknife",
    uuid: "90b55c79-b8c3-40b1-a530-a664c2ae92f2", // Cabin Radio — Йеллоунайф
    allowHttp: false,
  },
  {
    cityId: "yellowknife",
    uuid: "ea35f263-d57c-4249-b146-5ee6d0b5f977", // CJCD-FM 100.1 True North FM
    allowHttp: false,
  },
  {
    cityId: "yellowknife",
    uuid: "b9b23213-bba1-4ea3-86f6-e1fd57822a0a", // CBC Radio One — Yellowknife
    allowHttp: false,
  },
  // Суданские станции без координат и без «Khartoum» в названии: поиском по городу их не найти,
  // без них Хартум выпадает с глобуса.
  {
    cityId: "khartoum",
    uuid: "8d0e2e24-22c4-4544-8eb9-5f9fba1c441d", // Dabanga Radio
    allowHttp: false,
  },
  {
    cityId: "khartoum",
    uuid: "9793ba8c-91b0-4109-b053-d88a29bc2672", // HAWA al Sudan
    allowHttp: false,
  },
  {
    cityId: "bamako",
    uuid: "880cb524-8432-48d0-adf3-be96949c0171", // Radio Kledu — Бамако
    allowHttp: false,
  },
  {
    cityId: "illizi",
    uuid: "ac734bf8-3abd-4edd-be9f-507a58274b68", // Illizi — региональная станция гостелерадио Алжира
    allowHttp: false,
  },
  {
    cityId: "inuvik",
    uuid: "e0eecbf7-1d4a-4490-b9dc-8a7ef419a284", // CBC Radio One — Inuvik
    allowHttp: false,
  },
  {
    cityId: "iqaluit",
    uuid: "e03db9c8-dc8f-4334-97c1-56e94a4abaae", // CBC North — Iqaluit
    allowHttp: false,
  },
  {
    cityId: "whitehorse",
    uuid: "3deeacd6-f25f-4c65-aaf2-408f28cb46bb", // CBC Radio One — Whitehorse
    allowHttp: false,
  },
  {
    cityId: "whitehorse",
    uuid: "6e35aadc-01e9-45d1-a174-030a54f50e1f", // CIAY-FM Life 100.7
    allowHttp: false,
  },
  // Станции Средней Азии без координат и без города в базе: поиском по городу их не найти.
  {
    cityId: "tashkent",
    uuid: "0f685f2b-32d5-4858-a05a-e3fa664dc992", // Islom.uz
    allowHttp: false,
  },
  {
    cityId: "tashkent",
    uuid: "5f23a96a-afda-40b4-881f-fef95d0328e5", // Mars FM Uzbekistan
    allowHttp: false,
  },
  {
    cityId: "tashkent",
    uuid: "8d542c3e-a374-41a0-8daf-b7eb342fba53", // Radio O'zbegim Taronasi
    allowHttp: false,
  },
  {
    cityId: "tashkent",
    uuid: "5cbb8e6a-aafb-4ded-af9d-eac0bda06a6e", // Truck FM
    allowHttp: false,
  },
  {
    cityId: "bishkek",
    uuid: "33ecd479-837a-4e5b-bf3a-1d9d00f53e0d", // Coldstar Radio
    allowHttp: false,
  },
  {
    cityId: "bishkek",
    uuid: "9d81788e-5a14-40c9-95e0-b358a3552c5e", // Europa Plus Kyrgyzstan
    allowHttp: false,
  },
  {
    cityId: "bishkek",
    uuid: "43f5812f-3431-4e82-b58f-ddd17d83a9b8", // Биринчи Radio
    allowHttp: false,
  },
  {
    cityId: "bishkek",
    uuid: "01d60203-d360-4695-9496-97ee1300aead", // Кыргызстан Обондору
    allowHttp: false,
  },
  {
    cityId: "bishkek",
    uuid: "7576f174-f13e-434d-8a91-9537cd8df0b7", // Радио Тумар FM
    allowHttp: false,
  },
  {
    cityId: "bishkek",
    uuid: "f73925ef-f89f-4959-a924-0b0f37e74e12", // Сүйүнчү FM
    allowHttp: false,
  },
  // Сараевские станции без координат; общественные BH Radio 1 и Federalni Radio вещают
  // только по HLS и фильтром не проходят.
  {
    cityId: "sarajevo",
    uuid: "862898ae-b5fd-4bfb-b123-455a9fb221fe", // Radio Sarajevo 90.2
    allowHttp: false,
  },
  {
    cityId: "sarajevo",
    uuid: "42dad1c8-cbd2-4fea-85da-451f8da17bfd", // Radio M plus
    allowHttp: false,
  },
  {
    cityId: "sarajevo",
    uuid: "94074efd-84b4-44b5-bc77-d09c1e4d73b1", // Radio Miljacka
    allowHttp: false,
  },
];
