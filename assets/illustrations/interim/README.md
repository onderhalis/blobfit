# Interim mascot illustrations

**Status:** interim. Replace with production exports from the design owner (request CC-001 in issue #1).

## Provenance
Every PNG here was cut out of the **five founder-approved app concepts** in `assets/reference-inbox/founder-chat-2026-10-17/`:
- only the illustration region was cropped, never UI text, numbers or whole screens;
- the background was removed locally with `rembg` (BiRefNet-general model, run offline in the dev container);
- no character was redrawn, recolored or newly generated.

The source concepts are about 941×1672 px, so these cutouts are low resolution (roughly 150–680 px). They look soft on 3× displays. Production exports should be at least 1200 px on the long edge.

### `hd/` (what the app uses)
`hd/*.webp` are the same cut-outs, upscaled 2–4× (to about 700–1500 px) so they hold up on 3× iPhone screens. The upscaler is Real-ESRGAN `realesrgan-x4plus`, run on CPU through ncnn in the dev container. The alpha channel was resized with Lanczos. Nothing was redrawn, so pose, proportions, eyes and shorts are unchanged; the upscaler only reconstructs edges and smooths the clay texture a little. The files are WebP (quality 88). `src/components/art.ts` is generated from this folder.

These are still interim. Production exports (CC-001, CC-007) replace both folders.

| File | Source concept | Used for |
|---|---|---|
| `blob-idle-towel.png` | 01 Home hero | Home hero |
| `blob-stretch-peek.png` | 01 Home "Today's focus" | Rest-day card |
| `blob-thumbs-up.png` | 02 Goals hero | Onboarding hero |
| `goal-*.png` | 02 Goals cards | Goal cards (supporting-color characters, not the protagonist) |
| `blob-lunge.png` | 03 Daily plan hero | Plan hero, split squat thumbnail |
| `blob-squat.png`, `blob-push-up-small.png`, `blob-row.png`, `blob-warm-up.png` | 03 Daily plan rows | Exercise thumbnails |
| `blob-push-up.png` | 04 Exercise detail hero | Push-up detail hero |
| `blob-incline-push-up.png`, `blob-knee-push-up.png` | 04 Variation cards | Incline and kneeling push-up thumbnails |
| `blob-flex-towel.png`, `blob-flex-small.png` | 05 Progress | Progress hero / session complete |
| `blob-peek.png` | 05 Progress footer | Empty states and footer card |

## Brand check (`docs/QUALITY_GATES.md` #7)
The protagonist appears cream-white with two black pill eyes and **black shorts** in every pose except two crops. `blob-peek.png` is head-only. `blob-stretch-peek.png` shows the shorts. The colored `goal-*` figures are supporting characters, as in the approved goal concept.

Every other exercise uses a neutral icon card until its production art arrives (`docs/EXERCISE_ART_BRIEF.md`, request CC-011). No substitute Blob was invented for any of them.
