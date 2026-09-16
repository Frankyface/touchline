# GitHub Pages edition

Public application URL: https://frankyface.github.io/touchline/

The GitHub Pages edition is a complete static build of the existing notebook. It has no server, sign-in, account sync or access to the private Sites database. Each visitor starts with the original example plays and session. IndexedDB stores their edits on that browser/device; JSON backup/import is the transfer path between browsers and the account edition. Browser data is not a permanent archive, so keep exported backups.

## Architecture

- `github-pages/index.html` and `main.tsx` render the shared Notebook and styles.
- `vite.pages.config.ts` uses `/touchline/` as its base and writes only `dist-pages`.
- `pages/` is deliberately not used: it is a reserved routing directory in the existing Vinext application.
- `NotebookStore` separates persistence from the React autosave hook. The default adapter still uses the authenticated Sites API; the Pages entry supplies the browser adapter.
- IndexedDB stores a validated notebook and revision. Read/check/write occurs in one transaction, so simultaneous tabs cannot silently overwrite the same revision. Existing recovery-copy behavior handles a conflicting draft.
- Save success waits for transaction completion. Unavailable storage, quota failures and invalid/corrupt records report errors and do not silently replace saved data.
- No private notebook data, credentials, Worker bundle or database files are deployed to Pages.

## Deployment

GitHub Pages uses the repository's GitHub Actions publishing mode with HTTPS. `.github/workflows/pages.yml` installs the locked dependencies, runs model/workflow tests and TypeScript, builds the static entry and uploads only `dist-pages`. The deployment job has Pages and identity-token permissions; the build job has read-only source access. Pushes to `main` and manual workflow dispatch trigger deployment.

Run `npm run build:pages` and `npm run preview:pages` locally. For a source-level browser storage check, start `node node_modules/vite/bin/vite.js --config vite.pages.config.ts --host 127.0.0.1 --port 5180`, open `/touchline/` in agent-browser, then pipe `tests/pages-browser-check.js` into `agent-browser eval --stdin`. The test refuses non-loopback hosts and restores the original record. Do not edit that disposable preview while the check runs.

## Verification

- Nineteen existing model/workflow tests passed.
- TypeScript passed without incremental caching.
- Static production build passed, with the expected `/touchline/` script/style/favicon paths.
- Original Sites production build passed, retaining only `/` and `/api/notebook` routes.
- Actual browser rendered the notebook with browser-local save labels and no recorded page errors.
- An actual edit autosaved and survived a browser reload; the original play name was restored afterward.
- Six real IndexedDB checks passed: save/load roundtrip, competing revisions, invalid input rejection, quota failure preserving saved data, unavailable storage rejection and corrupt-record preservation.
- Independent source review approved the storage adapter, response validation, static routing isolation, artifact and deployment workflow.
- The first clean GitHub install exposed eight incomplete optional-package lock entries inherited from the Windows install. Regenerating those entries in a clean directory preserved existing locked versions and supplied the missing platform metadata. A Linux-targeted clean-install dry run then passed.

This is not an offline-installable PWA. The app shell still needs a network connection to load; once loaded, notebook saves use local storage. The account-backed Sites deployment remains available separately.
