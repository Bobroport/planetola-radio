import { Asset } from "expo-asset";
import type { ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";

type RendererOptions = ConstructorParameters<typeof Renderer>[0];

/** Глобальный объект без типов lib.dom: класс WebGLRenderingContext там объявлен обязательным. */
type GlobalWithWebGL = Record<"WebGLRenderingContext", unknown>;

/** Контекст expo-gl сообщает, поддерживает ли устройство WebGL 2 (OpenGL ES 3). */
export function supportsWebGL2(gl: ExpoWebGLRenderingContext): boolean {
  const flag = (gl as ExpoWebGLRenderingContext & { supportsWebGL2?: boolean })
    .supportsWebGL2;
  return flag !== false;
}

/**
 * Создаёт three.js-рендерер поверх контекста expo-gl.
 *
 * three r163+ бракует контекст, если он `instanceof WebGLRenderingContext`,
 * а expo-gl строит WebGL2-контекст как наследника этого же класса-заглушки.
 * На время конструктора прячем глобальный класс, чтобы проверка не сработала;
 * сам контекст при этом полноценный WebGL 2.
 */
/** Методы контекста, от которых three ждёт строку и сразу вызывает у неё `trim`/`indexOf`. */
const STRING_METHODS = ["getProgramInfoLog", "getShaderInfoLog", "getShaderSource"] as const;

type StringMethod = (typeof STRING_METHODS)[number];

/**
 * На некоторых устройствах expo-gl возвращает из этих методов `undefined` вместо пустой строки,
 * и three падает с «Cannot read property 'trim' of undefined» при первом рендере.
 * Подменяем методы на самом объекте контекста: expo-gl сам так делает для логирования.
 */
function ensureStringResults(gl: ExpoWebGLRenderingContext): void {
  const target = gl as unknown as Record<StringMethod, (...args: unknown[]) => unknown>;
  for (const name of STRING_METHODS) {
    const original = target[name];
    if (typeof original !== "function") continue;
    target[name] = (...args: unknown[]) => {
      const result = original.apply(gl, args);
      return typeof result === "string" ? result : "";
    };
  }
}

export function createRenderer(options: RendererOptions): Renderer {
  ensureStringResults(options.gl as ExpoWebGLRenderingContext);
  const g = globalThis as unknown as GlobalWithWebGL;
  const saved = g.WebGLRenderingContext;
  g.WebGLRenderingContext = undefined;
  try {
    return new Renderer(options);
  } finally {
    g.WebGLRenderingContext = saved;
  }
}

type TextureProperties = {
  __webglTexture?: WebGLTexture;
  __webglInit?: boolean;
};

/**
 * Загружает картинку из ассета в GPU силами expo-gl и отдаёт её three.js как готовую текстуру.
 *
 * Стандартный путь three (`texStorage2D` + `texSubImage2D` для DataTexture) в expo-gl
 * при неудачном декодировании файла падает нативно, без ошибки в JS. Шестиаргументный
 * `texImage2D` с объектом ассета — документированный способ expo-gl, он безопасен.
 */
export async function loadTextureFromAsset(
  gl: ExpoWebGLRenderingContext,
  renderer: THREE.WebGLRenderer,
  moduleId: number,
): Promise<THREE.Texture> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  if (!asset.localUri?.startsWith("file://")) {
    throw new Error(`Ассет не скачан в файл: ${asset.localUri ?? "нет localUri"}`);
  }

  const glTexture = gl.createTexture();
  if (!glTexture) {
    throw new Error("gl.createTexture() вернул null");
  }
  gl.bindTexture(gl.TEXTURE_2D, glTexture);
  // Без UNPACK_FLIP_Y: переворот строк в expo-gl падает на нулевом указателе, если декодирование
  // не удалось. Ориентацию исправляем ниже UV-матрицей three.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.SRGB8_ALPHA8,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    asset as unknown as TexImageSource,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
  // Мы трогали GL в обход three — сбрасываем его кэш состояния.
  renderer.resetState();

  const texture = new THREE.Texture();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  // Строки файла идут сверху вниз, а v=0 у WebGL внизу: переворачиваем по V, чтобы север был сверху.
  texture.repeat.set(1, -1);
  texture.offset.set(0, 1);
  // version остаётся 0, поэтому three не будет заливать текстуру сам, а просто привяжет нашу.
  const props = renderer.properties.get(texture) as TextureProperties;
  props.__webglTexture = glTexture;
  props.__webglInit = true;
  return texture;
}
