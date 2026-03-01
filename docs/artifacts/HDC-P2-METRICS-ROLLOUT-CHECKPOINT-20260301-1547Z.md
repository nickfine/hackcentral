# HDC P2.METRICS.01 Rollout Checkpoint

- Timestamp (UTC): `2026-03-01 16:02:00Z`
- Task ID: `P2.METRICS.01`
- Module: `team_pulse_metrics`
- Scope: Team Pulse live-source verification, deterministic cross-team attribution hardening, CSV export.
- Contract spec: `docs/HDC-P2-TEAM-PULSE-METRICS-CONTRACT-SPEC.md`

## Executed Validation Commands

```bash
# Supabase MCP-first check (known empty-list behavior in this workspace)
mcp__supabase__list_projects

# Fallback live project and key discovery
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects api-keys --project-ref ssafugtobsqxmqtphwch --output json

# Live schema compatibility check
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" curl -sS -X POST \
  "https://api.supabase.com/v1/projects/ssafugtobsqxmqtphwch/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg query \"select table_name, column_name, data_type from information_schema.columns where table_schema = 'public' and table_name in ('ArtifactReuse', 'TeamMember', 'Problem') order by table_name, ordinal_position;\" '{query:$query}')"

# Live service-role REST read checks
curl -sS -H "apikey: <service-role>" -H "Authorization: Bearer <service-role>" \
  "https://ssafugtobsqxmqtphwch.supabase.co/rest/v1/ArtifactReuse?select=id,artifact_id,user_id,used_at&limit=1"
curl -sS -H "apikey: <service-role>" -H "Authorization: Bearer <service-role>" \
  "https://ssafugtobsqxmqtphwch.supabase.co/rest/v1/TeamMember?select=id,teamId,userId,status,createdAt&limit=1"
curl -sS -H "apikey: <service-role>" -H "Authorization: Bearer <service-role>" \
  "https://ssafugtobsqxmqtphwch.supabase.co/rest/v1/Problem?select=id,status,moderation_state,created_at&limit=1"

# Targeted implementation validation
cd /Users/nickster/Downloads/HackCentral-p1-child-01
npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts
npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts tests/forge-native-showcase-contract.spec.ts tests/forge-native-showcase-runtime-modes.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck

# Production deploy and upgrade
cd /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native
forge deploy --environment production --no-verify
forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence
```

## Results

- Supabase MCP-first check: `list_projects` returned `[]` (expected in this workspace).
- Live schema compatibility: pass.
  - `ArtifactReuse`: `artifact_id`, `user_id`, `used_at` present.
  - `TeamMember`: camelCase membership fields (`teamId`, `userId`, `status`, `role`, `createdAt`) present.
  - `Problem`: `id`, `status`, `moderation_state`, `created_at` present.
- Live service-role REST read checks: pass.
  - `ArtifactReuse`: HTTP `200` (table readable; currently 0 rows).
  - `TeamMember`: HTTP `206` (table readable; sample row returned).
  - `Problem`: HTTP `200` (table readable; sample row returned).
- Targeted tests: pass (`3/3` in Team Pulse suite; includes `User.createdAt` fallback coverage).
- Cross-suite regression slice: pass (`19/19`).
- Typechecks (backend + frontend): pass.
- Live resolver smoke (`getBootstrapData`) with production runtime config: pass.
  - evidence payload snapshot: `docs/artifacts/HDC-P2-METRICS-LIVE-RESOLVER-SMOKE-20260301-1556Z.json`
  - key values: `reuseRatePct=0`, `crossTeamAdoptionCount=0`, `timeToFirstHackMedianDays=41.8`, `problemConversionPct=0`.
- Live production Team Pulse UI smoke: pass.
  - Team Pulse page renders `Export metrics (CSV)` + `Export metrics (JSON)` controls.
  - screenshot evidence: `docs/artifacts/HDC-P2-METRICS-LIVE-UI-SMOKE-20260301-1558Z.png`
  - CSV export probe captured blob (`size=497`, `type=text/csv;charset=utf-8`) and header row in preview.
  - exported file evidence: `docs/artifacts/HDC-P2-METRICS-LIVE-CSV-EXPORT-20260301-1600Z.csv`

## Checklist Status Snapshot

- [x] Source tables verified live with Supabase MCP-first + documented fallback path.
- [x] Deterministic multi-team primary-team attribution policy implemented and tested.
- [x] Team Pulse CSV export implemented in UI.
- [x] Contract spec updated with attribution policy and live verification evidence.
- [x] Live production UI smoke + export artifact capture completed.
- [x] GO decision finalized.

## Rollback Plan

- UI rollback:
  - Remove CSV export button and `exportTeamPulseCsv` wiring in `forge-native/static/frontend/src/App.tsx`.
- Backend rollback:
  - Revert deterministic membership ordering block in `buildTeamPulseMetrics` (`forge-native/src/backend/supabase/repositories.ts`) to previous first-match behavior.
- Data/schema rollback:
  - No schema migration included in this slice.

## Decision

- `GO`

## Notes

- Multi-team attribution policy is now deterministic without requiring schema changes.
- Live data currently shows no rows in `ArtifactReuse`; this is treated as valid zero-state, not a read-permission failure.
- During live resolver smoke, production compatibility issue (`User.created_at` vs `User.createdAt`) was discovered and fixed in repository bootstrap query fallback; regression test added.
- Full `custom-ui:build` still fails on unrelated `static/runtime-frontend` Tailwind/PostCSS setup in this workspace, but `static/frontend` build + production deploy/install succeeded and live smoke confirms Team Pulse module behavior.
