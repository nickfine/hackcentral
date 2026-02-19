# HDC HackDay Template Release Checklist

## Scope

Use this checklist for Spinout Phase 6 releases that affect:
- HDC template provisioning path,
- seed/mapping contract integrity,
- HD26 page-scoped bootstrap behavior.

## Pre-Release

- [ ] Canonical plan state reviewed (`docs/HDC-HACKDAY-TEMPLATE-SPINOUT-PLAN.md`).
- [ ] Ops runbook reviewed (`docs/HDC-HACKDAY-TEMPLATE-OPS-RUNBOOK.md`).
- [ ] Build/typecheck/tests pass for changed surfaces.
- [ ] Required environment variables confirmed in target env:
  - [ ] `HACKDAY_TEMPLATE_APP_ID`
  - [ ] `HACKDAY_TEMPLATE_MACRO_KEY`
  - [ ] any required Supabase backend secrets for the release path.

## Release Gates

- [ ] HDC parent -> child create flow succeeds in target environment.
- [ ] Child page renders HackDay macro without extension error banner.
- [ ] `Event` row contract fields are correct (`runtime_type`, `template_target`).
- [ ] `HackdayTemplateSeed` row written with expected mapping values.
- [ ] HD26 first-load bootstrap resolves page-scoped event context.
- [ ] No forbidden warning signatures observed in sampled logs:
  - [ ] service-role fallback warning
  - [ ] singleton `isCurrent` fallback warning
  - [ ] seed bootstrap failure warning
- [ ] Template provisioning smoke artifact captured in `docs/artifacts/`.

## Post-Release

- [ ] Runbook checkpoint recorded in:
  - [ ] `learnings.md`
  - [ ] `forge-native/CONTINUATION_HANDOFF.md`
  - [ ] `PLAN_HDC_V2_EXECUTION.md`
- [ ] Rollback command path verified and documented for this release window.
- [ ] First 3 template provisions monitored and outcome recorded.

## Exit Decision

- [ ] GO
- [ ] CONDITIONAL GO (notes required)
- [ ] NO GO (rollback required)

