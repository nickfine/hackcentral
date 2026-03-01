# HDC P3 ROI Contract Spec

Last updated: 2026-03-01 21:24 GMT  
Owner: HackDay Central Engineering  
Task ID: `P3.ROI.01`  
Roadmap refs: `R9.1`, `R9.2`, `R9.3`, `R9.4`, `R9.5`

## Scope

This spec defines the ROI dashboard contract and fallback policy for Phase 3.

In scope:

1. Admin-gated resolver contract for ROI payload retrieval.
2. Explicit source coverage reporting for token volume, cost rate cards, output signals, and business-unit attribution.
3. Baseline output aggregation (`hacks`, `artifacts`, `problems solved`, `pipeline progressions`) with trend and breakdown coverage.
4. Export bundle shape for CSV rows and formatted leadership summary text.

## Live Source Audit Baseline

Supabase MCP-first was executed and returned no projects in this workspace; CLI/management fallback evidence is captured in:

- `docs/artifacts/HDC-P3-ROI-DATASOURCE-AUDIT-20260301-1714Z.json`

Audit findings used by this contract:

1. Token volume is mapped from `EventAuditLog.new_value` payload keys (`tokenVolume`, `tokenCount`, `totalTokens`, `prompt/completion token` pairs) with partial attribution when actor/team context is missing.
2. Cost/spend (`R9.2`) is derived from configurable rate cards (env-backed with in-code defaults) applied to mapped token volumes, with model-key extraction from audit payloads.
3. Output sources are available and usable from:
   - `Project` (`source_type='hack_submission'`; when explicit status is absent, `hack_submission` source type is used as completion signal)
   - `Artifact` (non-archived publish count)
   - `Problem` (solved + visible)
   - `PipelineTransitionLog` (stage progression events)
4. Business-unit attribution (`R9.4`) resolves from `Team` record fields (where present) plus optional team-to-BU env map overrides.

## Resolver Contract

### Resolver

`hdcGetRoiDashboard`

### Input

`GetRoiDashboardInput`

```ts
{
  window?: 'weekly' | 'monthly' | 'quarterly';
  teamId?: string;
  businessUnit?: string;
}
```

### Output

`RoiDashboardSnapshot` with policy version:

- `policyVersion: 'r9-roi-scaffold-v1'`

Key payload blocks:

1. `sources`:
   - `tokenVolume` (`available` | `available_partial` | `unavailable`)
   - `costRateCard` (`available` | `available_partial` | `unavailable`)
   - `outputs` (`available` | `available_partial` | `unavailable`)
   - `businessUnit` (`available` | `available_partial` | `unavailable`)
2. `totals.outputs`:
   - `hacksCompleted`
   - `artifactsPublished`
   - `problemsSolved`
   - `pipelineItemsProgressed`
3. `breakdowns`:
   - `person[]`
   - `team[]`
   - `businessUnit[]`
4. `trend[]`:
   - periodized output and spend counts
5. `export`:
   - `rows[]` (CSV-ready flat rows)
   - `formattedSummary` (leadership-readable summary text)

## Access Policy

`hdcGetRoiDashboard` is admin-gated:

1. `User.role = 'ADMIN'` OR
2. capability tags include `roi_admin` OR `platform_admin`

Non-admin access returns:

- `[ROI_FORBIDDEN] Admin access is required to view ROI dashboard.`

## Fallback Policy

1. Token volume is always numeric (`0` when no token-bearing audit rows are found), sourced from audit payload mapping.
2. Cost is calculated as `tokenVolume / 1000 * ratePer1kTokensGbp` using rate-card config from `HDC_ROI_RATE_CARD_JSON` with in-code defaults.
3. Cost-per-output is derived from total spend and output counts (`0` when spend is zero and output count is non-zero).
4. Business-unit attribution is resolved from Team BU fields and optional `HDC_ROI_BUSINESS_UNIT_TEAM_MAP_JSON` overrides; unresolved coverage is surfaced as `available_partial` or `unavailable`.
5. Team and business-unit filters are both applied to totals, trend, and breakdown payloads.
6. Project normalization supports schema variants (`submittedAt`, `ownerId`, `createdAt`, `sourceType`) to avoid dropping hack outputs in mixed snake_case/camelCase deployments.
7. When token-bearing rows are absent, token-source reason text includes observed `EventAuditLog.action` distribution to aid upstream telemetry triage.

## Validation

```bash
cd /Users/nickster/Downloads/HackCentral-p1-child-01
npm run test:run -- tests/forge-native-roi-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
```
