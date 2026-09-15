# What makes a useful rugby notebook?

Research and implementation review, 15 September 2026.

## Conclusion

A good personal coaching tool makes it easy to **reuse a starting point, refine the movement, explain the idea, run the practice, and retain what you learned**. Touchline's first version handled drawing and storage. This update connects those activities into a practical planning and coaching workflow.

This is a design inference from primary product documentation, coaching guidance and a source-code audit. It is not a claim that these features measurably improve rugby performance or that the user is a professional coach. The user's confirmed preference remains clean, calm and effortless.

## Method and evidence quality

Three parallel investigations covered tactical-diagram products, session-planning/coaching principles, and the existing implementation. Sources were current vendor product pages, vendor help/release notes, World Rugby guidance, Nielsen Norman Group usability guidance and W3C accessibility guidance. Product marketing establishes advertised capabilities, not effectiveness. Help documentation is stronger evidence of an intended workflow. Coaching guidance establishes useful planning principles, not a prescription for every age, ability or rugby format.

No competitor accounts were purchased, no comparative user study was conducted, and no usage telemetry supports a conversion or retention claim. This pass used code review, meaningful logic tests, local API integration, type checks and a production build; no new browser interaction study was conducted. The initial release's browser checks remain historical evidence, not proof of every new interaction.

## Comparative findings

| Product/source | Documented strength | Why it matters for Touchline — inference |
| --- | --- | --- |
| [TacticalPad training guide](https://www.tacticalpad.com/edu/formation.php) | Saved teams, object manipulation, paths, highlights, animated boards and presentation options | Repeated setup and explanation deserve as much attention as drawing the first arrow. |
| [TacticalPad release notes](https://tacticalpad.com/update/) | Continuing work on drawing, export, alignment and recovery | Reliability and correction are ongoing product work, not finishing touches. |
| [Rugby Tactics Board](https://www.rugbytacticsboard.com/) | Rugby formation presets and multi-stage tactical sequences | Provide rugby-specific starting shapes and allow sequence corrections without rebuilding the diagram. |
| [RugbySlate animator](https://animator.rugbyslate.com/login/) | Keyframe animation, field options and backward-compatible file loading described in release notes | Let authors control time and preserve old notebooks when the format grows. |
| [Rugby Slate move library](https://rugbyslate.com/backs-moves/) | Ideas organised by recognizable patterns | Retrieval should use the language of the idea; favorites, categories and text search are a lightweight start. |
| [Tactic3D rugby](https://www.tactic3d.com/rugby/Rugby-software-tactic.html) | Player-facing views, comments and isolating a player's movement | A focused teaching view can communicate an idea without importing the complexity of a 3D authoring tool. |
| [Sportplan session planner](https://www.sportplan.net/drills/tutorial/sessionPlanner.jsp) | Plans combine personal sketches, drills and notes | The diagram-to-session handoff should be available from the diagram itself. |
| [Sportplan coaching tools](https://www.sportplan.net/drills/faq/en/tools.jsp) | Collection/reordering, slideshow delivery, print choices and categorized drawings | Planning, showing and printing are distinct tasks using the same coaching knowledge. |
| [SessionLab planner](https://help.sessionlab.com/en/articles/6166546-the-session-planner) | Automatic agenda timing and a proportional overview | Show what the plan actually contains and when each block begins; retain deliberate control over durations. |
| [SessionLab Time Tracker](https://help.sessionlab.com/en/articles/6103716-time-tracker-track-your-session-timing) | Delivery mode retains block context and supports timing adjustments | Live timing should support the coach's decisions. It should not silently advance or rewrite planned duration. |
| [SessionLab reuse](https://help.sessionlab.com/en/articles/4473066-reuse-methods-from-your-libraries-and-previous-sessions) | Reuse of existing activities and descriptions | Preserve setup and adaptations when a practice becomes part of another plan. |
| [SessionLab materials](https://help.sessionlab.com/en/articles/4473107-keep-track-of-the-materials-needed-to-run-your-session) | Block materials roll up into a session overview | Turn existing equipment notes into a usable packing list, without guessing quantities. |
| [SessionLab completion](https://help.sessionlab.com/en/articles/13832824-track-delivered-sessions-with-completion-status) | Delivered sessions are distinguishable and reusable | Separate delivery history from a fresh copy of the plan. |

## Coaching principles translated into design

World Rugby's [session principles](https://passport.world.rugby/coaching/introduction-to-coaching/the-principles-of-a-coaching-session/) describe purpose, observation, adaptation and review. Touchline now offers a short session focus and an observable “Look for” cue. These are optional: a useful notebook should permit a rough idea before it becomes a complete plan.

[Coaching through games](https://passport.world.rugby/coaching/coaching-children/coaching-children-the-basics/coaching-through-games/) distinguishes an objective, a player problem, questions and suitable progressions/regressions. Its context is children; generalizing the interface pattern is our inference. Optional “Make easier” and “Add challenge” notes give the author a place for their own decisions. The app does not automatically prescribe intensity, contact, dimensions or age-specific activities.

World Rugby's [how to coach](https://passport.world.rugby/coaching/introduction-to-coaching/how-to-coach/) and [positive learning environment](https://passport.world.rugby/coaching/coaching-children/coaching-children-the-basics/creating-a-positive-learning-environment/) include reflection and discussion. A delivered session now offers two concise prompts: what worked, and what to change or revisit. A fresh session copy carries the latter note forward while clearing its delivery date and review.

## Usability principles

[NN/G's usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) support visible status, error prevention, recognition and reversible actions. Applied here: the selected carrier cannot accidentally clear its own passes; block deletion has selective undo; recovery retains saved data and local differences instead of trusting a download trigger before replacing edits.

[Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supports keeping common actions visible and infrequent detail secondary. Applied here: compact workspace framing, visible Show play/Add to session/Mirror actions, and optional setup/adaptation fields tucked into clearly labeled details. Richer capability should not require every field to be filled.

[W3C's target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) specifies a 24×24 CSS-pixel minimum with exceptions. Touchline uses larger mobile action targets and 48-pixel coach timer buttons. These changes are not a claim of full WCAG conformance; drawing geometry, labels, contrast and focus behavior still deserve a dedicated accessibility audit.

## Changes shipped from the research

| Existing friction | Implemented improvement | Acceptance evidence |
| --- | --- | --- |
| An empty pitch requires repetitive positioning | Five original editable starters: blank, 3 v 2, backline, connected defence, practice channel | Every starter creates independent schema-valid records; available to existing accounts |
| Correcting a route means deleting and redrawing | Select an arrow or sequence pencil; edit start, duration and run endpoint | Existing fractional values preserved; overlap and possession chronology rejected before applying |
| Exploring the opposite edge means moving every item | Mirror the whole play, with undo | Intermediate runner and ball positions reflect correctly; mirroring twice restores the original |
| An editing interface distracts during explanation | Show play view, previous/next moments, player focus, playback and scrubbing | Type/build integration; source review of state and bounds |
| Repeated tab switching to insert a play | Add to session on the editor and play cards | Copies setup/cues/equipment/adaptations; keeps notes independent of later play edits |
| Library becomes harder to navigate | Categories, favorites, recent/name ordering, search through cues and setup | Persisted favorite field; constrained filters; existing text-search flow retained |
| A timer loses its place when closed | Coach mode lifted outside tabs, retaining paused position | Read-only lifecycle review; pure wall-clock tests cover delayed ticks, pause, extension and overtime |
| Countdown lacks useful context | Current diagram/cues/equipment/adaptations, next block, manual progression, +1 minute | Plan snapshot isolated from live timing; planned minutes never rewritten |
| Lessons disappear between sessions | Delivered marker, optional reflection and “Plan next session” | Copy tests preserve coaching content and carry next-time note while clearing delivery history |
| Equipment lives in scattered notes | Conservative session equipment list and richer print output | Exact-wording deduplication tested; no automatic quantity summation |
| Conflict recovery can discard an undelivered download | Fetch saved notebook and retain local differences as recovery copies | API roundtrip, valid reference remapping, canonical equality and repeat-recovery regression tests |

## Deliberate limits and next useful research

- Coach timer progress is local to the current tab. Closing coach mode pauses and preserves it; page refresh starts a new timer. Saved plans/reflections remain account-backed.
- Starting coach mode snapshots the plan/diagrams for that run. Editing the notebook while it is paused does not mutate the running snapshot. Session diagram links outside a run remain live links, including for delivered sessions; this is not an immutable archive.
- Equipment remains free text. “6 cones” and “8 cones” are separate entries, not an invented total. A quantity model would require more explicit author input.
- No automatic time redistribution: a balanced total is not evidence of good practice design. The user retains control of each block's duration.
- No team administration, attendance, social feed, marketplace, AI-generation dependency, 3D engine or automatic coaching-performance score was added. Those are different products and require evidence of need.
- Offline access and shareable video are plausible next investigations, but they need a storage/export design and real field testing. The current app continues to require a connection for saving.

The most useful next study is observational: ask the owner to create one variation, build one real session, run it, then reuse the reflection a week later. Record where they hesitate, what they skip and what they reach for outside Touchline. That would test the product hypothesis more credibly than adding another competitor feature.
