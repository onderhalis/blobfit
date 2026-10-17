# EP003 Squat — canonical first-frame art direction (CC-006)

**Status:** SPECIFICATION ONLY. The requested binary image **has not been created or committed**. Do not mark CC-006 complete until `video/inputs/ep003-squat-first-frame-canonical.png` is present and visually checked on GitHub.

## Required delivery
- Exact path: `video/inputs/ep003-squat-first-frame-canonical.png`.
- Format: **1080 × 1920 or larger, 9:16, opaque RGB/RGBA PNG**, no typography, badges, logos, watermarks, UI, visible text or framing guides.
- **Character:** canonical Blob, soft matte cream-white body, round friendly head, two vertical black pill eyes, no mouth/nose/hair/ears, black athletic shorts, beginner/S0–S1 physique; avoid exaggerated muscle definition.
- **Pose:** neutral standing start of bodyweight squat, feet shoulder-width, planted on floor and fully visible, arms relaxed beside torso, hips and knees unbent, slight front three-quarter view (~10–15° yaw) so both eyes remain legible.
- **Composition:** static eye-level medium-wide/full-body camera, character occupies **55–60% of full image height** (~1056–1152 px at 1920 px), centered horizontally with generous clearance on all sides. Aim head near y=440–500 and soles near y=1530–1620, leaving >=300 px of clear floor below and >=400 px above head. Do not crop feet, hands or head.
- **Background:** premium warm sunlit modern gym, soft directional daylight through windows, neutral concrete/light wood palette, minimal equipment in distant background, restrained depth of field. **No gym apparatus in front of the character or crossing legs.** Floor contact shadow natural and anchored. No dark high-contrast props behind the face.
- **Lighting:** soft cinematic daylight, natural body material and coherent shadow; no surreal glow, motion blur or extreme wide-angle distortion.
- **Temporal readiness:** enough empty space for a full controlled squat descent and return; avoid nearby benches, racks, dumbbells or other obstacles. Same static camera for all frames.

## Reference hierarchy
1. `assets/character/base-character-sheet.png` (approved proportions, shorts and eyes; front/side).
2. `assets/character/fitness-poses.png` and `assets/character/brand-style-reference.png` (material/visual tone).
3. `assets/workout-references/squat-cover.png` (approved **gym lighting and environment only**).
4. `assets/reference-inbox/founder-chat-2026-10-17/` (app composition, fallback visual direction).

**Important:** The canonical `squat-cover.png` has text baked into the artwork and depicts Blob **already at squat depth**, so it is **not suitable as a neutral first frame by cropping alone**. Do not mislabel a crop of it as a canonical standing still. The current `video/inputs/ep003-squat-first-frame.png` is explicitly interim and should remain labeled so.

## Production prompt (image-generation model)
> A premium photorealistic-soft-3D editorial fitness illustration, vertical 9:16, full-body neutral standing start pose of the exact same canonical warm cream-white Blob mascot from the supplied reference character sheet. The Blob has a simple rounded head, precisely two small upright black oval eyes, no mouth, no nose, no hair or ears, softly rounded limbs, no exaggerated muscles, and wears plain black athletic shorts. Beginner gym-going build. Feet planted shoulder-width, arms relaxed at sides, facing camera with a subtle 10–15 degree three-quarter turn, head upright, looking toward camera. Blob takes up 55–60% of image height and is fully visible with abundant headroom and floor clearance. Beautiful clean contemporary gym with warm afternoon daylight, windows and unobtrusive blurred gym equipment in the far background, soft coherent floor shadow, eye-level locked-off camera. Keep the floor directly in front of and around both feet entirely unobstructed. No words, logos, watermarks, interface, diagrams or graphics. No other characters.

### Negative constraints
> No text, lettering, title, speech bubble, logo, brand, watermark, oversized biceps, six-pack, colored body, shoes, extra fingers or limbs, cropped feet, foreground equipment, knees already bent, arms extended for squat, camera tilt, extreme perspective, side-only face, missing eye, altered shorts.

## QA before acceptance
1. Compare to approved character sheet at 100% zoom: eye spacing/shape, shorts, face and proportions.
2. Confirm pixel dimensions, 9:16, and text-free canvas; no frame bleed.
3. Verify both feet fully visible and floor is clear throughout squat motion; character height within 55–60%.
4. Validate consistency with gym style from `squat-cover.png`, but **not** its embedded text or bent pose.
5. Verify file is actually committed to GitHub at exact path, then update `video/jobs/ep003-squat-test.json` (on Claude's feature branch), re-run read-only `estimate` because approval code hashes image bytes, and post side-by-side with interim.
6. Do not generate a paid Wiro video until founder approves the **new** estimate/code. No retries or implicit spending.

## Handoff / blockers
The approved companion archive `blobfit-claude-handoff.zip` contains all **11 canonical source PNGs**, but they have **not been committed to GitHub**. They are distinct from the **11 production transparent pose PNGs** in `docs/ILLUSTRATION_EXPORT_SPEC.md`. The connected GitHub text-file workflow does not have access to the local image bytes. For a binary upload, the founder can hand the ZIP directly to Claude Code's workspace or upload extracted files through GitHub; this art spec alone does **not** satisfy the PNG deliverable. If no image can be transferred, keep this request open and the paid Wiro job blocked.