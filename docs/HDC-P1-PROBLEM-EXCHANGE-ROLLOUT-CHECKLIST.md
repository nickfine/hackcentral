# HDC Phase 1 Problem Exchange Rollout Checklist

Task ID: `P1.PX.01`  
Roadmap scope: `R2.1` to `R2.6`  
Last updated: 2026-03-01

Latest checkpoint artifact:
- `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md` (GO; live production UI smoke completed)
- UI smoke screenshot evidence: `docs/artifacts/HDC-P1-PX-LIVE-UI-SMOKE-20260301-0303Z.png`
- Shared guardrails pack: `docs/HDC-P1-OBS-GUARDRAILS-PACK.md`

## Supabase Access Path

- Use Supabase MCP first when available.
- If MCP project listing is empty or insufficient for admin checks in this workspace:
  1. Use `SUPABASE_ACCESS_TOKEN` with Supabase CLI to discover/access project refs.
  2. Fetch project keys via `supabase projects api-keys --project-ref <ref>`.
  3. Use service-role authenticated REST reads for authority audit queries.
  4. Run HackCentral resolver verification with:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `SUPABASE_SCHEMA=public`
     - `FORGE_DATA_BACKEND=supabase`

## Scope

Use this checklist before enabling or expanding the `problem_exchange` module in any environment.

## Preflight

- [ ] Contract reference reviewed: `docs/HDC-P1-PROBLEM-EXCHANGE-CONTRACT-SPEC.md`.
- [ ] Migration present in target DB: `forge-native/supabase/migrations/20260301020000_phase1_problem_exchange.sql`.
- [ ] Runtime backend set for Problem Exchange support:
  - [ ] `FORGE_DATA_BACKEND=supabase`
- [ ] Resolver surface deployed:
  - [ ] `hdcCreateProblem`
  - [ ] `hdcListProblems`
  - [ ] `hdcVoteProblem`
  - [ ] `hdcUpdateProblemStatus`
  - [ ] `hdcFlagProblem`
  - [ ] `hdcModerateProblem`
  - [ ] `hdcGetProblemExchangeCapabilities`

## Regression Gate (Must Pass)

Run from `/Users/nickster/Downloads/HackCentral`:

```bash
npm run qa:p1:go-gate
```

Optional cross-suite gate before production:

```bash
cd /Users/nickster/Downloads/HackCentral && npm run qa:p1:regression-pack
```

## Enablement Steps

- [ ] Enable `problem_exchange` route/nav visibility in the target environment.
- [ ] Smoke-check non-moderator flow:
  - [ ] submit problem
  - [ ] apply/reset filters
  - [ ] vote idempotency behavior
  - [ ] flag behavior and auto-hide threshold behavior
  - [ ] solved status requires linked hack/artifact
- [ ] Smoke-check moderator flow:
  - [ ] `Include hidden/removed` control available only to moderators
  - [ ] remove/reinstate actions visible and functional only for moderators
  - [ ] `hdcGetProblemExchangeCapabilities` returns `canModerate=true` for designated moderators
- [ ] Verify lifecycle telemetry events emitted (`problem_created`, `problem_voted`, `problem_status_updated`, `problem_flagged`, `problem_moderated`).

## Rollback Notes

- [ ] Immediate rollback path: disable `problem_exchange` module visibility/flag.
- [ ] Revoke moderation authority if needed by removing `role='ADMIN'` and/or capability tags (`problem_exchange_moderator`, `platform_admin`) on affected `User` rows.
- [ ] No destructive schema rollback is required for a feature rollback; keep migration in place and disable exposure.
- [ ] Capture rollback reason, time, and environment in:
  - [ ] `HDC-PRODUCT-EXECUTION-PLAN.md`
  - [ ] `CONTINUATION.md`
  - [ ] `LEARNINGS.md`

## Release Decision

- [ ] GO
- [ ] CONDITIONAL GO (notes required)
- [ ] NO GO (rollback executed)
