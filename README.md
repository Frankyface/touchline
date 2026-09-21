# Touchline

A calm, personal rugby notebook. Draw a play, watch the movement, collect variations, and take a session plan to the pitch.

[Open GitHub Pages edition](https://frankyface.github.io/touchline/) · [Account-synced edition](https://touchline-notebook.frankyface.chatgpt.site) · [Source on GitHub](https://github.com/Frankyface/touchline) · [Product research](docs/product-research.md)

## GitHub Pages

The Pages edition provides the same drawing board, playbook and session tools without sign-in. It saves to IndexedDB **in the current browser on the current device**. It does not sync with the account-backed edition. Use **Back up notebook** and **Import backup** to transfer work between current versions (the older account deployment does not yet accept recorded Play mode paths); clearing site data or closing a private browsing session can remove local notebooks.

Every push to `main` runs the tests, type check and static build, then deploys `dist-pages` through [.github/workflows/pages.yml](.github/workflows/pages.yml). GitHub Pages is public, but notebook contents stay in each visitor's browser and are not included in deployment artifacts.

```powershell
npm run build:pages
npm run preview:pages
```

Open the printed URL with `/touchline/`. The static entry is `github-pages/`; it reuses the shared React components and keeps the existing Sites build separate. See [Pages implementation and checks](docs/github-pages.md).

## Use it

- **Drawing board:** start from five editable formations, position players and cones, and draw runs, passes and kicks. Select an arrow or its pencil to edit timing and endpoints. Mirror a play, undo/redo, scrub, pause or change playback speed.
- **Play mode:** drag a player to record in real time; untouched players keep their routes. In the Ball stage, click Pass or Kick and a target, or drag the ball onto a receiver. The ball follows its carrier and snaps into possession after a catch. Preview natural or polygon paths, then apply the slate in one undo step. [Guide and checks](docs/play-mode.md).
- **Show play:** explain a sequence with a clean presentation view, previous/next movement moments and individual player focus.
- **Playbook:** favorites, categories, search and sorting help retrieve ideas. Duplicate variations or import validated backups as new copies. Add any play directly to a new or existing session.
- **Sessions:** combine plays and freeform blocks with a purpose, observable cues, setup and easier/harder variations. Reuse blocks, reorder them, see start offsets and gather equipment notes into one list.
- **Coach mode:** keep the current animated diagram, cues and next block beside a large countdown. Pause, extend the timer or advance manually. Closing pauses and retains your place in the current tab; refresh resets timer progress. A run uses a snapshot of the plan, and timing adjustments do not change saved durations.
- **Reflect and repeat:** mark a session delivered, record what worked and what to revisit, then use “Plan next session” to carry the next-time note into a fresh plan.
- **Take it outside:** inspect print previews for individual cards and complete sessions; print or save PDF using the browser print dialog. Export an SVG diagram or JSON notebook backup.
- **Your account:** hosted notebooks use ChatGPT sign-in and private per-user D1 storage. Changes autosave. Concurrent-device edits trigger a conflict instead of silently overwriting. “Keep my edits as copies” retrieves saved data and preserves differing local records as linked recovery copies.

Drawn routes illustrate your idea; Touchline does not predict rugby outcomes. The pitch is a schematic. Example practices use non-contact shadow defence.

## Run locally

Requires Node.js 22.13+ (verified with Node 24) and npm.

```powershell
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_happy_black_crow.sql
npm run dev -- --port 5178
```

Apply the initial migration **once per new local database**. Open the printed local URL. The portable preview provides a clearly isolated local test identity, `seedy@sites.test`; production authentication is owned by Sites and the mock is excluded from production.

On this Windows host, a subprocess npm shim failed during setup. Direct equivalents are:

```powershell
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run install:ci
node scripts/run-framework.mjs build
node scripts/run-framework.mjs dev --port 5178
```

## Verify

```powershell
npm test
npm run typecheck
npm run build
node tests/api.test.mjs
```

The API test requires the local dev server. It refuses non-loopback URLs, verifies authentication, validation, origin rejection, new-field persistence, stale-write rejection and recovery copies, and restores the original local notebook. Do not edit the same local notebook while it runs.

The research update passed 19 model/workflow tests, TypeScript, local API integration and a production build, with independent source review. No new browser QA was performed for this update. The initial release had desktop/mobile interaction checks; those are historical evidence, not validation of every new control. See [verification](docs/verification.md).

## Implementation

React 19 / Vinext / Cloudflare Workers; SVG coordinates; Zod validation; D1 document storage keyed by authenticated user ID with revision compare-and-swap. No AI key or paid model is needed to use the app. Limits: 100 plays, 40 markers and 120 movements per play, 50 sessions, 50 blocks per session; backup imports up to 2 MB.

New runs use two-second legs, passes use 0.7-second steps and kicks use 1.4-second flights. Scrub to choose a later start, then adjust timing in the movement editor. Adding a pass or kick previews that action; general playback starts on request. Saved session diagrams remain linked to the playbook, including delivered sessions; they are not immutable archives.

Saving requires a connection. Unsaved edits stay in the current page and closing it warns; the app is not an offline/PWA app. Keep a downloaded backup for archival use.

In the Codex in-app browser, print preview and export serialization can be inspected, but native blob-download and OS print-dialog completion could not be observed by its automation surface. Use a regular browser for downloading files and printing.

## Project records

[Research](docs/product-research.md) · [Plan](docs/master_plan.md) · [Handoff](handoff.md) · [Verification](docs/verification.md) · [Delivery](docs/delivery.md) · [Agent plan](docs/agent_plan.md) · [Token ledger](docs/token_usage.md)

Original examples were checked against World Rugby's [back-line attack](https://passport.world.rugby/coaching/key-factor-analysis/unit-skills/back-line-attack/), [passing](https://passport.world.rugby/coaching/key-factor-analysis/handling/passing-the-ball/), and [Law 11](https://passport.world.rugby/laws-of-the-game/laws-by-number/11-knock-forward-or-throw-forward/) guidance. Text and diagrams are original, editable examples, not official coaching programmes.
