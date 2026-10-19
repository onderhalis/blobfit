# Exercise art

The illustrator delivers **one sheet per exercise**: a transparent PNG with an invisible 3 × 2 grid, read left to right, top row first.

| Cell | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| File | `start.png` | `end.png` | `mistake-1.png` | `mistake-2.png` | `mistake-3.png` | `mistake-4.png` |

- **What each cell shows:** [`docs/EXERCISE_ART_BRIEF.md`](../../docs/EXERCISE_ART_BRIEF.md) has the spec and the checklist.
- **Prompts:** one ready-to-paste prompt per exercise, in [`docs/art-prompts/`](../../docs/art-prompts/).
- **Where sheets go:** `assets/exercises/inbox/<exercise-id>.png`, or paste them into the Claude chat.

After a delivery, run `npm run art:import`. It:
1. **Cuts** each sheet in `inbox/` into `assets/exercises/<exercise-id>/<file>.png` (1024 × 1024, one scale for the whole sheet) and removes it from the inbox. A single sheet with another name: `python3 tools/art/import_sheets.py <file> --as <exercise-id>`.
2. **Checks** every frame: transparent square PNG, at least 1024 px, a body that doesn't touch the edge, and a known exercise and mistake number.
3. **Aligns** all frames of an exercise on one shared scale and the same ground point, so the start → end loop doesn't jump.
4. **Writes** 900 px WebP copies to `build/` and regenerates `src/components/exerciseFrames.ts`, plus the brief's checklist and prompts.

A single replacement frame can still go straight to `assets/exercises/<exercise-id>/<file>.png`; then run `npm run art:sync`. Files that fail a check are listed and skipped. `npm run release:check` fails while any image is missing.
