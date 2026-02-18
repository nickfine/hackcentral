# HDC v2 Phase 6 Regression Triage Checklist

Prepared at (UTC): 2026-02-18T15:33:00Z

## Trigger Conditions

Run this checklist when any of the following occurs:
- migration dry-run integrity regression,
- performance budget breach,
- missing runtime telemetry signals,
- sustained Supabase `429` rate-limit failures,
- sync failures trending upward.

## Triage Steps

1. Classify severity
- `SEV-2`: integrity regression, repeat budget breach, persistent sync/write failure
- `SEV-3`: temporary telemetry capture gap, single-run anomaly

2. Capture baseline evidence
- latest dry-run artifact
- latest perf harness output
- latest production log snippet for telemetry/sync

3. Contain impact
- pause non-essential deploys on `SEV-2`
- stop repeated write retries that may amplify throttling

4. Diagnose path
- Data integrity path: page IDs, admin rows, sync-state rows
- Performance path: hot query/read route, sync loop duration
- Telemetry path: invocation coverage, environment mismatch, logger emission path

5. Mitigate
- apply runbook retry/rollback flow
- perform controlled re-run after mitigation
- document what changed and why

6. Verify closure
- dry-run integrity restored
- p95 budgets restored
- telemetry metrics observed again in production logs

## Rollback Gate

If mitigation fails or regression worsens:
1. Snapshot affected rows.
2. Execute rollback restore order (`Event` -> `EventAdmin` -> `EventSyncState` -> `EventAuditLog`).
3. Re-run verification checks before reopening normal operations.

## Closeout Record

- incident summary:
- root cause:
- corrective actions:
- preventive actions:
- owner/date:
