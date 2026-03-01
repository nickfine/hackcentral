# HDC P3 ROI R9.1 Token-Source Mapping Checkpoint

- Timestamp (UTC): 2026-03-01T17:45:00Z
- Task ID: `P3.ROI.01`
- Slice: `R9.1` token consumption tracking
- Decision: `CONDITIONAL GO`

## Scope Closed In This Slice

1. ROI resolver now maps token-volume signals from `EventAuditLog.new_value` payload keys:
   - `tokenVolume`, `tokenCount`, `totalTokens`, `tokensUsed`, `usageTokens`
   - fallback pair aggregation: `promptTokens/inputTokens` + `completionTokens/outputTokens`
2. ROI payload token fields are now numeric:
   - `totals.tokenVolume` returns number (`0` when no token-bearing rows are found)
   - `breakdowns.person[].tokenVolume`, `breakdowns.team[].tokenVolume`, and `trend[].tokenVolume` return numeric values
3. ROI source metadata now reports token mapping status as `available_partial` with attribution coverage details.

## Validation

```bash
cd /Users/nickster/Downloads/HackCentral-p1-child-01
npm run test:run -- tests/forge-native-roi-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
npm run test:run -- tests/forge-native-roi-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts
```

## Live Evidence

- Resolver smoke (admin + non-admin):
  - `docs/artifacts/HDC-P3-ROI-R9_1-LIVE-RESOLVER-SMOKE-20260301-1744Z.json`
- Contract/spec updates:
  - `docs/HDC-P3-ROI-CONTRACT-SPEC.md`
- Code:
  - `forge-native/src/backend/supabase/repositories.ts`
  - `tests/forge-native-roi-contract.spec.ts`

## Remaining Gates

1. `R9.2` cost-rate-card source and spend/cost-per-output calculations are still unresolved (`cost` remains `null`).
2. `R9.4` business-unit attribution source is still unresolved (`businessUnit` remains unavailable).
