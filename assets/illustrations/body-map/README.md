# Body map

Blob from the front and the back, used by the muscle map on the exercise screen (`src/components/MuscleMap.tsx`).

- **Source:** `source/front.png` and `source/back.png` were cut from Astra's `body-map.png`, delivered 2026-10-19 in reply to `docs/art-prompts/body-map.md`. They are the plain figure, with no muscles drawn.
- **Build:** `npm run art:body-map` (`tools/art/body_map.py`) writes:
  - `front.webp` and `back.webp`, 600 px tall;
  - for each muscle, one painted layer in the main colour (coral) and one in the supporting colour (amber);
  - the registry `src/components/bodyMapArt.ts`.
- **How it is drawn:**
  - The muscle areas are drawn by hand in `tools/art/body_map.py`, because Blob has no anatomy to trace.
  - Each layer keeps the clay shading and stays inside the silhouette.
  - The areas show where an exercise works, not anatomy, and stay review pending.
