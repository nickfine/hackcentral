# HDC v2 Phase 5 Migration Dry-Run

Generated at (UTC): 2026-02-18T13:48:21.408Z
Environment: production
Event query: HackDay 2026
Matched events: 0

## Summary
- Missing page IDs: 0
- Missing parent page IDs: 0
- No primary admin: 0
- No sync state: 0
- No submitted hacks: 0
- Total submitted hacks: 0
- Total projects: 0
- Total audit rows: 0

## Event Checks
- No events matched the query.

## Rollback Checklist
- Snapshot Event/EventAdmin/EventSyncState/EventAuditLog rows for affected event IDs before migration apply.
- If migration validation fails, restore event rows first, then EventAdmin, then EventSyncState, then EventAuditLog.
- Re-run this dry-run and verify zero regressions in page IDs, admin assignment, and sync state presence.
- Confirm Confluence child pages remain reachable for all restored confluencePageId values.

