export type Station = {
  id: string;
  name: string;
  city: string;
  streamUrl: string;
};

export const STATIONS: Station[] = [
  {
    id: "radio-paradise",
    name: "Radio Paradise",
    city: "Paradise, CA",
    streamUrl: "https://stream.radioparadise.com/mp3-128",
  },
  {
    id: "somafm-groove-salad",
    name: "SomaFM Groove Salad",
    city: "San Francisco",
    streamUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
  },
  {
    id: "fip",
    name: "FIP",
    city: "Paris",
    streamUrl: "https://icecast.radiofrance.fr/fip-midfi.mp3",
  },
  {
    id: "radio-swiss-jazz",
    name: "Radio Swiss Jazz",
    city: "Bern",
    streamUrl: "https://stream.srg-ssr.ch/m/rsj/mp3_128",
  },
  {
    id: "kexp",
    name: "KEXP",
    city: "Seattle",
    streamUrl: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
  },
];
