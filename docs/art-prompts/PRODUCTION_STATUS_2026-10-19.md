# Exercise art production status — 2026-10-19

## Verified source
- Read `docs/art-prompts/batch-1.md` on this branch: 36 standalone required files for 7 beginner exercises.
- Read CC-014 and CC-015 in Issue #1: no collages/crops; canonical identity and anatomical accuracy are mandatory.
- Recovered exact `base-character-sheet.png` from founder's original `blobfit-claude-handoff.zip` (1254×1254 PNG), and successfully uploaded it as a character-reference input to an external image generation service. This is NOT a GitHub commit.
- The working original was confirmed to have a light studio background. Source references in `assets/reference-inbox/founder-chat-2026-10-17/` are also present on this branch.

## First generation attempt
- Attempted `assets/exercises/squat/start.png` with the exact prompt in `docs/art-prompts/batch-1.md`, canonical character-sheet reference, square 1K, transparent background, and high quality.
- Image service rejected the request before generation: `Requires basic plan or higher`.
- **Result: 0 generated frames, 0 PNG assets committed.** No paid-generation claim.

## Required before calling batch 1 delivered
1. Production image generation must be available with reference input and transparent PNG export; external plan access/credit spending must be explicitly resolved.
2. Generate one isolated pose per file; each must pass character lock, correct perspective, 1024×1024 RGBA, full-body bounds and movement semantics.
3. Upload actual binary PNGs to `assets/exercises/<exercise-id>/<file>.png`, verify path returns image, run `npm run art:sync` and confirm no skipped files.
4. Maintain the 36-file checklist and do not count concept sheets as delivered.

**No core application code changed.**
