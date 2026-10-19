"""Builds a 9:16 first frame from an approved Blob cut-out on a plain warm studio backdrop.

Usage: python3 tools/video/make_first_frame.py <cutout.png> <out.png> [height_ratio]
The character is not redrawn or altered; only the background is composed.
"""
import sys

from PIL import Image, ImageDraw, ImageFilter

W, H = 720, 1280
FLOOR_Y = 1010


def backdrop() -> Image.Image:
    bg = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(bg)
    top, mid = (246, 240, 230), (236, 227, 213)
    f0, f1 = (228, 217, 201), (236, 227, 214)
    for y in range(H):
        if y < FLOOR_Y:
            t = y / FLOOR_Y
            c = tuple(int(top[i] + (mid[i] - top[i]) * t) for i in range(3))
        else:
            t = (y - FLOOR_Y) / (H - FLOOR_Y)
            c = tuple(int(f0[i] + (f1[i] - f0[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    # Soften the wall/floor seam and add a warm daylight wash from the upper left.
    seam = bg.crop((0, FLOOR_Y - 24, W, FLOOR_Y + 24)).filter(ImageFilter.GaussianBlur(10))
    bg.paste(seam, (0, FLOOR_Y - 24))
    light = Image.new('L', (W, H), 0)
    ImageDraw.Draw(light).ellipse((-300, -400, 520, 700), fill=70)
    light = light.filter(ImageFilter.GaussianBlur(160))
    return Image.composite(Image.new('RGB', (W, H), (255, 250, 240)), bg, light)


def main(cutout_path: str, out_path: str, height_ratio: float = 0.62) -> None:
    blob = Image.open(cutout_path).convert('RGBA')
    r, g, b, a = blob.split()
    # Pull the matte in slightly so no light fringe from the source concept remains.
    a = a.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    blob = Image.merge('RGBA', (r, g, b, a))
    target_h = int(H * height_ratio)
    blob = blob.resize((int(blob.width * target_h / blob.height), target_h), Image.LANCZOS)
    x = (W - blob.width) // 2
    y = FLOOR_Y + 18 - blob.height
    bg = backdrop()
    shadow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(shadow).ellipse((x + blob.width * 0.12, FLOOR_Y + 4, x + blob.width * 0.88, FLOOR_Y + 40), fill=110)
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    bg = Image.composite(Image.new('RGB', (W, H), (175, 158, 136)), bg, shadow)
    canvas = bg.convert('RGBA')
    canvas.alpha_composite(blob, (x, y))
    canvas.convert('RGB').save(out_path, optimize=True)
    print(f'{out_path} {W}x{H}, character {blob.width}x{blob.height} at ({x},{y})')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 0.62)
