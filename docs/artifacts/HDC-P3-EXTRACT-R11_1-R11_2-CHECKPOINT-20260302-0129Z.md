# HDC P3.EXTRACT.01 Baseline Checkpoint (R11.1 / R11.2)

Timestamp (UTC): 2026-03-02 01:29Z  
Task ID: `P3.EXTRACT.01`  
Decision: `GO_BASELINE`

## Scope Validated

1. `hdcGetHackdayExtractionCandidates` read contract.
2. `hdcTriggerPostHackdayExtractionPrompt` non-dry-run write path with idempotency behavior.
3. `hdcBulkImportHackdaySubmissions` non-dry-run write path with idempotency behavior.

## Migration State

- Migration file landed and applied:
  - `forge-native/supabase/migrations/20260302013000_phase3_extraction.sql`
- Created/verified tables:
  - `HackdayExtractionPrompt`
  - `HackdayExtractionImport`
- Verified constraints:
  - `hackday_extraction_prompt_unique_scope`
  - `hackday_extraction_import_unique_scope`
  - FK constraints to `Event` and `Project`

## Live Evidence

1. Source audit artifact:
   - `docs/artifacts/HDC-P3-EXTRACT-SOURCE-AUDIT-20260302-0119Z.json`
2. Non-dry-run resolver smoke artifact:
   - `docs/artifacts/HDC-P3-EXTRACT-LIVE-RESOLVER-SMOKE-20260302-0129Z.json`

Observed smoke behavior:

1. First prompt call:
   - `promptedParticipantCount=1`
2. Second prompt call:
   - `promptedParticipantCount=0`
   - `skippedAlreadyPromptedCount=1`
3. First import call:
   - `importedDraftCount=1`
4. Second import call:
   - `importedDraftCount=0`
   - `skippedAlreadyImportedCount=1`

## Data Hygiene

- Synthetic event/project/admin/audit/extraction/showcase rows created for validation were deleted after verification.
- Temporary `platform_admin` capability tag used for smoke access was reverted.

## Verification Commands

- `npm --prefix forge-native run typecheck` -> pass
- `npm --prefix forge-native run test:backend` -> pass (`15/15`)
- Supabase MCP-first attempted; apply/list operations required CLI fallback due permission scope.

## Risks / Follow-up

1. Baseline backend contract is validated, but Forge UI extraction controls are not yet wired.
2. A dedicated extraction operations runbook (replay/rollback) is still pending.
3. Consider adding a targeted extraction gate command (similar to prior phase telemetry gates) if this workflow expands.
