# HDC v2 Phase 6 Kickoff

Date: 2026-02-18  
Status: Ready for execution (GO)

## Purpose

Execute the post-Phase 5 stabilization and scale-readiness track:
- operational telemetry maturity,
- release hardening and rollback confidence,
- admin/QA execution clarity,
- transition from Phase 5 closure evidence to sustained run-state.

## Scope References

- `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-V2-PHASE5-FINAL-CLOSURE-20260218-1526Z.md`
- `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-V2-PHASE5-TELEMETRY-COMPARISON-20260218-1516Z.md`
- `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-V2-LEGACY-CLEANUP-CLOSURE-20260218-1518Z.md`
- `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/hdcService.ts`
- `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/supabase/repositories.ts`
- `/Users/nickster/Downloads/HackCentral/scripts/phase5-migration-dry-run.mjs`

## Current Baseline

- Phase 5 is closed for engineering execution and release readiness.
- Production runtime telemetry has been observed for both `registry_lookup` and `sync_execution`.
- Canonical migration target is normalized to `HDC Auto*` in tooling.
- Remaining non-blocking historical item is manual Confluence orphan-page cleanup.

## Phase 6 Objectives

1. Operationalize telemetry into a repeatable runbook with clear alert thresholds and responder actions.
2. Lock release/rollback playbook into a one-command or one-runbook path for operators.
3. Raise confidence via recurring verification checks (migration dry-run + perf harness + targeted production signal check).
4. Reduce ambiguity in admin actions by finalizing explicit decision trees for sync outcomes.

## Success Metrics

- Runtime telemetry coverage:
  - at least one weekly captured production sample for both `metric=registry_lookup` and `metric=sync_execution`.
- Performance guardrail adherence:
  - `registry_lookup` p95 remains below `120ms`,
  - `complete_and_sync` p95 remains below `220ms`.
- Migration integrity stability:
  - weekly dry-run reports zero regressions in page IDs, admin presence, and sync-state presence.
- Operational MTTR readiness:
  - documented retry/rollback path can be executed from runbook without code changes.

## Rollout Plan

1. Establish run cadence:
   - weekly operations check using migration dry-run + telemetry log capture.
2. Produce a consolidated ops runbook artifact:
   - commands, expected outputs, escalation criteria, rollback sequence.
3. Wire execution ownership:
   - engineering owner for telemetry/perf checks,
   - product/ops owner for release notes and incident follow-through.
4. Perform first Phase 6 pilot run:
   - generate week-1 artifact and validate runbook clarity.

## Risks and Backout

- Risk: low production traffic windows hide telemetry events.
  - Mitigation: trigger controlled invocation from admin surface during sampling window.
- Risk: upstream Supabase throttling recurrence on write-heavy operations.
  - Mitigation: keep retry policy and manual SQL fallback documented in runbook.
- Risk: drift between script defaults and canonical target naming.
  - Mitigation: keep canonical query documented and validated in weekly dry-run artifact.
- Backout:
  - if post-release regression is detected, execute Phase 5 rollback checklist from migration artifacts and revert to last known-good release line.

## Initial Ticket Set

1. P6-1: Phase 6 ops runbook document with telemetry thresholds, command catalog, and escalation map.
2. P6-2: Weekly verification artifact template (dry-run + telemetry + perf delta summary).
3. P6-3: Production telemetry sampling checklist and ownership schedule.
4. P6-4: Post-release regression triage checklist (sync failures, migration anomalies, rate-limit spikes).
5. P6-5: Historical hygiene closure note after manual Confluence orphan-page archive/delete completion.
