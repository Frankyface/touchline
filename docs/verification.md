# Verification evidence

## Automated
- Seven meaningful model tests: seed/reference validation; stationary/interpolated/completed runs; ball handoffs; continuous multi-leg loops; malformed backups; incomplete drafts; operation-local deletion undo preserving later edits.
- TypeScript `tsc --noEmit`: passed.
- Production Vinext Worker build: passed after final print-preview and print-style changes.
- Dependency lock consistency: npm ci dry-run with offline resolution passed.
- Local API integration: authentication rejection, invalid input rejection, cross-origin rejection, durable write/read, stale revision 409, original state restored: passed.
- Initial D1 migration applied successfully to local database. Production migration remains part of publishing.

## Actual browser interactions
- Desktop 1440×1000 and mobile 390×844 rendered and visually inspected; mobile document width stayed within viewport.
- Duplicate, rename, clear required title, complete it after debounce: resumed saving without sticky failure.
- Keyboard move X 30→31, undo→30; pointer drag→35/65; reload preserved coordinates.
- Playback advanced from zero; restart reset timeline.
- Removed/replaced a pass while in Pass mode; valid sender preserved.
- Added and removed cone without losing passes. Drew an extra run; movement count updated.
- Search filtered to the expected play; test play deleted through confirmation.
- Session duplicate, minutes 8→9, reorder, total 50→51; timer started, paused, advanced to the reordered 9-minute block.
- JSON fixture imported with fresh IDs and expected name; removed afterward. All test-only records cleaned.
- Print card preview visually inspected on mobile; session print content included all five blocks and linked diagrams.
- WebMCP read returned real notebook; valid open changed visible play; invalid ID and extra-field inputs intentionally rejected.

## Review
Independent read-only reviewer `project_signals` found and root fixed: sticky validation save failure; cone deletion clearing passes; keyboard/drag undo boundaries; overlapping load/save race; whole-notebook deletion undo; stale pass sender. Reviewer approved the corrected integrated source with no blocking defects and independently passed TypeScript. Final print arrow contrast was improved following the review.

## Honest limits
The in-app browser did not deliver a download event for an SVG blob download; native download completion and OS print-dialog completion were not verified there. Export serializer and print content/layout are implemented. Regular browser printing/downloading is documented. Hosted status and hosted checks are recorded after publication.
