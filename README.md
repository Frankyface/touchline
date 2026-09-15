# Touchline

A calm, personal rugby notebook. Draw a play, watch the movement, collect variations, and take a session plan to the pitch.

## Use it

- **Drawing board:** drag or keyboard-position attackers, defenders and cones. Draw multi-leg runs and chained passes. Scrub, pause, restart, or change playback speed. Select a player to change their label or starting ball. Undo/redo edits.
- **Playbook:** three original example plays get you started. Create your own, duplicate variations, search, or remove plays. Import adds copies from a validated backup without replacing existing work.
- **Sessions:** build a timed practice from plays and freeform blocks. Edit notes/equipment, reorder blocks, see the time budget, and run a large pitch-side countdown.
- **Take it outside:** inspect print previews for individual cards and complete sessions; print or save PDF using the browser print dialog. Export an SVG diagram or JSON notebook backup.
- **Your account:** hosted notebooks use ChatGPT sign-in and private per-user D1 storage. Changes autosave. Concurrent-device edits trigger a conflict instead of silently overwriting. Download your edits before reloading a conflict.

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

The API test requires the local dev server. It refuses non-loopback URLs, verifies authentication/validation/origin rejection/persistence/stale-write rejection, and restores the original local notebook. Do not edit the same local notebook while it runs.

Browser verification covered desktop 1440×1000 and phone 390×844, actual keyboard/pointer edits, save/reload, pass changes, cone removal, undo, search, imports, session duration/reorder, timer pause/next, print preview, and WebMCP success/failure paths. See [verification](docs/verification.md).

## Implementation

React 19 / Vinext / Cloudflare Workers; SVG coordinates; Zod validation; D1 document storage keyed by authenticated user ID with revision compare-and-swap. No AI key or paid model is needed to use the app. Limits: 100 plays, 40 markers and 120 movements per play, 50 sessions, 50 blocks per session; backup imports up to 2 MB.

Runs append in two-second legs. Passes append in 0.7-second steps and can begin later by scrubbing before choosing a receiver. Animation itself is explicit user action and never autoplays.

Saving requires a connection. Unsaved edits stay in the current page and closing it warns; the app is not an offline/PWA app. Keep a downloaded backup for archival use.

In the Codex in-app browser, print preview and export serialization can be inspected, but native blob-download and OS print-dialog completion could not be observed by its automation surface. Use a regular browser for downloading files and printing.

## Project records

[Plan](docs/master_plan.md) · [Handoff](handoff.md) · [Verification](docs/verification.md) · [Agent plan](docs/agent_plan.md) · [Token ledger](docs/token_usage.md)

Original examples were checked against World Rugby's [back-line attack](https://passport.world.rugby/coaching/key-factor-analysis/unit-skills/back-line-attack/), [passing](https://passport.world.rugby/coaching/key-factor-analysis/handling/passing-the-ball/), and [Law 11](https://passport.world.rugby/laws-of-the-game/laws-by-number/11-knock-forward-or-throw-forward/) guidance. Text and diagrams are original, editable examples, not official coaching programmes.
