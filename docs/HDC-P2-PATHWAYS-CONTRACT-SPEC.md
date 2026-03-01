# HDC P2 Pathways Contract Spec (`P2.PATH.01`)

Status: In progress (backend baseline landed)
Roadmap refs: `R6.1` to `R6.4`

## Scope

Phase 2 evolves `Guide` into Curated Pathways with:
- pathway structure (`R6.1`)
- pathway creation/editing by admin/designated contributors (`R6.2`)
- pathway discovery (domain/role/search/recommended) (`R6.3`)
- step completion progress tracking (`R6.4`)

This spec defines the first implementation slice (data + resolver contracts).

## Data Model (Supabase)

Migration: `forge-native/supabase/migrations/20260301130000_phase2_pathways.sql`

Tables:
1. `Pathway`
- `id`, `title`, `summary`, `intro_text`
- `domain`, `role`, `tags[]`
- `published`, `recommended`
- `created_by_user_id`, `updated_by_user_id`
- `created_at`, `updated_at`

2. `PathwayStep`
- `id`, `pathway_id`, `position`
- `step_type` enum: `read|try|build`
- `title`, `description`
- `linked_hack_project_id`, `linked_artifact_id`, `external_url`, `challenge_prompt`
- `is_optional`
- `created_at`, `updated_at`

3. `PathwayProgress`
- `id`, `pathway_id`, `step_id`, `user_id`
- `completed_at`, `created_at`
- uniqueness on `(pathway_id, step_id, user_id)`

## Resolver/API Contracts

Added to shared/frontend `Defs`:
- `hdcListPathways(payload: ListPathwaysInput): ListPathwaysResult`
- `hdcGetPathway(payload: { pathwayId: string }): GetPathwayResult`
- `hdcUpsertPathway(payload: UpsertPathwayInput): UpsertPathwayResult`
- `hdcSetPathwayStepCompletion(payload: SetPathwayStepCompletionInput): SetPathwayStepCompletionResult`

Input/output models live in:
- `forge-native/src/shared/types.ts`
- `forge-native/static/frontend/src/types.ts`

## Authorization

Pathway management (`upsert`) requires either:
- `User.role = ADMIN`, or
- `User.capability_tags` includes one of:
  - `pathway_admin`
  - `pathway_contributor`
  - `platform_admin`

Completion tracking is user-scoped and allowed for all authenticated viewers.
Draft/unpublished pathway reads are restricted to pathway managers.

## Backend Wiring

Implemented in:
- `forge-native/src/backend/supabase/repositories.ts`
  - `canUserManagePathways`
  - `listPathways`
  - `getPathway`
  - `upsertPathway`
  - `setPathwayStepCompletion`
- `forge-native/src/backend/hackcentral.ts`
  - wrappers + backend-mode handling (`[PATHWAYS_UNSUPPORTED_BACKEND]` in non-supabase mode)
- `forge-native/src/index.ts`
  - resolver registrations for all four pathway APIs

## Validation Baseline

Targeted tests:
- `tests/forge-native-pathways-contract.spec.ts`
- `tests/forge-native-pathways-runtime-modes.spec.ts`

Typechecks:
- `npm --prefix forge-native run typecheck`
- `npm --prefix forge-native/static/frontend run typecheck`

## Next Slice

1. Guide UI migration from static micro-guide to pathway list/detail rendering.
2. Pathway create/edit UI for authorized editors.
3. Home dashboard recommended pathway panel using `hdcListPathways`.
