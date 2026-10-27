import { fetch } from "expo/fetch";

import {
  extractStreamTitle,
  parseStreamTitle,
  type NowPlaying,
} from "@/lib/stream-title";

export type { NowPlaying } from "@/lib/stream-title";
export { parseStreamTitle } from "@/lib/stream-title";

const USER_AGENT = "radio-app/1.0";
/** Не читаем больше этого объёма, даже если сервер прислал странный metaint. */
const MAX_BYTES = 256 * 1024;

/**
 * Открывает поток с заголовком Icy-MetaData: 1, читает первый блок
 * метаданных (через icy-metaint байт аудио) и закрывает соединение.
 * Возвращает null, если станция не шлёт метаданные или они пустые.
 */
export async function fetchNowPlaying(
  streamUrl: string,
  signal: AbortSignal,
): Promise<NowPlaying | null> {
  const response = await fetch(streamUrl, {
    headers: { "Icy-MetaData": "1", "User-Agent": USER_AGENT },
    signal,
  });

  const metaint = Number.parseInt(
    response.headers.get("icy-metaint") ?? "0",
    10,
  );
  if (!Number.isFinite(metaint) || metaint <= 0 || metaint > MAX_BYTES) {
    await response.body?.cancel();
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return null;
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (received < MAX_BYTES) {
      const { value, done } = await reader.read();
      if (done) {
        return null;
      }
      chunks.push(value);
      received += value.length;

      // Байт сразу после аудио-блока — длина метаданных в блоках по 16 байт.
      if (received > metaint) {
        const buffer = concat(chunks, received);
        const length = buffer[metaint] * 16;
        if (length === 0) {
          return null;
        }
        if (received >= metaint + 1 + length) {
          const bytes = buffer.subarray(metaint + 1, metaint + 1 + length);
          const text = new TextDecoder("utf-8")
            .decode(bytes)
            .replace(/\0+$/, "");
          const streamTitle = extractStreamTitle(text);
          return streamTitle ? parseStreamTitle(streamTitle) : null;
        }
      }
    }
    return null;
  } finally {
    reader.cancel().catch(() => {
      // Соединение уже закрыто — не важно.
    });
  }
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  if (chunks.length === 1) {
    return chunks[0];
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  chunks.length = 0;
  chunks.push(out);
  return out;
}
