# HackDay Central v2 Execution Plan

**Goal:** Translate `HackDayCentral_spec_v2.md` into an implementation-ready roadmap with clear sequencing, acceptance criteria, and delivery gates.

**Current baseline (as implemented):**
- Multi-tenant vertical slice exists (draft creation, child page + macro insertion, hack submit, complete/sync, retry).
- Core persistence is currently Supabase-backed (`Event`, `EventAdmin`, `EventSyncState`, `EventAuditLog`) rather than Confluence page-property storage.
- Status is best described as: **Phase 1 complete + early Phase 2 started**.

## Phase 3 Telemetry Consistency Checkpoint (Feb 18, 2026 01:14 UTC)

### Completed
- Eliminated frontend telemetry/UI drift risk by centralizing switcher navigability counts through shared helper logic:
  - added `summarizeSwitcherNavigability` to:
    - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/appSwitcher.ts`
    - `/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/appSwitcher.ts`
  - updated telemetry emitters to use helper summary counts on both surfaces:
    - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/App.tsx`
    - `/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/App.tsx`
- Added helper-level coverage for partial/contradictory registry rows:
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-global-app-switcher.spec.ts`
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-app-switcher.spec.ts`
- Verification:
  - `npm run typecheck` (forge-native) ✅
  - `npm run frontend:build` (forge-native) ✅
  - `npm run macro:build` (forge-native) ✅
  - `npm run test:run` (repo root) ✅ (`44` tests passing)

### Deploy/install/smoke outcome
- No deploy/install/smoke commands executed in this checkpoint.
- Last confirmed production submit artifact remains `prodSmoke-20260217-170434`.

### Plan impact
- Switcher telemetry counts now match runtime navigability guards and warning behavior, reducing false non-navigable reporting from partial cache/contract edge cases.
- P3-8 macro-context breakpoint QA remains blocked only on Confluence page-create/discovery permissions for real parent/instance macro host pages.

## Phase 3 QA Acceleration Checkpoint (Feb 18, 2026 00:32 UTC)

### Completed
- Added `Refresh switcher registry` control on both UI surfaces when non-provisioned switcher rows are detected:
  - global app UI: `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/App.tsx`
  - macro UI: `/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/App.tsx`
- Added dedicated runbook/checklist for pending macro-context breakpoint matrix:
  - `/Users/nickster/Downloads/HackCentral/docs/HDC-V2-PHASE3-MACRO-QA-RUNBOOK.md`
- Verification:
  - `npm run typecheck` (forge-native) ✅
  - `npm run frontend:build` (forge-native) ✅
  - `npm run macro:build` (forge-native) ✅
  - `npm run test:run` (repo root) ✅ (`42` tests passing)

### Deploy/install/smoke outcome
- No deploy/install/smoke commands executed in this checkpoint.
- Last confirmed production submit artifact remains `prodSmoke-20260217-170434`.

### Plan impact
- Phase 3 switcher unavailable-state UX is now recoverable in-session via explicit registry refresh.
- P3-8 macro-context desktop/tablet/mobile matrix remains blocked only on Confluence page-create/discovery permissions for real parent/instance macro host pages.

## Phase 3 Telemetry + Contract Checks (Feb 18, 2026 00:13 UTC)

### Completed
- Added switcher navigability telemetry in backend response paths:
  - `getBootstrapData` logs registry quality counts,
  - `hdcGetContext` logs parent/instance registry quality counts.
- Added corresponding UI telemetry emitters on both app surfaces:
  - global app load path (live + cache),
  - macro context load path (live + cache).
- Added backend contract tests to enforce page-ID/navigability coherence:
  - whitespace/blank `confluencePageId` normalizes to `null`,
  - `isNavigable` remains consistent with normalized page IDs.
- Files updated:
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/hackcentral.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/hdcService.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/App.tsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/App.tsx`
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-repository-event-config.spec.ts`
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-hdcService.spec.ts`
- Verification:
  - `npm run typecheck` (forge-native) ✅
  - `npm run frontend:build` (forge-native) ✅
  - `npm run macro:build` (forge-native) ✅
  - `npm run test:run` (repo root) ✅ (`42` tests passing)

### Deploy/install/smoke outcome
- No deploy/install/smoke commands executed in this checkpoint.

### Plan impact
- Improves observability for provisioning-related switcher failures and locks backend contract behavior under tests while macro-host permissions remain blocked.

## Phase 3 Navigability Contract Hardening (Feb 18, 2026 00:07 UTC)

### Completed
- Introduced explicit switcher navigability contract in shared/backend registry model:
  - `EventRegistryItem.confluencePageId` nullable,
  - `EventRegistryItem.isNavigable` explicit boolean.
- Backend normalization updates:
  - Supabase event->registry mapper now normalizes page ID + computes `isNavigable`,
  - `hdcGetContext` instance payload now includes explicit `isNavigable`,
  - Convex fallback bootstrap registry is normalized to the same contract.
- Frontend integration completed on both UI surfaces:
  - global page switcher now keys disabled state and navigation guard off explicit `isNavigable`,
  - macro switcher now applies the same disabled/guard behavior and unavailable row text,
  - both surfaces show a top-level warning when non-provisioned entries are present.
- Files updated:
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/shared/types.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/supabase/repositories.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/hdcService.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/hackcentral.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/App.tsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/appSwitcher.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/types.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/App.tsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/appSwitcher.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/types.ts`
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-global-app-switcher.spec.ts`
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-app-switcher.spec.ts`
- Verification:
  - `npm run typecheck` (forge-native) ✅
  - `npm run frontend:build` (forge-native) ✅
  - `npm run macro:build` (forge-native) ✅
  - `npm run test:run` (repo root) ✅ (`40` tests passing)

### Deploy/install/smoke outcome
- No deploy/install/smoke commands executed in this checkpoint.

### Plan impact
- Switcher behavior is now contract-driven and consistent between global and macro surfaces even when page provisioning is incomplete.
- Remaining blocker is unchanged: manual macro-host breakpoint QA (P3-8) still requires real parent/instance host page IDs with accessible page-create/discovery permissions.

## Phase 3 Switcher Null-Target Hardening (Feb 17, 2026 23:53 UTC)

### Completed
- Added explicit non-navigable handling for switcher entries missing Confluence page IDs:
  - disabled switcher rows for null/blank `confluencePageId`,
  - inline unavailable label (`Page not provisioned yet`),
  - guarded navigation callback to prevent null-target route attempts,
  - surface warning when registry includes non-provisioned entries.
- Files updated:
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/App.tsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/appSwitcher.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/types.ts`
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-global-app-switcher.spec.ts`
- Verification:
  - `npm run typecheck` (forge-native) ✅
  - `npm run frontend:build` (forge-native) ✅
  - `npm run macro:build` (forge-native) ✅
  - `npm run test:run` (repo root) ✅ (`38` tests passing)

### Deploy/install/smoke outcome
- No deploy/install/smoke commands executed in this checkpoint.

### Plan impact
- Switcher now fails safely and transparently when backend data is incomplete (null page IDs), reducing false-negative QA outcomes and user confusion while macro host page permissions/discovery remain blocked.

## Phase 3 Macro-Context QA Checkpoint C (Feb 17, 2026 23:28 UTC)

### Completed
- Continued from current `main` head `1d649ae`.
- Revalidated current line before checkpoint close:
  - `npm run typecheck` (forge-native) ✅
  - `npm run frontend:build` (forge-native) ✅
  - `npm run macro:build` (forge-native) ✅
  - `npm run test:run` (repo root) ✅ (`36` tests passing)
- Verified blocking conditions for macro-context QA scope on `hackdaytemp`:
  - Atlassian MCP access in-session is scoped to `hd26.atlassian.net`; `hackdaytemp` cloud resource is not available via MCP search/fetch tools.
  - Global switcher registry payload contains only draft entries with `confluencePageId: null` and `confluenceParentPageId: null`; no navigable macro-host targets are present.
  - Confluence Create -> Page flow fails with `We’re unable to create for you` and `You don’t have the correct permissions for creation.`
  - Confluence REST search (`macro = "hackday-central-macro"` and HackDay/HackCentral title/text queries) returned `0` matching pages.
- Executed best unblocked next step:
  - Ran responsive switcher QA on production global surface URL:
    - desktop iframe viewport `1287x1303` (`>1024`) ✅ anchored dropdown + metadata/status visible + keyboard flow (`Enter`, `ArrowDown`, `Escape`) pass.
    - tablet iframe viewport `901x1371` (`768-1024`) ✅ compact dropdown with icon/name-only rows (meta/status hidden).
    - mobile iframe viewport `636x2150` (`<768`) ✅ fixed bottom sheet + fullscreen overlay + row tap target min `45px`.

### Deploy/install/smoke outcome in this checkpoint
- No additional deploy/install commands were executed.
- No new submit smoke artifact created; latest remains `prodSmoke-20260217-170434`.

### Plan impact
- Phase 3 responsive behavior is revalidated on the active production global surface.
- **Open blocker remains unchanged:** P3-8 macro-context matrix (real parent + instance macro host pages) cannot be completed without either:
  - permissions to create Confluence pages in `hackdaytemp`, or
  - existing macro host page URLs/IDs with viewer access.

## Production Promotion + Smoke Closure (Feb 17, 2026)

### Completed
- Continued from commit `f8cafdc` and reran local validation:
  - `npm run frontend:build` (forge-native) ✅
  - `npm run macro:build` (forge-native) ✅
  - `npm run typecheck` (forge-native) ✅
  - `npm run test:run` (repo root) ✅ (29 tests passing)
- Promoted current line to production:
  - `forge deploy --non-interactive -e production` ✅ (Forge version `3.6.0`)
  - `forge install --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence --environment production` ✅
  - `forge install list --site hackdaytemp.atlassian.net --product confluence -e production` ✅ (`Up-to-date`, production App version `3`)
- Manual production smoke run in **HackCentral** (not `HackCentral (Development)`):
  - load app ✅
  - list hacks ✅
  - submit hack ✅ (`Hack submitted: prodSmoke-20260217-1628`)
  - submitted hack appears in list after reload ✅

### Plan impact
- The requested production promote + minimal production smoke objective is closed.

## Global Surface Switcher Closure (Feb 17, 2026)

### Completed
- Confirmed active test surface is the Confluence global page URL:
  - `https://hackdaytemp.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/6ef543d7-4817-408a-ae19-1b466c81a797/hackday-central`
- Ported Phase 3 app switcher from macro-only implementation into global frontend and wired bootstrap registry payloads through backend contracts.
- Added global switcher logic coverage:
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-global-app-switcher.spec.ts`
- Landed implementation commit:
  - `25329c9` (`feat: add global-page app switcher with event registry bootstrap`)
- Revalidated locally:
  - `npm run typecheck` (forge-native) ✅
  - `npm run frontend:build` (forge-native) ✅
  - `npm run macro:build` (forge-native) ✅
  - `npm run test:run` (repo root) ✅ (`36` tests passing)
- Promoted to production:
  - `forge deploy --non-interactive -e production` ✅ (Forge version `3.8.0`)
  - `forge install --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence --environment production` ✅ (site already latest)
  - `forge install list --site hackdaytemp.atlassian.net --product confluence -e production` ✅ (`Up-to-date`, App version `3`)
- Manual production smoke on HackCentral global page:
  - load app ✅
  - list hacks ✅
  - submit hack ✅ (`Hack submitted: prodSmoke-20260217-170434`)
  - submitted item appears in Latest Hacks after submit/reload ✅

### Plan impact
- Phase 3 app switcher is now validated on the actual production surface in use (global page).
- Requested promotion/smoke objective remains closed on the corrected surface.

## Day 6 Integration Checkpoint (Feb 17, 2026)

### Completed
- Integration verification bundle executed:
  - `npm run typecheck` (forge-native) ✅
  - `npm run frontend:build` (forge-native) ✅
  - `npm run macro:build` (forge-native) ✅
  - `npm run test:run` (repo root) ✅ (29 tests passing)
  - targeted integration suite ✅ (`24` tests across `hdcService` + Supabase sync/event-config/project-insert specs)
- Day 6 flow coverage confirmed through service/repository tests and production smoke:
  - create draft + wizard contract persistence/validation,
  - launch lifecycle transitions,
  - submit hack (manual production smoke),
  - complete/sync classification and retry/idempotency handling.
- Permission matrix/failure-path coverage confirmed:
  - admin/co-admin/participant boundary checks for launch and complete/sync paths,
  - draft deletion guardrails (primary-admin only),
  - failure paths for invalid schedule ordering, invalid team-size bounds, missing go-live schedule fields, and no-submissions complete/sync.

### Release notes (Phase 2 checkpoint)
- No new code changes were required for Day 6; existing Day 4/5 implementations passed integration verification.
- Production remains aligned to the validated fix line (deployed production Forge `3.6.0`, install up to date).

## Day 7 Phase 3 Kickoff Checkpoint (Feb 17, 2026)

### Completed
- Finalized Phase 3 kickoff specification with:
  - app switcher UX contract,
  - desktop/tablet/mobile behavior matrix,
  - cross-instance navigation URL contract,
  - cache/invalidation strategy,
  - implementation task breakdown with owners and estimates.
- Deliverable created:
  - `/Users/nickster/Downloads/HackCentral/docs/HDC-V2-PHASE3-KICKOFF.md`

### Go/No-Go
- Decision: **GO** for entering Phase 3.
- Basis: Day 6 integration checkpoint passed and production smoke remains stable on current line.

## Phase 3 App Switcher Implementation Checkpoint A (Feb 17, 2026)

### Completed
- Implemented app switcher in macro frontend for parent + instance contexts:
  - trigger in header with current-context label/icon,
  - grouped sections (`Home`, `Live Events`, `Upcoming`, `Recent`),
  - current-context highlighting and non-navigable current row,
  - close-on-selection, click-outside, and `Escape`.
- Implemented responsive behavior in macro UI:
  - desktop anchored dropdown,
  - tablet compact dropdown,
  - mobile bottom sheet + backdrop with >=44px tap targets.
- Added cross-instance navigation helpers:
  - Confluence page path builder for switcher routing.
- Added lightweight client cache policy:
  - localStorage TTL cache (5 minutes) for registry-backed switcher entries,
  - invalidation wired into create/delete/launch/sync flows.
- Added automated coverage:
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-app-switcher.spec.ts` (4 tests).

### Verification
- `npm run typecheck` (forge-native) ✅
- `npm run macro:build` (forge-native) ✅
- `npm run frontend:build` (forge-native) ✅
- `npm run test:run` (repo root) ✅ (33 tests passing)

### Plan impact
- Phase 3 is now **in progress** with core switcher UI/logic landed locally.
- Remaining Phase 3 exit items:
  - Confluence breakpoint QA matrix on real parent + instance pages,
  - production rollout for switcher changes after QA sign-off.

## Phase 3 Rollout Checkpoint B (Feb 17, 2026)

### Completed
- Deployed switcher checkpoint line (`1aaccc8`) to Forge development:
  - `forge deploy --non-interactive -e development` ✅ (deployed version `5.15.0`)
  - `forge install --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence --environment development` ✅ (latest)
- Promoted same line to Forge production:
  - `forge deploy --non-interactive -e production` ✅ (deployed version `3.7.0`)
  - `forge install --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence --environment production` ✅ (latest)
- Production sanity smoke in `HackCentral` global surface:
  - load app ✅
  - list hacks ✅
  - submit hack ✅ (`Hack submitted: prodSmoke-20260217-phase3A`)
  - submitted item appears after reload ✅

### Blocking gap
- Manual macro QA for Phase 3 app switcher (parent + instance contexts, desktop/tablet/mobile) could not be completed in this run:
  - Confluence page creation for this user is blocked (`We’re unable to create for you`).
  - No discoverable existing Confluence page with installed macro context was available via search/recent.
- Result: rollout executed with automated checks + global-surface smoke, but macro-context breakpoint verification remains pending.

## Integrity Remediation Checkpoint (Feb 17, 2026)

### Closed findings
- Persisted full wizard Step 2 schedule payload to backend storage via `Event.event_schedule` (`jsonb`) with legacy fallback compatibility.
- Enforced wizard metadata contract server-side (`wizardSchemaVersion`, `completedStep`, `launchMode`) and applied go-live lifecycle promotion (`draft -> registration`).
- Restored save-draft continuity on every wizard step in macro frontend.
- Added server-side validation for schedule ordering and team-size bounds to prevent frontend-only enforcement gaps.

### Verification
- `npm run typecheck` (forge-native) ✅
- `npm run macro:build` (forge-native) ✅
- `npm run frontend:build` (forge-native) ✅
- `npm run lint` (forge-native) ✅ (manifest warning only, non-blocking)
- `npm run test:run` (repo root) ✅ (23 tests passing)

### Plan impact
- Day 4 "save-as-draft continuity" and validation hardening items are considered complete.
- Day 5 lifecycle/permission work remains open for transition endpoint coverage and enforcement breadth.

## Day 5 Transition Enforcement Checkpoint (Feb 17, 2026)

### Completed
- `hdcLaunchInstance` now enforces sequential lifecycle transitions server-side:
  - `draft -> registration -> team_formation -> hacking -> voting -> results -> completed`
- Transition endpoint now blocks terminal/invalid advancement:
  - `archived` cannot transition
  - terminal status without defined next transition is rejected
- Guardrail added for `results -> completed`:
  - requires sync status `complete`
- Existing role boundary preserved:
  - only primary/co-admin may transition lifecycle.

### Test coverage added
- Co-admin lifecycle advance from `draft` to `registration`.
- Participant/non-admin transition rejection.
- `results -> completed` blocked when sync is not complete.
- `results -> completed` succeeds when sync is complete.

### Verification
- `npm run typecheck` (forge-native) ✅
- `npm run frontend:build` (forge-native) ✅
- `npm run macro:build` (forge-native) ✅
- `npm run test:run` (repo root) ✅ (27 tests passing)

## Execution Status Checkpoint (Feb 16, 2026)

### Completed since roadmap creation
- Incident-response stabilization completed for Supabase legacy schema compatibility.
- Development submit flow is working end-to-end again (hack submit success confirmed).
- Supabase migration history in-repo is synchronized with remote history.

### Open risks
- Production environment is still behind development runtime fixes.
- Data model drift remains between legacy Supabase schema and strict v2 spec shape.

### Immediate priority
- Close Phase 0 Alignment Gate formally and move back to planned phase execution.

---

## 0.1 Alignment Gate Decision (Locked)

Decision date: **Feb 16, 2026**

### Decision A: Source of truth
- **Chosen:** Option A (Supabase-centric runtime source of truth).
- Confluence page properties are retained as integration/discovery metadata, not primary runtime state.

### Decision B: Scope target
- **Chosen:** Option B ("v2 MVP equivalent" with Supabase-first architecture and behavior parity).
- Scope is measured by user-visible and workflow parity against `HackDayCentral_spec_v2.md`, not by strict storage-mechanism parity.

### Decision record
- ADR created: `/Users/nickster/Downloads/HackCentral/docs/ADR-001-HDC-V2-ARCHITECTURE.md`

### Gate outcome
- Alignment Gate is considered **closed** for execution purposes.
- New work should follow phase order below unless a production incident requires interruption.

---

## 0. Alignment Gate (Do First)

**Objective:** Resolve architecture drift before building more features.

### Decision A: Source of truth
- Option A: Keep current Supabase-centric model for event/runtime data and treat Confluence page properties as integration metadata only.
- Option B: Re-align to spec and migrate primary runtime data to Confluence page properties with sharding.

### Decision B: Scope target
- Option A: Deliver strict v2 MVP exactly as specified.
- Option B: Deliver "v2 MVP equivalent" using Supabase-first architecture with spec-level behavior parity.

### Deliverables
- Architecture decision record in this file (or `docs/` ADR).
- Updated acceptance criteria per phase based on chosen architecture.
- Explicit migration strategy if choosing Option B for data model.

### Exit criteria
- Team agrees and documents final architecture and scope.
- No further feature work starts before this gate is closed.

---

## Next 7 Days Execution Sprint

### Sprint progress
- Day 1 status (Feb 16, 2026): **completed**
  - Production `FORGE_DATA_BACKEND` set to `supabase`.
  - Production deploy completed (`forge deploy -e production`).
  - Production installation upgraded on `hackdaytemp.atlassian.net`.
- Day 2 status (Feb 17, 2026): **completed (Confluence macro surface)**
  - Development verification rerun:
    - `npm run frontend:build` (forge-native) ✅
    - `npm run macro:build` (forge-native) ✅
    - `npm run typecheck` (forge-native) ✅
    - `npm run test:run` (repo root) ✅ (29 tests passing)
  - Production Forge verification rerun:
    - `forge variables list -e production` confirms expected Supabase variables and `FORGE_DATA_BACKEND=supabase`.
    - `forge install list --site hackdaytemp.atlassian.net --product confluence -e production` shows production status `Up-to-date`.
  - Manual Confluence smoke in active app surface (`HackCentral (Development)`):
    - `load app` ✅
    - `list hacks` ✅
    - `submit hack` ✅
  - Manual Confluence production smoke in `HackCentral`:
    - `load app` ✅
    - `list hacks` ✅
    - `submit hack` ✅ (`prodSmoke-20260217-1628`)
  - Clarification:
    - old "create project UI" step is not applicable in the current macro UI surface (no dedicated Projects area in this app surface).
  - Defects found during smoke were closed with retry/legacy compatibility hardening for `Project` insert constraints (`teamId`, `name`, FK paths).
- Day 3 status (Feb 16, 2026): **completed (scope freeze)**
  - Locked Phase 2 field/payload/permissions contract in:
    - `/Users/nickster/Downloads/HackCentral/docs/HDC-V2-PHASE2-SCOPE-FREEZE.md`
  - Day 4+ implementation should use this contract as the build target.
- Day 4 status (Feb 17, 2026): **completed (chunk A closed)**
  - Macro wizard expanded with full Step 2 schedule fields and extended Step 3/4 payload fields.
  - `CreateInstanceDraftInput` contract updated with v2 metadata (`wizardSchemaVersion`, `completedStep`, `launchMode`) and expanded schedule/rules/branding shape.
  - Backend now persists full schedule (`event_schedule`) and applies go-live lifecycle promotion.
  - Save Draft is available on every wizard step.
  - Validation coverage expanded for schedule ranges and team-size bounds (frontend + backend enforcement).
  - Tests expanded for v2 schedule/rules/branding and launch-mode behavior.
  - Verification rerun:
    - `npm run frontend:build` (forge-native) ✅
    - `npm run macro:build` (forge-native) ✅
    - `npm run typecheck` (forge-native) ✅
    - `npm run test:run` (repo root) ✅ (23 tests passing)
- Day 5 status (Feb 17, 2026): **completed**
  - Transition endpoint now enforces sequential state advancement and blocks invalid terminal transitions.
  - `results -> completed` now requires sync status `complete`.
  - Added transition permission/guardrail tests in `tests/forge-native-hdcService.spec.ts`.
  - Macro frontend admin action wording aligned to transition behavior ("Advance Lifecycle").
  - Verification rerun:
    - `npm run frontend:build` (forge-native) ✅
    - `npm run macro:build` (forge-native) ✅
    - `npm run typecheck` (forge-native) ✅
    - `npm run test:run` (repo root) ✅ (27 tests passing)
- Day 6 status (Feb 17, 2026): **completed (integration checkpoint)**
  - Verification rerun:
    - `npm run typecheck` (forge-native) ✅
    - `npm run frontend:build` (forge-native) ✅
    - `npm run macro:build` (forge-native) ✅
    - `npm run test:run` (repo root) ✅ (29 tests passing)
  - Targeted integration coverage:
    - `vitest run tests/forge-native-hdcService.spec.ts tests/forge-native-repository-sync.spec.ts tests/forge-native-repository-event-config.spec.ts tests/forge-native-repository-project-insert.spec.ts` ✅ (`24` tests)
  - Flow coverage assertion:
    - create draft + launch + complete/sync paths validated in service/repository tests;
    - submit hack path validated in production Confluence smoke (`HackCentral`).
- Day 7 status (Feb 17, 2026): **completed (Phase 3 kickoff prep)**
  - Deliverable:
    - `/Users/nickster/Downloads/HackCentral/docs/HDC-V2-PHASE3-KICKOFF.md`
  - Outcome:
    - app switcher behavior matrix finalized for desktop/tablet/mobile.
    - Phase 3 task breakdown prepared with estimates/owners.
    - go/no-go decision: **GO**.
- Phase 3 status (Feb 17, 2026): **in progress (implementation checkpoint A)**
  - Macro app switcher UI + helper/cache layer implemented locally.
  - Automated verification green (`typecheck`, `builds`, `33` tests).
  - Confluence breakpoint QA + production rollout still pending.
- Phase 3 status (Feb 17, 2026): **in progress (rollout checkpoint B)**
  - Development + production deploys completed for switcher checkpoint line.
  - Production global-surface sanity smoke passed (`prodSmoke-20260217-phase3A`).
  - Macro-context breakpoint QA is still pending due Confluence page-create/access constraints.

### Day 1: Production parity prep
- Verify production Forge variables for Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SCHEMA`, `FORGE_DATA_BACKEND`).
- Deploy current `main` to production environment.
- Run production smoke test (load app, list hacks, submit hack, create project).

### Day 2: Phase 1 closure audit
- Re-run Phase 1 acceptance criteria against development and production.
- Capture any remaining P1 defects as explicit backlog items with severity labels.
- Close Phase 1 formally in this plan if no P1 blockers remain.
- Current checkpoint (Feb 17, 2026):
  - Development acceptance checks: complete.
  - Production CLI/config checks: complete.
  - Manual Confluence macro smoke:
    - `HackCentral (Development)`: complete.
    - `HackCentral` (production app): complete (`load app`, `list hacks`, `submit hack`).

### Day 3: Phase 2 wizard scope freeze
- Freeze full 5-step wizard field contract from `HackDayCentral_spec_v2.md`.
- Define backend payload contract per step and draft-save behavior.
- Document role boundary matrix for step actions.
- Status: completed on Feb 16, 2026.
- Deliverable: `/Users/nickster/Downloads/HackCentral/docs/HDC-V2-PHASE2-SCOPE-FREEZE.md`

### Day 4: Phase 2 implementation chunk A
- Implement Step 2-5 scaffolding in macro frontend.
- Wire save-as-draft continuity across steps (frontend + resolver payload flow).
- Add validation and error contract tests for wizard transitions.
- Current checkpoint (Feb 17, 2026):
  - Step 2 full field scaffolding: complete.
  - Payload flow for expanded wizard contract: complete.
  - Save-as-draft continuity across steps: complete.
  - Validation coverage for wizard step gates: complete (frontend + backend).
  - Additional transition endpoint coverage remains in Day 5 scope.

### Day 5: Phase 2 implementation chunk B
- Implement lifecycle transition enforcement server-side for expanded state machine.
- Add primary/co-admin/participant restriction tests for transition endpoints.
- Implement draft deletion guardrails (primary admin only).
- Status: completed on Feb 17, 2026.

### Day 6: Phase 2 integration testing
- End-to-end test: create draft through full wizard, launch, submit hack, complete/sync.
- Validate permission matrix and failure UX paths.
- Produce release notes for Phase 2 checkpoint.
- Status: completed on Feb 17, 2026.

### Day 7: Phase 3 kickoff prep
- Finalize app switcher UI/UX spec (desktop/tablet/mobile behavior matrix).
- Prepare implementation task breakdown for Phase 3 with estimates and owners.
- Confirm go/no-go for entering Phase 3.
- Status: completed on Feb 17, 2026.
- Deliverable: `/Users/nickster/Downloads/HackCentral/docs/HDC-V2-PHASE3-KICKOFF.md`

---

## 1. Phase 1 Hardening (Stabilize Existing Vertical Slice)

**Objective:** Make current flow production-safe before widening scope.

### Work
- Add robust creation-flow error UX:
  - Duplicate name inline error.
  - Creation timeout handling (15s UX).
  - Retry behavior with idempotency key.
- Add redirect behavior after draft creation (`childPageUrl` navigation).
- Improve sync status semantics:
  - Preserve pushed/skipped counts on failures where possible.
  - Distinguish `failed` vs `partial` outcomes.
- Add tests for:
  - Create draft idempotency.
  - Role-based restrictions (admin vs participant).
  - Complete/sync retry idempotency.

### Exit criteria
- Draft creation, launch, submit, complete/sync, retry all pass E2E happy + failure paths.
- No unresolved P1 defects in creation/sync flows.

---

## 2. Phase 2 Wizard + Permissions Completion

**Objective:** Reach full creation and permissions scope in spec sections 2 and 5.

### Work
- Expand creation UI to full 5-step wizard:
  - Step 1 Basic Info (with email validation/autocomplete strategy).
  - Step 2 Full schedule fields.
  - Step 3 Rules/settings.
  - Step 4 Branding.
  - Step 5 Review/launch.
- Add Save-as-draft continuity across steps.
- Implement lifecycle transitions per state machine:
  - `draft -> registration -> team_formation -> hacking -> voting -> results -> completed -> archived`
- Implement draft deletion (primary admin only, confirmation).
- Implement role boundaries in API + UI:
  - Primary admin-only actions.
  - Co-admin constraints.
  - Participant restrictions.
- Implement admin transfer/orphan handling workflow.

### Exit criteria
- Full wizard functional end-to-end.
- Lifecycle transitions enforced server-side.
- Permission matrix validated with automated tests.

---

## 3. Phase 3 App Switcher + Cross-Instance Navigation

**Objective:** Deliver the spec’s persistent app switcher and navigation behavior.

### Work
- Build app switcher component for parent + instance contexts.
- Sections:
  - Home
  - Live Events
  - Upcoming
  - Recent
- Implement current-context highlighting, click-outside close, selection close.
- Add responsive behavior:
  - Desktop full dropdown
  - Tablet compact dropdown
  - Mobile full-screen overlay (touch targets >=44px)
- Add lightweight client cache policy for registry fetches.

### Exit criteria
- App switcher appears in all required contexts.
- Responsive acceptance criteria pass on desktop/tablet/mobile breakpoints.
- Cross-instance navigation works reliably from switcher entries.

---

## 4. Phase 4 Sync, Library, and Audit Integrity

**Objective:** Complete data integrity and visibility requirements in spec section 3.

### Work
- Complete sync semantics:
  - Explicit partial sync handling.
  - Error categorization and admin-facing retry guidance.
- Ensure completion locks instance editing where required (read-only behavior).
- Implement audit trail retention policy (latest 100 entries).
- Implement cross-instance derived profile/reputation computation and cache policy.
- Implement archive behavior:
  - Auto-archive completed events after 90 days.
  - Exclude archived items from switcher "Recent".

### Exit criteria
- Sync statuses are accurate and user-visible.
- Completed events enforce read-only constraints.
- Derived profile/reputation available on instance entry.
- Archive automation verified.

---

## 5. Phase 5 Migration, Performance, and Launch Readiness

**Objective:** Prepare for full production rollout.

### Work
- Execute migration plan for existing HackDay 2026 instance.
- Add performance instrumentation:
  - Registry lookup timing.
  - Sync duration/error rate.
- Stress tests:
  - Multi-instance scale.
  - High hack/participant volumes.
- Final QA matrix:
  - Creation, permissions, sync, switcher, lifecycle, archival.
- Ops readiness:
  - Runbooks for sync failure/manual recovery.
  - Admin docs and onboarding.

### Exit criteria
- Migration completed with verified data integrity.
- Performance meets targets.
- Release checklist signed off.

---

## Delivery Cadence (Suggested)

- Phase 0: 2-3 days
- Phase 1: 3-5 days
- Phase 2: 1.5-2.5 weeks
- Phase 3: 1-1.5 weeks
- Phase 4: 1-1.5 weeks
- Phase 5: 1 week

Total: ~6-8 weeks depending on architecture choice and migration complexity.

---

## Tracking Model

For each phase, track:
- Scope items (done/pending)
- Risks and blockers
- Test coverage added
- Production impact
- Go/no-go decision for next phase

Use this file as the execution source, and keep `HackDayCentral_spec_v2.md` as the product/architecture intent source.
