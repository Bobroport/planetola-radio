"""
Готовит скриншоты iPad для слота iPad 13" в App Store Connect.

    python scripts/ipad-screenshots.py <входная папка> <выходная папка> [ширина высота]

1. Убирает надпись «◀ TestFlight» в строке состояния. На iPad она стоит в одной строке слева
   от часов, а часы с датой сдвинуты вправо; скрипт стирает надпись и возвращает часы на место.
   Координаты заданы для ширины 1640 (iPad 11") и масштабируются по ширине снимка.
2. Приводит снимок к нужному размеру (по умолчанию 2064×2752, слот iPad 13"). Пропорции 11"
   и 13" различаются, поэтому снимок масштабируется по высоте, а недостающую ширину добирают
   поля, залитые цветом крайнего столбца каждой строки: у приложения по краям экрана всегда
   фон (заголовок, глобус, панель вкладок, отступы списков), так что швов не видно.
   Снимок шире целевого обрезается по центру.

Нужен Python с Pillow (`pip install Pillow`).
"""
import os
import sys

from PIL import Image

BASE_WIDTH = 1640
LABEL = (20, 8, 205, 60)  # «◀ TestFlight» (включая отступ до часов)
CLOCK = (212, 8, 450, 60)  # часы и дата, пока слева есть надпись
SHIFT = 186  # на столько часы сдвинуты вправо из-за надписи
CLEAN_Y = 30  # строка состояния; фон берём по центру ширины, там всегда пусто


def has_label(im, s):
    px = im.load()
    bg = px[im.width // 2, round(CLEAN_Y * s)]
    x0, y0, x1, y1 = (round(v * s) for v in LABEL)
    hits = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if sum(abs(a - b) for a, b in zip(px[x, y], bg)) > 90:
                hits += 1
    return hits > 200 * s * s


def clean(im):
    s = im.width / BASE_WIDTH
    if not has_label(im, s):
        return im, False
    x0, y0, x1, y1 = (round(v * s) for v in CLOCK)
    block = im.crop((x0, y0, x1, y1))
    px = im.load()
    fx0, fy0 = round(LABEL[0] * s), round(min(LABEL[1], CLOCK[1]) * s)
    fx1, fy1 = x1, round(max(LABEL[3], CLOCK[3]) * s)
    for y in range(fy0, fy1):
        bg = px[im.width // 2, y]
        for x in range(fx0, fx1):
            px[x, y] = bg
    im.paste(block, (x0 - round(SHIFT * s), y0))
    return im, True


def fit(im, size):
    tw, th = size
    if im.size == size:
        return im
    w = round(im.width * th / im.height)
    im = im.resize((w, th), Image.LANCZOS)
    if w >= tw:
        left = (w - tw) // 2
        return im.crop((left, 0, left + tw, th))
    out = Image.new("RGB", size)
    pad = (tw - w) // 2
    out.paste(im, (pad, 0))
    px, src = out.load(), im.load()
    for y in range(th):
        l, r = src[0, y], src[w - 1, y]
        for x in range(pad):
            px[x, y] = l
        for x in range(pad + w, tw):
            px[x, y] = r
    return out


def main():
    src, dst = sys.argv[1], sys.argv[2]
    size = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (2064, 2752)
    os.makedirs(dst, exist_ok=True)
    for name in sorted(os.listdir(src)):
        if not name.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            continue
        im = Image.open(os.path.join(src, name)).convert("RGB")
        im, changed = clean(im)
        im = fit(im, size)
        out = os.path.join(dst, os.path.splitext(name)[0] + ".png")
        im.save(out, optimize=True)
        print(f"{name}: {'label removed' if changed else 'no label'} -> {im.size}")


main()
