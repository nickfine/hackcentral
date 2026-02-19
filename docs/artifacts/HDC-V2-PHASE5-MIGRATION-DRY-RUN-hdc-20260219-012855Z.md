# HDC v2 Phase 5 Migration Dry-Run

Generated at (UTC): 2026-02-19T01:28:55.134Z
Environment: production
Event query: HDC
Matched events: 6

## Summary
- Missing page IDs: 0
- Missing parent page IDs: 0
- No primary admin: 0
- No sync state: 0
- No submitted hacks: 5
- Total submitted hacks: 1
- Total projects: 1
- Total audit rows: 7

## Event Checks
- HDC Auto 1771412434287 (075f09ae-1805-4a88-85bc-4cf43b03b612)
  - lifecycle: completed
  - confluencePageId: 5799956
  - confluenceParentPageId: 5668895
  - primary/co-admin count: 1/0
  - sync status: complete (present=true)
  - submitted hacks: 1, total projects: 1
  - audit rows: 2
- HDC Auto 1771457590664 (22eef630-8c1f-4663-a5c1-bcd851e8e718)
  - lifecycle: draft
  - confluencePageId: 7241729
  - confluenceParentPageId: 7045123
  - primary/co-admin count: 1/0
  - sync status: not_started (present=true)
  - submitted hacks: 0, total projects: 0
  - audit rows: 1
- HDC Auto DEV 1771415612395 (e6b25c00-1be9-49ab-b122-e3f7d03e9d8b)
  - lifecycle: draft
  - confluencePageId: 5799975
  - confluenceParentPageId: 5799944
  - primary/co-admin count: 1/0
  - sync status: not_started (present=true)
  - submitted hacks: 0, total projects: 0
  - audit rows: 1
- HDC FullWidth 1771464315923 (9e06221f-29fb-4beb-9010-ff5741723afd)
  - lifecycle: draft
  - confluencePageId: 7241751
  - confluenceParentPageId: 7045123
  - primary/co-admin count: 1/0
  - sync status: not_started (present=true)
  - submitted hacks: 0, total projects: 0
  - audit rows: 1
- HDC Spinout 1771461223558 (4536d3de-aab6-4928-8cbe-a5b9457797c1)
  - lifecycle: draft
  - confluencePageId: 6782997
  - confluenceParentPageId: 7045123
  - primary/co-admin count: 1/0
  - sync status: not_started (present=true)
  - submitted hacks: 0, total projects: 0
  - audit rows: 1
- HDC Spinout 1771461373277 (5293915c-a129-42d1-addd-eecf309b3fab)
  - lifecycle: draft
  - confluencePageId: 6783016
  - confluenceParentPageId: 5668895
  - primary/co-admin count: 1/0
  - sync status: not_started (present=true)
  - submitted hacks: 0, total projects: 0
  - audit rows: 1

## Rollback Checklist
- Snapshot Event/EventAdmin/EventSyncState/EventAuditLog rows for affected event IDs before migration apply.
- If migration validation fails, restore event rows first, then EventAdmin, then EventSyncState, then EventAuditLog.
- Re-run this dry-run and verify zero regressions in page IDs, admin assignment, and sync state presence.
- Confirm Confluence child pages remain reachable for all restored confluencePageId values.

