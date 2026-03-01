# HDC P2.OBS.01 Rollout Checkpoint

- Timestamp (UTC): `2026-03-01 17:05:00Z`
- Task ID: `P2.OBS.01`
- Module: `phase2_observability`
- Scope: Phase 2 adoption telemetry contract, backend hooks for recognition reads and Team Pulse exports, live production telemetry sampling.
- Contract spec: `docs/HDC-P2-OBS-TELEMETRY-CONTRACT-SPEC.md`

## Executed Validation Commands

```bash
# Supabase MCP-first + fallback availability check
mcp__supabase__list_projects
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json

# Targeted contract + telemetry tests
cd /Users/nickster/Downloads/HackCentral-p1-child-01
npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
npm run qa:p2:telemetry-static-check

# Production build/deploy/install
cd /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native
npm run custom-ui:build
forge deploy --environment production --no-verify
forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence

# Live telemetry sampling
forge logs -e production --since 30m --limit 3000 \
  | rg "hdc-phase2-telemetry|recognition_snapshot_read|team_pulse_export" -n
```

## Results

- Supabase MCP-first check: `list_projects` returned `[]` (known workspace behavior).
- CLI fallback project discovery: pass (`ssafugtobsqxmqtphwch` active).
- Contract tests: pass (`6/6` across Team Pulse + Recognition + Phase 2 telemetry suites).
- Typechecks: pass (backend + frontend).
- Static telemetry contract grep: pass (`qa:p2:telemetry-static-check`).
- Production build/deploy/install: pass.
- Live production UI smoke for Team Pulse export actions: pass.
  - screenshot: `docs/artifacts/HDC-P2-OBS-LIVE-UI-EXPORT-SMOKE-20260301-1705Z.png`
- Live production telemetry evidence: pass.
  - log artifact: `docs/artifacts/HDC-P2-OBS-LIVE-TELEMETRY-LOGS-20260301-1705Z.txt`
  - observed events:
    - `recognition_snapshot_read`
    - `team_pulse_export` (`format=csv`, `csvRowCount=6`)
    - `team_pulse_export` (`format=json`, `csvRowCount=null`)

## Checklist Status Snapshot

- [x] Phase 2 telemetry contract documented.
- [x] Backend recognition-read telemetry emitted with deterministic payload fields.
- [x] Team Pulse export telemetry captured through backend resolver path.
- [x] Targeted contract tests and typechecks pass.
- [x] Live production telemetry lines observed and archived.
- [x] GO decision finalized.

## Rollback Plan

- Remove resolver `hdcTrackTeamPulseExport` from:
  - `forge-native/src/index.ts`
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Remove frontend invocation in Team Pulse exports:
  - `forge-native/static/frontend/src/App.tsx`
- Remove Phase 2 telemetry emission points in backend:
  - `forge-native/src/backend/supabase/repositories.ts`
  - `forge-native/src/backend/hackcentral.ts`
- Keep existing Phase 1 telemetry channel behavior unchanged.

## Decision

- `GO`

## Notes

- `viewerTimezone` in live export telemetry reflected Forge viewer context (`UTC` in sampled logs), while local smoke context can be `Europe/London`; this is expected and non-blocking.
- Phase 2 telemetry channel is additive (`[hdc-phase2-telemetry]`) and does not alter existing `[hdc-performance-telemetry]`/`[hdc-switcher-telemetry]` behavior.
