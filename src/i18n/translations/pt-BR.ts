import type { Dictionary } from "./en";
import { pt } from "./pt";

/** Бразильский португальский: общий словарь с отличиями в лексике и грамматике. */
export const ptBR: Dictionary = {
  ...pt,
  "tab.search": "Buscar",
  "globe.spin": "Gire o globo",
  "globe.hint": "Leve uma cidade para o centro ou toque em um ponto",
  "globe.loading": "Carregando a Terra…",
  "globe.noWebGL": "Este dispositivo não é compatível com WebGL 2, então o globo 3D não está disponível.",
  "city.nowPlaying": "tocando agora",
  "region.middleEast": "Oriente Médio",
  "region.oceania": "Austrália e Oceania",
  "player.loading": "Carregando…",
  "player.findingTrack": "Descobrindo o que está tocando…",
  "player.saveTrack": "Curtir esta faixa",
  "player.unsaveTrack": "Remover das faixas curtidas",
  "search.placeholder": "Nome, cidade, tag, idioma…",
  "search.tags": "Tags",
  "search.reset": "Redefinir",
  "stations.empty": "Você ainda não tem estações favoritas. Toque na estrela ao lado de uma estação para adicioná-la aqui.",
  "tracks.title": "Faixas curtidas",
  "tracks.empty": "Ainda não há nada aqui. Toque no coração do player quando curtir uma faixa.",
  "tracks.remove": "Remover das faixas curtidas",
  "profile.namePlaceholder": "Qual é o seu nome?",
  "profile.start.globeHint": "Gire o globo e escolha uma cidade no mapa",
  "profile.start.listHint": "Cidades agrupadas por região em uma lista de texto",
  "profile.start.cityHint": "Abrir direto as estações da cidade escolhida",
  "profile.start.stationsHint": "Abrir direto as suas estações favoritas",
  "profile.whichCity": "Qual cidade abrir",
  "profile.cityPlaceholder": "Comece a digitar o nome de uma cidade",
  "profile.dataSource": "Dados das estações: Radio Browser, atualizados em {date}",
};
