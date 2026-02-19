# Plan: HackDay Template Spinout via HDC (Using HD26Forge as Canonical App)

## Summary
HDC will create **HackDay template instances** by creating a child Confluence page that embeds the HackDay macro, then writing a **minimal seed record** to shared Supabase. HackDay (HD26Forge, refactored in place) will resolve instance context by `pageId`, bootstrap from seed on first load, and own lifecycle/data from that point onward.

This plan preserves backward compatibility using a compatibility bridge, then deprecates singleton `isCurrent` behavior after validation.

### Execution status checkpoint (Feb 19, 2026 02:37 UTC)
- HDC template provisioning path is active in production.
- HD26 runtime context resolution is fully page-scoped.
- Legacy singleton `isCurrent` fallback path has been removed from HD26 resolver runtime flow.
- Remaining workstream is operational monitoring/documentation hygiene, not architecture or contract migration.

## Scope and Decisions Locked
1. Clone model: single HackDay Forge app, multiple child pages/instances.
2. Repo strategy: refactor `/Users/nickster/Downloads/HD26Forge` in place.
3. Backend shape: modularize now (resolver/domain/repository split).
4. HDC seed behavior: minimal seed only; local HackDay admin completes setup in HackDay.
5. Data topology: shared Supabase with strict instance scoping.
6. Context binding: `Confluence pageId -> HackDay instance` mapping.
7. Seed handshake: HDC writes seed records directly (no cross-app invoke).
8. Seed write target: dedicated seed/mapping table.
9. Branding: genericize now (remove hardcoded “HackDay 2026” assumptions).
10. Migration: compatibility bridge first, then cut singleton paths.
11. DB key mode for HackDay backend: move to encrypted service-role key in Forge backend.

## Current-State Review Findings (No Code Changes Made)
1. HD26Forge backend is concentrated in `/Users/nickster/Downloads/HD26Forge/src/index.js` with a very large resolver surface and singleton event lookup via `isCurrent`.
2. HD26Forge includes hardcoded event-specific identity and copy (`DEMO_EVENT_ID`, “HackDay 2026” strings in UI/content modules).
3. HD26Forge is already Custom UI with separated frontend bundle path (`/Users/nickster/Downloads/HD26Forge/static/frontend`), but behavior remains singleton-instance oriented.
4. HDC currently creates child pages by reusing parent macro snippet logic; this must become explicit target-macro embedding for HackDay templates.

## Target Architecture
1. HDC remains orchestration and registry owner for template metadata and links.
2. HackDay owns event runtime lifecycle, participants, team/project flow, and admin setup.
3. Contract boundary is a dedicated seed/mapping table keyed by Confluence child page ID.
4. HackDay resolves context from current page ID and seed mapping, not global `isCurrent`.

## Data Model and Contract Changes

### A) Shared Supabase: New Seed Table
Create `HackdayTemplateSeed`:
1. `id` UUID/text PK.
2. `confluence_page_id` text unique not null.
3. `confluence_parent_page_id` text not null.
4. `hdc_event_id` text not null.
5. `template_name` text not null.
6. `primary_admin_email` text not null.
7. `co_admin_emails` jsonb default `[]`.
8. `seed_payload` jsonb not null (minimal seed config).
9. `hackday_event_id` text null (set after HackDay initializes core event).
10. `provision_status` enum/text (`provisioned`, `initialized`, `failed`) default `provisioned`.
11. `created_at`, `updated_at`, `initialized_at` timestamps.
12. Unique index on `confluence_page_id`.
13. Index on `hdc_event_id`.
14. Index on `provision_status`.

### B) HDC Event Registry
In HDC event model (existing `Event` row used by HDC):
1. Add `runtime_type` (`hdc_native` | `hackday_template`), default `hdc_native`.
2. Add `template_target` (`hackday`), nullable for existing rows.
3. Backfill existing rows to `hdc_native`.

### C) HackDay Context Resolution
1. Add a context resolver path in HD26Forge that receives current page ID and resolves:
   - existing initialized mapping (`HackdayTemplateSeed.hackday_event_id`), or
   - first-load bootstrap from seed if `hackday_event_id` is null.
2. Create/attach HackDay core event row only during first-load initialization path.
3. Record `hackday_event_id` back into seed row atomically.

## Public API / Interface / Type Changes

### HDC (`/Users/nickster/Downloads/HackCentral/forge-native`)
1. Extend `CreateInstanceDraftInput` in:
   - `/Users/nickster/Downloads/HackCentral/forge-native/src/shared/types.ts`
   - `/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/types.ts`
2. Add fields:
   - `instanceRuntime?: "hdc_native" | "hackday_template"` (kept optional for backward-compatible callers; backend defaults to `"hackday_template"`).
   - `templateTarget?: "hackday"` (kept optional on input; backend derives from runtime type).
3. Extend `EventRegistryItem` with:
   - `runtimeType: "hdc_native" | "hackday_template"`.
   - `templateTarget: "hackday" | null`.
4. Extend create result payload with:
   - `templateProvisionStatus: "provisioned" | "initialized" | "failed" | null`.

### HDC Backend Service Contract
1. `hdcCreateInstanceDraft` behavior branch:
   - for `hackday_template`: create page with HackDay macro + write seed table + write HDC registry row.
   - for `hdc_native`: existing behavior unchanged.
2. Confluence page creation helper contract in:
   - `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/confluencePages.ts`
3. Add explicit macro embedding parameters:
   - `targetAppId`, `targetMacroKey`, `fallbackLabel`.

### HackDay (`/Users/nickster/Downloads/HD26Forge`)
1. Keep existing resolver names for frontend compatibility initially.
2. Add internal `resolveInstanceContext(pageId, accountId)` used by all event-scoped resolvers.
3. Add backend config contract:
   - replace `SUPABASE_ANON_KEY` usage with encrypted `SUPABASE_SERVICE_ROLE_KEY`.
4. Add event bootstrap result shape used by app load:
   - `instanceContext` with `pageId`, `eventId`, `setupRequired`, `runtimeSource`.

## Implementation Plan (Decision-Complete Sequence)

### Phase 1: HD26Forge Foundation Refactor
1. Split `/Users/nickster/Downloads/HD26Forge/src/index.js` into:
   - `src/resolvers/*.js` grouped by domain (users, teams, project, voting, admin, analytics, notifications).
   - `src/domain/context/resolveInstanceContext.js`.
   - `src/repositories/*.js` for DB access.
2. Keep exported resolver names stable so frontend does not break during the split.
3. Add compatibility wrapper:
   - if no page mapping yet, fallback to current `isCurrent` path temporarily.
4. Switch Supabase key mode to service role in backend lib and update env docs.

### Phase 2: HackDay Instance Context + Seed Bootstrap
1. Add migration for `HackdayTemplateSeed`.
2. Implement resolver utility:
   - read Forge context page ID.
   - lookup seed by `confluence_page_id`.
   - initialize core event if needed.
   - return canonical `eventId`.
3. Replace direct `getCurrentEvent()` calls with `resolveInstanceContext()` for event-scoped resolvers.
4. Keep `getCurrentEvent()` only for compatibility fallback path until cutover complete.

### Phase 3: Genericize HD26Forge Branding and Time Data
1. Remove hardcoded “HackDay 2026” strings from:
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/src/lib/missionBriefContent.js`
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/src/data/motdMessages.js`
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/src/components/*` where date/year literals are embedded.
2. Move event display name/date windows/timezone to event-config-driven fields loaded from backend.
3. Preserve current visual style; only remove fixed-year coupling.

### Phase 4: HDC Template Provisioning Path
1. Add explicit HackDay macro embedding in HDC child-page creation.
2. Add HDC environment variables for target HackDay macro app:
   - `HACKDAY_TEMPLATE_APP_ID`
   - `HACKDAY_TEMPLATE_MACRO_KEY`
3. Extend HDC creation flow:
   - create child page with HackDay macro.
   - write HDC `Event` row with `runtime_type=hackday_template`.
   - write `HackdayTemplateSeed` row with minimal seed payload.
4. Update HDC parent UI to label this as template creation and show “setup continues in HackDay”.
5. For template runtime rows, HDC instance actions (submit/sync/lifecycle) should be hidden/disabled with explicit handoff messaging.

### Phase 5: Migration and Cutover
1. Backfill existing relevant pages into mapping/seed where needed.
2. Enable compatibility bridge mode in staging.
3. Validate both legacy and page-scoped paths.
4. Remove singleton fallback once staging and production evidence passes.
5. Freeze direct `isCurrent` operational dependency for template-created instances.

### Phase 6: Documentation and Ops
1. Update HDC and HD26Forge runbooks for:
   - provisioning flow,
   - seed contract troubleshooting,
   - pageId mapping checks,
   - rollback.
2. Add release checklist entries in both repos.
3. Add artifact templates for template-provision smoke runs.

## Testing and Acceptance Criteria

### Unit/Contract Tests
1. HDC: creating `hackday_template` instance writes seed and registry metadata correctly.
2. HDC: macro embedding uses configured target appId/macroKey.
3. HDC: template rows do not expose native HDC lifecycle/sync actions.
4. HackDay: `resolveInstanceContext` returns mapped event for existing seed.
5. HackDay: first load initializes event from seed and records `hackday_event_id`.
6. HackDay: compatibility fallback still works for unmigrated rows before cutover.
7. HackDay: hardcoded branding/date literals removed from runtime content loaders.

### Integration Tests
1. End-to-end template creation from HDC parent page:
   - child page created,
   - HackDay macro rendered,
   - seed row present.
2. First HackDay admin visit:
   - setup screen loads with seeded basics,
   - local setup completion persists to HackDay core tables.
3. Non-admin visit behavior:
   - correct permission gating.
4. Existing HD26Forge path:
   - no regression in team creation, submission, voting, judging, results.
5. Existing HDC `hdc_native` instances:
   - no regression in current behavior.

### Manual/Environment Validation
1. Desktop/tablet/mobile navigation from HDC parent to template child page.
2. Verify page-scoped isolation by opening two template pages in parallel and confirming no cross-event data bleed.
3. Verify rollback path:
   - delete seed row and re-run creation safely with idempotent request IDs.

### Done Criteria
1. HDC can create HackDay template instances end-to-end on production environment.
2. HackDay no longer depends on singleton `isCurrent` for template-created pages.
3. New template instances are page-scoped, genericized, and locally configurable by HackDay admins.
4. Phase artifacts and runbooks updated in both repos.

## Rollout Strategy
1. Stage deploy both apps with compatibility bridge enabled.
2. Run staged smoke + regression bundle.
3. Deploy HDC provisioning first, then HackDay context refactor (same release window).
4. Monitor first 3 template creations.
5. Disable singleton fallback after successful observation window and evidence capture.

## Assumptions and Defaults
1. Both apps run on same Atlassian site context where child pages are created.
2. Shared Supabase remains available and writable by HDC service-role backend.
3. HD26Forge moves to service-role backend key with strict server-side permission checks.
4. HDC remains source for template registry metadata; HackDay remains source for runtime lifecycle and participation data.
5. Backward compatibility for existing non-template instances is required until formal fallback removal checkpoint is passed.
