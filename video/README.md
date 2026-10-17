# BLOB FIT video pipeline (Wiro AI)

Budget-controlled image-to-video generation for Blob Fit Reels (issue #2, `CG-VIDEO-001`). **Nothing in this folder spends credits unless the founder approves a specific run.**

## How spending is controlled

| Guard | What it does |
|---|---|
| Live price check | `estimate` reads the model's price table from Wiro (`/Tool/Detail` → `dynamicprice`). That call is read-only and free. If the price for these exact parameters can't be determined, the run is blocked. |
| Budget cap | Every job has `budgetCapUsd` (default **$1.00 per clip**). `WIRO_BUDGET_CAP_USD` can lower it further. A run whose verified price is above the cap is refused. |
| Approval code | `estimate` prints a 10-character code. It is a hash of the model, parameters, first-frame bytes, attempt number and live price. `generate` only runs with that exact code. If anything changes, including Wiro's price, a new approval is needed. |
| One attempt, no retries | `generate` submits once. The run record is written *before* waiting, so a crash can never cause a second submission. A failed task is not resubmitted (Wiro does not bill failed tasks). A new attempt needs a new code. |
| Ledger | Every finished run is appended to `video/ledger.json` with the estimate, the charged cost and a running total. |

## 1. Configure credentials (never commit them, never paste them into GitHub or chat)

Create a project at <https://wiro.ai/panel/project/new> to get an **API key** and, for signature auth, an **API secret**.

**On your own computer (recommended):** create `.env.local` in the repository root. It is already git-ignored.

```bash
cat > .env.local <<'EOF'
WIRO_API_KEY=paste-key-here
WIRO_API_SECRET=paste-secret-here
WIRO_BUDGET_CAP_USD=1.00
EOF
git check-ignore .env.local   # must print ".env.local"
```

Alternatively, export the values for the current shell only, without them landing in shell history:

```bash
read -rs WIRO_API_KEY && export WIRO_API_KEY
read -rs WIRO_API_SECRET && export WIRO_API_SECRET
```

**In a Claude Code cloud environment:**
1. Add `WIRO_API_KEY` and `WIRO_API_SECRET` in the environment's settings: environment menu → Edit → *Network secrets*, or as environment variables if that section isn't shown.
2. Allow the domain `api.wiro.ai` under Network access → Allowed domains. Also allow the host that serves output files (it appears in the run record).
3. Start a new session; the settings apply from the next session.

Then check the setup (no credits used):

```bash
npm run video -- check
```

## 2. Verify the price (no credits used)

```bash
npm run video -- models                      # live price tables for the candidate image-to-video models
npm run video -- estimate ep003-squat-test   # exact price for this job + approval code
```

`estimate` also writes `video/runs/<job>/estimate.json`, a snapshot of the price that was checked.

## 3. Generate (spends credits only after approval)

Post the estimate and code in issue #2. Once the founder approves:

```bash
npm run video -- generate ep003-squat-test --approve <code> --dry-run   # shows the exact request, sends nothing
npm run video -- generate ep003-squat-test --approve <code>             # one paid attempt
npm run video -- status ep003-squat-test [--refresh]                    # read-only follow-up
```

## Optional: Wiro MCP server in Claude Code

The repo ships a project MCP config (`.mcp.json`) for Wiro's hosted MCP server, `https://mcp.wiro.ai/v1`. It lets a Claude Code session browse models and read live prices (`search_models`, `get_model_schema`) without the CLI. It contains no secret; the header is filled from the environment variable `WIRO_MCP_AUTH`:

- signature-auth projects: `WIRO_MCP_AUTH=<API_KEY>:<API_SECRET>`
- key-only projects: `WIRO_MCP_AUTH=<API_KEY>`

Setup:
- **Claude Code cloud environment:**
  1. Add `WIRO_MCP_AUTH` as a network secret or environment variable.
  2. Allow `mcp.wiro.ai` and `api.wiro.ai` under Network access → Allowed domains.
  3. Start a new session.
- **Local:** `export WIRO_MCP_AUTH=...` in the shell that starts `claude`. Use `read -rs` as shown above. The first time, Claude Code asks you to approve the project's `wiro` server.

Wiro's MCP server cannot be added as a claude.ai connector. Connectors that take only a URL need OAuth, and Wiro uses API keys.

`.claude/settings.json` makes Claude Code ask for confirmation before every `run_model` call (spends credits) and every `upload_file` call. The approval rule still applies: a clip is generated only after the founder approves a specific estimate. For paid runs, prefer the CLI: it enforces the budget cap and approval code, writes the ledger, and never retries. MCP's `run_model` does none of that.

## Where things go

| Path | In git? | Contents |
|---|---|---|
| `video/jobs/*.json` | yes | Job specs: model, parameters, first frame, budget cap, draft shot script |
| `video/inputs/` | yes | First frames. Source cut-outs come from founder-approved concepts only. |
| `video/runs/<job>/` | yes | `estimate.json` and `attempt-N.json`: task id, parameters, cost, timings, output hashes |
| `video/ledger.json` | yes | All charged runs and the running total |
| `video/output/` | **no** | Downloaded MP4s. Large media stays out of git; attach it to the issue or a release instead. |

## Jobs

| Job | Model | Clip |
|---|---|---|
| `ep003-squat-test` | `klingai/kling-v2.6` | 5 s, 9:16, sound off, first frame + negative prompt |
| `ep003-squat-test-budget` | `klingai/kling-v2.5-turbo` (`std`) | Same shot, cheaper tier, as a fallback |

Model ids and parameters come from Wiro's official n8n node package (`@wiro-ai/n8n-nodes-wiroai@2.0.1`). The API surface (endpoints, signature, task states, price fields) mirrors the official MCP server (`@wiro-ai/wiro-mcp@1.3.1`).

## First frame

`video/inputs/ep003-squat-first-frame.png` is **interim**. It is the approved concept Blob (goals-screen hero cut-out, unchanged) placed on a plain warm studio backdrop by `tools/video/make_first_frame.py`. The canonical squat cover / gym still is requested in issue #1; swap it in once it lands, then re-run `estimate`, because the approval code covers the image bytes.

## Reel renderer prototype (no credits)

```bash
python3 tools/video/render_reel.py video/reels/ep003-squat.json   # -> video/output/reels/ep003-squat.mp4
```

The renderer turns a storyboard into a 1080×1920, 30 fps MP4 with an AAC audio track (≈30 s for EP003):
- It uses text cards built from the approved art. Exercise text is pulled from `data/exercises.json`, so the app and the Reels say the same thing, and every exercise card carries a *pending coach review* note.
- The clip segment uses the newest **completed** Wiro run for its job. Until one exists, it shows the first frame, clearly labelled *PREVIEW · squat clip pending approval*.
- `voice` in the storyboard can point to a narration file. Without one, a silent track keeps the file upload-ready. Generating narration (e.g. a Wiro text-to-speech model) would be another paid run and needs its own approval.

Requires Python 3.10+ with Pillow, ffmpeg, and `npm install` (for the bundled fonts).

## Known limitations

- This repo's cloud container cannot reach `api.wiro.ai` or `mcp.wiro.ai` (network policy). Run the commands locally, or allow the domains as described above.
- Prices are only known for the live parameters. Models billed by compute time give an approximate figure and require `--accept-approximate` plus a cap of at least twice the estimate.
- Image-to-video output quality depends on the first frame. The interim frame comes from a 941×1672 concept, so expect softness until a production still is available.
