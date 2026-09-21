# Touchline
Read `handoff.md`, then its active feature.

## Scope and autonomy
The user requested a complete surprise project, delegated all product choices, preferred a clean/calm interface, and waived the source prompt's interview/confirmation gate. Build, verify, repair, and deliver the full scope in `docs/master_plan.md` without routine approval pauses.

## Ownership
The root agent owns all Site source, publishing, and integrated records. Sites skill forbids spawned agents from editing the checkout. Agents may research, inspect, test, and independently review.

## Commands
- Install: `npm run install:ci` (on this Windows host, invoke npm's absolute JavaScript entrypoint if its shim fails).
- Dev: `node scripts/run-framework.mjs dev --port 5178`
- Build: Sites `scripts/build-site.mjs`; standalone `npm run build`.
- Type check: `node node_modules/typescript/bin/tsc --noEmit`
- Migrations: `npm run db:generate`, then local Wrangler D1 execute using the generated config.
- Tests: `node --experimental-strip-types --test tests/model.test.mjs tests/workflow.test.mjs tests/recording.test.mjs` and local-only `node tests/api.test.mjs`.

## Standards
Keep a functional drawing surface in the first viewport, preserve keyboard/touch paths, validate saved/imported data, and scope all persistent records to the authenticated user. No mock save success. Animation illustrates authored routes; it is not a rugby simulation.

See `docs/runbook.md`, `docs/agent_plan.md`, and `docs/token_usage.md`.
