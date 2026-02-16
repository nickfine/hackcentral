# HackDay Central v2 Execution Plan

**Goal:** Translate `HackDayCentral_spec_v2.md` into an implementation-ready roadmap with clear sequencing, acceptance criteria, and delivery gates.

**Current baseline (as implemented):**
- Multi-tenant vertical slice exists (draft creation, child page + macro insertion, hack submit, complete/sync, retry).
- Core persistence is currently Supabase-backed (`Event`, `EventAdmin`, `EventSyncState`, `EventAuditLog`) rather than Confluence page-property storage.
- Status is best described as: **Phase 1 complete + early Phase 2 started**.

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
