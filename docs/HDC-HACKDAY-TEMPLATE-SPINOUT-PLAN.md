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

## Execution checkpoint (2026-02-19 23:45 GMT)

### Context note
- No new canonical spinout phase was executed in this checkpoint.
- Work performed was HD26Forge local UX stabilization required to unblock team workflow testing.

### Operational progress captured
1. Join-request UX/state reliability fixes completed and validated.
2. Captain approval surface made persistent on team detail.
3. Team-page submission CTA restored locally for captain/member role paths.

### Evidence anchors
- `/Users/nickster/Downloads/HackCentral/learnings.md` (latest local UX checkpoint)
- `/Users/nickster/Downloads/HackCentral/forge-native/CONTINUATION_HANDOFF.md` (handoff-ready state)
- `/Users/nickster/Downloads/HackCentral/PLAN_HDC_V2_EXECUTION.md` (execution log entry)

### Next actionable step
- Continue with local role-matrix verification and then decide deploy timing for the submit-bar restoration delta.

## Execution checkpoint (2026-02-19 23:50 GMT)

### Context note
- No new canonical spinout phase was executed in this checkpoint.
- Work was intentionally constrained to the next incomplete HD26Forge local UX stabilization slice from the 23:45 GMT source-of-truth checkpoint.

### Local UX verification closure
1. Verified team-detail CTA matrix by role in local workflow (`captain`, `member`, `non-member`).
2. Verified join-request lifecycle in local (`submit -> pending -> captain accept/decline`) with explicit captain feedback.
3. Applied minimal captain CTA guard fix in local UI contract:
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/src/components/TeamDetail.jsx`
4. Added local e2e proof artifact:
   - `/Users/nickster/Downloads/HD26Forge/tests/e2e/local/team-detail-ux.spec.ts`

### Validation
- `/Users/nickster/Downloads/HD26Forge`: `npm run lint` ✅
- `/Users/nickster/Downloads/HD26Forge/static/frontend`: `npm run build` ✅
- `/Users/nickster/Downloads/HD26Forge`: `npm run test:e2e:local` ✅ (`3/3`)

### Boundary
- Existing prior fixes (create idea visibility, delete idea flow, join-request error/success surfacing) were preserved.
- Deploy and production health-check actions were not executed in this checkpoint and remain operator-directed.

## Execution checkpoint (2026-02-20 00:26 GMT)

### Context note
- No new canonical spinout phase was executed in this checkpoint.
- Work remained in HD26Forge local UX/presentation hardening.

### Operational progress captured
1. Recovered dashboard light-mode contrast behavior for cinematic/decision surfaces (including Mission Window area).
2. Completed nav naming/order cleanup (`Hack Ideas & Teams` before `Schedule`) and aligned marketplace heading.
3. Fixed pending-request accept/decline button icon-label alignment.
4. Promoted the light-mode recovery slice to production and verified `hackdaytemp` upgrade state (v`5.51.0`).

### Current boundary
- Schedule title normalization (`Schedule` without event-name prefix) is implemented locally and built, but remains pending commit/push/deploy.

### Next actionable step
- Promote schedule title cleanup delta to production and perform one quick `hackdaytemp` visual smoke on Schedule + Dashboard light mode.

## Execution checkpoint (2026-02-20 00:30 GMT)

### Context note
- No new canonical spinout architecture phase was executed in this checkpoint.
- Work was constrained to the pending HD26Forge `Schedule` heading promotion slice from the `00:26 GMT` source-of-truth boundary.

### Operational progress captured
1. Promoted local schedule title normalization to production:
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/src/components/Schedule.jsx`
   - page title is now exactly `Schedule`.
2. Applied required release version bump:
   - `/Users/nickster/Downloads/HD26Forge/package.json` `7.5.52 -> 7.5.53`
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/package.json` `1.2.26 -> 1.2.27`
3. Completed git promotion on `main`:
   - commits `42e8326` and `6949759` pushed to `origin/main` (head `6949759`).

### Validation
- `/Users/nickster/Downloads/HD26Forge/static/frontend`: `npm run build` ✅
- `/Users/nickster/Downloads/HD26Forge`: `npm run test:e2e:local` ✅ (`3/3`)
- `/Users/nickster/Downloads/HD26Forge`: `npm run qa:health:prod` ✅ (`PASS`)

### Deploy and upgrade
- `/Users/nickster/Downloads/HD26Forge`: `forge deploy -e production --non-interactive` ✅
  - latest successful production deploy row: `2026-02-20T00:30:01.353Z`
- `/Users/nickster/Downloads/HD26Forge`: `forge install --upgrade --site hackdaytemp.atlassian.net --product confluence -e production --non-interactive` ✅
  - result: `Site is already at the latest version`
- install verification confirms `hackdaytemp` production is `App version 5` and `Up-to-date`.

### Version evidence
- App package: `7.5.53`
- Custom UI package: `1.2.27`
- Forge production app version on site: `5` (latest)

## Execution checkpoint (2026-02-20 01:41 GMT)

### Context note
- No new canonical spinout architecture phase was executed in this checkpoint.
- Work was constrained to a production micro-release in HD26Forge for light-mode countdown chip contrast.

### Operational progress captured
1. Promoted Dashboard light-mode countdown chip readability fix:
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/src/index.css`
   - selector: `[data-color-mode="light"] .ecd-urgency-chip`
2. Applied release version bump:
   - `/Users/nickster/Downloads/HD26Forge/package.json` `7.5.57 -> 7.5.58`
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/package.json` `1.2.31 -> 1.2.32`
3. Git promotion completed:
   - commit `e98d9fa` pushed on `main`.

### Validation
- `/Users/nickster/Downloads/HD26Forge/static/frontend`: `npm run build` ✅
- No additional e2e/prod health-check execution in this checkpoint (CSS-only micro-slice).

### Deploy and upgrade
- `/Users/nickster/Downloads/HD26Forge`: `forge deploy -e production --non-interactive` ✅
  - deployed app version: `5.58.0`
  - latest successful production deploy row: `2026-02-20T01:38:40.781Z`
- `/Users/nickster/Downloads/HD26Forge`: `forge install --upgrade --site hackdaytemp.atlassian.net --product confluence -e production --non-interactive` ✅
  - result: `Site is already at the latest version`

## Execution checkpoint (2026-02-20 01:45 UTC)

### Context note
- No new canonical spinout architecture phase was executed in this checkpoint.
- Work was intentionally constrained to the next pending validation slice after the `01:41 GMT` micro-release.

### Operational progress captured
1. Closed the missing post-release validation coverage for the already-promoted countdown-contrast release.
2. Executed runbook-default verification commands on the current production release line (`e98d9fa`).

### Exact versions
- HD26Forge app package: `7.5.58`
- HD26Forge custom-ui package: `1.2.32`
- Production deployed app line on `hackdaytemp`: `5.58.0`

### Validation
- `/Users/nickster/Downloads/HD26Forge/static/frontend`: `npm run build` ✅
- `/Users/nickster/Downloads/HD26Forge`: `npm run test:e2e:local` ✅ (`4/4`)
- `/Users/nickster/Downloads/HD26Forge`: `npm run qa:health:prod` ✅ (`PASS`)

### Deploy and upgrade
- No new deploy/install operations were required for this verification-only slice.
- Prior deploy/install outcomes from `2026-02-20 01:41 GMT` remain authoritative (`5.58.0`, site up-to-date).

### Commit hash(es)
- Validated release commit: `e98d9fa`
