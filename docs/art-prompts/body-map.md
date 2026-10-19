# Body map prompt (muscle visuals)

Founder decision, 2026-10-19: muscle visuals use Blob, with the working muscles shown as coloured areas.

**Two images only.** The app paints each muscle area on top of Blob from `data/exercises.json`: primary muscles in coral, secondary in amber. So one front view and one back view cover all 51 exercises. A new exercise needs no new art.

The areas show where an exercise works, not anatomy. Blob has no visible muscles, and the areas stay "review pending" until a coach has checked them, like the rest of the exercise content.

**Deliver:** one transparent sheet, named `body-map.png`. Paste it into the Claude Code chat, or upload it to `assets/exercises/inbox/`.

`body-map.png`

```text
One landscape image, at least 1536 x 1024 px (larger is better), as a PNG with a fully transparent background. Two full-body figures side by side with clear empty space between them and around them: LEFT = front view, RIGHT = back view. Character: same character as the BLOB FIT reference (base-character-sheet.png) and the exercise images: a 3D soft-clay mascot with a warm cream-white, rounded, beginner-build body, two upright black pill-shaped eyes, no mouth, nose, hair or ears, wearing plain black athletic shorts. The body is soft and plain all over: a smooth round chest and belly, soft rounded arms and legs, no pecs, no abs, no six-pack, no bulging arms, no muscle shapes, grooves or seams, and no coloured areas. One even cream colour everywhere except the black shorts and eyes. Both figures: standing straight and relaxed, facing the camera square-on (front) or with the back square to the camera (back), feet hip-width apart, arms hanging about 15 degrees away from the body so the sides of the torso, the inner arms and the inner thighs are visible. Back view: the back of the head is plain with no eyes, and the shorts are seen from behind. Same size, height and light for both figures. Soft, even front light with only gentle shading and no strong shadows across the body, because coloured areas will be painted onto it later. No floor, room, scenery, text, labels, lines, arrows, muscle shapes or colours: the app paints the muscle areas itself.
```

**First attempt (2026-10-19), not used:**
- the body was muscular, with pecs, a six-pack and bulky arms, which is against the brand lock in `CLAUDE.md`;
- every muscle was already painted in a different colour;
- the app needs a plain body, so it can colour only the muscles each exercise works.

**Acceptance:**
- Both figures are the canonical Blob with black shorts, at the same size, and the background is transparent.
- Arms are clear of the body, so the side and inner surfaces can carry a colour.
- The body is as soft and plain as in the exercise images: no muscle definition, no coloured areas, no lines or text.
