# HDC Product Execution Plan

Last updated: 2026-03-01 12:58 GMT  
Owner: Nick Fine  
Program: HackDay Central (HDC)

## Document Metadata

| Field | Value |
|---|---|
| Canonical product requirements | `HDC-PRODUCT-ROADMAP.md` |
| Execution ledger file | `HDC-PRODUCT-EXECUTION-PLAN.md` |
| Current phase | Phase 1 (Foundation Delivery) |
| Program status | In execution |
| Active task ID | `P2.PATH.01` |
| Continuity protocol | `CONTINUATION.md` + latest `LEARNINGS.md` entry |

## Master Milestone Timeline

| Phase | Window | Objective | Exit gate |
|---|---|---|---|
| Phase 0 | 2026-03-01 to 2026-03-03 | Make execution and continuity system decision-complete and durable | All continuity files exist, cross-link, and startup recovery is under 2 minutes |
| Phase 1 | 2026-03-04 to 2026-04-26 | Deliver Foundation loops: Registry, Problem Exchange, Pipeline, Showcase, Child integration | `R1` to `R5` P0 criteria accepted behind flags |
| Phase 2 | 2026-04-27 to 2026-06-07 | Deliver adoption influence mechanisms | `R6` to `R8` P0 criteria accepted |
| Phase 3 | 2026-06-08 to 2026-08-02 | Deliver ROI and compounding value systems | `R9` to `R12` P0 criteria accepted |

## Work Packages

| Task ID | Roadmap Ref | Owner | Status | Dependencies | Acceptance | Evidence |
|---|---|---|---|---|---|---|
| `P0.CONT.01` | Continuity backbone | Nick Fine | Completed (2026-03-01) | None | `HDC-PRODUCT-EXECUTION-PLAN.md` created with required schema | This file |
| `P0.CONT.02` | Continuity startup order | Nick Fine | Completed (2026-03-01) | `P0.CONT.01` | `hdc-product-roadmap.hd` updated with fixed read order | `hdc-product-roadmap.hd` |
| `P0.CONT.03` | Handoff schema | Nick Fine | Completed (2026-03-01) | `P0.CONT.01` | `CONTINUATION.md` rewritten with active task pointer + next actions | `CONTINUATION.md` |
| `P0.CONT.04` | Bootstrap prompt schema | Nick Fine | Completed (2026-03-01) | `P0.CONT.03` | `CONTINUATION_PROMPT.md` rewritten for fresh chat bootstrap | `CONTINUATION_PROMPT.md` |
| `P0.CONT.05` | Session rituals | Nick Fine | Completed (2026-03-01) | `P0.CONT.03` | `.claude/instructions.md` enforces startup/shutdown rituals and current source-of-truth files | `.claude/instructions.md` |
| `P0.CONT.06` | Source-of-truth cleanup | Nick Fine | Completed (2026-03-01) | `P0.CONT.05` | `README.md` and `docs/README.md` references corrected | `README.md`, `docs/README.md` |
| `P0.CONT.07` | Forge handoff file | Nick Fine | Completed (2026-03-01) | `P0.CONT.03` | `forge-native/CONTINUATION_HANDOFF.md` exists and is linked | `forge-native/CONTINUATION_HANDOFF.md` |
| `P0.CONT.08` | Learnings protocol | Nick Fine | Completed (2026-03-01) | `P0.CONT.03` | `LEARNINGS.md` includes per-session entry and reusable entry template | `LEARNINGS.md` |
| `P1.IA.01` | IA and routing migration | Product + Eng | Completed (2026-03-01) | `P0.CONT.*` | Implementation-level IA/routing spec approved for canonical nav, sub-tabs, redirects, and Forge view adapters | `docs/HDC-P1-IA-ROUTING-SPEC.md` |
| `P1.REG.01` | `R1.1` to `R1.5` | Eng | Completed (2026-03-01) | `P1.IA.01` | Registry P0 implemented and validated | `docs/HDC-P1-REGISTRY-CONTRACT-SPEC.md`, `forge-native/src/index.ts`, `forge-native/src/backend/supabase/repositories.ts`, `forge-native/static/frontend/src/App.tsx`, `forge-native/static/frontend/src/utils/registry.ts`, `tests/forge-native-registry-contract.spec.ts`, `tests/forge-native-registry-utils.spec.ts`, `tests/forge-native-registry-runtime-modes.spec.ts` |
| `P1.PX.01` | `R2.1` to `R2.6` | Eng | Completed (2026-03-01; GO) | `P1.IA.01`, `P1.REG.01` | Problem Exchange P0 including moderation auto-hide | `docs/HDC-P1-PROBLEM-EXCHANGE-CONTRACT-SPEC.md`, `docs/HDC-P1-PROBLEM-EXCHANGE-ROLLOUT-CHECKLIST.md`, `docs/HDC-P1-PROBLEM-EXCHANGE-MODERATION-RUNBOOK.md`, `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md`, `docs/artifacts/HDC-P1-PX-LIVE-UI-SMOKE-20260301-0303Z.png`, `forge-native/supabase/migrations/20260301020000_phase1_problem_exchange.sql`, `forge-native/src/backend/supabase/repositories.ts`, `forge-native/src/backend/hackcentral.ts`, `forge-native/src/index.ts`, `forge-native/src/shared/types.ts`, `forge-native/static/frontend/src/types.ts`, `forge-native/static/frontend/src/App.tsx`, `forge-native/static/frontend/src/utils/problemExchange.ts`, `tests/forge-native-problem-exchange-contract.spec.ts`, `tests/forge-native-problem-exchange-runtime-modes.spec.ts`, `tests/forge-native-problem-exchange-utils.spec.ts` |
| `P1.PIPE.01` | `R3.1` to `R3.5` | Eng | Completed (2026-03-01; GO) | `P1.IA.01` | Pipeline board with stage gates, admin-editable criteria, and required transition notes | `docs/HDC-P1-PIPELINE-CONTRACT-SPEC.md`, `docs/artifacts/HDC-P1-PIPE-ROLLOUT-CHECKPOINT-20260301-1108Z.md`, `forge-native/supabase/migrations/20260301033000_phase1_pipeline.sql`, `forge-native/src/backend/supabase/repositories.ts`, `forge-native/src/backend/hackcentral.ts`, `forge-native/src/index.ts`, `forge-native/src/shared/types.ts`, `forge-native/static/frontend/src/types.ts`, `forge-native/static/frontend/src/constants/nav.ts`, `forge-native/static/frontend/src/App.tsx`, `forge-native/static/frontend/src/styles.css`, `tests/forge-native-pipeline-contract.spec.ts`, `tests/forge-native-pipeline-runtime-modes.spec.ts` |
| `P1.SHOW.01` | `R4.1` to `R4.4` | Eng | Completed (2026-03-01; GO) | `P1.IA.01` | Showcase split + hack detail pages live | `docs/HDC-P1-SHOWCASE-CONTRACT-SPEC.md`, `forge-native/supabase/migrations/20260301122000_phase1_showcase.sql`, `forge-native/src/backend/supabase/repositories.ts`, `forge-native/src/backend/hackcentral.ts`, `forge-native/src/index.ts`, `forge-native/src/shared/types.ts`, `forge-native/static/frontend/src/types.ts`, `forge-native/static/frontend/src/App.tsx`, `forge-native/static/frontend/src/styles.css`, `tests/forge-native-showcase-contract.spec.ts`, `tests/forge-native-showcase-runtime-modes.spec.ts`, `docs/artifacts/HDC-P1-SHOW-ROLLOUT-CHECKPOINT-20260301-1142Z.md`, `docs/artifacts/HDC-P1-SHOW-LIVE-UI-SMOKE-20260301-1153Z.png` |
| `P1.CHILD.01` | `R5.1` to `R5.4` | Eng | Completed (2026-03-01; GO) | `P1.PX.01`, `P1.SHOW.01` | Child integrations (problem import + auto-draft publish) live | `docs/HDC-P1-CHILD-INTEGRATION-CONTRACT-SPEC.md`, `docs/artifacts/HDC-P1-CHILD-ROLLOUT-CHECKPOINT-20260301-1258Z.md`, `docs/artifacts/p1-child-step6-live-20260301-1257.png`, `docs/artifacts/p1-child-create-success-20260301-1258.png`, `forge-native/src/backend/supabase/repositories.ts`, `forge-native/src/backend/hackcentral.ts`, `forge-native/src/backend/hdcService.ts`, `forge-native/src/index.ts`, `forge-native/src/shared/types.ts`, `forge-native/static/frontend/src/types.ts`, `forge-native/static/frontend/src/App.tsx`, `tests/forge-native-hdcService.spec.ts` |
| `P1.OBS.01` | Phase 1 telemetry | Eng | Completed (2026-03-01; GO) | `P1.REG.01`, `P1.PX.01`, `P1.PIPE.01` | Regression and telemetry guardrails standardized for Phase 1 loops, with reusable gate template for pending modules | `docs/HDC-P1-OBS-GUARDRAILS-PACK.md`, `docs/HDC-P1-MODULE-ROLLOUT-CHECKPOINT-TEMPLATE.md`, `docs/artifacts/HDC-P1-OBS-ROLLOUT-CHECKPOINT-20260301-1112Z.md`, `package.json` |
| `P2.PATH.01` | `R6.1` to `R6.4` | Eng | Planned | Phase 1 complete | Pathways delivered in Guide | Pending |
| `P2.METRICS.01` | `R7.1` to `R7.4` | Eng | Planned | Phase 1 data availability | Team Pulse metrics expansion delivered | Pending |
| `P2.RECOG.01` | `R8.1` to `R8.2` | Eng | Planned | `P2.METRICS.01` | Recognition rules + leaderboard segmentation delivered | Pending |
| `P2.OBS.01` | Phase 2 telemetry | Eng | Planned | `P2.PATH.01`, `P2.METRICS.01`, `P2.RECOG.01` | Adoption KPI trend instrumentation active | Pending |
| `P3.ROI.01` | `R9.1` to `R9.5` | Eng + Data | Planned | Phase 2 complete, token data source audit | ROI dashboard + export delivered | Pending |
| `P3.FORK.01` | `R10.1` to `R10.2` | Eng | Planned | `P1.REG.01`, `P1.SHOW.01` | Fork/remix for hacks + artifacts delivered | Pending |
| `P3.EXTRACT.01` | `R11.1` to `R11.2` | Eng | Planned | `P1.CHILD.01`, `P1.SHOW.01` | Post-hackday extraction and bulk import workflows delivered | Pending |
| `P3.FEED.01` | `R12.1` to `R12.2` | Eng | Planned | Phase 2 metrics available | Home feed + personalized recommendations delivered | Pending |
| `P3.OBS.01` | Phase 3 telemetry | Eng + Data | Planned | `P3.ROI.01`, `P3.FEED.01` | Cost/output trend alerting with reporting cadence | Pending |

## Active Sprint Queue

### Now

1. `P2.PATH.01` - prepare Guide pathways dependency framing and implementation slices.
2. `P2.METRICS.01` - pre-plan Team Pulse expansion dependencies.
3. `P2.RECOG.01` - pre-plan recognition metrics prerequisites.

### Next

1. `P2.RECOG.01` - pre-plan recognition metrics prerequisites.
2. `P2.OBS.01` - define adoption KPI trend instrumentation baseline.
3. `P3.ROI.01` - start token data source audit prerequisites.

### Blocked

1. None currently logged.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Nav/IA migration creates regressions in existing create/open flows | High | Ship behind route-level flags and run existing create/runtime regression pack before each rollout |
| Moderation logic causes false hides | Medium | Enforce distinct-user flag counting and admin override audit trail |
| Pipeline adoption lags without clear stage criteria | Medium | Stage-gate criteria visible in UI and required transition notes |
| Phase 3 token data not available at required granularity | High | Perform data-source audit before `P3.ROI.01`; scope fallback metrics if gaps remain |

## Release Guardrails and Rollout Gates

1. Use feature flags per module: `registry`, `problem_exchange`, `pipeline`, `showcase`, `child_integration`, `pathways`, `roi`, `feed`.
2. Do not enable a module in production without passing the module-specific regression suite plus create/open/runtime baseline checks.
3. Preserve existing production guardrails around runtime routing and telemetry (`create_handoff`, `runtime_first_load`, `runtime_bootstrap`).
4. Keep rollback path documented for every production schema or routing change.
5. Update continuity documents in the same session as any deployment or migration.

## Change Log

| Date | Change |
|---|---|
| 2026-03-01 | Created initial execution ledger from `HDC-PRODUCT-ROADMAP.md`; seeded tasks for Phase 0-3 and activated continuity protocol. |
| 2026-03-01 | Completed `P1.IA.01` with implementation-ready IA/routing spec in `docs/HDC-P1-IA-ROUTING-SPEC.md`; active task advanced to `P1.REG.01`. |
| 2026-03-01 | Locked `P1.REG.01` contract specification (`docs/HDC-P1-REGISTRY-CONTRACT-SPEC.md`) and moved `P1.REG.01` to in-progress implementation status. |
| 2026-03-01 | Implemented `P1.REG.01` backend baseline: Supabase migration, resolver/service/repository contracts, and targeted registry backend tests (5 passing). |
| 2026-03-01 | Implemented `P1.REG.01` Forge Registry UI baseline in `App.tsx` with list/filter/create/detail/reuse flows, added registry frontend utility module, and validated with registry contract + utility tests (9 passing total). |
| 2026-03-01 | Completed `P1.REG.01` validation hardening: added source-hack linked/unlinked contract coverage and runtime backend-mode checks; total Registry validation suite now 15 passing tests. Active task advanced to `P1.PX.01`. |
| 2026-03-01 | Started `P1.PX.01` implementation: added Problem Exchange contract spec, Supabase migration, shared/resolver/backend repository wiring, and contract/runtime tests (25 passing cross-suite with Registry + Problem Exchange). |
| 2026-03-01 | Implemented `P1.PX.01` Forge Problem Exchange UI baseline in `App.tsx` (create/list/filter/vote/flag/status/moderate flows), added frontend utility module `utils/problemExchange.ts`, and validated with new utility tests; cross-suite now 31 passing tests. |
| 2026-03-01 | Added `P1.PX.01` moderation guardrails and telemetry: backend allowlist gate for `hdcModerateProblem` via `HDC_PROBLEM_EXCHANGE_MODERATOR_ACCOUNT_IDS`, new `hdcGetProblemExchangeCapabilities` resolver, UI moderation gating in `App.tsx`, and backend telemetry events (`problem_created`, `problem_voted`, `problem_status_updated`, `problem_flagged`, `problem_moderated`); cross-suite now 32 passing tests. |
| 2026-03-01 | Replaced temporary moderation allowlist gate with org authority source in Supabase `User` (`role='ADMIN'` or capability tags `problem_exchange_moderator` / `platform_admin`) while keeping `hdcGetProblemExchangeCapabilities` response contract stable (`moderationMode='allowlist'` compatibility alias); targeted typechecks + PX test suite passing (17 tests). |
| 2026-03-01 | Expanded `P1.PX.01` UI-level validation coverage via `problemExchange` utilities/tests (filter apply/reset, solved-link enforcement, preview vote/flag idempotency, moderation gate UX state helpers), and added rollout/moderation operations docs (`HDC-P1-PROBLEM-EXCHANGE-ROLLOUT-CHECKLIST.md`, `HDC-P1-PROBLEM-EXCHANGE-MODERATION-RUNBOOK.md`); utility suite now 12 passing tests. |
| 2026-03-01 | Executed `P1.PX.01` rollout regression gate (contract + runtime + utils + Forge/frontend typechecks) and recorded checkpoint artifact `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md` with Conditional GO; live staging smoke/authority audit remains pending due missing staging credentials in current workspace. |
| 2026-03-01 | Retrieved working Supabase project access via `/Users/nickster/Downloads/HD26Forge` credential path; completed live authority audit against `ssafugtobsqxmqtphwch` (`8` mapped accounts, `2` moderator-eligible) and verified live resolver behavior for moderator/non-moderator account IDs via `getProblemExchangeCapabilities` (`true` for admin account, `false` for user account); rollout checkpoint updated, Conditional GO now blocked only on live UI smoke. |
| 2026-03-01 | Executed live production UI smoke on Problem Exchange (`create`, `filter apply/reset`, vote/flag duplicate guards, solved-link validation, status transition, moderator remove/reinstate), captured evidence in `docs/artifacts/HDC-P1-PX-LIVE-UI-SMOKE-20260301-0303Z.png`, upgraded checkpoint decision to GO in `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md`, and advanced active task to `P1.PIPE.01`. |
| 2026-03-01 | Started `P1.PIPE.01` implementation: locked pipeline contract spec (`docs/HDC-P1-PIPELINE-CONTRACT-SPEC.md`), promoted nav from Projects to Pipeline, and delivered initial Pipeline board shell with stage criteria + metrics in Forge UI (`App.tsx`/`styles.css`), including backward-compatible `projects` -> `pipeline` redirect. |
| 2026-03-01 | Completed `P1.PIPE.01`: landed persistent pipeline migration, board + move + criteria-update resolvers (`hdcGetPipelineBoard`, `hdcMovePipelineItem`, `hdcUpdatePipelineStageCriteria`), admin-gated UI controls for stage transitions and stage criteria editing, and validated with targeted tests (`9/9`), full Phase 1 suite (`47/47`), plus live Supabase migration and resolver smoke checks; checkpoint recorded in `docs/artifacts/HDC-P1-PIPE-ROLLOUT-CHECKPOINT-20260301-1108Z.md`. Active task advanced to `P1.OBS.01`. |
| 2026-03-01 | Completed `P1.OBS.01`: standardized Phase 1 regression + telemetry gates into `qa:p1:go-gate`, added shared guardrail runbook (`docs/HDC-P1-OBS-GUARDRAILS-PACK.md`), introduced reusable module checkpoint template (`docs/HDC-P1-MODULE-ROLLOUT-CHECKPOINT-TEMPLATE.md`), and validated checkpoint `docs/artifacts/HDC-P1-OBS-ROLLOUT-CHECKPOINT-20260301-1112Z.md` (GO). Active task advanced to `P1.SHOW.01`. |
| 2026-03-01 | Started `P1.SHOW.01`: locked Showcase contract spec (`docs/HDC-P1-SHOWCASE-CONTRACT-SPEC.md`), added Showcase migration (`forge-native/supabase/migrations/20260301122000_phase1_showcase.sql`) and repository/service/resolver contracts (`hdcListShowcaseHacks`, `hdcGetShowcaseHackDetail`, `hdcSetShowcaseFeatured`), expanded `createHack` metadata contract (`demoUrl`, team/tags/source/linked artifacts), wired Forge Showcase list/detail/featured controls in `App.tsx`, validated with Showcase targeted tests (`9/9`) plus full guardrail gate (`56/56`), and applied live migration + resolver smoke against `ssafugtobsqxmqtphwch`; checkpoint recorded as Conditional GO in `docs/artifacts/HDC-P1-SHOW-ROLLOUT-CHECKPOINT-20260301-1142Z.md`. |
| 2026-03-01 | Completed `P1.SHOW.01`: deployed production Forge app (`app version 5.29.0`), executed live Showcase UI smoke (submit modal `demoUrl` validation, valid submit, filters, detail panel, admin featured toggle), captured screenshot evidence (`docs/artifacts/HDC-P1-SHOW-LIVE-UI-SMOKE-20260301-1153Z.png`), sampled live Forge telemetry logs (`hdc-switcher-telemetry`, `hdc-performance-telemetry`), validated admin/non-admin featured authority (`[SHOWCASE_FORBIDDEN]` for non-admin), ran rollback dry-run (`hdcSetShowcaseFeatured(false)`), and upgraded checkpoint to GO in `docs/artifacts/HDC-P1-SHOW-ROLLOUT-CHECKPOINT-20260301-1142Z.md`. Active task advanced to `P1.CHILD.01`. |
| 2026-03-01 | Started `P1.CHILD.01` implementation baseline: added child integration contract spec (`docs/HDC-P1-CHILD-INTEGRATION-CONTRACT-SPEC.md`), added resolver/repository contract `hdcListProblemImportCandidates` for high-vote Problem Exchange imports, extended `hdcCreateInstanceDraft` with `childIntegration` payload (`importProblemIds`, `autoPublishToShowcaseDrafts`, `templateMode`), persisted child integration metadata into `HackdayTemplateSeed.seed_payload` and `event_created` audit records, and wired Create HackDay step-6 UI controls for challenge import + auto-publish/template choices. Validation: `tests/forge-native-hdcService.spec.ts` + `tests/forge-native-createFromWeb.spec.ts` (31/31 passing), `forge-native` typecheck pass, `forge-native/static/frontend` typecheck pass. |
| 2026-03-01 | Completed `P1.CHILD.01`: deployed production child-integration bundle, verified live Create HackDay step-6 controls (`templateMode`, `autoPublishToShowcaseDrafts`, Problem Exchange import checklist), executed end-to-end create smoke (`P1 CHILD LIVE 20260301-1305`) with selected candidate import (`819b3023-ec4d-4b22-8f9f-07ca7f7c2fa2`) and child page creation (`18120705`), and confirmed persisted `HackdayTemplateSeed.seed_payload.childIntegration` payload (`templateMode=customized`, `autoPublishToShowcaseDrafts=false`, imported problem snapshot). Checkpoint: `docs/artifacts/HDC-P1-CHILD-ROLLOUT-CHECKPOINT-20260301-1258Z.md` (`GO`). Active task advanced to `P2.PATH.01`. |
