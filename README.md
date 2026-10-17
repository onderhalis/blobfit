# BLOB FIT — mobile app build brief

**Status:** Product and engineering handoff committed; image reference bundle must still be uploaded; implementation not started.  
**Product:** An English-first, character-led beginner fitness application for iOS and Android.  
**Source of truth:** [`CLAUDE.md`](CLAUDE.md) and the project documents. The five approved concept images are packaged in the [companion asset archive](#asset-installation) and need to be placed in `assets/app-screens/` before visual implementation.

## North star

Blob is the **same original warm-white, black-shorts mascot** audiences followed from a difficult Day 0 into sustainable strength. Inside the app he is a gentle, more experienced companion—not a different character and not a hyper-muscular bodybuilder. Users practice alongside Blob, build a realistic routine and see **their own** measurable improvement.

**Treat the mockups as design references, not functional app code.** Recreate the layouts with native components and real navigation. Existing illustrative statistics and placeholder exercise prescriptions are NOT verified user data.

## Five screens to build

| Screen | Design reference | Must actually do |
|---|---|---|
| Home | [`01-home.png`](assets/app-screens/01-home.png) | Greeting, today's session, app navigation, continue workout |
| Onboarding / Goals | [`02-goals.png`](assets/app-screens/02-goals.png) | Goal choice, beginner/experience level, frequency, equipment, persist preferences |
| Daily Plan | [`03-daily-plan.png`](assets/app-screens/03-daily-plan.png) | A/B workout plan, exercise list, reps and sets, start session |
| Exercise Detail | [`04-exercise-detail.png`](assets/app-screens/04-exercise-detail.png) | Muscles worked, safe setup, step-by-step technique, easy alternatives, log reps |
| Progress | [`05-progress.png`](assets/app-screens/05-progress.png) | Sessions done, adherence, progress over time based on actual logged data |

## For Claude Code — fastest start

1. Read [`CLAUDE.md`](CLAUDE.md) and [`docs/PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md) completely.
2. After installing the asset package, review all five assets in `assets/app-screens/` and brand rules in `docs/DESIGN_SYSTEM.md`.
3. Follow [`.claude/commands/build-mvp.md`](.claude/commands/build-mvp.md) and implement/test the Expo app.
4. Report what works, what remains placeholder, how to run it, and screenshots of the five screens.

**Suggested first Claude Code message:**

> Read `CLAUDE.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/DESIGN_SYSTEM.md`, `docs/QUALITY_GATES.md` and `.claude/commands/build-mvp.md`, inspect all five `assets/app-screens/` images, then implement BLOB FIT as a functioning Expo/React Native TypeScript MVP on a feature branch. Build the five actual screens, onboarding persistence, exercises, workout logging, and real progress calculations. Do not treat the images as the UI itself; recreate the components. Preserve Blob's exact two-eye white-clay + black shorts identity. Run checks and show me the result before adding purchases or backend services.

## Directory guide

- `CLAUDE.md` — persistent Claude Code operating rules
- `.claude/commands/build-mvp.md` — execution brief
- `docs/PRODUCT_REQUIREMENTS.md` — product flows and MVP scope
- `docs/DESIGN_SYSTEM.md` — layout, palette, Blob identity, interaction rules
- `docs/ARCHITECTURE.md` — recommended implementation choices
- `docs/QUALITY_GATES.md` — concrete acceptance criteria
- `docs/CONTENT_AND_SAFETY.md` — content/fitness integrity and publishing separation
- `docs/ASSET_MANIFEST.md` — what each image is, what it is not
- `docs/BLOB_*` — earlier social-content visual bible and 100-content narrative plan
- `data/` — typed-seed-ready representative exercise/program catalog

## Constraints

- English-first, localization-friendly. Targets iOS **and** Android.
- No fabricated gains, health outcomes, streaks or percentages.
- This repo contains creator-owned AI-generated concept references; do not copy third-party account art/layouts.
- No auth, Supabase, RevenueCat, paid plan, generative coaching or medical claims in MVP unless separately approved.
- Exercise technique, muscle overlays and rep ranges require qualified review before production release.
- Working product name “BLOB FIT” is provisional until trademark/app-store clearance.
## Asset installation

The connected GitHub integration can commit text and code but not the binary images from this ChatGPT handoff. Download the companion `blobfit-claude-handoff.zip` attached in the originating conversation. Extract it, then copy `blob-fit-starter/assets/` into this repository's `assets/` directory and commit the assets. The archive also holds the source documentation. **Do not assume the images are already in GitHub.** Claude Code should confirm all expected PNGs before claiming visual parity.

**Repository access:** Initially created as PUBLIC by the user; change to PRIVATE in GitHub Settings if you prefer to keep the unreleased work confidential.
