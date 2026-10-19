#!/usr/bin/env python3
"""Cuts exercise sheets into the single frames that npm run art:sync expects.

    npm run art:import                                   # every sheet in assets/exercises/inbox/
    python3 tools/art/import_sheets.py path/to/sheet.png --as hip-hinge

A sheet is one transparent image per exercise (prompts in docs/art-prompts/) holding the frames that
exercise still needs, in this order: start and end (always together, so the loop between them comes
from one drawing), then the missing mistakes. Figures sit in rows of up to three, read left to
right, top row first. The order is worked out here exactly as tools/art/exercise-brief.mjs writes
it into the prompt; when every frame is already there, a sheet replaces all of them.

Figures are found as shapes in the alpha channel. Props that touch or overlap a figure horizontally
(a bench, a band, a dumbbell) stay with it. All frames of a sheet keep one shared scale, chosen so
Blob's eyes are EYE px tall (smaller if the widest pose would not fit), so frames from a later sheet
match the frames already there. Each frame is written as a 1024 x 1024 transparent PNG to
assets/exercises/<exercise-id>/<name>.png.

Sheets taken from the inbox are deleted after a successful import (git history keeps the upload).
Exit code 1 if a sheet could not be imported; nothing is written for that sheet.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from sync_exercise_art import eye_height

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets' / 'exercises'
INBOX = SOURCE / 'inbox'
PER_ROW = 3
SIZE = 1024
FILL = 0.88
EYE = 52  # eye height in px in every imported frame
WORK = 600  # long edge of the mask used to find figures
MIN_AREA = 0.0004  # shapes smaller than this share of the sheet are specks
GAP = 0.01  # shapes closer than this share of the width belong to one figure


def needed(exercise: dict) -> list[str]:
    """The frames a sheet for this exercise holds, in order. Mirrors wanted() in exercise-brief.mjs."""
    names = ['start', 'end'] + [f'mistake-{i + 1}' for i in range(len(exercise['mistakes']))]
    have = {name for name in names if (SOURCE / exercise['id'] / f'{name}.png').exists()}
    if have == set(names):
        return names
    pair = 'start' not in have or 'end' not in have
    return [name for i, name in enumerate(names) if (pair if i < 2 else name not in have)]


def rows_for(count: int) -> list[int]:
    """Figures per row: [3, 2] for five, [2] for two."""
    rows = math.ceil(count / PER_ROW)
    return [PER_ROW] * (rows - 1) + [count - PER_ROW * (rows - 1)]


def shapes(alpha: Image.Image) -> list[tuple[float, tuple[int, int, int, int], np.ndarray]]:
    """Connected shapes in a downscaled alpha mask: (centre y, box, pixel mask), in mask units."""
    scale = WORK / max(alpha.size)
    small = alpha.resize((max(1, round(alpha.width * scale)), max(1, round(alpha.height * scale))), Image.BOX)
    mask = np.asarray(small) > 24
    seen = np.zeros_like(mask)
    found = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        queue, points = deque([(y0, x0)]), []
        seen[y0, x0] = True
        while queue:
            y, x = queue.popleft()
            points.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        if len(points) < MIN_AREA * mask.size:
            continue
        ys, xs = np.array([p[0] for p in points]), np.array([p[1] for p in points])
        component = np.zeros_like(mask)
        component[ys, xs] = True
        found.append((ys.mean(), (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), component))
    return found


def group(parts: list, width: int) -> list[list]:
    """Merges shapes of one row into figures: shapes that overlap or nearly touch horizontally."""
    groups: list[list] = []
    right = -1.0
    for part in sorted(parts, key=lambda p: p[1][0]):
        if groups and part[1][0] <= right + GAP * width:
            groups[-1].append(part)
            right = max(right, part[1][2])
        else:
            groups.append([part])
            right = part[1][2]
    return groups


def crop(sheet: Image.Image, parts: list, scale: float) -> Image.Image:
    """One figure at full resolution, with everything outside its shapes made transparent."""
    keep = np.zeros_like(parts[0][2])
    for _, _, component in parts:
        keep |= component
    left = min(p[1][0] for p in parts)
    top = min(p[1][1] for p in parts)
    right = max(p[1][2] for p in parts)
    bottom = max(p[1][3] for p in parts)
    # Back to full resolution, grown a little so soft edges and the contact shadow survive.
    full = Image.fromarray((keep * 255).astype(np.uint8)).resize(sheet.size, Image.NEAREST).filter(ImageFilter.MaxFilter(9))
    box = (
        max(0, int((left - 2) * scale)),
        max(0, int((top - 2) * scale)),
        min(sheet.width, int((right + 2) * scale)),
        min(sheet.height, int((bottom + 2) * scale)),
    )
    piece = sheet.crop(box)
    piece.putalpha(Image.fromarray(np.minimum(np.asarray(piece.getchannel('A')), np.asarray(full.crop(box)))))
    return piece.crop(piece.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())


def cut(sheet: Image.Image, layout: list[int]) -> tuple[list[Image.Image], str | None]:
    """The figures of a sheet in reading order, or an error when the layout does not match."""
    found = shapes(sheet.getchannel('A'))
    if not found:
        return [], 'no figures found'
    height, width = found[0][2].shape
    rows: list[list] = [[] for _ in layout]
    for part in found:
        rows[min(int(part[0] / height * len(layout)), len(layout) - 1)].append(part)
    scale = max(sheet.size) / WORK
    pieces = []
    for number, (parts, expected) in enumerate(zip(rows, layout), start=1):
        figures = group(parts, width)
        if len(figures) != expected:
            where = f'row {number}' if len(layout) > 1 else 'the sheet'
            return [], f'{where} has {len(figures)} figure(s); the prompt asks for {expected}'
        pieces += [crop(sheet, figure, scale) for figure in figures]
    return pieces, None


def import_sheet(path: Path, exercise: dict) -> list[str]:
    """Writes the frames of one sheet. Returns errors; nothing is written when there are any."""
    try:
        sheet = Image.open(path)
        sheet.load()
    except Exception as error:  # noqa: BLE001 - report any unreadable file
        return [f'cannot be read ({error})']
    sheet = sheet.convert('RGBA')
    w, h = sheet.size
    corners = [sheet.getpixel((0, 0)), sheet.getpixel((w - 1, 0)), sheet.getpixel((0, h - 1)), sheet.getpixel((w - 1, h - 1))]
    if any(pixel[3] > 8 for pixel in corners):
        return ['needs a transparent background (RGBA PNG); the corners are opaque']
    names = needed(exercise)
    pieces, error = cut(sheet, rows_for(len(names)))
    if error:
        return [f'{error} ({", ".join(names)})']
    largest = max(max(piece.size) for piece in pieces)
    eyes = [e for e in (eye_height(piece) for piece in pieces) if e]
    scale = SIZE * FILL / largest
    if eyes:
        scale = min(scale, EYE / float(np.median(eyes)))
    folder = SOURCE / exercise['id']
    folder.mkdir(parents=True, exist_ok=True)
    for number, (name, piece) in enumerate(zip(names, pieces), start=1):
        sized = piece.resize((max(1, round(piece.width * scale)), max(1, round(piece.height * scale))), Image.LANCZOS)
        canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(sized, ((SIZE - sized.width) // 2, (SIZE - sized.height) // 2))
        target = folder / f'{name}.png'
        replaced = target.exists()
        canvas.save(target, optimize=True)
        print(f'  figure {number} -> {target.relative_to(ROOT)}{" (replaced)" if replaced else ""}')
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('sheets', nargs='*', type=Path, help='sheet files; default: everything in assets/exercises/inbox/')
    parser.add_argument('--as', dest='exercise', help='exercise id for a single sheet whose file name is not the id')
    args = parser.parse_args()
    exercises = {e['id']: e for e in json.loads((ROOT / 'data' / 'exercises.json').read_text())}
    if args.sheets:
        sheets = [p.resolve() for p in args.sheets]
    elif INBOX.exists():
        sheets = sorted(p for p in INBOX.iterdir() if p.suffix.lower() in ('.png', '.webp'))
    else:
        sheets = []
    if args.exercise and len(sheets) != 1:
        parser.error('--as takes exactly one sheet')
    if not sheets:
        print('No sheets to import (put them in assets/exercises/inbox/<exercise-id>.png).')
        return 0
    failed = False
    for path in sheets:
        exercise_id = args.exercise or path.stem
        exercise = exercises.get(exercise_id)
        print(f'{path.name} -> {exercise_id}')
        if exercise is None:
            errors = [f'no exercise with id "{exercise_id}" in data/exercises.json; name the file <exercise-id>.png']
        else:
            errors = import_sheet(path, exercise)
        for message in errors:
            print(f'  {message}', file=sys.stderr)
        if errors:
            failed = True
        elif path.parent == INBOX.resolve():
            path.unlink()
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
