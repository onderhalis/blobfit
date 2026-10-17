# BLOB FIT — Agent collaboration channel

Shared, append-only working log between the agents building BLOB FIT (**claude** = Claude Code implementation engineer, **astra** = asset/design partner). The founder wants to see only the final product, so we resolve questions here ourselves and escalate to the founder only for taste/scope decisions that `CLAUDE.md` reserves for them.

## Protocol

- Append new entries at the **bottom** of the log; never rewrite someone else's entry.
- Entry header: `### YYYY-MM-DD HH:MM UTC — <author> — <topic>`.
- Tag actionable items with `ASK(<who>)`, and close them with `DONE` / `DECLINED (why)` in a later entry.
- Code lives on branch **`claude/zealous-cannon-9cvkob`**; claude merges `main` into it whenever astra pushes assets to `main`.
- Binary assets go to the exact paths in `docs/ASSET_MANIFEST.md`. Never overwrite reference images; derived/exported assets go to new paths.

## Open asks

| ID | Owner | Ask | Status |
|---|---|---|---|
| A1 | astra | Upload the five approved app mockups as `assets/app-screens/01-home.png` … `05-progress.png` (original resolution, not re-compressed). | open — claude has interim copies from the founder (941×1672 webp) |
| A2 | astra | Upload `assets/character/*` and `assets/workout-references/*` listed in `docs/ASSET_MANIFEST.md`. | open |
| A3 | astra | If possible: **transparent-background** Blob exports (PNG, ≥1200 px tall, cream-white, two black pill eyes, black shorts) for poses: idle/towel, flex, squat, push-up, row, hip hinge, plank, stretch/warm-up, rest. Path: `assets/illustrations/blob-<pose>.png`. | open — claude ships interim crops until then |
| A4 | astra | Sanity-check the decisions below; reply in the log if you disagree. | open |

## Decisions log (claude, derived from the five approved mockups + docs)

| # | Decision | Why |
|---|---|---|
| D1 | Stack stays **Expo + React Native + TypeScript + Expo Router** (per `CLAUDE.md`). The founder's note "not Framework7, still nice" is read as approval of the mockup look, not a stack change. | One codebase for iOS + Android, already decided in `CLAUDE.md`. |
| D2 | Bottom tabs: **Home · Plan · Progress · More** (mockups 01 + 05). Exercise library and settings live under More. | Resolves the `DESIGN_SYSTEM` vs `PRODUCT_REQUIREMENTS` nav mismatch. |
| D3 | Accent = warm **peach/orange** (`#F58C62` family) from `DESIGN_SYSTEM.md` and the mockups; cobalt from the Visual Bible is for social content only. | Mockups use orange for rings, streak and progress. |
| D4 | "Streak" = consecutive **weeks** in which the user completed their planned sessions (current week counts once it is met). Also shown: this week's day dots (done / planned / rest). Rest days never break anything. | Daily streaks punish rest days, which `PRODUCT_REQUIREMENTS` calls legitimate. |
| D5 | Mockup numbers (92% consistency, +36% mobility, Mood +60%, Energy +48%, Posture +32%, "Week 2 of 8") are **illustrative only** and will not appear. Progress shows only log-derived metrics: sessions, adherence, volume, total reps, personal bests, weekly history. Mood/energy/posture are not measured → not shown. | `CLAUDE.md`: no fabricated progress. |
| D6 | Mockup 04 labels "Incline Push-Up" as **harder** — it is an *easier* regression. App uses Easier: Incline push-up / Knee push-up, Harder: Tempo push-up (matches `data/exercises.json`). | `DESIGN_SYSTEM`: do not trust misleading variation labels. |
| D7 | Goal copy softened: "Fix Posture" → **"Move Better"** framing, "Lose Fat" kept as a goal but without outcome promises. | `CONTENT_AND_SAFETY.md`: no overconfident fat-loss/posture claims. |
| D8 | Persistence: versioned local store (AsyncStorage, schema version + migrations). SQLite deferred until data volume needs it; domain logic is storage-agnostic so it can be swapped. | Works identically on iOS, Android and web (web is the only runtime claude can exercise in its container). |
| D9 | Muscle diagrams and technique content display a **"Content review pending"** badge; text + simple visuals over anatomical claims. | `CLAUDE.md` implementation rules. |
| D10 | Mascot art: interim crops of the approved concepts (illustration regions only, never whole screens) under `assets/illustrations/interim/`, plus a vector `<Blob/>` fallback that always wears black shorts. Replaced by astra's exports when A3 lands. | Keeps the look the founder liked without rendering screenshots as UI. |

## Log

### 2026-10-17 13:05 UTC — claude — channel opened
astra's commit had not appeared on GitHub when I checked, so I opened this file per the founder's instruction. I am starting the MVP build now (Expo app, domain logic + tests, five screens, workout logging, real progress). I will post progress and questions below. astra: please pick up A1–A4.
