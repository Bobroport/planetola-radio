"""
Убирает со скриншота iPhone надпись «◀ TestFlight» под часами и возвращает часы на
обычное место (с надписью iOS поднимает их на 18 px при ширине 920).

    python clean_status_bar.py <входная папка> <выходная папка> [ширина высота]

Работает на любом разрешении: координаты заданы для ширины 920 и масштабируются.
Если указаны ширина и высота, результат дополнительно приводится к этому размеру.
Скриншоты без надписи копируются как есть.
"""
import os
import sys

from PIL import Image

BASE_WIDTH = 920
CLOCK = (100, 38, 240, 77)  # часы, когда под ними есть надпись
LABEL = (20, 77, 190, 108)  # сама надпись
SHIFT = 18  # на столько часы подняты из-за надписи
CLEAN_X = 420  # столбец, где в строке состояния всегда пусто: по нему берём фон строки


def has_label(im, s):
    px = im.load()
    # Только левее часов: на обычном месте часы сами заходят в строки надписи.
    x0, y0, x1, y1 = (round(v * s) for v in (LABEL[0], LABEL[1], CLOCK[0] - 5, LABEL[3]))
    cx = round(CLEAN_X * s)
    hits = 0
    for y in range(y0, y1):
        bg = px[cx, y]
        for x in range(x0, x1):
            if sum(abs(a - b) for a, b in zip(px[x, y], bg)) > 90:
                hits += 1
    return hits > 40 * s * s


def clean(im):
    w, _ = im.size
    s = w / BASE_WIDTH
    if not has_label(im, s):
        return im, False
    px = im.load()
    cx = round(CLEAN_X * s)
    x0, y0, x1, y1 = (round(v * s) for v in CLOCK)
    shift = round(SHIFT * s)

    # Часы как маска прозрачности: пиксель = a*цвет_цифр + (1-a)*фон_строки.
    sample = px[cx, (y0 + y1) // 2]
    dark = sum(sample) < 384
    ink = (255, 255, 255) if dark else (0, 0, 0)
    alpha = {}
    for y in range(y0, y1):
        bg = px[cx, y]
        span = sum(abs(i - b) for i, b in zip(ink, bg)) or 1
        for x in range(x0, x1):
            a = sum(abs(p - b) for p, b in zip(px[x, y], bg)) / span
            if a > 0.03:
                alpha[(x, y)] = min(1.0, a)

    # Затираем часы и надпись фоном той же строки.
    fx0 = round(min(CLOCK[0], LABEL[0]) * s)
    fx1 = round(max(CLOCK[2], LABEL[2]) * s)
    fy0 = round(min(CLOCK[1], LABEL[1]) * s)
    fy1 = round(max(CLOCK[3], LABEL[3]) * s)
    for y in range(fy0, fy1):
        bg = px[cx, y]
        for x in range(fx0, fx1):
            px[x, y] = bg

    # Рисуем часы ниже, поверх фона новой строки.
    for (x, y), a in alpha.items():
        ny = y + shift
        bg = px[cx, ny]
        px[x, ny] = tuple(round(a * i + (1 - a) * b) for i, b in zip(ink, bg))
    return im, True


def main():
    src, dst = sys.argv[1], sys.argv[2]
    size = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else None
    os.makedirs(dst, exist_ok=True)
    for name in sorted(os.listdir(src)):
        if not name.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            continue
        im = Image.open(os.path.join(src, name)).convert("RGB")
        im, changed = clean(im)
        if size and im.size != size:
            im = im.resize(size, Image.LANCZOS)
        out = os.path.join(dst, os.path.splitext(name)[0] + ".png")
        im.save(out, optimize=True)
        print(f"{name}: {'label removed' if changed else 'no label, copied'} -> {im.size}")


main()
