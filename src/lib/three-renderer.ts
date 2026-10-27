import type { ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer } from "expo-three";

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
export function createRenderer(options: RendererOptions): Renderer {
  const g = globalThis as unknown as GlobalWithWebGL;
  const saved = g.WebGLRenderingContext;
  g.WebGLRenderingContext = undefined;
  try {
    return new Renderer(options);
  } finally {
    g.WebGLRenderingContext = saved;
  }
}
