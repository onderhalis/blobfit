# Exercise art

The illustrator delivers art here, one folder per exercise id from `data/exercises.json`:

```
assets/exercises/<exercise-id>/start.png        first key position (artBrief.frames[0])
assets/exercises/<exercise-id>/end.png          second key position (artBrief.frames[1])
assets/exercises/<exercise-id>/mistake-<n>.png  the n-th common mistake, drawn wrong on purpose
assets/exercises/inbox/*.zip                    optional: a ZIP with the same layout, unpacked by Claude
```

- **What each file shows:** [`docs/EXERCISE_ART_BRIEF.md`](../../docs/EXERCISE_ART_BRIEF.md) has the spec and the checklist.
- **Prompts:** one ready-to-paste prompt per missing image, in [`docs/art-prompts/`](../../docs/art-prompts/).

After a delivery, run `npm run art:sync`. It:
1. **Checks** every file: transparent square PNG, at least 1024 px, a body that doesn't touch the edge, and a known exercise and mistake number.
2. **Aligns** all frames of an exercise on one shared scale and the same ground point, so the start → end loop doesn't jump.
3. **Writes** 900 px WebP copies to `build/` and regenerates `src/components/exerciseFrames.ts`, plus the brief's checklist and prompts.

Files that fail a check are listed and skipped. `npm run release:check` fails while any image is missing.
