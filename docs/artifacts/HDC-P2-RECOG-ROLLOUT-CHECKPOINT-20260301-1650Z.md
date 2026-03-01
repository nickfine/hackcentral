# HDC P2.RECOG.01 Rollout Checkpoint

- Timestamp (UTC): `2026-03-01 16:50:00Z`
- Task ID: `P2.RECOG.01`
- Module: `recognition`
- Scope: Live verification and production smoke for `R8.1` viewer badges and `R8.2` segmented recognition leaderboards.
- Contract spec: `docs/HDC-P2-RECOGNITION-CONTRACT-SPEC.md`

## Executed Validation Commands

```bash
# Supabase MCP-first check (known empty-list behavior in this workspace)
mcp__supabase__list_projects

# Fallback live project and key discovery
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects api-keys --project-ref ssafugtobsqxmqtphwch --output json

# Live schema compatibility check for recognition signal sources
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" curl -sS -X POST \
  "https://api.supabase.com/v1/projects/ssafugtobsqxmqtphwch/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg query \"select table_name, column_name, data_type from information_schema.columns where table_schema = 'public' and table_name in ('Project', 'Artifact', 'Problem', 'PathwayProgress', 'User') order by table_name, ordinal_position;\" '{query:$query}')"

# Live resolver smoke for recognition payload
cd /Users/nickster/Downloads/HackCentral-p1-child-01
SUPABASE_URL="https://ssafugtobsqxmqtphwch.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
SUPABASE_SCHEMA="public" \
FORGE_DATA_BACKEND="supabase" \
HDC_RUNTIME_OWNER="hackcentral" \
npx -y tsx -e "import { getBootstrapData } from './forge-native/src/backend/hackcentral.ts'; (async () => { const viewer={accountId:'cmiukfwe1000807bj5ir1vpy4',siteUrl:'https://hackdaytemp.atlassian.net',timezone:'Europe/London'}; const data=await getBootstrapData(viewer); console.log(JSON.stringify({viewer,source:data.source,recognition:data.recognition}, null, 2)); })();"

# Targeted validation
npm run test:run -- tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
```

## Results

- Supabase MCP-first project check: `list_projects` returned `[]` (expected in this workspace).
- Live schema compatibility: pass.
  - required recognition source columns verified for `Project`, `Artifact`, `Problem`, `PathwayProgress`, `User`.
  - evidence file: `docs/artifacts/HDC-P2-RECOG-LIVE-SCHEMA-VERIFY-20260301-1647Z.json`
- Live resolver smoke (`getBootstrapData`): pass.
  - evidence file: `docs/artifacts/HDC-P2-RECOG-LIVE-RESOLVER-SMOKE-20260301-1647Z.json`
  - policy versions emitted:
    - `mentorSignal.policyVersion=r8-mentor-sessions-used-v1`
    - `pathwaySignal.policyVersion=r8-pathway-completion-v1`
  - segmented leaderboards present (`builders`, `sharers`, `solvers`, `mentors`).
  - viewer badges payload present (`firstArtifactPublished`, `firstProblemSolved`, `fiveArtifactsReused`, `mentoredThreePeople`, `contributedToPathway`).
- Production UI smoke (Confluence global page): pass.
  - Team Pulse page rendered with `Export metrics` controls and recognition tabs (`Builders`, `Sharers`, `Solvers`, `Mentors`).
  - Home page rendered viewer recognition badge lane.
  - screenshot evidence: `docs/artifacts/HDC-P2-RECOG-LIVE-UI-SMOKE-20260301-1650Z.png`
- Targeted tests: pass (`4/4`).
- Typechecks (backend + frontend): pass.

## Checklist Status Snapshot

- [x] Live source tables and columns verified for recognition signals.
- [x] Recognition resolver emits versioned mentor/pathway policies.
- [x] Segmented leaderboards available in resolver payload and Team Pulse UI.
- [x] Viewer badge payload available and rendered in dashboard recognition lane.
- [x] Targeted contract tests and typechecks pass.
- [x] GO decision finalized.

## Rollback Plan

- UI rollback:
  - revert Team Pulse recognition tab wiring and viewer badge chip mapping in `forge-native/static/frontend/src/App.tsx`.
- Backend rollback:
  - revert recognition aggregation expansion in `forge-native/src/backend/supabase/repositories.ts` to pre-`leaderboards`/`viewerBadges` payload.
- Schema rollback:
  - no schema migration in this slice.

## Decision

- `GO`

## Notes

- Workspace-level Supabase MCP limitations remain unchanged; documented CLI fallback remains required for project/table introspection.
- Live payload currently reflects low-activity seed state (builders populated, other lanes mostly empty), which is valid for this environment and not a contract failure.
