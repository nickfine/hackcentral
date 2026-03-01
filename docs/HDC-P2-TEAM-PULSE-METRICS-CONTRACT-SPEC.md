# HDC P2 Team Pulse Metrics Contract Spec

Last updated: 2026-03-01 14:05 GMT
Owner: HackDay Central Engineering
Task ID: `P2.METRICS.01`
Roadmap refs: `R7.1`, `R7.2`, `R7.3`, `R7.4`

## Scope

This spec defines the Phase 2 Team Pulse metrics contract shipped through `getBootstrapData` for the global-page UI.

P0 metrics in scope:

1. Reuse rate (`R7.1`)
2. Cross-team adoption (`R7.2`)
3. Time-to-first-hack median + trend (`R7.3`)
4. Problem Exchange conversion (`R7.4`)

## API Contract

`BootstrapData` now includes:

```ts
teamPulse?: TeamPulseMetrics | null
```

`TeamPulseMetrics` shape:

```ts
{
  calculatedAt: string;
  reuseRatePct: number;
  reusedArtifactCount: number;
  totalArtifactCount: number;
  crossTeamAdoptionCount: number;
  crossTeamAdoptionEdges: Array<{
    sourceTeamId: string;
    sourceTeamLabel: string;
    targetTeamId: string;
    targetTeamLabel: string;
    reuseCount: number;
  }>;
  timeToFirstHackMedianDays: number | null;
  timeToFirstHackSampleSize: number;
  timeToFirstHackTrend: Array<{
    periodStart: string; // month start in UTC
    periodLabel: string; // YYYY-MM
    medianDays: number | null;
    sampleSize: number;
  }>;
  problemConversionPct: number;
  solvedProblemCount: number;
  totalProblemCount: number;
}
```

## Metric Definitions

1. `reuseRatePct`:
   - numerator: non-archived artifacts with `reuse_count > 0`
   - denominator: all non-archived artifacts
   - rounded to 1 decimal
2. `crossTeamAdoptionCount`:
   - counts `ArtifactReuse` events where artifact source team and reuser team differ
   - source team resolved from artifact source project `team_id` (fallback: source owner user)
   - adopter team resolved from `TeamMember` accepted membership (fallback: reuser user)
3. `timeToFirstHackMedianDays`:
   - per-user duration from `User.created_at` to first owned hack-submission project `created_at`
   - median rounded to 1 decimal
   - trend buckets by month (`YYYY-MM`) of first-hack timestamp; currently last 6 buckets
4. `problemConversionPct`:
   - numerator: visible problems in `status='solved'`
   - denominator: visible problems (`moderation_state != 'removed'`)
   - rounded to 1 decimal

## UI Contract

Team Pulse view displays:

1. Reuse rate tile with numerator/denominator counts
2. Cross-team adoption total
3. Time-to-first-hack median with sample size
4. Problem conversion rate with solved/total counts
5. Cross-team adoption matrix table (top edges)
6. Time-to-first-hack monthly trend list

Export action now emits current Team Pulse contract payload to JSON.

## Fallback and Compatibility

1. If Team/TeamMember tables are unavailable, cross-team metrics gracefully fall back to user-level labels.
2. If required metric tables are missing, each metric degrades to zero/null rather than failing bootstrap.
3. Convex bootstrap path remains compatible because `teamPulse` is optional.

## Validation

```bash
npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts
npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts tests/forge-native-showcase-contract.spec.ts tests/forge-native-showcase-runtime-modes.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
```
