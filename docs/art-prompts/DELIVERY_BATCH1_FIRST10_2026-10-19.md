# Batch 1 image handoff — first 10 / 36 (2026-10-19)

## Verified GitHub delivery
All 10 source PNGs committed to this feature branch in commit `aa6184984c1229ae7117e6215530f929d18dd0ec`. The GitHub Contents API confirms that each path exists with a blob SHA matching its local original. All are independent 1024×1024 RGBA PNGs with actual transparent corners and inset silhouettes — not sprite sheets, white-background images or cuts from a collage.

**Squat (5)**: `assets/exercises/squat/{start,end,mistake-1,mistake-2,mistake-3}.png`

**Incline Push-Up (5)**: `assets/exercises/incline-push-up/{start,end,mistake-1,mistake-2,mistake-3}.png`

**Remaining batch-1**: Supported Dumbbell Row 5, Seated Band Row 6, Prone Y Raise 5, Hip Hinge 5, Front Plank 5 = **26 PNGs still to generate**. Batch 2 and 3 not yet started.

## Technical QA
- Files were read back from GitHub after commit: 5 per directory, SHA and size verified.
- Ran `python3 tools/art/sync_exercise_art.py` against branch head in an isolated checkout. Result: **Synced 10 image(s) for 2 exercise(s)**, exit code 0, **no skipped files**.
- This technical preflight generated local WebPs and `src/components/exerciseFrames.ts`; **those generated app assets were NOT committed** because visual/coach QA is pending.
- Original generation of Incline Push-Up start/end was reversed; filenames have been corrected based on visual pose in the uploaded files.

## Visual QA — production blockers
1. `squat/start.png`: strict side-on perspective gives only one visible eye; confirm against the canonical silhouette before final approval.
2. `incline-push-up/mistake-1.png`: hip sag needs stronger anatomical distinction from the correct bottom frame; coach to review.
3. `incline-push-up/mistake-3.png`: tilt clearly shows unstable equipment, but incidental motion-mark strokes need removal to comply with clean no-graphics rule.

Other seven assets are **visual candidates**, not coach-approved movement instruction. Incorrect technique must not be presented as verified fitness guidance.

## Integration next
Claude Code should verify the same 10 paths independently, review the three flags and reference exact prompt text in `docs/art-prompts/batch-1.md`. When approved, run `npm run art:sync` and commit generated optimized WebPs and registry; regenerate the brief to remove delivered paths from missing lists. Do not claim batch-1/production complete while the other 26 assets are missing.
