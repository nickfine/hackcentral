# HDC P3 ROI Token Producer Blocker Checkpoint

- Timestamp (UTC): 2026-03-01T21:39:00Z
- Task: `P3.ROI.01`
- Scope: unblock upstream token-bearing audit producer for ROI `R9.1` spend evidence

## Summary

Implemented and shipped a new admin-gated producer path `hdcLogRoiTokenUsage` that writes token-bearing `llm_usage_logged` rows into `EventAuditLog.new_value` using canonical keys consumed by the ROI mapper.

## What shipped

1. New resolver contract:
   - `hdcLogRoiTokenUsage`
   - input: `LogRoiTokenUsageInput`
   - output: `LogRoiTokenUsageResult`
2. Backend producer implementation:
   - access gate: same ROI admin policy as `hdcGetRoiDashboard`
   - writes `EventAuditLog.action='llm_usage_logged'`
   - payload includes canonical token keys without duplicate total-key aliases to prevent double-counting
3. Regression coverage:
   - producer write contract test
   - producer non-admin authorization guard test

## Validation

- Targeted test gate:
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts` (`12/12`)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Deploy/install:
  - `forge deploy --environment production --no-verify` (pass)
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` (site latest)
- Supabase MCP-first protocol:
  - `mcp__supabase__list_projects` returned `[]` (known workspace behavior)
- Live resolver smoke artifact:
  - `docs/artifacts/HDC-P3-ROI-TOKEN-PRODUCER-LIVE-RESOLVER-SMOKE-POSTDEPLOY-20260301-2138Z.json`
  - evidence highlights:
    - producer write succeeded with `tokenVolume=2400`
    - ROI monthly totals delta after write: `tokenVolume +2400`, `cost +0.02`

## Decision

`GO` for blocker resolution: in-repo producer dependency is now closed and production ROI can receive non-zero token spend evidence through the shipped resolver path.
