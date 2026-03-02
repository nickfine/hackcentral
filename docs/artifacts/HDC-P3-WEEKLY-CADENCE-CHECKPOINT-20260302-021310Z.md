# HDC P3 Weekly Cadence Checkpoint

Timestamp (UTC): 2026-03-02T02:13:10.240Z
Decision: `GO`

## Commands Executed

```bash
cd /Users/nickster/Downloads/HackCentral
npm run qa:p3:weekly-cadence -- --since 24h --limit 4000 --project-ref ssafugtobsqxmqtphwch
```

## Observability Summary

- Parsed events: `36`
- Window: `2026-03-02T00:21:11.814Z` to `2026-03-02T01:47:33.041Z`
- Metric counts:
  - `feed_signal_health`: `26`
  - `roi_signal_health`: `6`
  - `roi_export`: `4`
- Alert frequency:
  - `recommendation_coverage_below_threshold`: `26`
- Warning frequency:
  - `trend_points_below_threshold`: `6`

## Extraction Readiness Summary

- extractionCadenceStatus: `pending_results_event`
- resultsEventCount: `0`
- Lifecycle counts:
  - `draft`: `56`

## Evidence

- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-20260302-021310Z.txt`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-021310Z.json`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-CADENCE-CHECKPOINT-20260302-021310Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-021310Z.json`

