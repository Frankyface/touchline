# Play mode

## Use it

1. Open a play and choose **Play mode** above the pitch.
2. Set the clip length (1–30 seconds) before the first take. Select a player and press **Play & record**. The clock starts immediately, so waiting before moving is part of the take.
3. Drag the selected player and release to finish. Early release holds their last position through the remaining clip. Each finished take plays alongside the next one on the same clock. **Keep this player still** handles stationary players.
4. Record the ball last as an independent free trace, or let the starting carrier keep it. Arrow keys work during recording; **Finish take** completes keyboard takes. Escape or **Cancel take** discards only the current attempt.
5. Preview the slate. **Natural movement** follows the original recording. **Polygon lines** uses up to 1–24 straight edges, with a 0–100% straightening control. Original samples and timestamps remain available; lowering the amount blends toward the hand-drawn path.
6. **Use this slate** replaces the existing movement sequence in one undo step. A movement pencil edits an individual route's timing, endpoint and shape. Reopening Play mode preserves untouched adjustments.

Recording ends automatically at the clip limit. Switching away from the tab or losing the pointer cancels the current take. Draft takes are applied only with **Use this slate**; closing/discarding the dialog leaves the play unchanged. Recordings illustrate authored movement and are not a rugby physics simulation.

## Storage and compatibility

Raw points are normalized pitch coordinates with normalized timestamps. Capture samples at most about 20 times per second; validation permits 604 points per take. Drawing and playback share the same path transformation. Ball recordings replace authored passes; choosing another starting carrier or drawing a new pass removes the ball recording.

Backups contain the raw recordings and shape settings. Compact JSON avoids padding a recording backup with indentation. Recording apply, play/session copies, merged imports and recovery check a 1.9 MB notebook budget, leaving room below the 2 MB import/API limit. Saving has a final size guard and reports failures without claiming success.

This update targets the GitHub Pages edition. The separately hosted account edition must be updated before it can import backups containing recording fields. Older notebooks still load in this edition without migration.

## Verification — 2026-09-21

- 32 model/workflow/recording tests cover concurrent playback, waiting and pauses, polygon bends/loops, bounded route edits, ball paths, mirroring, strict validation, backup/recovery roundtrip, near-equal capture timestamps, longest clips, untouched pencil edits, unusual imported IDs and UTF-8 size checks.
- TypeScript and both static Pages and Sites production builds pass.
- Actual browser flow: duplicate a local fixture, record one player by drag/release and another with arrows, hold remaining players, record the ball, preview, change polygon controls, apply, undo/redo, edit individual timing/edges, reopen/apply, cancel a redo, and reload saved work.
- Responsive preview at 390×844: recording drag/release, scrolling, polygon edges and straightening controls checked. This is browser viewport coverage; physical touch hardware was not tested.
- Read-only independent source review corrected preservation of earlier edits, preview geometry, timestamp normalization, imported ID handling and recording size limits.

The existing desktop browser download/print limitations still apply. This turn verifies backup serialization by automated tests, not native file-download completion.
