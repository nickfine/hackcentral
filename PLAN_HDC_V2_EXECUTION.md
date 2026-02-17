# HackDay Central v2 Execution Plan

**Goal:** Translate `HackDayCentral_spec_v2.md` into an implementation-ready roadmap with clear sequencing, acceptance criteria, and delivery gates.

**Current baseline (as implemented):**
- Multi-tenant vertical slice exists (draft creation, child page + macro insertion, hack submit, complete/sync, retry).
- Core persistence is currently Supabase-backed (`Event`, `EventAdmin`, `EventSyncState`, `EventAuditLog`) rather than Confluence page-property storage.
- Status is best described as: **Phase 1 complete + early Phase 2 started**.

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
- Day 2 status (Feb 16, 2026): **in progress (development audit complete)**
  - Development verification rerun:
    - `npm run frontend:build` (forge-native) ✅
    - `npm run macro:build` (forge-native) ✅
    - `npm run typecheck` (forge-native) ✅
    - `npm run test:run` (repo root) ✅ (23 tests passing)
  - Production Forge verification rerun:
    - `forge variables list -e production` confirms expected Supabase variables and `FORGE_DATA_BACKEND=supabase`.
    - `forge install list --site hackdaytemp.atlassian.net --product confluence -e production` shows production status `Up-to-date`.
  - Automated P1 defect scan result: no new P1 defects identified.
  - Remaining to close Day 2 fully: manual production smoke test (`load app`, `list hacks`, `submit hack`, `create project`).
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

### Day 1: Production parity prep
- Verify production Forge variables for Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SCHEMA`, `FORGE_DATA_BACKEND`).
- Deploy current `main` to production environment.
- Run production smoke test (load app, list hacks, submit hack, create project).

### Day 2: Phase 1 closure audit
- Re-run Phase 1 acceptance criteria against development and production.
- Capture any remaining P1 defects as explicit backlog items with severity labels.
- Close Phase 1 formally in this plan if no P1 blockers remain.
- Current checkpoint (Feb 16, 2026):
  - Development acceptance checks: complete.
  - Production CLI/config checks: complete.
  - Manual production smoke: pending.

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

### Day 6: Phase 2 integration testing
- End-to-end test: create draft through full wizard, launch, submit hack, complete/sync.
- Validate permission matrix and failure UX paths.
- Produce release notes for Phase 2 checkpoint.

### Day 7: Phase 3 kickoff prep
- Finalize app switcher UI/UX spec (desktop/tablet/mobile behavior matrix).
- Prepare implementation task breakdown for Phase 3 with estimates and owners.
- Confirm go/no-go for entering Phase 3.

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
