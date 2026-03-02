# HDC P3 Observability Weekly Cadence Checkpoint

Timestamp (UTC): 2026-03-02T02:40:11.957Z
Task scope: Phase 3 telemetry cadence (`feed_signal_health`, `roi_signal_health`, `roi_export`)
Decision: `GO`

## Commands Executed

```bash
cd /Users/nickster/Downloads/HackCentral
npm run qa:p3:telemetry-static-check
npm run qa:p3:obs-weekly-cadence
```

## Sample Configuration

- log window: `24h`
- log limit: `4000`

## Live Telemetry Sample Summary

- Sample lines: `49`
- Parsed events: `49`
- Window: `2026-03-02T00:21:11.814Z` to `2026-03-02T02:26:34.000Z`
- Metric counts:
  - `feed_signal_health`: `37`
  - `roi_signal_health`: `8`
  - `roi_export`: `4`
- Alert frequency:
  - `recommendation_coverage_below_threshold`: `37`
- Warning frequency:
  - `trend_points_below_threshold`: `8`

## Evidence

- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-20260302-024011Z.txt`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-024011Z.json`
