# HDC P3 Weekly Cadence Checkpoint

Timestamp (UTC): 2026-03-02T11:38:24.791Z
Decision: `GO`

## Commands Executed

```bash
cd /Users/nickster/Downloads/HackCentral
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

## Extraction Readiness Summary

- extractionCadenceStatus: `pending_results_event`
- resultsEventCount: `0`
- Lifecycle counts:
  - `draft`: `56`
- Next upcoming results announce at: `2026-03-09T18:00:00.000Z`
- Next upcoming event: `One Day Test`

## Action Guidance

- Recommended next action: Re-run `qa:p3:weekly-cadence` at or after `2026-03-09T18:00:00.000Z` to trigger first non-empty extraction sample.

## Evidence

- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-20260302-113824Z.txt`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-113824Z.json`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-CADENCE-CHECKPOINT-20260302-113824Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-113824Z.json`

