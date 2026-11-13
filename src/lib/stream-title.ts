export type NowPlaying = {
  /** Исходная строка трека после очистки. */
  raw: string;
  artist: string | null;
  title: string;
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Теги, в которых разные платформы хранят исполнителя и название, по убыванию приоритета. */
const XML_ARTIST_TAGS = [
  "DB_LEAD_ARTIST_NAME",
  "DB_DALET_ARTIST_NAME",
  "artist",
  "Artist",
  "ARTIST",
];
const XML_TITLE_TAGS = [
  "DB_DALET_TITLE_NAME",
  "DB_SONG_NAME",
  "title",
  "Title",
  "TITLE",
  "song",
  "Song",
];

function xmlTag(xml: string, names: string[]): string | null {
  for (const name of names) {
    const match = new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)</${name}>`).exec(xml);
    const value = match?.[1].trim();
    if (value) return decodeEntities(value);
  }
  return null;
}

/** Значение атрибута key="value" в строке формата iHeart. */
function attribute(text: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(text);
  const value = match?.[1].trim();
  return value ? decodeEntities(value) : null;
}

/**
 * Станции iHeartMedia (KIIS, KISS-FM и др.) шлют строку вида
 * `Bruno Mars - text="Risk It All" song_spot="M" MediaBaseId="3206087" …`:
 * исполнитель до « - », название в атрибуте text, остальные атрибуты служебные.
 * Иногда исполнитель лежит в атрибуте artist, а в рекламных вставках
 * (song_spot не "M") text содержит название ролика.
 */
const IHEART_TITLE = /(?:^|\s)text="/;

function parseIHeartTitle(text: string): NowPlaying | null {
  const attributesStart = text.search(/(?:^|\s)[A-Za-z_]+="/);
  const prefix = text.slice(0, attributesStart).replace(/\s*-\s*$/, "").trim();
  const title = attribute(text, "text");
  const artist = attribute(text, "artist") ?? (prefix || null);
  if (!title || isPlaceholder(title)) return null;
  const cleanTitle = cleanText(title);
  const cleanArtist = artist && !isPlaceholder(artist) ? cleanText(artist) : null;
  return {
    raw: cleanArtist ? `${cleanArtist} - ${cleanTitle}` : cleanTitle,
    artist: cleanArtist,
    title: cleanTitle,
  };
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isPlaceholder(text: string): boolean {
  return (
    text.replace(/[-–—\s]/g, "").length === 0 || /^unknown$/i.test(text)
  );
}

/**
 * Разбирает значение StreamTitle. Поддерживает "Artist - Title",
 * "Now Playing: Artist - Title", строки iHeart с атрибутами (`Artist - text="Title" …`)
 * и XML-документы (например, Bauer Media:
 * <RadioInfo><Table><DB_LEAD_ARTIST_NAME>…</DB_LEAD_ARTIST_NAME>…).
 * Возвращает null, если названия нет.
 */
export function parseStreamTitle(streamTitle: string): NowPlaying | null {
  const trimmed = streamTitle.trim();

  if (trimmed.startsWith("<")) {
    const artist = xmlTag(trimmed, XML_ARTIST_TAGS);
    const title = xmlTag(trimmed, XML_TITLE_TAGS);
    if (!title && !artist) return null;
    const cleanTitle = cleanText(title ?? artist ?? "");
    const cleanArtist = title && artist ? cleanText(artist) : null;
    if (isPlaceholder(cleanTitle)) return null;
    return {
      raw: cleanArtist ? `${cleanArtist} - ${cleanTitle}` : cleanTitle,
      artist: cleanArtist,
      title: cleanTitle,
    };
  }

  if (IHEART_TITLE.test(trimmed)) return parseIHeartTitle(trimmed);

  const raw = cleanText(
    decodeEntities(trimmed).replace(/^now playing:\s*/i, ""),
  );
  if (isPlaceholder(raw)) {
    return null;
  }
  const separator = raw.indexOf(" - ");
  if (separator <= 0) {
    return { raw, artist: null, title: raw };
  }
  const artist = raw.slice(0, separator).trim();
  const title = raw.slice(separator + 3).trim();
  if (!title) {
    return { raw, artist: null, title: artist };
  }
  return { raw, artist, title };
}

/** Достаёт значение StreamTitle='…' из блока ICY-метаданных; апострофы внутри допустимы. */
export function extractStreamTitle(metadata: string): string | null {
  const match = /StreamTitle='((?:[^'\\]|\\.|'(?!;))*)'/.exec(metadata);
  return match ? match[1] : null;
}
