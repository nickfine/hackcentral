# HDC P3 ROI Token Producer Gap Analysis

- Timestamp (UTC): 2026-03-01T21:26:00Z
- Task ID: `P3.ROI.01`
- Scope: verify whether current backend emits token-bearing audit actions for ROI `R9.1`

## Findings

1. Current backend `logAudit` emitters (in `forge-native/src/backend/hdcService.ts`) record actions such as:
   - `event_created`
   - `status_changed`
   - `draft_deleted`
   - `hack_submitted`
   - `sync_complete` / `sync_partial` / `sync_failed`
   - `sync_retry`
2. No code-path currently emits token-usage audit actions (e.g., `llm_usage_logged`) with token-bearing payloads into `EventAuditLog.new_value`.
3. Live source audit corroborates this:
   - all observed audit rows are `event_created`
   - token-bearing payload keys are absent in production scope

## Impact

- ROI token volume and spend remain correctly wired but source-constrained (`available_partial`) until a token producer is integrated.

## Recommended Closure Path for P3.ROI.01

1. Add/restore a token telemetry producer that writes token-bearing payloads into `EventAuditLog.new_value` (or approved equivalent source table wired into ROI).
2. Capture first non-zero ROI spend checkpoint and live UI evidence.
3. Then close `P3.ROI.01` and transition to `P3.FORK.01`.
