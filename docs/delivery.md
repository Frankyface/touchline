# Delivery receipt

## Research update — 2026-09-15 21:23 UTC

Version 2 is privately published and its product source is pushed to [Frankyface/touchline](https://github.com/Frankyface/touchline).

- Live URL: https://touchline-notebook.frankyface.chatgpt.site
- Site: `appgprj_6aa9a0abd3e88191bb067d7d04e00ba9`
- Saved version 2: `appgprj_6aa9a0abd3e88191bb067d7d04e00ba9~appgver_9bfef6c72a1881919dbbcb159999d7f1`
- Deployment: `appgdep_6aa9b7336cd48191a1b3928ecb935d7b` — terminal status `succeeded`
- Published product source: `86efa52ccde7b4a13a99f1f6fcbb533c46568954`
- GitHub `main` was verified against that exact SHA after pushing. This receipt is a later documentation-only commit.
- Audience remains private owner-only; no access changes or SQL migrations were made.

Nineteen model/workflow tests, uncached TypeScript, final local API integration and the production build passed. Two independent reviewers approved the corrected source. The deployment archive was validated locally and accepted by Sites; the known Windows packaging-wrapper failure used the same native-tar fallback described below.

No new browser QA or hosted write test was performed for this release. A direct HTTP probe did not establish a signed-in notebook user (API 401), so it is not claimed as a successful authenticated check. The first release's hosted save/reload evidence below remains historical. New feature acceptance evidence and limitations are in `verification.md`; research and implementation traceability are in `product-research.md`.

The existing Codex preview tab was directed to the exact returned live URL. No recurring task was created. Product implementation is complete; observational field use is the next source of usability evidence.

## Initial release

Touchline is complete and privately published as of 2026-09-15 20:41 UTC.

Live URL: https://touchline-notebook.frankyface.chatgpt.site

- Project: `appgprj_6aa9a0abd3e88191bb067d7d04e00ba9`
- Saved version 1: `appgprj_6aa9a0abd3e88191bb067d7d04e00ba9~appgver_9f0f9b9d1f988191bd6c06f5722c0bac`
- Deployment: `appgdep_6aa9acf72e588191a435ee5e866a5df1` — terminal status `succeeded`
- Published source: `4f7482de1ed5de87d116106019d18e32a2d7e2d6`
- Audience: private owner-only, unchanged.

The hosted app loaded successfully with authenticated notebook access. An actual keyboard edit moved the first example marker from SVG X 210 to 217; autosave completed, reload retained 217, and a reverse edit restored the original 210 and saved. This verifies production migration, authenticated write and durable read. Original examples and session remain clean. No hosted console errors were recorded. Existing in-app tab was reused for the exact returned live URL; viewport override reset and tab retained as a deliverable.

The official packaging wrapper could not launch its Bash subprocess on Windows. Following its inspected contract, native tar packaged the complete validated dist tree, including hidden .openai metadata and D1 migrations. The connector validated and saved the archive before deployment. No source files, credentials or node_modules were included in the deployment archive.

All F001–F005 scope is delivered. See README and docs/verification.md for controls, local execution and the remaining native print/download verification limit. These final delivery records are documentation added after the published source checkpoint; product source is unchanged.
## Play mode update — 2026-09-21

Target: [GitHub Pages](https://frankyface.github.io/touchline/). The commit adding this section includes sequential player/ball recording, recorded-path playback, polygon controls, editor integration and backup limits. Its corresponding [Pages workflow run](https://github.com/Frankyface/touchline/actions/workflows/pages.yml) records the exact published SHA and deployment result.

Local release checks passed: 32 tests, uncached TypeScript, Pages production build and shared Sites production build. Actual desktop and phone-sized browser interaction coverage is recorded in [Play mode](play-mode.md). The disposable local QA variation was removed; no hosted notebook data was edited for these checks.

The private account-backed Sites deployment is unchanged by this release. Its old schema does not accept new recording fields; Pages-to-Pages backups remain supported.
