#!/usr/bin/env python3
"""Cuts exercise sheets into the single frames that npm run art:sync expects.

    npm run art:import                                   # every sheet in assets/exercises/inbox/
    python3 tools/art/import_sheets.py path/to/sheet.png --as hip-hinge

A sheet is one image per exercise (prompts in docs/art-prompts/), with a transparent background
and an invisible grid of 3 columns x 2 rows. Cells are read left to right, top row first:

    1 start   2 end   3 mistake-1
    4 mistake-2   5 mistake-3   6 mistake-4

Every figure (and its props) is assigned to the cell that holds its centre, so a figure that
reaches a little into the next cell is still cut cleanly. Empty cells are skipped. All cells of a
sheet keep one shared scale, and each one is written as a 1024 x 1024 transparent PNG to
assets/exercises/<exercise-id>/<name>.png, replacing a frame that is already there.

Sheets taken from the inbox are deleted after a successful import (git history keeps the upload).
Exit code 1 if a sheet could not be imported.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets' / 'exercises'
INBOX = SOURCE / 'inbox'
COLUMNS, ROWS = 3, 2
CELLS = ['start', 'end', 'mistake-1', 'mistake-2', 'mistake-3', 'mistake-4']
SIZE = 1024
FILL = 0.88
WORK = 600  # long edge of the mask used to find figures
MIN_AREA = 0.0004  # components smaller than this share of the sheet are specks


def figures(alpha: Image.Image) -> list[tuple[float, float, tuple[int, int, int, int], np.ndarray]]:
    """Connected shapes in a downscaled alpha mask: (centre x, centre y, box, pixel mask), in mask units."""
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
        found.append((xs.mean(), ys.mean(), (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), component))
    return found


def cut(sheet: Image.Image) -> dict[int, Image.Image]:
    """The figure in each non-empty cell, cropped at full resolution with everything else made transparent."""
    alpha = sheet.getchannel('A')
    scale = max(sheet.size) / WORK
    shapes = figures(alpha)
    height, width = shapes[0][3].shape if shapes else (1, 1)
    cells: dict[int, list] = {}
    for cx, cy, box, component in shapes:
        cell = min(int(cy / height * ROWS), ROWS - 1) * COLUMNS + min(int(cx / width * COLUMNS), COLUMNS - 1)
        cells.setdefault(cell, []).append((box, component))
    out = {}
    for cell, parts in cells.items():
        keep = np.zeros_like(parts[0][1])
        for _, component in parts:
            keep |= component
        left = min(b[0] for b, _ in parts)
        top = min(b[1] for b, _ in parts)
        right = max(b[2] for b, _ in parts)
        bottom = max(b[3] for b, _ in parts)
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
        tight = piece.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        if tight:
            out[cell] = piece.crop(tight)
    return out


def import_sheet(path: Path, exercise: dict) -> tuple[list[str], list[str]]:
    """Writes the frames of one sheet. Returns (errors, warnings); nothing is written when there are errors."""
    try:
        sheet = Image.open(path)
        sheet.load()
    except Exception as error:  # noqa: BLE001 - report any unreadable file
        return [f'cannot be read ({error})'], []
    sheet = sheet.convert('RGBA')
    w, h = sheet.size
    corners = [sheet.getpixel((0, 0)), sheet.getpixel((w - 1, 0)), sheet.getpixel((0, h - 1)), sheet.getpixel((w - 1, h - 1))]
    if any(pixel[3] > 8 for pixel in corners):
        return ['needs a transparent background (RGBA PNG); the corners are opaque'], []
    pieces = cut(sheet)
    if not pieces:
        return ['no figures found'], []
    names = CELLS[: 2 + len(exercise['mistakes'])]
    warnings = [f'cell {cell + 1} should be empty ({exercise["name"]} has {len(exercise["mistakes"])} mistakes); ignored'
                for cell in sorted(pieces) if cell >= len(names)]
    usable = {cell: piece for cell, piece in pieces.items() if cell < len(names)}
    if not usable:
        return ['no figures in the cells this exercise uses'], warnings
    largest = max(max(piece.size) for piece in usable.values())
    scale = SIZE * FILL / largest
    folder = SOURCE / exercise['id']
    folder.mkdir(parents=True, exist_ok=True)
    for cell, piece in sorted(usable.items()):
        sized = piece.resize((max(1, round(piece.width * scale)), max(1, round(piece.height * scale))), Image.LANCZOS)
        canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(sized, ((SIZE - sized.width) // 2, (SIZE - sized.height) // 2))
        target = folder / f'{names[cell]}.png'
        replaced = target.exists()
        canvas.save(target, optimize=True)
        print(f'  cell {cell + 1} -> {target.relative_to(ROOT)}{" (replaced)" if replaced else ""}')
    empty = [str(i + 1) for i in range(len(names)) if i not in usable]
    if empty:
        print(f'  empty: cell {", ".join(empty)}')
    return [], warnings


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
            errors, warnings = [f'no exercise with id "{exercise_id}" in data/exercises.json; name the file <exercise-id>.png'], []
        else:
            errors, warnings = import_sheet(path, exercise)
        for message in errors + warnings:
            print(f'  {message}', file=sys.stderr)
        if errors:
            failed = True
        elif path.parent == INBOX.resolve():
            path.unlink()
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
