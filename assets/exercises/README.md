# Exercise art

The illustrator delivers art here, one folder per exercise id from `data/exercises.json`:

```
assets/exercises/<exercise-id>/start.png       the first key position (artBrief.frames[0])
assets/exercises/<exercise-id>/end.png         the second key position (artBrief.frames[1])
assets/exercises/<exercise-id>/mistake-<n>.png the n-th common mistake, drawn wrong on purpose
```

What to draw for each file, the spec and the delivery checklist are in [`docs/EXERCISE_ART_BRIEF.md`](../../docs/EXERCISE_ART_BRIEF.md), generated from the exercise data.

After a delivery, run `npm run art:sync`:
1. It checks every file: transparent RGBA PNG, short edge at least 1024 px, padding on every side, a known exercise and mistake number.
2. It writes optimized WebP copies to `build/`.
3. It regenerates `src/components/exerciseFrames.ts` and the brief's checklist.

The app shows a delivered frame instead of the interim art. Files that fail a check are listed and skipped.
