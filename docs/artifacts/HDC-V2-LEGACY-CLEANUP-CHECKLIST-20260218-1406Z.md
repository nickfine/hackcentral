# HDC v2 Legacy Cleanup Checklist

Generated at (UTC): 2026-02-18T14:06:13Z
Scope: Remaining historical/legacy cleanup items while Phase 5 seed closure is rate-limited.

## Item 1: Orphan Confluence Page Cleanup
- Owner: Confluence site admin (`hackdaytemp.atlassian.net`)
- Priority: High
- Background:
  - Supabase historical hygiene has already removed corresponding stale `Event` rows.
  - Confluence pages may still exist and cause confusion during QA/search.
- Action:
  - Archive or delete these pages in Confluence UI:
    - `pageId=6029333` -> [Open](https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=6029333)
    - `pageId=5767177` -> [Open](https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5767177)
- Verification:
  - Page URLs return archived/deleted state in Confluence UI.
  - No references remain in current migration artifacts or runbooks.
- Evidence to attach:
  - screenshot or audit note in runbook showing archive/delete completion.
- Unblock criteria:
  - Both page IDs are no longer active in Confluence navigation/search.

## Item 2: Canonical Migration Target Naming Normalization
- Owner: Product + backend owner
- Priority: High
- Background:
  - `HackDay 2026` dry-run currently returns `0` matches.
  - Active canonical production events are `HDC Auto*` with valid lineage/page IDs.
- Action options (pick one and standardize):
  1. Rename canonical `HDC Auto*` row(s) to the target naming convention (`HackDay 2026 ...`), or
  2. Update migration runbook/checklists to treat `HDC Auto*` IDs as canonical target for this release.
- Verification:
  - Command:
    - `npm -C /Users/nickster/Downloads/HackCentral run qa:phase5:migration-dry-run -- --event-query "HackDay 2026"`
  - Expected: at least one matching canonical event row with non-null page ID + parent ID.
- Evidence to attach:
  - latest migration dry-run artifact showing resolved target matching.
- Unblock criteria:
  - Canonical migration target query is stable and documented; no ambiguity between naming and actual IDs.

## Item 3: Seed Submission Closure Retry (after rate-limit window)
- Owner: backend owner
- Priority: Medium
- Background:
  - Current blocker is upstream Supabase `429 Too Many Requests` during seed writes.
- Action:
  - Retry seed through existing ops webtrigger (`seed_hack`) for event:
    - `075f09ae-1805-4a88-85bc-4cf43b03b612`
- Verification:
  - Re-run dry-run:
    - `npm -C /Users/nickster/Downloads/HackCentral run qa:phase5:migration-dry-run -- --event-query "HDC Auto"`
  - Expected: `Total submitted hacks > 0`.
- Evidence to attach:
  - latest dry-run artifact with non-zero submitted hack count.
- Unblock criteria:
  - Submitted-hack realism gap is closed for sync-volume readiness.

## Tracking note
- Until all three items above are closed, release posture remains **Conditional GO**.
