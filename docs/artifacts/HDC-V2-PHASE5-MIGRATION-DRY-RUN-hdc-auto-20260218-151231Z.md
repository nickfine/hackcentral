# HDC v2 Phase 5 Migration Dry-Run

Generated at (UTC): 2026-02-18T15:12:31.345Z
Environment: production
Event query: HDC Auto
Matched events: 2

## Summary
- Missing page IDs: 0
- Missing parent page IDs: 0
- No primary admin: 0
- No sync state: 0
- No submitted hacks: 1
- Total submitted hacks: 1
- Total projects: 1
- Total audit rows: 2

## Event Checks
- HDC Auto 1771412434287 (075f09ae-1805-4a88-85bc-4cf43b03b612)
  - lifecycle: draft
  - confluencePageId: 5799956
  - confluenceParentPageId: 5668895
  - primary/co-admin count: 1/0
  - sync status: not_started (present=true)
  - submitted hacks: 1, total projects: 1
  - audit rows: 1
- HDC Auto DEV 1771415612395 (e6b25c00-1be9-49ab-b122-e3f7d03e9d8b)
  - lifecycle: draft
  - confluencePageId: 5799975
  - confluenceParentPageId: 5799944
  - primary/co-admin count: 1/0
  - sync status: not_started (present=true)
  - submitted hacks: 0, total projects: 0
  - audit rows: 1

## Rollback Checklist
- Snapshot Event/EventAdmin/EventSyncState/EventAuditLog rows for affected event IDs before migration apply.
- If migration validation fails, restore event rows first, then EventAdmin, then EventSyncState, then EventAuditLog.
- Re-run this dry-run and verify zero regressions in page IDs, admin assignment, and sync state presence.
- Confirm Confluence child pages remain reachable for all restored confluencePageId values.

