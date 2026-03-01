# HDC P2 Pathways Rollout Checkpoint

- Module: `P2.PATH.01`
- Roadmap refs: `R6.1` to `R6.4`
- Timestamp (UTC): `2026-03-01 13:39`
- Environment: `production` (`ssafugtobsqxmqtphwch`)
- Decision: `GO`

## Scope Covered

- Pathways schema migration
- Resolver contracts in production:
  - `hdcListPathways`
  - `hdcGetPathway`
  - `hdcUpsertPathway`
  - `hdcSetPathwayStepCompletion`
- Guide Pathways production UI:
  - list/detail rendering
  - manager controls (`Create pathway`, `Edit pathway`)
  - step completion progress updates

## Live Migration Evidence

- Applied migration:
  - `forge-native/supabase/migrations/20260301130000_phase2_pathways.sql`
- Initial failure observed and fixed:
  - cause: `PathwayStep.linked_artifact_id` typed as `text` while `Artifact.id` is `uuid`
  - correction: changed `linked_artifact_id` to `uuid`
  - re-apply result: success
- Post-migration schema checks:
  - tables present: `Pathway`, `PathwayStep`, `PathwayProgress`
  - key indexes present:
    - `pathway_step_pathway_position_idx`
    - `pathway_progress_unique_completion_idx`
  - key constraints present:
    - `pathway_step_hack_fk`
    - `pathway_step_artifact_fk`
    - `pathway_progress_pathway_fk`
    - `pathway_progress_step_fk`
    - `pathway_progress_user_fk`

## Resolver Smoke Evidence

- Seeded pathway via manager account (`role=ADMIN`, account id `642558c74b23217e558e9a25`):
  - pathway id: `e7928bd4-141a-4d33-b545-df27161698c6`
  - title: `Pathways Live Smoke 2026-03-01T13-36-50-536Z`
- Resolver checks:
  - `upsertPathway` (manager): pass
  - `listPathways` (manager): pass (`listCount=1`)
  - `getPathway` (manager): pass (`detailStepCount=3`)
  - `setPathwayStepCompletion` (participant): pass (`1/3`, `33%`)
  - `upsertPathway` (participant): denied with expected `[PATHWAY_FORBIDDEN]`

## Production UI Smoke Evidence

- Live route:
  - `https://hackdaytemp.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/86632806-eb9b-42b5-ae6d-ee09339702b6/hackday-central`
- Manager flow assertions (logged-in `nfine@adaptavist.com`):
  - `Guide` opens `Guide Pathways`
  - `Editor` badge visible
  - `Create pathway` button visible
  - `Edit pathway` opens editor form
  - save succeeds with toast `Pathway updated.`
  - `Mark complete` updates progress to `1/3 steps • 33% complete`
- Screenshot artifacts:
  - `docs/artifacts/HDC-P2-PATH-LIVE-UI-SMOKE-20260301-133829Z.png`
  - `docs/artifacts/HDC-P2-PATH-LIVE-UI-SMOKE-20260301-133904Z.png`
  - local preview smoke:
    - `docs/artifacts/HDC-P2-PATH-LOCAL-UI-SMOKE-20260301-133139Z.png`

## Validation Commands

```bash
npm --prefix forge-native/static/frontend run typecheck
npm --prefix forge-native run typecheck
npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts
```

## Follow-up

- Advance active task to `P2.METRICS.01` (Team Pulse expansion) now that `P2.PATH.01` rollout gates are satisfied.
