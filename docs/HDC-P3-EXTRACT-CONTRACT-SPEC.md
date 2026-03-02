# HDC P3 Extraction Contract Spec

Last updated: 2026-03-02 00:56 GMT  
Owner: HackDay Central Engineering  
Task ID: `P3.EXTRACT.01`  
Roadmap refs: `R11.1`, `R11.2`

## Scope

This spec defines the baseline contract boundaries for automated post-hackday extraction.

In scope:

1. `R11.1` post-results extraction prompting for hackday participants.
2. `R11.2` admin-triggered bulk import of hackday submissions into Showcase drafts.
3. Idempotency and duplicate controls for repeated prompt/import executions.
4. Notification and participant follow-up payload shape for post-import enrichment.

Out of scope in this slice:

1. Final notification channel delivery implementation details (email/slack adapters).
2. Any non-draft auto-publish behavior in bulk import (publish remains participant/admin action).

## Roadmap Baseline (Source of Truth)

Canonical product requirements map to:

1. `R11.1` - "When a child hackday reaches `Results` phase, all participants receive a prompt to publish: `learnings.md`, reusable artifacts and problem validations back to HDC central."
2. `R11.2` - "HDC Admin can trigger a bulk import of all submissions from a completed hackday into Showcase as draft entries. Participants are notified and invited to tag, enrich and publish their submissions."

## Contract Surface

### 1) `hdcGetHackdayExtractionCandidates` (read)

Purpose: return event-level extraction readiness and candidate submission summary.

Input:

```ts
{
  eventId: string;
  limit?: number; // default 200
}
```

Output:

```ts
{
  eventId: string;
  lifecycleStatus: string;
  policyVersion: 'r11-extraction-v1';
  participantCount: number;
  submissionCount: number;
  showcaseDraftCount: number;
  candidates: Array<{
    projectId: string;
    title: string;
    submittedAt: string | null;
    ownerUserId: string | null;
    alreadyImportedToShowcase: boolean;
  }>;
}
```

Rules:

1. Candidate set is scoped to the requested event.
2. `alreadyImportedToShowcase` must be explicit per candidate for deterministic dry-run results.
3. Resolver must not mutate data.

### 2) `hdcTriggerPostHackdayExtractionPrompt` (command, `R11.1`)

Purpose: issue extraction prompts when event lifecycle is at `results`.

Input:

```ts
{
  eventId: string;
  dryRun?: boolean; // default false
  notifyParticipants?: boolean; // default true
}
```

Output:

```ts
{
  eventId: string;
  policyVersion: 'r11-extraction-v1';
  status: 'prompted' | 'skipped_not_results' | 'dry_run';
  lifecycleStatus: string;
  eligibleParticipantCount: number;
  promptedParticipantCount: number;
  skippedAlreadyPromptedCount: number;
  promptedAt: string | null;
}
```

Rules:

1. If lifecycle is not `results`, command returns `skipped_not_results` with no writes.
2. Prompting must be idempotent per `(eventId, participantUserId, lifecycleStatus='results')`.
3. In `dryRun`, counts are computed but no prompt records are written.

### 3) `hdcBulkImportHackdaySubmissions` (command, `R11.2`)

Purpose: create Showcase draft entries from completed hackday submissions.

Input:

```ts
{
  eventId: string;
  dryRun?: boolean; // default false
  notifyParticipants?: boolean; // default true
  limit?: number; // default 500
  overwriteExistingDrafts?: boolean; // default false
}
```

Output:

```ts
{
  eventId: string;
  policyVersion: 'r11-extraction-v1';
  status: 'imported' | 'skipped_not_results' | 'dry_run';
  scannedSubmissionCount: number;
  importedDraftCount: number;
  skippedAlreadyImportedCount: number;
  skippedInvalidSubmissionCount: number;
  notifiedParticipantCount: number;
  importedProjectIds: string[];
  importedAt: string | null;
}
```

Rules:

1. If lifecycle is not `results`, command returns `skipped_not_results` with no writes.
2. Default behavior is additive and idempotent; existing imported draft links are skipped.
3. `overwriteExistingDrafts` allows replacement only when explicitly set.
4. In `dryRun`, projected counts are returned with no writes.

## Access Policy

1. `hdcGetHackdayExtractionCandidates`:
   - HDC admin, event admin, or platform admin.
2. `hdcTriggerPostHackdayExtractionPrompt`:
   - HDC admin, event admin, or platform admin.
3. `hdcBulkImportHackdaySubmissions`:
   - HDC admin or platform admin only.

Forbidden access returns typed error codes:

1. `[EXTRACT_FORBIDDEN]` for read/prompt paths.
2. `[EXTRACT_IMPORT_FORBIDDEN]` for bulk import path.

## Data Source Boundaries

Baseline data dependencies for implementation:

1. `Event` and lifecycle metadata (`results` gate).
2. `Project` submission rows scoped by event.
3. `ShowcaseHack` draft records for idempotent import checks.
4. `HackdayTemplateSeed.seed_payload` for child integration context.
5. `EventAuditLog` for command auditability and replay-safe tracing.

## Idempotency and Traceability

1. Prompt idempotency key:
   - `(eventId, participantUserId, lifecycleStatus='results', policyVersion)`.
2. Import idempotency key:
   - `(eventId, sourceProjectId, policyVersion)`.
3. Both commands emit audit actions with deterministic payload summaries:
   - `hackday_extraction_prompted`
   - `hackday_bulk_imported`

## Baseline Migration Scope Framing

To keep command paths deterministic and replay-safe, Phase 3 extraction may require one or more dedicated relation tables (final shape to be confirmed in the upcoming source audit):

1. prompt state table (event + participant prompt status).
2. import mapping table (event submission -> showcase draft link).

If tables are not yet present, command resolvers must fail with explicit migration errors rather than silently degrade.

## Validation Gate for This Step

Step-1 completion criteria:

1. Contract spec published: `docs/HDC-P3-EXTRACT-CONTRACT-SPEC.md`.
2. Execution ledger updated to `P3.EXTRACT.01` in-progress with this spec as baseline evidence.
3. Next implementation step is resolver/type scaffolding aligned to this contract.
