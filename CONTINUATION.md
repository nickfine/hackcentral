# CONTINUATION.md

Last updated: 2026-03-01 17:40 GMT

## Current Snapshot

- Branch: `codex/p1-child-01`
- Product source of truth: `HDC-PRODUCT-ROADMAP.md`
- Live execution ledger: `HDC-PRODUCT-EXECUTION-PLAN.md`
- Runtime owner: `HDC_RUNTIME_OWNER=hackcentral`
- Latest known release markers:
  - Root app version: `0.6.44`
  - Forge native package version: `0.3.12`
- Current phase: `Phase 3 in execution`
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
- Child integrations (`P1.CHILD.01`) are now completed (GO):
  - contract spec: `docs/HDC-P1-CHILD-INTEGRATION-CONTRACT-SPEC.md`
  - new resolver: `hdcListProblemImportCandidates` (backend: `forge-native/src/backend/hackcentral.ts`, `forge-native/src/backend/supabase/repositories.ts`, `forge-native/src/index.ts`)
  - `CreateInstanceDraftInput` extension with `childIntegration` payload:
    - `importProblemIds`
    - `autoPublishToShowcaseDrafts`
    - `templateMode`
  - `hdcService.createInstanceDraft` now validates imported problem IDs against importable Problem Exchange items and persists child metadata to:
    - `HackdayTemplateSeed.seed_payload.childIntegration`
    - `event_created` audit log payload
  - Forge Create HackDay step-6 UI in `forge-native/static/frontend/src/App.tsx` now supports:
    - template mode selection (`default` / `customized`)
    - auto-publish Showcase draft intent toggle
    - Problem Exchange challenge import checklist (`hdcListProblemImportCandidates`)
  - targeted tests: `tests/forge-native-hdcService.spec.ts` + `tests/forge-native-createFromWeb.spec.ts` (`31/31` passing)
  - typechecks: `npm --prefix forge-native run typecheck` and `npm --prefix forge-native/static/frontend run typecheck` passing
  - live rollout checkpoint: `docs/artifacts/HDC-P1-CHILD-ROLLOUT-CHECKPOINT-20260301-1258Z.md` (`GO`)
  - live UI evidence:
    - `docs/artifacts/p1-child-step6-live-20260301-1257.png`
    - `docs/artifacts/p1-child-create-success-20260301-1258.png`
  - live created smoke event:
    - name: `P1 CHILD LIVE 20260301-1305`
    - child page id: `18120705`
    - persisted `HackdayTemplateSeed.seed_payload.childIntegration` contains selected import `819b3023-ec4d-4b22-8f9f-07ca7f7c2fa2`, `templateMode=customized`, `autoPublishToShowcaseDrafts=false`
- Pathways (`P2.PATH.01`) rollout is now complete (`GO`):
  - contract spec: `docs/HDC-P2-PATHWAYS-CONTRACT-SPEC.md`
  - migration: `forge-native/supabase/migrations/20260301130000_phase2_pathways.sql`
  - resolver contracts:
    - `hdcListPathways`
    - `hdcGetPathway`
    - `hdcUpsertPathway`
    - `hdcSetPathwayStepCompletion`
  - backend wiring:
    - `forge-native/src/backend/supabase/repositories.ts`
    - `forge-native/src/backend/hackcentral.ts`
    - `forge-native/src/index.ts`
  - shared/frontend contract parity:
    - `forge-native/src/shared/types.ts`
    - `forge-native/static/frontend/src/types.ts`
  - guardrails:
    - pathway editor access = `ADMIN` role OR capability tags `pathway_admin` / `pathway_contributor` / `platform_admin`
  - targeted tests:
    - `tests/forge-native-pathways-contract.spec.ts`
    - `tests/forge-native-pathways-runtime-modes.spec.ts`
    - result: `5/5` passing
  - Guide UI now uses pathway contracts in `forge-native/static/frontend/src/App.tsx`:
    - pathway list/detail rendering
    - step completion with progress updates (`hdcSetPathwayStepCompletion`)
    - manager-gated create/edit pathway editor (`hdcUpsertPathway`)
  - Guide styles extended in `forge-native/static/frontend/src/styles.css`
  - local browser smoke evidence:
    - `docs/artifacts/HDC-P2-PATH-LOCAL-UI-SMOKE-20260301-133139Z.png`
  - production browser smoke evidence:
    - `docs/artifacts/HDC-P2-PATH-LIVE-UI-SMOKE-20260301-133829Z.png`
    - `docs/artifacts/HDC-P2-PATH-LIVE-UI-SMOKE-20260301-133904Z.png`
  - rollout checkpoint:
    - `docs/artifacts/HDC-P2-PATH-ROLLOUT-CHECKPOINT-20260301-1339Z.md`
  - local smoke fixed bug:
    - empty filter result now clears stale selected pathway detail in preview mode
  - live migration note:
    - corrected `PathwayStep.linked_artifact_id` column type to `uuid` to align with `Artifact.id`
  - post-rollout hardening (completed after GO checkpoint):
    - pathway edit persistence now preserves existing `PathwayStep.id` values and only removes deleted steps (prevents `PathwayProgress` cascade loss on every edit)
    - frontend + backend now validate pathway-step `linkedArtifactId` as UUID before persistence
    - expanded contract coverage in `tests/forge-native-pathways-contract.spec.ts` for edit-id preservation and invalid artifact-id validation
    - validation rerun: `npm run test:run -- tests/forge-native-pathways-contract.spec.ts` (`4/4`), backend/frontend typechecks pass
- Team Pulse metrics expansion (`P2.METRICS.01`) is now completed (`GO`):
  - contract spec: `docs/HDC-P2-TEAM-PULSE-METRICS-CONTRACT-SPEC.md`
  - shared/frontend contracts:
    - `forge-native/src/shared/types.ts`
    - `forge-native/static/frontend/src/types.ts`
    - `BootstrapData.teamPulse` now carries `R7.1`-`R7.4` metric payload
  - live source verification completed via Supabase MCP-first + CLI fallback:
    - `mcp__supabase__list_projects` returned `[]` in this workspace (known behavior)
    - schema compatibility verified for `ArtifactReuse`, `TeamMember`, `Problem` via management SQL
    - service-role REST read checks succeeded for all three source tables
  - backend aggregation in `forge-native/src/backend/supabase/repositories.ts` now computes:
    - `R7.1` reuse rate (`reusedArtifactCount/totalArtifactCount`)
    - `R7.2` cross-team adoption edge counts from `ArtifactReuse` + source project teams
    - `R7.3` time-to-first-hack median and monthly trend (`User.created_at` -> first hack submission)
    - `R7.4` Problem Exchange solved conversion rate
    - deterministic multi-team adopter attribution policy:
      - accepted memberships only
      - primary team precedence: role (`OWNER` > `ADMIN` > `LEAD` > `MEMBER`) -> earliest membership timestamp -> lexical team id tie-break
  - Team Pulse UI wiring in `forge-native/static/frontend/src/App.tsx` + `styles.css` now renders:
    - metric tiles for `R7.1`-`R7.4`
    - cross-team adoption matrix table
    - time-to-first-hack trend bars
    - Team Pulse exports now include both JSON contract payload and CSV reporting format
  - production compatibility hardening:
    - bootstrap user query now supports `User.created_at` and `User.createdAt` schema variants
    - regression coverage added in `tests/forge-native-team-pulse-metrics-contract.spec.ts`
  - live evidence artifacts:
    - rollout checkpoint: `docs/artifacts/HDC-P2-METRICS-ROLLOUT-CHECKPOINT-20260301-1547Z.md` (`GO`)
    - resolver payload snapshot: `docs/artifacts/HDC-P2-METRICS-LIVE-RESOLVER-SMOKE-20260301-1556Z.json`
    - UI smoke screenshot: `docs/artifacts/HDC-P2-METRICS-LIVE-UI-SMOKE-20260301-1558Z.png`
    - CSV export sample: `docs/artifacts/HDC-P2-METRICS-LIVE-CSV-EXPORT-20260301-1600Z.csv`
  - targeted validation:
    - `tests/forge-native-team-pulse-metrics-contract.spec.ts` (`3/3`)
    - cross-suite regression: pathways + showcase + Team Pulse contract (`19/19`)
    - backend/frontend typechecks pass
- Runtime frontend build blocker is now resolved:
  - issue: `forge-native/static/runtime-frontend` PostCSS/Tailwind build failure during `custom-ui:build`
  - fix: moved runtime PostCSS plugin to `@tailwindcss/postcss` and removed v4-incompatible `@apply` utility usage in `src/index.css`
  - validated:
    - `npm --prefix forge-native run runtime:build` (pass)
    - `npm --prefix forge-native run custom-ui:build` (pass)
- Recognition mentor + pathway signal policy baseline (`P2.RECOG.01`) is now landed:
  - contract spec: `docs/HDC-P2-RECOGNITION-CONTRACT-SPEC.md`
  - bootstrap contract now includes `recognition.mentorSignal` + `recognition.pathwaySignal`:
    - policy version: `r8-mentor-sessions-used-v1`
    - policy source: `User.mentor_sessions_used`
    - mentor badge threshold: `>= 3`
    - deterministic leaderboard order: `mentor_sessions_used DESC` -> `userName ASC` -> `userId ASC`
    - policy version: `r8-pathway-completion-v1`
    - policy source: `PathwayProgress`
    - pathway badge threshold: `distinct pathway_id >= 1`
    - deterministic leaderboard order: `distinctPathwayCount DESC` -> `completedStepCount DESC` -> `userName ASC` -> `userId ASC`
  - backend wiring: `forge-native/src/backend/supabase/repositories.ts`
  - frontend consumption (mentor lane + mentor/pathway badge counts): `forge-native/static/frontend/src/App.tsx`
  - contract parity updates:
    - `forge-native/src/shared/types.ts`
    - `forge-native/static/frontend/src/types.ts`
  - targeted validation:
    - `tests/forge-native-recognition-mentor-policy-contract.spec.ts` (`1/1`)
    - `tests/forge-native-team-pulse-metrics-contract.spec.ts` + recognition policy suite (`4/4`)
    - backend/frontend typechecks pass
- Recognition segmented leaderboard + viewer badge baseline (`P2.RECOG.01`) is now landed:
  - `recognition.leaderboards` now emits `R8.2` segments:
    - `builders`
    - `sharers`
    - `solvers`
    - `mentors`
  - `recognition.viewerBadges` now emits `R8.1` viewer badge states:
    - `firstArtifactPublished`
    - `firstProblemSolved`
    - `fiveArtifactsReused`
    - `mentoredThreePeople`
    - `contributedToPathway`
  - backend wiring: `forge-native/src/backend/supabase/repositories.ts`
  - frontend wiring: `forge-native/static/frontend/src/App.tsx` + `forge-native/static/frontend/src/constants/nav.ts`
  - contract parity updates:
    - `forge-native/src/shared/types.ts`
    - `forge-native/static/frontend/src/types.ts`
  - updated spec: `docs/HDC-P2-RECOGNITION-CONTRACT-SPEC.md`
  - targeted validation:
    - `tests/forge-native-recognition-mentor-policy-contract.spec.ts` (`1/1`)
    - `tests/forge-native-team-pulse-metrics-contract.spec.ts` + recognition suite (`4/4`)
    - backend/frontend typechecks pass
- Recognition rollout gate (`P2.RECOG.01`) is now complete (`GO`):
  - rollout checkpoint: `docs/artifacts/HDC-P2-RECOG-ROLLOUT-CHECKPOINT-20260301-1650Z.md`
  - live source verification evidence: `docs/artifacts/HDC-P2-RECOG-LIVE-SCHEMA-VERIFY-20260301-1647Z.json`
  - live resolver payload evidence: `docs/artifacts/HDC-P2-RECOG-LIVE-RESOLVER-SMOKE-20260301-1647Z.json`
  - live UI smoke evidence: `docs/artifacts/HDC-P2-RECOG-LIVE-UI-SMOKE-20260301-1650Z.png`
  - production UI smoke confirms Team Pulse segmented recognition tabs (`Builders`, `Sharers`, `Solvers`, `Mentors`) and Home viewer badge lane rendering
- Phase 2 observability hardening (`P2.OBS.01`) is now complete (`GO`):
  - telemetry contract: `docs/HDC-P2-OBS-TELEMETRY-CONTRACT-SPEC.md`
  - backend telemetry hooks now emit:
    - `recognition_snapshot_read` on bootstrap recognition reads
    - `team_pulse_export` via resolver-backed export tracking (`hdcTrackTeamPulseExport`)
  - rollout checkpoint: `docs/artifacts/HDC-P2-OBS-ROLLOUT-CHECKPOINT-20260301-1705Z.md`
  - live telemetry evidence: `docs/artifacts/HDC-P2-OBS-LIVE-TELEMETRY-LOGS-20260301-1705Z.txt`
  - live UI export smoke evidence: `docs/artifacts/HDC-P2-OBS-LIVE-UI-EXPORT-SMOKE-20260301-1705Z.png`
  - validation coverage:
    - `tests/forge-native-phase2-telemetry-contract.spec.ts`
    - `qa:p2:telemetry-static-check`
- Phase 3 ROI baseline (`P3.ROI.01`) has started and first scaffold slice is landed:
  - live datasource audit evidence (Supabase MCP-first + CLI fallback): `docs/artifacts/HDC-P3-ROI-DATASOURCE-AUDIT-20260301-1714Z.json`
  - ROI contract + fallback policy: `docs/HDC-P3-ROI-CONTRACT-SPEC.md`
  - new admin-gated resolver contract: `hdcGetRoiDashboard`
  - shared/frontend type parity updates:
    - `forge-native/src/shared/types.ts`
    - `forge-native/static/frontend/src/types.ts`
  - backend wiring:
    - `forge-native/src/backend/supabase/repositories.ts`
    - `forge-native/src/backend/hackcentral.ts`
    - `forge-native/src/index.ts`
  - validation:
    - `tests/forge-native-roi-contract.spec.ts` (`2/2`)
    - `tests/forge-native-team-pulse-metrics-contract.spec.ts` + `tests/forge-native-recognition-mentor-policy-contract.spec.ts` + `tests/forge-native-phase2-telemetry-contract.spec.ts` + ROI suite (`8/8`)
    - backend/frontend typechecks pass
- Phase 3 ROI live conditional-go slice is now landed:
  - admin-visible ROI dashboard UI with filter controls and export actions:
    - `forge-native/static/frontend/src/App.tsx`
    - `forge-native/static/frontend/src/constants/nav.ts`
  - production rollout evidence:
    - resolver smoke (admin allow + non-admin forbidden): `docs/artifacts/HDC-P3-ROI-LIVE-RESOLVER-SMOKE-20260301-1730Z.json`
    - UI smoke screenshot: `docs/artifacts/HDC-P3-ROI-LIVE-UI-SMOKE-20260301-1731Z.png`
    - live CSV export sample: `docs/artifacts/HDC-P3-ROI-LIVE-CSV-EXPORT-20260301-1731Z.csv`
    - live summary export sample: `docs/artifacts/HDC-P3-ROI-LIVE-SUMMARY-EXPORT-20260301-1731Z.txt`
  - rollout decision:
    - checkpoint: `docs/artifacts/HDC-P3-ROI-ROLLOUT-CHECKPOINT-20260301-1732Z.md`
    - status: `CONDITIONAL GO` (blocked on unresolved `R9.1` token source and `R9.2` spend calculation path)

## Active Task Pointer

- Active Task ID: `P3.ROI.01`
- Task title: `ROI dashboard scaffold and admin surface rollout`
- Plan source: `HDC-PRODUCT-EXECUTION-PLAN.md`
- IA baseline spec: `docs/HDC-P1-IA-ROUTING-SPEC.md`
- Registry contract spec: `docs/HDC-P1-REGISTRY-CONTRACT-SPEC.md`
- Pathways requirements source: `HDC-PRODUCT-ROADMAP.md` (`R6.1`-`R6.4`)
- Team Pulse requirements source: `HDC-PRODUCT-ROADMAP.md` (`R7.1`-`R7.4`)
- Recognition requirements source: `HDC-PRODUCT-ROADMAP.md` (`R8.1`-`R8.2`)
- ROI requirements source: `HDC-PRODUCT-ROADMAP.md` (`R9.1`-`R9.5`)

## Next 3 Atomic Actions

1. Integrate token-usage source mapping into ROI payload so token totals are sourced values (`R9.1`), not fallback nulls.
2. Implement configurable rate-card spend/cost-per-output calculation path and wire into ROI totals (`R9.2`).
3. Define and wire business-unit attribution source into ROI filters and breakdown rows (`R9.4` parity completion).

## Blockers / Decisions Needed

- No blockers currently logged.
- Known test harness constraint:
  - Root Vitest workspace cannot directly mount Forge frontend `App.tsx` due React 19 (root) vs React 18 (Forge custom UI package) hook/runtime mismatch.
- Known gate-scope constraint in this child worktree:
  - `npm run qa:p1:go-gate` currently reports pass while `qa:p1:regression-pack` only executes existing Showcase suites (2 files) because several listed suite files are absent in this child checkout.

## Supabase MCP Access Note

- Preferred path: use Supabase MCP tools first.
- Known behavior in this workspace:
  - `mcp__supabase__list_projects` may return empty even when project access exists.
  - `mcp__supabase__list_tables` / `mcp__supabase__list_migrations` currently return permission errors for `ssafugtobsqxmqtphwch`; use CLI fallback with `SUPABASE_ACCESS_TOKEN`.
  - `/Users/nickster/Downloads/HD26Forge/.mcp.json` currently configures Supabase MCP with anon API key, which is insufficient for management/admin checks.
- Fallback path for live authority audits:
  1. Use shell `SUPABASE_ACCESS_TOKEN` with Supabase CLI to discover/access project refs.
  2. Derive service-role key via `supabase projects api-keys --project-ref <ref>`.
  3. Run read-only authority checks via Supabase REST (`/rest/v1/ArtifactReuse`, `/rest/v1/TeamMember`, `/rest/v1/Problem`) with service-role auth.
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
  - `docs/artifacts/HDC-P2-PATH-LOCAL-UI-SMOKE-20260301-133139Z.png`
  - `docs/artifacts/HDC-P2-PATH-LIVE-UI-SMOKE-20260301-133904Z.png`
  - `docs/artifacts/HDC-P2-METRICS-ROLLOUT-CHECKPOINT-20260301-1547Z.md`
  - `docs/artifacts/HDC-P2-METRICS-LIVE-RESOLVER-SMOKE-20260301-1556Z.json`
  - `docs/artifacts/HDC-P2-METRICS-LIVE-UI-SMOKE-20260301-1558Z.png`
  - `docs/artifacts/HDC-P2-METRICS-LIVE-CSV-EXPORT-20260301-1600Z.csv`
  - `docs/artifacts/HDC-P2-RECOG-LIVE-SCHEMA-VERIFY-20260301-1647Z.json`
  - `docs/artifacts/HDC-P2-RECOG-LIVE-RESOLVER-SMOKE-20260301-1647Z.json`
  - `docs/artifacts/HDC-P2-RECOG-LIVE-UI-SMOKE-20260301-1650Z.png`
  - `docs/artifacts/HDC-P2-RECOG-ROLLOUT-CHECKPOINT-20260301-1650Z.md`
  - `docs/artifacts/HDC-P2-OBS-LIVE-UI-EXPORT-SMOKE-20260301-1705Z.png`
  - `docs/artifacts/HDC-P2-OBS-LIVE-TELEMETRY-LOGS-20260301-1705Z.txt`
  - `docs/artifacts/HDC-P2-OBS-ROLLOUT-CHECKPOINT-20260301-1705Z.md`
  - `docs/artifacts/HDC-P3-ROI-LIVE-UI-SMOKE-20260301-1731Z.png`
  - `docs/artifacts/HDC-P3-ROI-LIVE-CSV-EXPORT-20260301-1731Z.csv`
  - `docs/artifacts/HDC-P3-ROI-LIVE-SUMMARY-EXPORT-20260301-1731Z.txt`

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

# Team Pulse live source verification + deterministic attribution + CSV export checks completed in this session
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects api-keys --project-ref ssafugtobsqxmqtphwch --output json
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" curl -sS -X POST "https://api.supabase.com/v1/projects/ssafugtobsqxmqtphwch/database/query" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d "$(jq -n --arg query \"select table_name, column_name, data_type from information_schema.columns where table_schema = 'public' and table_name in ('ArtifactReuse', 'TeamMember', 'Problem') order by table_name, ordinal_position;\" '{query:$query}')"
cd /Users/nickster/Downloads/HackCentral-p1-child-01 && SUPABASE_URL="https://ssafugtobsqxmqtphwch.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" SUPABASE_SCHEMA="public" FORGE_DATA_BACKEND="supabase" HDC_RUNTIME_OWNER="hackcentral" npx -y tsx -e "import { getBootstrapData } from './forge-native/src/backend/hackcentral.ts'; (async () => { const viewer={accountId:'cmiukfwe1000807bj5ir1vpy4',siteUrl:'https://hackdaytemp.atlassian.net',timezone:'Europe/London'}; const data=await getBootstrapData(viewer); console.log(JSON.stringify(data.teamPulse, null, 2)); })();"
cd /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native && forge deploy --environment production --no-verify
cd /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native && forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence
cd /Users/nickster/Downloads/HackCentral-p1-child-01 && npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts
cd /Users/nickster/Downloads/HackCentral-p1-child-01 && npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts tests/forge-native-showcase-contract.spec.ts tests/forge-native-showcase-runtime-modes.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts
cd /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native && npm run typecheck
cd /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native/static/frontend && npm run typecheck
```

## Fresh Chat Startup Checklist

1. Read `CONTINUATION.md`.
2. Read `hdc-product-roadmap.hd`.
3. Read `HDC-PRODUCT-ROADMAP.md`.
4. Read `HDC-PRODUCT-EXECUTION-PLAN.md`.
5. Read the latest entry in `LEARNINGS.md`.
6. Confirm the `Active Task ID` before implementation.
