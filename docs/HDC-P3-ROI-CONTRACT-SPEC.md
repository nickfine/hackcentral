# HDC P3 ROI Contract Spec

Last updated: 2026-03-01 18:05 GMT  
Owner: HackDay Central Engineering  
Task ID: `P3.ROI.01`  
Roadmap refs: `R9.1`, `R9.2`, `R9.3`, `R9.4`, `R9.5`

## Scope

This spec defines the initial ROI dashboard resolver scaffold and fallback policy for Phase 3.

In scope:

1. Admin-gated resolver contract for ROI payload retrieval.
2. Explicit source coverage reporting for token volume, cost rate cards, output signals, and business-unit attribution.
3. Baseline output aggregation (`hacks`, `artifacts`, `problems solved`, `pipeline progressions`) with trend and breakdown scaffolding.
4. Export bundle shape for CSV rows and formatted leadership summary text.

## Live Source Audit Baseline

Supabase MCP-first was executed and returned no projects in this workspace; CLI/management fallback evidence is captured in:

- `docs/artifacts/HDC-P3-ROI-DATASOURCE-AUDIT-20260301-1714Z.json`

Audit findings used by this scaffold:

1. Token volume is mapped from `EventAuditLog.new_value` payload keys (`tokenVolume`, `tokenCount`, `totalTokens`, `prompt/completion token` pairs) with partial attribution when actor/team context is missing.
2. Cost/rate-card sources in public schema are unavailable for ROI accounting (`R9.2`) beyond auth/session token fields.
3. Output sources are available and usable from:
   - `Project` (`source_type='hack_submission'`, `status='completed'`)
   - `Artifact` (non-archived publish count)
   - `Problem` (solved + visible)
   - `PipelineTransitionLog` (stage progression events)
4. Business-unit dimension is unavailable from current `Team` / `TeamMember` / `User` schema.

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
   - `businessUnit[]` (empty while BU source is unavailable)
4. `trend[]`:
   - periodized output counts (no spend/token values until source availability changes)
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
2. Cost fields remain `null` until rate-card sources are available.
3. Cost-per-output fields remain `null` while spend is unavailable.
4. Business-unit breakdown remains empty with explicit note while BU dimension is unavailable.
5. Team filter is supported; business-unit filter is accepted but reported as unresolved in notes.

## Validation

```bash
cd /Users/nickster/Downloads/HackCentral-p1-child-01
npm run test:run -- tests/forge-native-roi-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
```
