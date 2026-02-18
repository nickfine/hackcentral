# HDC v2 Phase 5 Telemetry Comparison (Post-Release)

Generated at (UTC): 2026-02-18T15:16:00Z

## Scope
- Compare latest Phase 5 performance sample against recorded baseline.
- Check production Forge logs for emitted `[hdc-performance-telemetry]` events.

## Baseline (recorded earlier)
- Source: `/Users/nickster/Downloads/HackCentral/learnings.md`
- `registry_lookup`: `p50=0.64ms`, `p95=7.63ms` (budget `120ms`)
- `complete_and_sync`: `p50=1.02ms`, `p95=7.48ms` (budget `220ms`)

## Fresh Sample (2026-02-18 15:15 UTC)
- Command: `npm -C /Users/nickster/Downloads/HackCentral run test:perf:phase5`
- `registry_lookup`: `p50=0.40ms`, `p95=7.18ms` (budget `120ms`)
- `complete_and_sync`: `p50=1.01ms`, `p95=5.32ms` (budget `220ms`)

## Delta vs Baseline
- `registry_lookup`
  - `p50`: `0.64ms -> 0.40ms` (`-37.5%`)
  - `p95`: `7.63ms -> 7.18ms` (`-5.9%`)
- `complete_and_sync`
  - `p50`: `1.02ms -> 1.01ms` (`-1.0%`)
  - `p95`: `7.48ms -> 5.32ms` (`-28.9%`)

## Production Log Telemetry Check
- Command: `forge logs -e production --verbose --since 4h --limit 1000`
- Window checked: `2026-02-18T11:15:10Z` to `2026-02-18T15:15:11Z`
- Observed in window:
  - `[hdc-migration-ops]` retry/timeout history from seed attempts.
  - `[hdc-switcher-telemetry]` records from app resolver.
- Not observed in this window:
  - `[hdc-performance-telemetry]` entries for `metric=registry_lookup` or `metric=sync_execution`.

## Assessment
- Performance harness remains comfortably under Phase 5 p95 budgets.
- No regression detected vs baseline; latest sample is equal or better on all tracked metrics.
- Production runtime perf telemetry is currently under-observed in the checked window; this appears to be a traffic/invocation coverage gap rather than a budget breach signal.

## Next capture action
- Trigger one admin `completeAndSync` and one high-traffic registry read in production, then re-run log check to capture at least one runtime `[hdc-performance-telemetry]` event per metric.
