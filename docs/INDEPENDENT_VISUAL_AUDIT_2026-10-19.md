# Blob Fit independent visual QA — 2026-10-19

Status: design exploration, NOT production-approved artwork.

## Strengths
- Distinctive cream-white Blob, two black oval eyes, black shorts identity.
- Beginner-first product concept, logged progress rather than invented gains.

## Gaps / release blockers
1. Exercise detail needs exercise-specific assets and start/end poses; one generic hero is not a technique guide.
2. Anatomy, joints, equipment handling and easier/harder variants need qualified review.
3. Consistent silhouette, proportions, shorts, eye placement, shadows and camera angle.
4. Transparent standalone per-pose exports, correct dimensions and asset naming.
5. Native iPhone screenshot QA, VoiceOver, Dynamic Type and safe-area checks remain unverified.

## Concept explorations
Two 4x3 Blob exercise pose sheets were generated in ChatGPT on 2026-10-19. These are drafts only, not verified independent transparent PNG assets and NOT uploaded to GitHub. Some poses are ambiguous; do not use as instructional art without QA.

## Production contract
Proposed path: assets/exercises/<exercise-slug>/<phase>.png where phase is start, mid or finish. Standalone transparent PNGs with consistent canvas, canonical character and camera. Map exercise IDs to paths, phase, viewpoint and review status. No anatomy approval claims without expert review.

## Next steps
Audit active app branch/PR exercise IDs and asset imports, produce machine-readable missing-asset manifest, then integrate QA-approved images only. Do not change core logic for an art-only task.
