# Play mode

## Use it

1. Open a play and choose **Play mode** above the pitch. The stages are **Players**, **Ball**, and **Preview**.
2. Choose a clip length (1–30 seconds). Select a player, drag to start recording, and release to finish. Use **Start clock** to include a wait before moving, or to move with arrow keys. Early release holds the final position for the rest of the clip.
3. Record only the players you want to change. Untouched players retain their routes or stay still. Earlier takes replay alongside the next player. **Undo take** restores the preceding take; **Keep selected player still** replaces that player's route with a stationary take.
4. **Continue to ball**. The ball stays with its carrier. Choose **Pass** and tap a receiver, or drag the ball onto them; nearby receivers highlight and snap into possession. Choose **Kick** and tap a receiver or open space. A caught kick follows a curved flight and the receiver carries on. A kick into space stays at its landing spot; selecting a player afterwards assigns the kick's receiver before adding more actions.
5. New passes and kicks follow the last ball action. Scrub to a later time to add a delay. Preview, restart, undo the last ball change, clear ball actions, or choose another starting carrier. Existing ball actions are preserved until changed.
6. **Preview** the slate. **Natural movement** follows recorded timing. **Polygon lines** uses up to 1–24 straight edges with a 0–100% straightening control. Raw samples and timestamps remain available. Untouched routes keep their individual shape settings.
7. **Use this slate** applies the draft in one editor undo step. A movement pencil edits timing, run endpoints/shape, or a kick's landing spot. Passes and kicks can also be added directly on the main drawing board.

Recording ends automatically at the clip limit. Escape, losing the pointer or switching away cancels the current take; existing draft takes survive. Escape during a ball drag cancels that drag. Closing or discarding Play mode leaves the saved play unchanged. The drawing illustrates authored movement, not rugby physics.

## Storage and compatibility

Raw points use normalized pitch coordinates and timestamps. Capture samples at most about 20 times per second; validation permits 604 points per take. Drawing and playback share path transformations. A live recorded carrier supplies the launch position of existing ball actions, preventing jumps back to their old route.

Older free-drawn ball recordings are retained exactly when players are edited. Use **Use carrier possession**, clear the ball route, choose a new carrier, or add a ball action to replace a free-drawn route. Undo can restore it before applying. Free-drawn ball paths and possession actions cannot coexist in a saved play.

Backups contain raw recordings, shape settings and pass/kick actions. Compact JSON avoids indentation overhead. Applying recordings, copying plays/sessions, merged imports and recovery check a 1.9 MB notebook budget below the 2 MB import/API limit. Saving has a final size guard and reports failures without claiming success.

This update targets GitHub Pages. The separately hosted account edition must be updated before importing backups with new recording or kick fields. Older notebooks load in the Pages edition without migration.

## Verification — 2026-09-21

- 43 model/workflow/recording/ball tests cover timing, polygon paths, possession chains, moving catches, loose kick landings, mirroring, snapping, strict validation, backup/recovery, capture launch positions, preserved legacy traces, unusual imported IDs and size checks.
- Uncached TypeScript and both Pages and shared Sites production builds passed.
- Actual desktop browser checks: direct player drag, chained pass/kick/pass, drag-to-receiver snapping, space kick and receiver assignment, undo, apply, main-board kick, movement timing editor and reload persistence.
- Browser viewport checks at 390×844 and 1280×720 cover pitch/controls/footer layout. Mobile-sized direct recording and keyboard take cancellation were exercised. Physical touch hardware was not tested.
- Independent source review checked possession and pointer cancellation. Escape during a held ball drag was source-reviewed; the available browser control cannot isolate pointer-down/up for that exact interaction.

The previous release exercised polygon controls, editor undo/redo and individual route edits in the browser. Those observations remain historical; this release's new ball behavior is covered above. Backup serialization is tested; native download/print completion remains unverified in the in-app browser.
