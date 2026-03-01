# HDC P1 Child Integration Contract Spec

Last updated: 2026-03-01
Owner: HackCentral Engineering
Task: `P1.CHILD.01`
Roadmap refs: `R5.1`, `R5.2`, `R5.3`, `R5.4`

## Scope

This contract defines the Phase 1 baseline for child HackDay integrations:

1. Import high-voted Problem Exchange entries into child setup as official challenge seeds.
2. Persist auto-publish intent for Showcase draft creation on event completion.
3. Persist template mode intent (`default` vs `customized`) in child seed metadata.

This phase does **not** execute completion-time Showcase draft fan-out yet; it persists the behavior contract so completion workers can consume it.

## Resolver Contracts

### `hdcListProblemImportCandidates`

Purpose: return importable Problem Exchange candidates for child HackDay creation.

Request:

```ts
{
  limit?: number;          // default 20, max 100
  minVoteCount?: number;   // default 3
  statuses?: ProblemStatus[]; // default ['open', 'claimed']
}
```

Response:

```ts
{
  items: Array<{
    problemId: string;
    title: string;
    description: string;
    status: 'open' | 'claimed' | 'solved' | 'closed';
    voteCount: number;
    estimatedTimeWastedHours: number;
    team: string;
    domain: string;
    updatedAt: string;
    createdByName: string;
  }>;
  criteria: {
    minVoteCount: number;
    statuses: ProblemStatus[];
  };
}
```

Selection rules:

- only moderation state `visible`
- status in requested/default set
- vote count `>= minVoteCount`
- sorted by votes desc, then time-wasted desc, then updated desc

### `hdcCreateInstanceDraft` (extended payload)

Extended field on existing payload:

```ts
childIntegration?: {
  importProblemIds?: string[];
  autoPublishToShowcaseDrafts?: boolean; // default true
  templateMode?: 'default' | 'customized'; // default 'default'
}
```

Validation rules:

- `importProblemIds` normalized, deduped, trimmed
- max 25 selected IDs
- selected IDs must resolve against importable candidate set (`open|claimed`, visible)
- invalid IDs fail creation with `[CHILD_IMPORT_INVALID]`

## Persistence Contract

For `hackday_template` runtime, `HackdayTemplateSeed.seed_payload.childIntegration` now contains:

```ts
{
  importProblemIds: string[];
  importedProblems: Array<{
    problemId: string;
    title: string;
    status: 'open' | 'claimed' | 'solved' | 'closed';
    voteCount: number;
    estimatedTimeWastedHours: number;
    team: string;
    domain: string;
    updatedAt: string;
  }>;
  autoPublishToShowcaseDrafts: boolean;
  templateMode: 'default' | 'customized';
}
```

`EventAuditLog` (`action=event_created`) now records summary metadata:

```ts
childIntegration: {
  importProblemIds: string[];
  importedProblemCount: number;
  autoPublishToShowcaseDrafts: boolean;
  templateMode: 'default' | 'customized';
}
```

## UI Baseline Contract (Create HackDay wizard Step 6)

The review/create step now supports:

- Template preset intent:
  - `Default template`
  - `Customized template`
- Auto-publish toggle for Showcase draft intent.
- Problem Exchange challenge import checklist sourced from `hdcListProblemImportCandidates`.

## Evidence

Implementation files:

- `forge-native/src/backend/supabase/repositories.ts`
- `forge-native/src/backend/hackcentral.ts`
- `forge-native/src/backend/hdcService.ts`
- `forge-native/src/index.ts`
- `forge-native/src/shared/types.ts`
- `forge-native/static/frontend/src/types.ts`
- `forge-native/static/frontend/src/App.tsx`

Validation:

- `npm run test:run -- tests/forge-native-hdcService.spec.ts tests/forge-native-createFromWeb.spec.ts`
- `npm --prefix forge-native run typecheck`
- `npm --prefix forge-native/static/frontend run typecheck`
