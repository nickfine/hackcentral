# CONTINUATION.md

Last updated: 2026-03-01 11:56 GMT

## Current Snapshot

- Branch: `main`
- Product source of truth: `HDC-PRODUCT-ROADMAP.md`
- Live execution ledger: `HDC-PRODUCT-EXECUTION-PLAN.md`
- Runtime owner: `HDC_RUNTIME_OWNER=hackcentral`
- Latest known release markers:
  - Root app version: `0.6.44`
  - Forge native package version: `0.3.12`
- Current phase: `Phase 1 in execution`
- Registry (`P1.REG.01`) is complete and validated:
  - migration: `forge-native/supabase/migrations/20260301011000_phase1_registry.sql`
  - resolvers: `hdcCreateArtifact`, `hdcListArtifacts`, `hdcGetArtifact`, `hdcMarkArtifactReuse`
  - Forge UI wiring: `forge-native/static/frontend/src/App.tsx`
  - Registry UI utility module: `forge-native/static/frontend/src/utils/registry.ts`
  - targeted tests: `tests/forge-native-registry-contract.spec.ts` + `tests/forge-native-registry-utils.spec.ts` + `tests/forge-native-registry-runtime-modes.spec.ts` (15 passing total)
- Problem Exchange (`P1.PX.01`) backend baseline now landed:
  - contract spec: `docs/HDC-P1-PROBLEM-EXCHANGE-CONTRACT-SPEC.md`
  - migration: `forge-native/supabase/migrations/20260301020000_phase1_problem_exchange.sql`
  - resolvers: `hdcCreateProblem`, `hdcListProblems`, `hdcVoteProblem`, `hdcUpdateProblemStatus`, `hdcFlagProblem`, `hdcModerateProblem`
  - tests: `tests/forge-native-problem-exchange-contract.spec.ts` + `tests/forge-native-problem-exchange-runtime-modes.spec.ts`
- Problem Exchange (`P1.PX.01`) Forge UI baseline now landed:
  - global-page UI wiring in `forge-native/static/frontend/src/App.tsx` for create/list/filter/vote/flag/status/moderate flows
  - frontend utility module `forge-native/static/frontend/src/utils/problemExchange.ts`
  - utility tests: `tests/forge-native-problem-exchange-utils.spec.ts`
- Problem Exchange moderation guardrails + telemetry now landed:
  - backend moderation gate in `forge-native/src/backend/hackcentral.ts` now uses org authority source from `User`:
    - `role='ADMIN'`, or capability tags `problem_exchange_moderator` / `platform_admin`
    - compatibility fallback for missing `User.role` column uses capability tags only
  - capabilities resolver: `hdcGetProblemExchangeCapabilities` (resolver wiring in `forge-native/src/index.ts`)
  - shared type contracts updated in `forge-native/src/shared/types.ts` and `forge-native/static/frontend/src/types.ts`
  - UI moderation guardrails in `forge-native/static/frontend/src/App.tsx` (remove/reinstate visibility and include-hidden gating)
  - backend telemetry events in `forge-native/src/backend/supabase/repositories.ts`:
    - `problem_created`
    - `problem_voted`
    - `problem_status_updated`
    - `problem_flagged`
    - `problem_moderated`
  - runtime-mode moderation guard coverage added in `tests/forge-native-problem-exchange-runtime-modes.spec.ts`
- Problem Exchange UI validation expansion + operations docs now landed:
  - utility-driven UI validation helpers added in `forge-native/static/frontend/src/utils/problemExchange.ts` and wired in `forge-native/static/frontend/src/App.tsx` for:
    - filter apply/reset construction
    - solved-link status validation
    - preview-mode vote/flag idempotency
    - moderation gate action resolution
  - expanded utility coverage in `tests/forge-native-problem-exchange-utils.spec.ts` (12 passing tests)
  - rollout checklist: `docs/HDC-P1-PROBLEM-EXCHANGE-ROLLOUT-CHECKLIST.md`
  - moderation authority runbook: `docs/HDC-P1-PROBLEM-EXCHANGE-MODERATION-RUNBOOK.md`
- Problem Exchange rollout checkpoint now recorded and closed:
  - artifact: `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md`
  - status: `GO` (code-level gate + live authority audit + live resolver checks + live UI smoke passed)
  - live UI smoke evidence screenshot: `docs/artifacts/HDC-P1-PX-LIVE-UI-SMOKE-20260301-0303Z.png`
- Pipeline (`P1.PIPE.01`) is now implemented and validated (GO):
  - contract spec: `docs/HDC-P1-PIPELINE-CONTRACT-SPEC.md`
  - migration: `forge-native/supabase/migrations/20260301033000_phase1_pipeline.sql`
  - resolvers: `hdcGetPipelineBoard`, `hdcMovePipelineItem`, `hdcUpdatePipelineStageCriteria`
  - backend admin gate: org authority source in `User` (`role='ADMIN'` or capability tags `pipeline_admin` / `platform_admin`)
  - Forge UI in `forge-native/static/frontend/src/App.tsx` now includes:
    - board columns + stage/flow metrics
    - admin move controls with required transition note
    - admin stage criteria editor controls
    - legacy view redirect (`projects` -> `pipeline`)
  - styling: `forge-native/static/frontend/src/styles.css`
  - tests: `tests/forge-native-pipeline-contract.spec.ts` + `tests/forge-native-pipeline-runtime-modes.spec.ts`
  - rollout checkpoint artifact: `docs/artifacts/HDC-P1-PIPE-ROLLOUT-CHECKPOINT-20260301-1108Z.md`
- Phase 1 observability/guardrail baseline (`P1.OBS.01`) now landed (GO):
  - guardrails pack: `docs/HDC-P1-OBS-GUARDRAILS-PACK.md`
  - module checkpoint template: `docs/HDC-P1-MODULE-ROLLOUT-CHECKPOINT-TEMPLATE.md`
  - standardized commands in root `package.json`:
    - `qa:p1:regression-pack`
    - `qa:p1:telemetry-static-check`
    - `qa:p1:go-gate`
  - checkpoint artifact: `docs/artifacts/HDC-P1-OBS-ROLLOUT-CHECKPOINT-20260301-1112Z.md`
- Showcase (`P1.SHOW.01`) is now completed and validated (GO):
  - contract spec: `docs/HDC-P1-SHOWCASE-CONTRACT-SPEC.md`
  - migration: `forge-native/supabase/migrations/20260301122000_phase1_showcase.sql`
  - resolvers: `hdcListShowcaseHacks`, `hdcGetShowcaseHackDetail`, `hdcSetShowcaseFeatured`
  - backend: `forge-native/src/backend/supabase/repositories.ts` + `forge-native/src/backend/hackcentral.ts` + `forge-native/src/index.ts`
  - shared/frontend contracts: `forge-native/src/shared/types.ts` + `forge-native/static/frontend/src/types.ts`
  - Forge UI wiring in `forge-native/static/frontend/src/App.tsx`:
    - Showcase list load + filters (query/type/status/tags/source event/featured-only)
    - hack detail panel
    - admin featured toggle controls
    - submit-hack modal expanded to include required `demoUrl` and Showcase metadata fields
  - Showcase targeted tests: `tests/forge-native-showcase-contract.spec.ts` + `tests/forge-native-showcase-runtime-modes.spec.ts` (`9/9` passing)
  - rollout artifact: `docs/artifacts/HDC-P1-SHOW-ROLLOUT-CHECKPOINT-20260301-1142Z.md` (`GO`)
  - live UI smoke evidence screenshot: `docs/artifacts/HDC-P1-SHOW-LIVE-UI-SMOKE-20260301-1153Z.png`
  - Phase 1 regression pack updated to include Showcase suites:
    - root `package.json` script `qa:p1:regression-pack` now runs Registry + Problem Exchange + Pipeline + Showcase suites (`56/56`)
  - live migration applied to `ssafugtobsqxmqtphwch`; read-only resolver smoke passed (`listShowcaseHacks`, `getShowcaseHackDetail`)
  - production deploy/install refresh completed (`forge app version 5.29.0`)
  - live authority check validated featured toggle permissions:
    - admin account can set/unset featured
    - non-admin account receives `[SHOWCASE_FORBIDDEN]`
  - live telemetry sampling captured from `forge logs`:
    - `[hdc-switcher-telemetry]`
    - `[hdc-performance-telemetry]`

## Active Task Pointer

- Active Task ID: `P1.CHILD.01`
- Task title: `Child integrations (problem import + auto-draft publish)`
- Plan source: `HDC-PRODUCT-EXECUTION-PLAN.md`
- IA baseline spec: `docs/HDC-P1-IA-ROUTING-SPEC.md`
- Registry contract spec: `docs/HDC-P1-REGISTRY-CONTRACT-SPEC.md`
- Child integration requirements source: `HDC-PRODUCT-ROADMAP.md` (`R5.1`-`R5.4`)

## Next 3 Atomic Actions

1. Lock `P1.CHILD.01` contract spec for Problem Exchange import into child HackDay drafts (`R5.1`-`R5.4`).
2. Implement backend/resolver contracts for child import + auto-draft publish semantics with explicit source-linking to solved problems/hacks.
3. Wire Forge UI baseline for child integration flow and add targeted contract/runtime suites before live rollout gate.

## Blockers / Decisions Needed

- No blockers currently logged.
- Known test harness constraint:
  - Root Vitest workspace cannot directly mount Forge frontend `App.tsx` due React 19 (root) vs React 18 (Forge custom UI package) hook/runtime mismatch.

## Supabase MCP Access Note

- Preferred path: use Supabase MCP tools first.
- Known behavior in this workspace:
  - `mcp__supabase__list_projects` may return empty even when project access exists.
  - `/Users/nickster/Downloads/HD26Forge/.mcp.json` currently configures Supabase MCP with anon API key, which is insufficient for management/admin checks.
- Fallback path for live authority audits:
  1. Use shell `SUPABASE_ACCESS_TOKEN` with Supabase CLI to discover/access project refs.
  2. Derive service-role key via `supabase projects api-keys --project-ref <ref>`.
  3. Run read-only authority checks via Supabase REST (`/rest/v1/User`) with service-role auth.
  4. Run resolver verification from HackCentral using:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `SUPABASE_SCHEMA=public`
     - `FORGE_DATA_BACKEND=supabase`

## Playwright MCP Access Note

- Preferred live browser validation surface for HackCentral global page:
  - `https://hackdaytemp.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/86632806-eb9b-42b5-ae6d-ee09339702b6/hackday-central`
- Known stale route that should not be used for current production smoke:
  - `.../6ef543d7-4817-408a-ae19-1b466c81a797/hackday-central` (`Global page module was not found`)
- Key smoke evidence from this session:
  - `docs/artifacts/HDC-P1-SHOW-LIVE-UI-SMOKE-20260301-1153Z.png`

## Validation Commands

```bash
# Docs integrity: core continuity references present in active docs
rg -n "HDC-PRODUCT-EXECUTION-PLAN\\.md|forge-native/CONTINUATION_HANDOFF\\.md" \
  README.md docs/README.md .claude/instructions.md

# Quick continuity sanity check
rg -n "Active Task ID|Startup Read Order|Next 3 Atomic Actions" \
  CONTINUATION.md CONTINUATION_PROMPT.md HDC-PRODUCT-EXECUTION-PLAN.md

# Phase 1 standardized regression/telemetry gate
cd /Users/nickster/Downloads/HackCentral && npm run qa:p1:go-gate

# Registry validation checks completed in this session
cd /Users/nickster/Downloads/HackCentral && npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts tests/forge-native-registry-runtime-modes.spec.ts
cd /Users/nickster/Downloads/HackCentral/forge-native/static/frontend && npm run typecheck
cd /Users/nickster/Downloads/HackCentral/forge-native && npm run typecheck

# Problem Exchange backend validation checks completed in this session
cd /Users/nickster/Downloads/HackCentral && npm run test:run -- tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-runtime-modes.spec.ts

# Problem Exchange frontend utility checks completed in this session
cd /Users/nickster/Downloads/HackCentral && npm run test:run -- tests/forge-native-problem-exchange-utils.spec.ts

# Problem Exchange UI-validation utility expansion checks completed in this session
cd /Users/nickster/Downloads/HackCentral && npm run test:run -- tests/forge-native-problem-exchange-utils.spec.ts
cd /Users/nickster/Downloads/HackCentral/forge-native/static/frontend && npm run typecheck
cd /Users/nickster/Downloads/HackCentral/forge-native && npm run typecheck

# Live authority audit summary (Supabase project)
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects api-keys --project-ref ssafugtobsqxmqtphwch --output json

# Live resolver capability verification with real account IDs
cd /Users/nickster/Downloads/HackCentral && SUPABASE_URL="https://ssafugtobsqxmqtphwch.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" SUPABASE_SCHEMA="public" FORGE_DATA_BACKEND="supabase" npx -y tsx -e "import { getProblemExchangeCapabilities } from './forge-native/src/backend/hackcentral.ts'; ..."

# Full targeted Registry + Problem Exchange cross-suite
cd /Users/nickster/Downloads/HackCentral && npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts tests/forge-native-registry-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-utils.spec.ts

# Forge handoff file presence
test -f /Users/nickster/Downloads/HackCentral/forge-native/CONTINUATION_HANDOFF.md

# Optional: check current git changes
cd /Users/nickster/Downloads/HackCentral && git status --short --branch

# Live Problem Exchange UI smoke evidence captured
ls -l /Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P1-PX-LIVE-UI-SMOKE-20260301-0303Z.png

# Pipeline UI shell validation completed in this session
cd /Users/nickster/Downloads/HackCentral/forge-native/static/frontend && npm run typecheck
cd /Users/nickster/Downloads/HackCentral/forge-native && npm run typecheck

# Showcase targeted validation checks completed in this session
cd /Users/nickster/Downloads/HackCentral && npm run test:run -- tests/forge-native-showcase-contract.spec.ts tests/forge-native-showcase-runtime-modes.spec.ts
cd /Users/nickster/Downloads/HackCentral/forge-native/static/frontend && npm run typecheck
cd /Users/nickster/Downloads/HackCentral/forge-native && npm run typecheck

# Showcase live migration + schema verification completed in this session
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects api-keys --project-ref ssafugtobsqxmqtphwch --output json
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" curl -sS -X POST "https://api.supabase.com/v1/projects/ssafugtobsqxmqtphwch/database/query" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d "$(jq -n --arg query \"select count(*)::int as showcase_rows from \\\"ShowcaseHack\\\";\" '{query:$query}')"

# Showcase production deploy + telemetry sampling completed in this session
cd /Users/nickster/Downloads/HackCentral/forge-native && npm run custom-ui:build
cd /Users/nickster/Downloads/HackCentral/forge-native && forge deploy --environment production --no-verify
cd /Users/nickster/Downloads/HackCentral/forge-native && forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence
cd /Users/nickster/Downloads/HackCentral/forge-native && forge logs -e production --since 30m --verbose

# Showcase live authority + rollback dry-run verification completed in this session
cd /Users/nickster/Downloads/HackCentral && SUPABASE_URL="https://ssafugtobsqxmqtphwch.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" SUPABASE_SCHEMA="public" FORGE_DATA_BACKEND="supabase" npx -y tsx -e "import { setShowcaseFeatured } from './forge-native/src/backend/hackcentral.ts'; ..."
```

## Fresh Chat Startup Checklist

1. Read `CONTINUATION.md`.
2. Read `hdc-product-roadmap.hd`.
3. Read `HDC-PRODUCT-ROADMAP.md`.
4. Read `HDC-PRODUCT-EXECUTION-PLAN.md`.
5. Read the latest entry in `LEARNINGS.md`.
6. Confirm the `Active Task ID` before implementation.
