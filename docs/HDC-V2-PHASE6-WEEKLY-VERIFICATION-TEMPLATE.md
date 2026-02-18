# HDC v2 Phase 6 Weekly Verification Template

Use this template for the weekly Phase 6 operations check artifact.

## Metadata

- Week of:
- Generated at (UTC):
- Operator:
- Environment: production
- Canonical query: `HDC Auto`

## Run Log

1. Migration dry-run
- Command:
```bash
npm -C /Users/nickster/Downloads/HackCentral run qa:phase5:migration-dry-run -- --environment production
```
- Artifact path:
- Pass/Fail:

2. Performance harness
- Command:
```bash
npm -C /Users/nickster/Downloads/HackCentral run test:perf:phase5
```
- Result summary:
  - `registry_lookup` p95:
  - `complete_and_sync` p95:
- Pass/Fail:

3. Production telemetry capture
- Command:
```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
forge logs -e production --since 30m --limit 1000 | rg "hdc-performance-telemetry|sync_execution|registry_lookup" -n
```
- `registry_lookup` seen: yes/no
- `sync_execution` seen: yes/no
- Pass/Fail:

## Integrity Checklist

- Missing page IDs: `0`
- Missing parent page IDs: `0`
- No primary admin: `0`
- No sync state: `0`
- Total submitted hacks: `>= 1`

## Budget Checklist

- `registry_lookup` p95 `< 120ms`
- `complete_and_sync` p95 `< 220ms`

## Overall Decision

- Status: `PASS` / `FAIL` / `CONDITIONAL`
- Release posture impact:
- Required follow-up actions:

## Incident Notes (if any)

- Severity:
- Symptoms:
- Mitigation taken:
- Next checkpoint owner:
