# HDC P3 Observability Telemetry Contract Spec

Last updated: 2026-03-02 00:00 GMT
Owner: HackDay Central Engineering
Task ID: `P3.OBS.01`
Roadmap refs: `R9`, `R12`

## Scope

Phase 3 observability telemetry for ROI and Home feed signal health.

In scope:

1. Feed signal-health telemetry emitted from `hdcGetHomeFeed` read paths.
2. ROI signal-health telemetry emitted from `hdcGetRoiDashboard` read paths.
3. ROI export telemetry emitted from `hdcTrackRoiExport`.
4. Explicit threshold fields and health state in telemetry payloads.
5. Reporting cadence definition for runbooks and checkpoint gates.

## Telemetry Channel

`[hdc-phase3-telemetry]`

All events are backend `console.info` JSON payloads.

## Event Contracts

### 1) `feed_signal_health`

Emitted from:

- `SupabaseRepository.getHomeFeed`
- `getHomeFeed` convex fallback in `forge-native/src/backend/hackcentral.ts`

Required fields:

- `metric`: `feed_signal_health`
- `source`: `supabase_repository` or `convex_fallback`
- `provider`: `supabase` or `convex`
- `policyVersion`
- `activityStatus`
- `recommendationStatus`
- `includeRecommendations`
- `itemCount`
- `recommendationCount`
- `activityCategoryCount`
- `expectedActivityCategoryCount`
- `recommendationCategoryCount`
- `expectedRecommendationCategoryCount`
- `activityCoveragePct`
- `recommendationCoveragePct`
- `activityCoverageThresholdPct`
- `recommendationCoverageThresholdPct`
- `healthy`
- `alerts` (array)
- `viewerTimezone`
- `viewerSiteUrl`
- `loggedAt`

Threshold policy:

- `activityCoverageThresholdPct = 80`
- `recommendationCoverageThresholdPct = 67`

Alert policy:

- `activity_coverage_below_threshold`
- `recommendation_coverage_below_threshold`
- `empty_activity_feed`

### 2) `roi_signal_health`

Emitted from:

- `SupabaseRepository.getRoiDashboard`

Required fields:

- `metric`: `roi_signal_health`
- `source`: `supabase_repository`
- `provider`: `supabase`
- `policyVersion`
- `window`
- `teamFilterApplied`
- `businessUnitFilterApplied`
- `tokenSourceStatus`
- `costRateCardStatus`
- `outputSourceStatus`
- `businessUnitSourceStatus`
- `totalTokenVolume`
- `totalCost`
- `totalOutputs`
- `costPerHack`
- `tokenSignalRowCount`
- `tokenAttributedRowCount`
- `tokenAttributionPct`
- `trendPointCount`
- `tokenAttributionThresholdPct`
- `highCostPerHackThresholdGbp`
- `minimumTrendPoints`
- `healthy`
- `alerts` (critical)
- `warnings` (non-critical)
- `viewerTimezone`
- `viewerSiteUrl`
- `loggedAt`

Threshold policy:

- `tokenAttributionThresholdPct = 60`
- `highCostPerHackThresholdGbp = 0.25`
- `minimumTrendPoints = 2`

Critical alert policy:

- `spend_without_outputs`
- `cost_per_hack_above_threshold`
- `token_attribution_below_threshold`

Warning policy:

- `trend_points_below_threshold`
- `business_unit_coverage_partial`
- `cost_rate_card_partial`

### 3) `roi_export`

Emitted from:

- `SupabaseRepository.trackRoiExport`
- `trackRoiExport` convex fallback in `forge-native/src/backend/hackcentral.ts`

Resolver contract:

- Resolver: `hdcTrackRoiExport`
- Input: `TrackRoiExportInput`
- Output: `TrackRoiExportResult`

Required fields:

- `metric`: `roi_export`
- `source`: `supabase_repository` or `convex_fallback`
- `provider`: `supabase` or `convex`
- `format`: `csv` or `summary`
- `exportedAt`
- `window`
- `tokenSourceStatus`
- `costRateCardStatus`
- `outputSourceStatus`
- `businessUnitSourceStatus`
- `totalTokenVolume`
- `totalCost`
- `totalOutputs`
- `rowCount` (CSV only)
- `summaryLineCount` (summary only)
- `viewerTimezone`
- `viewerSiteUrl`
- `loggedAt`

## Reporting Cadence

1. Event cadence: emitted on every feed read, ROI read, and ROI export.
2. Daily operational sample: one production log sample per day (`--since 24h`) for channel presence and alert/warning counts.
3. Weekly checkpoint cadence: include one summarized artifact with:
- latest daily sample result,
- alert/warning frequency,
- explicit GO/NO-GO decision for continued rollout.

Telemetry payloads include `reportingCadence='daily_sample_weekly_checkpoint'` to keep runtime and docs aligned.

## Static Gate

`qa:p3:telemetry-static-check`

Must assert channel/event/resolver/type wiring references:

- `hdc-phase3-telemetry`
- `feed_signal_health`
- `roi_signal_health`
- `roi_export`
- `hdcTrackRoiExport`

## Validation

```bash
cd /Users/nickster/Downloads/HackCentral-p1-child-01
npm run test:run -- tests/forge-native-feed-contract.spec.ts tests/forge-native-roi-contract.spec.ts tests/forge-native-phase3-telemetry-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
npm run qa:p3:telemetry-static-check
```
