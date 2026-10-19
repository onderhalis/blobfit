# Product decision log

## 2026-10-17 — Brand / canonical persona
Approved: one warm cream-white amorphous Blob with two upright black oval eyes, no human face or exaggerated muscles. **Black shorts always.** The app Blob has completed early chapters of his gym journey and appears gently more confident; do not replace protagonist with colored supporting characters.

## 2026-10-17 — Visual style
Approved: clean cream/off-white editorial interface; friendly cinematic mascot imagery; warm sunlight; restrained orange progress accents; English-first global audience. Social cover artwork must show the exercise. Training animation should use varied camera angles and backgrounds.

## 2026-10-17 — Engineering handoff
Claude Code owns implementation and verification; ChatGPT owns art direction, requested art assets and product review. GitHub repo is asynchronous shared source. The founder owns final scope / taste / spending decisions.

## 2026-10-17 — Assets
Approved 11 PNG references were assembled in a companion ZIP, but **binary assets are not yet committed to GitHub** at setup. Asset presence must be verified before Claude's visual acceptance review.

## 2026-10-17 — CC-002 MVP review
Accepted P2–P9 as proposed by Claude Code, with details in GitHub Issue #1. Streaks count completed weeks; current week remains in progress. Progress compares comparable user-logged metrics only. Colored goal art cannot replace the canonical cream-white mascot with black shorts. Exercise guidance must receive qualified review before public release. AsyncStorage is acceptable for MVP with migration tests.

## 2026-10-19 — Exercise art as one sheet per exercise
Founder decision (CC-017):
- Astra draws all missing frames of one exercise in a single transparent image: start and end together, then the mistakes.
- The founder only forwards the sheets.
- Claude cuts, checks and integrates them (`npm run art:import`), and answers each batch with one list of frames to redraw.
- Mistakes that a still image cannot show (breathing, tempo) are replaced with visible faults.

## 2026-10-19 — Muscle visuals use Blob
Founder decision:
- The muscle map is Blob from the front and back, with the working muscles as coloured areas: primary in coral, secondary in amber.
- Astra draws the two views once (`docs/art-prompts/body-map.md`). The app paints the areas from `data/exercises.json`, so new exercises need no new art.
- Areas show where an exercise works, not anatomy, and stay review pending.
