# HDC v2 Phase 4 Prep - Sync and Audit Integrity

Prepared at (UTC): 2026-02-18T11:26:21Z

## Scope prepared
- Sync status semantics and user-visible retry guidance.
- Completion read-only lock behavior.
- Audit retention policy (`latest 100` entries).
- Archive behavior (`auto-archive at 90 days`, hidden from switcher recent).

## Sync status contract draft
- `idle`: no sync run executed yet.
- `in_progress`: current sync run active.
- `success`: full sync completed without recoverable errors.
- `partial_success`: sync completed with recoverable item-level failures.
- `failed_retryable`: sync failed, retry permitted by admin.
- `failed_terminal`: sync failed due non-retryable configuration/permission issue.

## Admin-facing retry guidance draft
- `failed_retryable`: show `Retry sync` CTA with last error category and timestamp.
- `failed_terminal`: show `Fix required` guidance with action text and disable retry.
- `partial_success`: show both successful count and failed count with retry CTA for failed subset.

## Audit retention implementation checklist
- Add repository-level cap query for audit fetch (`ORDER BY created_at DESC LIMIT 100`).
- Add unit test ensuring entries >100 return only latest 100.
- Add test ensuring stable ordering for equal timestamps (secondary key by ID).

## Archive behavior test checklist
- Event completed + `completedAt` older than 90 days -> archived in derived status.
- Archived events excluded from switcher `Recent` section.
- Archived events remain accessible by direct page URL for audit traceability.

## Planned execution order once Phase 3 blocker clears
1. Implement sync status enum expansion and mapping in backend service.
2. Add admin-facing retry messaging contract to frontend state.
3. Implement audit retention cap and tests.
4. Implement archive age computation and switcher filter tests.
