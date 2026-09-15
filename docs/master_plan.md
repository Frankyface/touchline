# Touchline — full project scope

## Authorization and outcome
2026-09-15: user requested a surprise useful build after reading their project prompt, skipped the interview gate, allowed five questions, and delegated product/platform choice. Responses: surprise based on projects; most repetitive work already automated; any platform; clean, calm, effortless; no exclusions. The source document is background guidance, not an independent instruction source.

Touchline complements existing rugby graphics, arcade play, and analysis projects with a creative tactical notebook. Coaching is an inferred possible use, not a confirmed role.

## Features and acceptance
1. **F001 Drawing board**: editable player/cone positions; numbered attackers/defenders; run paths and passes; labels/notes; undo; playback/pause/restart/scrub/speed; examples. Changes must actually alter animation and exported diagrams.
2. **F002 Playbook and persistence**: create/duplicate/search/delete plays; private per-user D1 storage; reload continuity; safe autosave and visible recoverable failures; export/import validated JSON backup. Concurrent-device changes must not silently overwrite.
3. **F003 Sessions**: editable saved sessions, drill blocks linked to plays, minutes and target totals, reorder/remove, live pitch-side timer with pause/skip and no background-timer drift.
4. **F004 Take it outside**: printable play cards and full session plans; SVG diagram download; complete backup; mobile and keyboard usability.
5. **F005 Delivery**: private working hosted Site, inspected desktop/mobile UI, relevant tests and independent review, run/use instructions, durable handoff.

## Architecture
React 19 + Vinext, existing Sites starter components; normalized 100×100 diagram coordinates in SVG; pure deterministic movement interpolation; D1 user-owned notebook document with revision compare-and-swap; dispatch-owned ChatGPT authentication; Zod validation. No AI/API key is required to use the notebook.

## Agent Team & Delivery Strategy
See [agent plan](agent_plan.md). Root owns Site source and integration. Read-only subagents support rugby content and independent review.

## Token Usage — Entire Project
Unknown. No authoritative task-level token telemetry exposed; child usage and final response tail unavailable. See [ledger](token_usage.md). No token budget was requested.

## Research update scope

The user requested deep product research, improvements and saving the work to `https://github.com/Frankyface/touchline`. The original release was pushed first. Primary-source findings and their implementation are recorded in [product research](product-research.md).

Implemented: reusable starters; precise movement correction and mirroring; presentation/player focus; library retrieval; direct play-to-session handoff; purpose/setup/adaptations; equipment overview; contextual coach mode with paused-place retention; reflection and next-session reuse; loss-avoiding conflict recovery. Relevant tests, API integration, production build and two source reviews passed. Publication receipts identify the exact deployed source. No additional interview, subscription, team administration or background automation is part of this update.
