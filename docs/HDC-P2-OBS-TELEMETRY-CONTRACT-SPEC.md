# HDC P2 Observability Telemetry Contract Spec

Last updated: 2026-03-01 17:02 GMT
Owner: HackDay Central Engineering
Task ID: `P2.OBS.01`
Roadmap refs: `R6`, `R7`, `R8`

## Scope

Phase 2 observability baseline for adoption-influence modules:

1. Recognition snapshot reads (backend bootstrap path)
2. Team Pulse export actions (CSV/JSON)

## Telemetry Channel

`[hdc-phase2-telemetry]`

All events are JSON payloads written via `console.info` from Forge backend code paths.

## Event Contracts

### 1) `recognition_snapshot_read`

Emitted from `SupabaseRepository.getBootstrapData` after `recognition` payload assembly.

Required fields:

- `metric`: `recognition_snapshot_read`
- `source`: `supabase_repository`
- `provider`: `supabase`
- `mentorPolicyVersion` (string)
- `pathwayPolicyVersion` (string)
- `buildersCount` (number)
- `sharersCount` (number)
- `solversCount` (number)
- `mentorsCount` (number)
- `qualifiedMentorChampionCount` (number)
- `qualifiedPathwayContributorCount` (number)
- `viewerBadgeCount` (number)

### 2) `team_pulse_export`

Emitted from backend resolver path `hdcTrackTeamPulseExport` (Supabase or convex fallback).

Required fields:

- `metric`: `team_pulse_export`
- `source`: `supabase_repository` or `convex_fallback`
- `provider`: `supabase` or `convex`
- `format`: `json` or `csv`
- `exportedAt` (ISO timestamp)
- `hasTeamPulseData` (boolean)
- `reuseRatePct` (number)
- `crossTeamAdoptionCount` (number)
- `crossTeamEdgeCount` (number)
- `timeToFirstHackMedianDays` (number or `null`)
- `timeToFirstHackSampleSize` (number)
- `timeToFirstHackTrendPointCount` (number)
- `problemConversionPct` (number)
- `solvedProblemCount` (number)
- `totalProblemCount` (number)
- `csvRowCount` (number for CSV exports, `null` for JSON exports)
- `viewerTimezone` (string)
- `viewerSiteUrl` (string)
- `loggedAt` (ISO timestamp)

## Resolver Contract

`hdcTrackTeamPulseExport`

Input: `TrackTeamPulseExportInput`

Output: `TrackTeamPulseExportResult`

- `logged=true`
- `metric='team_pulse_export'`
- `loggedAt` ISO timestamp

## Validation

```bash
cd /Users/nickster/Downloads/HackCentral-p1-child-01
npm run test:run -- tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
npm run qa:p2:telemetry-static-check
```
