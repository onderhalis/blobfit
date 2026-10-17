# Blob Fit — GitHub agent-to-agent coordination

## Shared source of truth
This repository is the shared workspace for:
- **Claude Code / IMPLEMENTATION** — owns code, runtime architecture, testing, root-cause analysis, pull requests.
- **ChatGPT / DESIGN & PRODUCT** — owns reference artwork, brand/visual rules, feature scope, UX review and assets.
- **Founder** — final approver of product, brand, scope, third-party spend, distribution and releases.

This workflow is **asynchronous**. No direct real-time inter-model chat is configured. Neither assistant can independently wake the other unless the user schedules a check or has a GitHub automation/action installed. Treat issue replies and PRs as messages that a subsequent tool-driven assistant session can read.

## Communication channels
- **Agent inbox:** GitHub issue titled `[AGENT INBOX] Claude ↔ ChatGPT | Blob Fit`. Discuss blockers, missing references, requested assets and handoff decisions there.
- **Build work:** open linked GitHub Issues for individual features and blockers; use a branch + PR per implementation slice.
- **Design assets:** `assets/app-screens/`, `assets/character/`, `assets/workout-references/`. Source of truth for expected paths: `docs/ASSET_MANIFEST.md`.
- **Decisions:** log settled decisions in `docs/DECISIONS.md`; never silently reinterpret mascot identity, subscriptions, safety or app scope.

## Message protocol
Prefix every comment:

`[FROM: CLAUDE CODE] [TYPE: REQUEST|STATUS|BLOCKER|REVIEW] [ID: CC-001]`
or
`[FROM: CHATGPT] [TYPE: RESPONSE|ASSET|DECISION|REVIEW] [RE: CC-001]`

Each message states:
1. **Context:** which screen/file/issue and current implementation state.
2. **Need:** concrete action/request and expected filename or behavior.
3. **Acceptance:** what will demonstrate completion (e.g. file resolves in GitHub, appears in Expo).
4. **Blocker severity:** blocking, can proceed with placeholder, informational.
5. **Next owner:** Claude Code, ChatGPT, or founder.
Link directly to commits, paths, PRs, and screenshots. Do not ask for invisible background work.

## Missing image protocol — first priority
There are exactly **11 source PNGs** expected by the current manifest: 5 app screens, 3 character reference images, and 3 workout references. A companion ZIP was created in ChatGPT, but the GitHub connector used to initialize this repository does not automatically transfer its binary contents. **Do not claim PNG files exist until they can be fetched from GitHub.**

The founder can install them by downloading `blobfit-claude-handoff.zip` from the original ChatGPT conversation, extracting, then copying the archive's `blob-fit-starter/assets/` tree into repository root `assets/` and committing/pushing (or uploading the 11 PNGs to matching paths on GitHub web UI).

Claude: Before visual parity work, check files and report `missing assets` as a BLOCKER in the inbox. While waiting, continue on a separate branch with Expo scaffolding, state, navigation and tests using conspicuous placeholders. Replace placeholders only after assets are present.

## Implementation rhythm
1. Claude inspects repo and posts a compact request if anything is missing.
2. ChatGPT reads the issue, supplies a concrete committed doc/code change or an actionable artifact and replies.
3. Claude confirms receipt, implements, and raises a PR with screenshot/test evidence.
4. ChatGPT reviews design/product acceptance; founder decides major subjective changes.
5. Close requests only when evidence exists in repo. No fabricated status claims.

## Safety, security and limits
- No payments, new cloud backend, accounts, recurring spend, public release or changes to canonical brand direction without founder approval.
- Exercise imagery is *concept art*, not medically verified anatomy.
- Avoid pasting credentials, private keys or personal data into issues.
- Public repository: assume all issues, source files and comments are world-readable until visibility is changed.
