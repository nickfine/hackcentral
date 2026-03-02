# HDC P3 Observability Weekly Cadence Checkpoint

Timestamp (UTC): 2026-03-02T12:59:04.562Z
Task scope: Phase 3 telemetry cadence (`feed_signal_health`, `roi_signal_health`, `roi_export`)
Decision: `WARN`

## Commands Executed

```bash
REPO_ROOT="${HDC_REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT"
npm run qa:p3:telemetry-static-check
npm run qa:p3:obs-weekly-cadence
```

## Sample Configuration

- log window: `24h`
- log limit: `4000`

## Live Telemetry Sample Summary

- Sample lines: `78`
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

## Decision Inputs

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

## Evidence

- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-20260302-125904Z.txt`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-125904Z.json`
