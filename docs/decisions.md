# Decisions
- Product: an interactive rugby notebook adds a creative use case distinct from existing apps. No actual coaching role assumed.
- Calm editorial typography, deep green functional pitch, white paper surfaces, restrained motion. No decorative imagery needed for this tool.
- Durable D1 state and per-user revision control support phone/computer use. Browser storage is not authoritative.
- Original example content checked against World Rugby passing/backline concepts; animation does not simulate defenders.
- Starter dependency helper hit a Windows npm shim issue. Preserved package lock and used the installed npm CLI JavaScript entrypoint for the same install script.

## Research update

- Optimize the whole workflow: reuse, refine, explain, coach, reflect and reuse. Evidence and limits are in `product-research.md`.
- Keep detail optional and advanced setup/adaptations collapsible; retain visible everyday actions.
- Coach mode uses a stable plan/diagram snapshot. Runtime timing is local to the tab; closing pauses, tab switching preserves it, and refresh resets it. Extensions and overtime do not rewrite the plan or automatically advance activities.
- A repeated session gets new IDs, clears its date/completion/review and carries the next-time reflection forward. Ordinary session diagram links remain live, not historical snapshots.
- Preserve free-text equipment literally and deduplicate exact entries; do not infer quantities.
- Recover conflicts by merging the saved notebook with copies of divergent local records, remapping links and ignoring object key order/omitted optionals. Revision checks continue to reject stale writes.
- Optional model fields preserve old notebooks/backups with the current schema version and existing D1 table. No dependencies or database migration were needed.
- GitHub is the user's source archive; Sites remains the private hosted application. Both receive the validated product commit. Post-publication receipts may be a later documentation-only commit.
