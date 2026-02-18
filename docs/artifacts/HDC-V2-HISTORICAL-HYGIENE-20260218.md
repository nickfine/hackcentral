# HDC V2 Historical Hygiene - 2026-02-18

Timestamp (UTC): 2026-02-18T12:46:45Z

## Scope executed
1. Removed stale Supabase `Event` rows left from pre-permission and intermediate create-flow attempts.
2. Verified no remaining `Event` rows with `confluence_page_id IS NULL`.
3. Verified only canonical QA `HDC Auto` rows remain in `Event` table.
4. Recorded unresolved manual Confluence page cleanup queue where API delete access is not available from this workspace.

## Supabase cleanup details
Project ref: `ssafugtobsqxmqtphwch` (`HackDay`)

Deleted event IDs (cascade across `EventAdmin`, `EventSyncState`, `EventAuditLog`, then `Event`):
- `cmiukfw93000007bja26l91xv` (`HackDay 2026`, null page id)
- `demo-event-2026` (`HackDay 2026 Demo`, null page id)
- `f9d8c0d0-971a-42df-a42b-ae7845ab3689` (`HDC Auto 1771412203620`, intermediate)
- `2e0c1753-8461-432e-aa2e-f1a815209b86` (`HDC Auto 1771412232294`, intermediate)

Post-clean verification:
- Remaining `HDC Auto` rows:
  - `075f09ae-1805-4a88-85bc-4cf43b03b612` -> page `5799956` (prod parent host lineage)
  - `e6b25c00-1be9-49ab-b122-e3f7d03e9d8b` -> page `5799975` (dev parent host lineage)
- `confluence_page_id IS NULL` rows: none.

## Pending manual cleanup queue (Confluence pages)
These old child pages may still exist in Confluence but are no longer referenced by Supabase registry:
- [Old intermediate child 6029333](https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=6029333)
- [Old intermediate child 5767177](https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5767177)

Reason still pending:
- No authenticated Confluence delete endpoint/tooling available in current workspace session (`Atlassian MCP search` returned `401 Unauthorized`).
- Safe fallback is manual archive/delete via Confluence UI by site admin.

## Historical blocker resolution marker
Pre-permission blocker window is now historical only:
- Confluence create/scope blocker (`403`/`401`) was resolved on 2026-02-18.
- Remaining Phase 4 work is feature hardening, not access unblocking.
