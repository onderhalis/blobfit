#!/usr/bin/env python3
"""Builds the muscle map art: Blob from the front and back, plus one painted layer per muscle.

    npm run art:body-map            # writes the layers and src/components/bodyMapArt.ts
    python3 tools/art/body_map.py --preview out.png   # every region in its own colour, for checking placement

Input: assets/illustrations/body-map/source/{front,back}.png, cut from Astra's body-map sheet
(docs/art-prompts/body-map.md). Output: assets/illustrations/body-map/{side}.webp and
{side}-{muscle}-{primary,secondary}.webp, all the same size, so the app stacks the layers of the
muscles an exercise works on top of the plain figure.

Regions are drawn here, by hand, in source-image pixels: Blob has no anatomy to trace. They are an
orientation aid, not anatomy, and stay "review pending" with the rest of the exercise content.
Each layer keeps the clay shading of the figure underneath and never leaves its silhouette.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets' / 'illustrations' / 'body-map' / 'source'
OUT = ROOT / 'assets' / 'illustrations' / 'body-map'
REGISTRY = ROOT / 'src' / 'components' / 'bodyMapArt.ts'
HEIGHT = 600  # px; the map is shown up to about 170 pt tall
COLORS = {'primary': (242, 123, 112), 'secondary': (244, 192, 78)}  # MUSCLE_COLORS in MuscleMap.tsx
OPACITY = 0.92
FEATHER = 3.5  # px of soft edge, at output size
GROW = 1.15  # every region a little larger than drawn, so it reads at phone size

# Shapes per side, in source pixels (front.png is 545 x 856, back.png 542 x 855). An ellipse is
# (cx, cy, rx, ry, degrees); a box is ('box', left, top, right, bottom, radius). Shapes on one side
# of the body are mirrored to the other around the figure's centre line.
Shape = tuple
MIRROR = {'front': 272, 'back': 271}
REGIONS: dict[str, dict[str, list[Shape]]] = {
    'chest': {'front': [(222, 348, 54, 40, 0)]},
    'front shoulders': {'front': [(150, 314, 34, 30, 0)]},
    'side shoulders': {'front': [(98, 322, 34, 30, -20)], 'back': [(96, 322, 34, 30, 20)]},
    'rear shoulders': {'back': [(148, 314, 34, 30, 0)]},
    'biceps': {'front': [(72, 388, 40, 28, -55)]},
    'triceps': {'back': [(70, 388, 40, 28, 55)]},
    'grip': {'front': [(78, 470, 50, 24, 35)], 'back': [(76, 470, 50, 24, -35)]},
    'core': {'front': [('box', 214, 402, 330, 515, 30)]},
    'obliques': {'front': [(184, 462, 20, 46, 0)]},
    'upper back': {'back': [('box', 176, 282, 366, 350, 34)]},
    'back': {'back': [(196, 405, 48, 66, -12)]},
    'lower back': {'back': [('box', 228, 440, 314, 508, 22)]},
    'glutes': {'back': [(208, 585, 60, 56, 0)]},
    'outer hips': {'back': [(150, 600, 18, 40, 0)]},
    'quadriceps': {'front': [(188, 700, 50, 70, 0)]},
    'adductors': {'front': [(244, 704, 20, 50, 0)]},
    'hamstrings': {'back': [(190, 712, 50, 64, 0)]},
    'calves': {'back': [(170, 795, 42, 38, 0)]},
}
# Every shoulder region at once, for exercises that name only "shoulders".
REGIONS['shoulders'] = {
    side: [shape for name in ('front shoulders', 'side shoulders', 'rear shoulders') for shape in REGIONS[name].get(side, [])]
    for side in ('front', 'back')
}


def mirrored(shape: Shape, centre: float) -> Shape:
    if shape[0] == 'box':
        _, left, top, right, bottom, radius = shape
        return ('box', 2 * centre - right, top, 2 * centre - left, bottom, radius)
    cx, cy, rx, ry, angle = shape
    return (2 * centre - cx, cy, rx, ry, -angle)


def draw(mask: ImageDraw.ImageDraw, shape: Shape, scale: float) -> None:
    if shape[0] == 'box':
        _, left, top, right, bottom, radius = shape
        dx, dy = (right - left) * (GROW - 1) / 2, (bottom - top) * (GROW - 1) / 2
        box = [(left - dx) * scale, (top - dy) * scale, (right + dx) * scale, (bottom + dy) * scale]
        mask.rounded_rectangle(box, radius=radius * GROW * scale, fill=255)
        return
    cx, cy, rx, ry, angle = shape
    rx, ry = rx * GROW, ry * GROW
    t = math.radians(angle)
    points = []
    for i in range(72):
        a = 2 * math.pi * i / 72
        x, y = rx * math.cos(a), ry * math.sin(a)
        points.append(((cx + x * math.cos(t) - y * math.sin(t)) * scale, (cy + x * math.sin(t) + y * math.cos(t)) * scale))
    mask.polygon(points, fill=255)


def region_mask(side: str, shapes: list[Shape], size: tuple[int, int], scale: float, alpha: np.ndarray) -> np.ndarray:
    image = Image.new('L', size, 0)
    pen = ImageDraw.Draw(image)
    for shape in shapes:
        draw(pen, shape, scale)
        draw(pen, mirrored(shape, MIRROR[side]), scale)
    soft = np.asarray(image.filter(ImageFilter.GaussianBlur(FEATHER)), dtype=float) / 255
    return soft * alpha  # never outside the silhouette


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--preview', type=Path, help='write one image with every region in its own colour, then stop')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    registry: dict[str, dict] = {}
    previews = []
    for side in ('front', 'back'):
        source = Image.open(SOURCE / f'{side}.png').convert('RGBA')
        scale = HEIGHT / source.height
        base = source.resize((round(source.width * scale), HEIGHT), Image.LANCZOS)
        pixels = np.asarray(base, dtype=float)
        alpha = pixels[..., 3] / 255
        lum = pixels[..., :3].mean(axis=2)
        cream = float(np.median(lum[alpha > 0.9]))
        # Keep the clay's shading, but lift the black shorts so a colour painted over them still reads.
        shade = np.clip(lum / cream, 0.85, 1.06)[..., None]
        if args.preview:
            canvas = np.asarray(base.convert('RGB'), dtype=float)
            for i, name in enumerate(sorted(REGIONS)):
                if name == 'shoulders' or side not in REGIONS[name]:
                    continue
                m = region_mask(side, REGIONS[name][side], base.size, scale, alpha)[..., None]
                hue = np.array(Image.new('HSV', (1, 1), (int(i * 255 / len(REGIONS)), 200, 230)).convert('RGB').getpixel((0, 0)), dtype=float)
                canvas = canvas * (1 - 0.8 * m) + hue * shade * 0.8 * m
            previews.append(Image.fromarray(canvas.clip(0, 255).astype(np.uint8)))
            continue
        base.save(OUT / f'{side}.webp', 'WEBP', quality=88, method=6)
        entry = registry.setdefault(side, {'size': base.size, 'layers': {}})
        for name, sides in sorted(REGIONS.items()):
            if side not in sides:
                continue
            m = region_mask(side, sides[side], base.size, scale, alpha)
            for kind, color in COLORS.items():
                layer = np.zeros((*m.shape, 4))
                layer[..., :3] = np.asarray(color, dtype=float) * shade
                layer[..., 3] = m * OPACITY * 255
                path = OUT / f'{side}-{name.replace(" ", "-")}-{kind}.webp'
                Image.fromarray(layer.clip(0, 255).astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=88, method=6)
            entry['layers'][name] = f'{side}-{name.replace(" ", "-")}'
    if args.preview:
        sheet = Image.new('RGB', (sum(p.width for p in previews) + 20, HEIGHT), (247, 241, 230))
        x = 0
        for p in previews:
            sheet.paste(p, (x, 0))
            x += p.width + 20
        sheet.save(args.preview)
        print(f'Wrote {args.preview}')
        return 0

    lines = [
        '// Generated by tools/art/body_map.py from assets/illustrations/body-map/source. Do not edit by hand.',
        '',
        'export interface BodyMapSide {',
        '  /** require() of a bundled image. */',
        '  base: number;',
        '  width: number;',
        '  height: number;',
        '  /** One painted layer per muscle, the same size as the base, in the primary and secondary colour. */',
        '  layers: Record<string, { primary: number; secondary: number }>;',
        '}',
        '',
        "export const BODY_MAP: Record<'front' | 'back', BodyMapSide> = {",
    ]
    for side in ('front', 'back'):
        entry = registry[side]
        width, height = entry['size']
        lines.append(f'  {side}: {{')
        lines.append(f"    base: require('@/assets/illustrations/body-map/{side}.webp'),")
        lines.append(f'    width: {width},')
        lines.append(f'    height: {height},')
        lines.append('    layers: {')
        for name, stem in entry['layers'].items():
            lines.append(
                f"      {json.dumps(name)}: {{ primary: require('@/assets/illustrations/body-map/{stem}-primary.webp'), "
                f"secondary: require('@/assets/illustrations/body-map/{stem}-secondary.webp') }},"
            )
        lines.append('    },')
        lines.append('  },')
    lines += ['};', '']
    REGISTRY.write_text('\n'.join(lines))
    count = sum(len(e['layers']) for e in registry.values())
    print(f'Wrote {count} muscle layers (x2 colours) and {REGISTRY.relative_to(ROOT)}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
