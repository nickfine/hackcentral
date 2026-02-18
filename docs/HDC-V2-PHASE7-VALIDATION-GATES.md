# HDC v2 Phase 7 Validation Gates

Prepared at (UTC): 2026-02-18T16:00:00Z  
Status: Active

## Purpose

Codify mandatory pre-merge validation for all Phase 7 changes so quality checks are consistent, repeatable, and auditable.

## Gate Policy

No feature/fix/docs-for-runtime-change PR should be merged unless all required gates for its change class are green.

## Change Classes

1. `docs-only`
- Changes only in documentation/artifacts with no script/code behavior impact.

2. `ui-or-backend`
- Changes in `forge-native/static/**`, `forge-native/src/**`, root `src/**`, or tests.

3. `ops-or-release`
- Changes in `scripts/**`, operational runbooks/templates, `package.json` scripts, or migration/telemetry command paths.

## Required Gates by Change Class

1. `docs-only`
- `git diff --name-only` confirms no runtime code/scripts modified.
- No test run required.

2. `ui-or-backend`
- `npm --prefix /Users/nickster/Downloads/HackCentral/forge-native run typecheck`
- `npm -C /Users/nickster/Downloads/HackCentral run test:run`

3. `ops-or-release`
- `npm --prefix /Users/nickster/Downloads/HackCentral/forge-native run typecheck`
- `npm -C /Users/nickster/Downloads/HackCentral run test:run`
- Execute the changed operational command at least once (example: `qa:phase6:weekly-check`, `qa:phase7:weekly-report-scaffold`).

## Standard Command Bundle

- Pre-merge local bundle:
```bash
npm -C /Users/nickster/Downloads/HackCentral run qa:phase7:premerge
```

## Commit/PR Notes Contract

Each merge-ready change should include:
1. Gate command list executed.
2. Pass/fail outcomes.
3. Any deliberate skipped gate and explicit reason.

## Tracker Update Contract

For non-doc-only changes, update all three trackers in same change set:
- `/Users/nickster/Downloads/HackCentral/learnings.md`
- `/Users/nickster/Downloads/HackCentral/PLAN_HDC_V2_EXECUTION.md`
- `/Users/nickster/Downloads/HackCentral/forge-native/CONTINUATION_HANDOFF.md`

## Failure Handling

If any required gate fails:
1. Do not merge.
2. Fix or revert failing changes.
3. Re-run full required gates.
4. Record failure + fix summary in tracker entry.
