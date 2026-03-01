# HDC P3 Feed Contract Spec

Last updated: 2026-03-01 23:50 GMT  
Owner: HackDay Central Engineering  
Task ID: `P3.FEED.01`  
Roadmap refs: `R12.1`, `R12.2`

## Scope

This spec defines the baseline Home activity feed and recommendation contract for Phase 3.

In scope:

1. Typed resolver contract for Home feed retrieval.
2. `R12.1` activity feed categories on Home:
   - new hacks
   - trending problems
   - new artifacts
   - pipeline movements
   - upcoming hackdays
3. `R12.2` recommendation categories on Home:
   - problems in your domain
   - artifacts used by your team
   - pathways for your role
4. Source-coverage status metadata so UI can display partial availability explicitly.

## Resolver Contract

### Resolver

`hdcGetHomeFeed`

### Input

`GetHomeFeedInput`

```ts
{
  limit?: number;
  recommendationLimit?: number;
  includeRecommendations?: boolean;
}
```

### Output

`HomeFeedSnapshot` with policy version:

- `policyVersion: 'r12-home-feed-v1'`

Key payload blocks:

1. `items[]` (`HomeFeedActivityItem`)
   - `type`: `new_hack` | `trending_problem` | `new_artifact` | `pipeline_movement` | `upcoming_hackday`
   - `title`, `description`, `occurredAt`
2. `recommendations[]` (`HomeFeedRecommendation`)
   - `type`: `problem_domain` | `team_artifact` | `pathway_role`
   - `title`, `reason`, `score`
3. `sources`
   - `activities.status`: `available` | `available_partial`
   - `recommendations.status`: `available` | `available_partial`

## Data Sources (Supabase)

1. Activities:
   - `Project` (`source_type='hack_submission'`) for new hacks
   - `Problem` for trending problems
   - `Artifact` for new artifacts
   - `PipelineTransitionLog` for pipeline movements
   - `Event`/registry schedule for upcoming hackdays
2. Recommendations:
   - `Problem` domain signals from viewer/team activity
   - `ArtifactReuse` + `TeamMember` for team artifact usage
   - `Pathway` + viewer role/capability signals for role pathways

## Fallback Policy

1. Resolver is Supabase-first and uses configured backend fallback behavior.
2. Convex fallback currently returns partial coverage:
   - activities synthesized from featured hacks + upcoming events
   - recommendations synthesized from featured hacks
3. Coverage status is always explicit via `sources.activities` and `sources.recommendations`.

## Validation

```bash
cd /Users/nickster/Downloads/HackCentral-p1-child-01
npm run test:run -- tests/forge-native-feed-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
```
