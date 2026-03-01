# HDC P1 Showcase Contract Spec

Task ID: `P1.SHOW.01`  
Roadmap scope: `R4.1` to `R4.4`  
Last updated: 2026-03-01

## Goal

Define the Phase 1 Showcase contract that separates completed hacks from the Registry, supports featured curation, and exposes hack detail views with linked evidence.

## Submission Contract (`R4.1`)

`createHack` now accepts Showcase metadata:

- `title`
- `description`
- `assetType`
- `visibility`
- `demoUrl` (required, `https`)
- `teamMembers[]`
- `sourceEventId`
- `tags[]`
- `linkedArtifactIds[]`

Persistence model:

- `Project` remains the canonical hack/project record (`source_type='hack_submission'`)
- `ShowcaseHack` stores Showcase-specific metadata keyed by `project_id`

## Featured Contract (`R4.2`)

Featured status is managed via:

- `hdcSetShowcaseFeatured({ projectId, featured })`

Authorization:

- same admin gate as pipeline (`role='ADMIN'` or capability tags `pipeline_admin` / `platform_admin`)

Featured visibility:

- `hdcListShowcaseHacks` includes `featured` per item
- Home bootstrap prefers featured hacks when building top cards

## Search and Filter Contract (`R4.3`)

Resolver:

- `hdcListShowcaseHacks(input)`

Input filters:

- `query`
- `assetTypes[]` (`prompt|skill|app`)
- `statuses[]` (`completed|in_progress`)
- `tags[]`
- `sourceEventId`
- `featuredOnly`
- `sortBy` (`newest|featured|reuse_count`)
- `limit`

Output:

- `items[]` with author, visibility, tags, demo URL, pipeline stage, reuse counts, and linked/team counts
- `canManage` flag for admin-only curation controls

## Hack Detail Contract (`R4.4`)

Resolver:

- `hdcGetShowcaseHackDetail({ projectId })`

Detail payload includes:

- base showcase list item fields
- `teamMembers[]`
- `linkedArtifactIds[]`
- `context`, `limitations`, `riskNotes`, `sourceRepoUrl`
- `artifactsProduced[]` (Artifact rows linked by `source_hack_project_id`)
- `problemsSolved[]` (Problem rows linked by `linked_hack_project_id`, solved/closed only)

## Persistence Model

Migration: `forge-native/supabase/migrations/20260301122000_phase1_showcase.sql`

Table: `ShowcaseHack`

- `project_id` (PK, FK -> `Project.id`)
- `featured`
- `demo_url`
- `team_members[]`
- `source_event_id` (FK -> `Event.id`)
- `tags[]`
- `linked_artifact_ids[]`
- `context`, `limitations`, `risk_notes`, `source_repo_url`
- `created_by_user_id` (FK -> `User.id`)
- `created_at`, `updated_at`

## Delivery Scope (Current Slice)

- Shared/backend/frontend types expanded with Showcase list/detail/feature contracts.
- Backend service/resolver wiring added:
  - `hdcListShowcaseHacks`
  - `hdcGetShowcaseHackDetail`
  - `hdcSetShowcaseFeatured`
- Supabase repository methods implemented for list/detail/feature operations.
- `createHack` now writes Showcase metadata and validates `demoUrl`.
- Contract/runtime tests added for repository behavior and backend runtime modes.
