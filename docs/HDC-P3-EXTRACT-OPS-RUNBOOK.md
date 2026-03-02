# HDC Phase 3 Extraction Ops Runbook

## Purpose

Operational procedure for `P3.EXTRACT.01` (`R11.1` + `R11.2`) after backend migration and UI wiring.

Runbook goals:
1. Execute post-results extraction safely with dry-run-first gates.
2. Verify idempotency/replay behavior before and after live execution.
3. Capture repeatable evidence for GO/NO-GO checkpoint decisions.
4. Provide rollback-safe cleanup for bad imports.

## Scope and Roles

- Event-level extraction prompt (`R11.1`): Event Admin or HDC/Platform Admin.
- Bulk import to Showcase drafts (`R11.2`): HDC Admin or Platform Admin.
- Data source of truth: `Event`, `Project`, `ShowcaseHack`, `HackdayExtractionPrompt`, `HackdayExtractionImport`, `EventAuditLog`.

## Preflight Checklist

1. Confirm event is in `results` lifecycle.
2. Confirm event-scoped submissions exist (`Project.source_type='hack_submission'` and `event_id=<eventId>`).
3. Confirm extraction tables exist (`HackdayExtractionPrompt`, `HackdayExtractionImport`).
4. Use Supabase MCP first; if permission-scoped, use CLI fallback path from `CONTINUATION.md`.
5. Run local static gate before live ops:

```bash
npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native/static/frontend run typecheck
npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run typecheck
npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run test:backend
```

## Command Catalog

### 1. Candidate read (`R11.1` read path)

```bash
cd /Users/nickster/Downloads/HackCentral-p1-child-01
SUPABASE_URL="https://ssafugtobsqxmqtphwch.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
SUPABASE_SCHEMA="public" \
FORGE_DATA_BACKEND="supabase" \
npx -y tsx -e "import { getHackdayExtractionCandidates } from './forge-native/src/backend/hackcentral.ts'; (async () => { const viewer={accountId:'<atlassianAccountId>',siteUrl:'https://hackdaytemp.atlassian.net',timezone:'Europe/London'}; const result=await getHackdayExtractionCandidates(viewer,{eventId:'<eventId>',limit:50}); console.log(JSON.stringify(result,null,2)); })();"
```

### 2. Prompt extraction dry-run/live (`R11.1`)

```bash
cd /Users/nickster/Downloads/HackCentral-p1-child-01
SUPABASE_URL="https://ssafugtobsqxmqtphwch.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
SUPABASE_SCHEMA="public" \
FORGE_DATA_BACKEND="supabase" \
npx -y tsx -e "import { triggerPostHackdayExtractionPrompt } from './forge-native/src/backend/hackcentral.ts'; (async () => { const viewer={accountId:'<atlassianAccountId>',siteUrl:'https://hackdaytemp.atlassian.net',timezone:'Europe/London'}; const dryRun=await triggerPostHackdayExtractionPrompt(viewer,{eventId:'<eventId>',dryRun:true,notifyParticipants:true}); const live=await triggerPostHackdayExtractionPrompt(viewer,{eventId:'<eventId>',dryRun:false,notifyParticipants:true}); console.log(JSON.stringify({dryRun,live},null,2)); })();"
```

### 3. Bulk import dry-run/live (`R11.2`)

```bash
cd /Users/nickster/Downloads/HackCentral-p1-child-01
SUPABASE_URL="https://ssafugtobsqxmqtphwch.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
SUPABASE_SCHEMA="public" \
FORGE_DATA_BACKEND="supabase" \
npx -y tsx -e "import { bulkImportHackdaySubmissions } from './forge-native/src/backend/hackcentral.ts'; (async () => { const viewer={accountId:'<atlassianAccountId>',siteUrl:'https://hackdaytemp.atlassian.net',timezone:'Europe/London'}; const dryRun=await bulkImportHackdaySubmissions(viewer,{eventId:'<eventId>',dryRun:true,notifyParticipants:true,limit:50,overwriteExistingDrafts:false}); const live=await bulkImportHackdaySubmissions(viewer,{eventId:'<eventId>',dryRun:false,notifyParticipants:true,limit:50,overwriteExistingDrafts:false}); console.log(JSON.stringify({dryRun,live},null,2)); })();"
```

### 4. Replay/idempotency check

Repeat live prompt/import once more and confirm:
- prompt replay: `promptedParticipantCount=0` and `skippedAlreadyPromptedCount>0`
- import replay: `importedDraftCount=0` and `skippedAlreadyImportedCount>0`

### 5. Audit verification

Query `EventAuditLog` for extraction actions:
- `hackday_extraction_prompted`
- `hackday_bulk_imported`

## UI Operations Path (Primary)

Use `HackDays -> Post-HackDay Extraction (R11)` panel in the Forge UI:
1. Select event and load candidates.
2. Run prompt dry-run, then live prompt.
3. Run import dry-run, then live import.
4. Re-run each live action once to confirm idempotent replay.

Expected permission errors:
- `[EXTRACT_FORBIDDEN]` for read/prompt role mismatch.
- `[EXTRACT_IMPORT_FORBIDDEN]` for import role mismatch.

## Rollback Procedure (Import Cleanup)

Use only when incorrect drafts were imported for an event.

1. Freeze further extraction actions for that event.
2. Export current rows for evidence (`ShowcaseHack`, `HackdayExtractionImport`, `HackdayExtractionPrompt`, `EventAuditLog`).
3. Remove extraction import records for the event and affected project IDs.
4. Remove generated `ShowcaseHack` rows where `source_event_id=<eventId>` for affected project IDs.
5. Keep `EventAuditLog` rows intact for traceability; append remediation log entry.
6. Re-run candidate read + dry-runs before unfreezing actions.

## Evidence Requirements

Publish an artifact under:
- `/Users/nickster/Downloads/HackCentral-p1-child-01/docs/artifacts/`

Minimum evidence set:
1. Candidate read payload snapshot.
2. Prompt dry-run/live/replay payload snapshot.
3. Import dry-run/live/replay payload snapshot.
4. UI smoke screenshot of extraction panel and action outcome.
5. Final GO/NO-GO checkpoint decision.

## GO/NO-GO Criteria

GO when all are true:
1. Event is `results` and candidate list is non-empty (or explicitly empty by expected business condition).
2. Prompt/import dry-runs complete without validation/permission/migration errors.
3. Live prompt/import complete successfully.
4. Replay checks prove idempotency (`0` new writes on second run with skip counts > 0).
5. Evidence artifact is published and linked in `HDC-PRODUCT-EXECUTION-PLAN.md` and `CONTINUATION.md`.

NO-GO when any are true:
1. Permission mismatches for intended operator role.
2. Missing schema/migration errors.
3. Unexpected duplicate writes on replay.
4. Missing evidence for one or more mandatory checks.
