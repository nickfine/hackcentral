# HDC v2 Phase 6 Ops Runbook

Prepared at (UTC): 2026-02-18T15:30:00Z  
Status: Active

## Purpose

Provide a repeatable operations procedure for post-Phase-5 stability checks, telemetry verification, and rollback-ready response.

## Scope

- Weekly migration integrity dry-run on canonical production target.
- Weekly performance baseline re-check.
- Weekly production runtime telemetry capture for both key metrics.
- Incident triage and rollback sequence.

## Canonical Context

- Canonical event query: `HDC Auto`
- Canonical production instance ID: `075f09ae-1805-4a88-85bc-4cf43b03b612`
- Confluence site: `hackdaytemp.atlassian.net`
- Forge app: `hackday-central` (`production`)

## Command Catalog

1. Migration dry-run (production):
```bash
npm -C /Users/nickster/Downloads/HackCentral run qa:phase5:migration-dry-run -- --environment production
```

2. Performance harness:
```bash
npm -C /Users/nickster/Downloads/HackCentral run test:perf:phase5
```

3. Production telemetry pull (last 30 minutes):
```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
forge logs -e production --since 30m --limit 1000 | rg "hdc-performance-telemetry|sync_execution|registry_lookup" -n
```

## Weekly Verification Procedure

1. Run migration dry-run command.
2. Confirm dry-run summary has:
   - `Missing page IDs: 0`
   - `Missing parent page IDs: 0`
   - `No primary admin: 0`
   - `No sync state: 0`
   - `Total submitted hacks: >= 1`
3. Run perf harness command.
4. Confirm p95 budgets:
   - `registry_lookup` p95 `< 120ms`
   - `complete_and_sync` p95 `< 220ms`
5. Pull production logs and confirm at least one event each:
   - `metric=registry_lookup`
   - `metric=sync_execution`
6. Save a timestamped artifact in `/Users/nickster/Downloads/HackCentral/docs/artifacts/` with results and command outputs summarized.

## Alert Thresholds and Response

1. Migration integrity regression (any required field missing):
   - Severity: `SEV-2`
   - Action: stop release changes, run rollback checklist, open incident artifact.

2. Performance budget breach (p95 above threshold on two consecutive runs):
   - Severity: `SEV-2`
   - Action: freeze deploys, collect telemetry + profiling evidence, triage repository/service hot paths.

3. Missing runtime telemetry signals for both metrics after controlled invocation:
   - Severity: `SEV-3`
   - Action: validate invocation path/environment, verify logging in production line, re-run controlled capture.

4. Sustained Supabase 429s on operational writes:
   - Severity: `SEV-2`
   - Action: use bounded retries, reduce write burst, apply manual SQL fallback only with audit note.

## Sync Incident Decision Tree

1. `syncStatus=failed` and `retryable=true`:
   - Run one `Retry Sync`.
   - If failure repeats, capture telemetry and escalate.

2. `syncStatus=failed` and `retryable=false`:
   - Treat as terminal configuration/data issue.
   - Do not spam retries; fix root cause first.

3. `syncStatus=partial`:
   - Capture pushed/skipped counts.
   - Retry once; if persistent partial, escalate as data-quality incident.

## Rollback Sequence

1. Snapshot affected rows before corrective changes:
   - `Event`, `EventAdmin`, `EventSyncState`, `EventAuditLog`.
2. Restore in order if rollback is required:
   - `Event` -> `EventAdmin` -> `EventSyncState` -> `EventAuditLog`.
3. Re-run production dry-run and confirm all integrity checks pass.
4. Confirm Confluence child pages remain reachable for restored page IDs.
5. Publish rollback evidence artifact under `/Users/nickster/Downloads/HackCentral/docs/artifacts/`.

## Ownership

- Engineering on-call:
  - runs weekly verification commands and telemetry checks.
- Product/Ops owner:
  - reviews weekly artifact, tracks open actions, and confirms release posture.

## Open Non-Blocking Hygiene

- Manual Confluence page archive/delete pending for orphan IDs:
  - `6029333`
  - `5767177`
