# HDC P3 Weekly Cadence Checkpoint

Timestamp (UTC): 2026-03-02T12:59:04.516Z
Decision: `WARN`

## Commands Executed

```bash
REPO_ROOT="${HDC_REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT"
npm run qa:p3:weekly-cadence -- --since 24h --limit 4000 --project-ref ssafugtobsqxmqtphwch
```

## Observability Summary

- Parsed events: `78`
- Window: `2026-03-02T00:21:11.814Z` to `2026-03-02T11:19:58.566Z`
- Metric counts:
  - `feed_signal_health`: `61`
  - `roi_signal_health`: `13`
  - `roi_export`: `4`
- Alert frequency:
  - `recommendation_coverage_below_threshold`: `61`
- Warning frequency:
  - `trend_points_below_threshold`: `13`

## Observability Decision Inputs

- Required metrics:
  - `feed_signal_health`
  - `roi_signal_health`
  - `roi_export`
- Missing required metrics:
  - none
- Decision reasons:
  - Unhealthy events detected: 61
  - Alert keys detected: recommendation_coverage_below_threshold
  - Warning keys detected: trend_points_below_threshold

## Extraction Readiness Summary

- extractionCadenceStatus: `pending_results_event`
- resultsEventCount: `0`
- Lifecycle counts:
  - `draft`: `56`
- Next upcoming results announce at: `2026-03-09T18:00:00.000Z`
- Next upcoming event: `Nick Weds Test 2`

## Action Guidance

- Recommended next action: Re-run `qa:p3:weekly-cadence` at or after `2026-03-09T18:00:00.000Z` to trigger first non-empty extraction sample.

## Evidence

- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-20260302-125904Z.txt`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-125904Z.json`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-CADENCE-CHECKPOINT-20260302-125904Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-125904Z.json`

