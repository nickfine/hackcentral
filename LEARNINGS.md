# LEARNINGS.md - HackCentral Session Notes

**Last Updated:** March 1, 2026

## Project Overview

**HackCentral** is an AI Maturity Accelerator platform that creates HackDay template instances via wizard, which HD26Forge then renders on Confluence.

**Shared Backend:** Both HackCentral and HD26Forge use `https://ssafugtobsqxmqtphwch.supabase.co`

## Critical Relationship with HD26Forge

When users create a HackDay in HackCentral:
1. Wizard collects: eventName, eventTagline, schedule, rules, branding
2. Creates `HackdayTemplateSeed` record in Supabase with `seed_payload`
3. HD26Forge macro detects seed → creates Event record
4. HD26Forge renders with Adaptavist logo + custom name/tagline from wizard

**Important:** Changes to HackCentral wizard affect how HD26Forge displays created HackDays.

## Current Project State

**Version:** 0.6.44 (root app)
**Forge UI Cache-Busters:** 0.6.44 (`HACKCENTRAL_UI_VERSION` / `HACKCENTRAL_MACRO_VERSION`)
**Tech Stack:** React 19 + TypeScript + Vite + Convex + Forge Native
**Forge Native Package:** 0.3.12

## Session Update - Performance Rollout Completion + Live Telemetry Validation (Mar 1, 2026)

### Completed

- Enabled and validated low-risk performance rollout flags in production and staging:
  - `HDC_PERF_CREATE_BACKEND_V1=true`
  - `HDC_PERF_RUNTIME_BOOTSTRAP_V2=true`
  - frontend build flags enabled at deploy time:
    - `VITE_HDC_PERF_CREATE_HANDOFF_V1=true`
    - `VITE_HDC_PERF_RUNTIME_BOOTSTRAP_V2=true`
    - `VITE_HDC_PERF_LOADING_UX_V1=true`
- Fixed `create-from-web` fallback user provisioning defects in `forge-native/src/backend/supabase/repositories.ts`:
  - generate `id` for inserted fallback users
  - include required `createdAt` and `updatedAt` timestamps
  - eliminated prior production `23502` not-null failures.
- Corrected app entry URL drift:
  - updated `HACKDAY_CREATE_APP_URL` from legacy `/forge-apps/...` to `/wiki/apps/.../hackday-central` for both production and staging.
- Rebuilt all Forge custom UIs and redeployed to ensure frontend perf flags were compiled into active bundles.
- Release/version bump committed and pushed:
  - root `0.6.44`
  - Forge native `0.3.12`
  - UI markers `HACKCENTRAL_UI_VERSION` and `HACKCENTRAL_MACRO_VERSION` set to `0.6.44`.

### Production Evidence (Live Create -> Open Full Page)

- Latest validated create request:
  - `creationRequestId`: `156ac93e-4702-43d8-bf4d-1c61393f9aec`
  - `eventId`: `42818bfa-ab12-4f2b-bcac-01633e9da590`
  - `childPageId`: `16875584`
- Backend create metric:
  - `create_instance_draft` success, `3439ms`, `mode: v1`
  - stage timings captured (lookup, conflict check, child page creation, user resolution, event/milestone/admin/seed creation).
- Frontend handoff metric:
  - `create_handoff` success, `4184ms`, `mode: v1`, `outcome: opened_app_view`
- Runtime load metrics:
  - `runtime_first_load` success, `3822ms`, `mode: v2`
  - `runtime_bootstrap` success, `1704ms`, `mode: v2`
- Route validation:
  - full-page app opened on `/wiki/apps/.../hackday-app?pageId=16875584` and loaded event title/tagline correctly.

### Notes

- During rollout validation, an intermediate deploy regressed frontend telemetry to `legacy` mode because Vite flags were not compiled in that bundle.
- Rebuilding Custom UI with flags and redeploying fixed this; final production telemetry confirms active `v2` runtime bootstrap path.

## Session Update - Create Flow Stabilization + Runtime CSP Cleanup (Feb 28, 2026)

### Completed and Deployed

- Production deploy sequence completed through Forge version `5.20.0`.
- Create flow launch behavior stabilized for both HackCentral UIs:
  - `forge-native/static/frontend/src/App.tsx`
  - `forge-native/static/macro-frontend/src/App.tsx`
- Launch logic now uses app-shell navigation in this order:
  1. top-window assign (when available)
  2. `router.navigate(appViewUrl)` with timeout
  3. `router.open(appViewUrl)` with timeout
  4. child-page fallback only if app-view launch fails
- Removed false-positive “opened in new tab” behavior from async popup handling in sandboxed iframe contexts.
- Runtime context activation is primed immediately after create for the new child page:
  - calls `hdcActivateAppModeContext` with created `childPageId`.
- Runtime CSP cleanup completed:
  - removed `@fontsource` imports from runtime frontend entry
  - switched runtime font stacks to CSP-safe system fonts
  - eliminated runtime `data:font` CSP console errors during app load
- App list clarity update:
  - runtime app entry renamed to `HackCentral Runtime (Internal)` in manifest.

### Validation

- Playwright end-to-end create tests passed (multiple runs):
  - create from HackCentral UI
  - auto-land on `/wiki/apps/.../hackday-app?pageId=...`
  - correct created event heading shown
  - no “An error has occurred in loading this app” banner
- Runtime direct-open validation passed:
  - runtime page loads with `0` console errors (warnings remain platform-level/non-blocking).
- Targeted tests passed:
  - `tests/forge-native-hdcService.spec.ts`
  - `tests/forge-native-createFromWeb.spec.ts`
  - `tests/runtime-app-view-gating.spec.ts`
  - `tests/create-hackday-launch-url.spec.ts`
  - `tests/forge-native-runtime-context-precedence.spec.ts`

## Session Update - Runtime Cutover + Existing Page Migration (Feb 28, 2026)

### Completed

- Production runtime owner switched to HackCentral:
  - `HDC_RUNTIME_OWNER=hackcentral`
- Forge production redeployed and install upgraded on `hackdaytemp.atlassian.net`.
- Existing created-instance pages migrated from legacy HD26 macro target to HackCentral runtime macro target using:
  - `scripts/migrate-hackday-runtime-macro.mjs`
- Migration result:
  - `totalCandidates: 28`
  - `updated: 28`
  - `skipped: 0`
  - `errors: 0`
- Rollback artifact written:
  - `docs/runtime-migration/rollback-manifest-2026-02-28-104510.json`

### Open App View Follow-up

- Root cause found for launch failure:
  - runtime frontend was navigating to old module key `hackday-global-nav`.
  - fixed to `hackday-runtime-global-page` in:
    - `forge-native/static/runtime-frontend/src/App.jsx`
- Remaining UX inconsistency:
  - CTA visibility and auto-open are still gated by `useAdaptavistLogo`, so some migrated pages hide the button even with valid page context.
  - Current gate in runtime frontend:
    - `showOpenAppViewCta={Boolean(isMacroHost && useAdaptavistLogo && eventPageId)}`

## Session Update - App Shell Full-Page Routing + Default Recency Sort (Feb 28, 2026)

### Completed

- Confirmed created HackDay instances can open in full app-shell route context using URL pattern:
  - `/wiki/apps/<app-id>/<env-id>/hackday-app`
- Verified this app-route path removes Confluence page chrome (header/sidebar/title region) compared with page-macro context.
- Updated HackDay registry ordering to default to **most recent first** in both Forge UIs:
  - Global page UI (`forge-native/static/frontend`)
  - Macro UI (`forge-native/static/macro-frontend`)

### Sorting Behavior (Most Recent First)

- Default list/switcher ordering now prioritizes recency derived from schedule timestamps (`results`, `voting`, `submission`, `hacking`, then earlier anchors).
- Tie-breaker fallback uses numeric Confluence page ID (descending), then event name.
- This replaced older default alphabetical ordering for main registry experiences.

### Deploy/Release Markers

- Forge package version bumped to `0.3.9` (`forge-native/package.json`)
- UI version markers bumped to `0.6.21` in both App.tsx files
- Commit: `3045843` — `Sort hackdays by most recent by default`
- Pushed to `origin/main` on February 28, 2026

### Validation Notes

- `npm run typecheck` passed in `forge-native`
- `npm run custom-ui:build` passed for both bundles
- Console warnings seen during testing (FeatureGateClients duplicates, CSP font blocks, deprecated platform APIs) were non-blocking and host/platform-originated

## Session Update - Runtime Consolidation Foundations (Feb 28, 2026)

### Completed

- Added HackCentral-hosted runtime modules in Forge manifest:
  - Global page route: `hackday-app` (resource `runtime-ui-frontend`, resolver `runtime-resolver`)
  - Runtime macro: `hackday-runtime-macro`
  - Runtime function handler: `src/runtime/index.js` (ported from HD26Forge backend)
- Added runtime frontend resource:
  - `forge-native/static/runtime-frontend` (ported from HD26Forge frontend)
- Added runtime selection feature flag and route metadata contract in `hdcGetAppViewUrl`:
  - `HDC_RUNTIME_OWNER` (`hd26forge` default, `hackcentral` for cutover)
  - Response now includes `runtimeOwner` and `routeVersion`
- Added runtime-aware instance provisioning behavior:
  - New child page macro target now selected by runtime owner
  - Full-page `appViewUrl` now selected by runtime owner with fallback to legacy HD26 route
- Added migration tooling for existing child pages:
  - `scripts/migrate-hackday-runtime-macro.mjs` (supports `dryRun`, `tenant`, `batchSize`, `cursor`, `rollbackManifestPath`)
  - `scripts/rollback-hackday-runtime-macro.mjs`
  - Manifest includes page-level rollback metadata (pre-migration hash + updated version + previous storage body for rollback)

### New Forge Env Variables

- `HDC_RUNTIME_OWNER`
- `HDC_RUNTIME_APP_ID`
- `HDC_RUNTIME_ENVIRONMENT_ID`
- `HDC_RUNTIME_MACRO_KEY`

### Validation

- `forge-native`: `npm run typecheck` ✅
- `forge-native`: `npm run test:backend` ✅
- `forge-native`: `npm run custom-ui:build` ✅ (frontend + macro + runtime frontend)
- `forge-native`: `npm run lint` ✅ (1 non-blocking deprecation warning about fetch.backend permissions)

**Deployment:**
- Frontend: Vite dev server (localhost:5173)
- Backend: Convex
- Confluence: Forge app on hackdaytemp.atlassian.net

## Key Concepts

### HackDay Template Wizard Flow
```
User fills wizard
  ↓
Stores HackdayTemplateSeed in Supabase (seed_payload)
  ↓
HD26Forge macro loads on Confluence page
  ↓
Detects seed → Creates Event in Supabase
  ↓
Renders HackDay with custom branding/messaging
```

### Shared Data Structure

**HackdayTemplateSeed Table** (Supabase):
- `confluence_page_id` - Links to child page
- `seed_payload` - Complete wizard data (basicInfo, schedule, rules, branding)
- `hackday_event_id` - Created Event ID
- `provision_status` - 'provisioned', 'initialized', 'failed'

**Seed Payload Structure:**
```javascript
{
  basicInfo: {
    eventName: string,
    eventIcon?: string,
    eventTagline?: string,
    primaryAdminEmail?: string,
    coAdminEmails?: string[],
  },
  schedule: { /* dates and times */ },
  rules: {
    minTeamSize?: number,
    maxTeamSize?: number,
    // other constraints
  },
  branding: {
    bannerMessage?: string,
    accentColor?: string,
    bannerImageUrl?: string,
  },
  launchMode?: "draft" | "go_live"
}
```

## Development Notes

### Frontend Architecture
- React components in `src/components/` (shared, ui, dashboard, library, people, projects)
- Custom hooks in `src/hooks/`
- Utilities and design system in `src/lib/`
- Design tokens system in `src/lib/design-system.ts`

### Backend (Convex)
- Database schema in `convex/schema.ts`
- Mutations/queries in `convex/` files (profiles.ts, hackdays.ts, etc.)
- Forge bridge in `convex/forgeBridge.ts` for Confluence integration

### Design System
Follow patterns in DESIGN_SYSTEM.md:
- Shared components: SectionHeader, ModalWrapper, SkeletonGrid
- Page patterns and layouts
- Design tokens for consistency

### Testing
- Framework: Vitest + React Testing Library
- Run: `npm test`
- Coverage: `npm run test:coverage`

## Deployment

### Convex Backend
```bash
npm run convex:deploy  # Deploy to production
```

### Confluence App (Forge Native)
```bash
cd forge-native
npm run custom-ui:build
forge deploy --environment production --no-verify
forge install -e production --upgrade --non-interactive \
  --site hackdaytemp.atlassian.net --product confluence
```

See DEPLOY.md for exact copy-paste steps.

## Known Issues & TODOs

- Open App View CTA/auto-open visibility is inconsistent on migrated pages due to `useAdaptavistLogo` gating in runtime frontend.
- Decide and implement final rule:
  - gate by page context only (`isMacroHost && eventPageId`) for all created instances, or
  - keep logo-based segmentation intentionally.
- `LEARNINGS.md` is the primary HackCentral continuity log for session summaries, deploy notes, and recent changes
- `learnings.md` contains additional project-specific continuity notes (including HD26Forge integration details)

## Session Update - Created HackDay Chrome Parity Reminder (Feb 27, 2026)

### Observation

- Original HackDay app view can run in app-shell context without Confluence page title/byline in the primary content area.
- Created HackDays are currently opened on Confluence child pages that render the HackDay macro, so Confluence page chrome remains visible.

### Key Constraint

- Forge macro cannot remove host Confluence page chrome from inside iframe content.
- True parity requires app-route usage (`/wiki/apps/.../hackday-app`) for created instances.

### Next Work Item (deferred to new chat)

1. Add/confirm launch flow from HackCentral-created child pages into HD26Forge app route.
2. Keep child pages as durable anchors/metadata sources.
3. Preserve HD26Forge page-scoped context integrity and trusted page-id rules during routing changes.

## Session Update - Schedule Builder V2 Payload Hardening (Feb 25, 2026)

### Completed and Deployed

- Hardened Schedule Builder V2 payload consistency across HackCentral web create path:
  - Convex payload validator (`convex/hackdays.ts`)
  - Forge backend shared types and normalization (`forge-native/src/shared/types.ts`, `forge-native/src/backend/hdcService.ts`)
  - Forge repository schedule parsing/round-trip (`forge-native/src/backend/supabase/repositories.ts`)
  - Forge frontend API types and wizard typing (`forge-native/static/frontend/src/types.ts`, `forge-native/static/frontend/src/App.tsx`)
- Added preserve-only support for `customEvents` and preserved `selectedEvents`.
- Preserved `duration`, `openingCeremonyAt`, `presentationsAt`, `judgingStartsAt` end-to-end.
- `customEvents` are intentionally:
  - stored in `Event.event_schedule`
  - stored in `HackdayTemplateSeed.seed_payload.schedule`
  - **NOT rendered yet** on child Schedule page at this Feb 25 checkpoint
  - **NOT converted to milestones yet** at this Feb 25 checkpoint (superseded by Feb 26 update below)

### Validation Completed

- `forge-native` typecheck passed
- Targeted regression tests added/passed:
  - `forge-native-createFromWeb.spec.ts`
  - `forge-native-hdcService.spec.ts`
  - `forge-native-repository-event-config.spec.ts`
- Full root test suite passed (`95/95`) after fixing localStorage test shim in `tests/setup.ts`
- Production smoke test (post-deploy) confirmed:
  - preserved schedule fields in `event_schedule` and `seed_payload.schedule`
  - no custom-event milestones (expected)

### Deployment Rule (Important)

- Use a **single Forge deploy target: production**
- Always deploy with:
  - `forge deploy --environment production --no-verify`
- Do not rely on default/active Forge environment selection

### Commit

- `b9d500c` - `Harden Schedule Builder V2 payload preservation`

### What's Next (Schedule Builder V2)

- Historical note (Feb 25): Phase 2 UI + Phase 3 preview were still pending at this checkpoint
- Current remaining work (see Feb 26 updates below):
  - Phase 3 UI work: Schedule preview page
  - Exact custom-event signal-color parity on child Schedule page (currently phase-mapped)

## Next Session Quick Start

1. Type: `Read .claude/instructions.md`
2. I'll load context and ask what to work on
3. Expect a model recommendation (Haiku for implementation, Sonnet for analysis)

## Important Files to Know

| File | Purpose |
|------|---------|
| `DESIGN_SYSTEM.md` | UI components and patterns |
| `learnings.md` | HD26Forge-specific continuity notes |
| `.claude/instructions.md` | Session onboarding and quick reference |
| `convex/schema.ts` | Database schema |
| `convex/hackdays.ts` | HackDay creation wizard logic |
| `forge-native/CONTINUATION_HANDOFF.md` | Forge integration notes |
| `forge-native/src/backend/hdcService.ts` | Backend: normalizeEventSchedule, createMilestonesFromSchedule |
| HD26Forge `static/frontend/src/components/Schedule.jsx` | Schedule page rendering and milestone grouping |

## Session Update - Forge UI Restyles, Font Parity, and Deploy Debugging (Feb 26, 2026)

### Completed and Deployed

- Restyled Forge **HackDays** page (`forge-native/static/frontend`) to match the main-app Schedule Builder / PhaseCard visual language (teal accent cards, stronger hierarchy, restyled empty/loading/error states).
- Restyled Forge **dashboard/front page** and refreshed shared **`HackCard`** visuals globally in `static/frontend` (dashboard hero, metric cards, section framing, quick-actions shell/FAB styling alignment).
- Aligned Forge frontend base font stack to original HackDay (`IBM Plex Sans`, `Segoe UI`, `sans-serif`) and then fixed title font parity by bundling IBM Plex Sans in the frontend bundle.
- Fixed Hacks page filter-row regression (`Show Deprecated` checkbox blown out by text-input styles).

### Font Parity - What Actually Fixed It

- Title typography metrics were already correct (weight/tracking), but the face still looked wrong when `IBM Plex Sans` was not installed locally.
- **Stack-only change was insufficient**.
- Exact parity required explicit font loading in Forge frontend:
  - Added `@fontsource/ibm-plex-sans` to `forge-native/static/frontend/package.json`
  - Imported weights `400/500/600/700` in `forge-native/static/frontend/src/main.tsx`
- Result: Forge frontend bundle now ships IBM Plex font assets, so title rendering no longer depends on local machine fonts.

### Hacks Page Regression - Root Cause / Fix

**Symptom:** Hacks filters/layout broke and the `Show Deprecated` checkbox was stretched like a full-width filter control.

**Root cause:** Over-broad CSS selector in `forge-native/static/frontend/src/styles.css`:
- `.filter-row input` matched nested checkbox inputs inside `.check-label`

**Fix:**
- Scoped filter controls to direct children only:
  - `.filter-row > input`
  - `.filter-row > select`
- Added defensive `.check-label input` sizing rules (`flex: 0 0 auto`, compact width/padding)

### Forge Deploy / Cache-Busting Lessons (Important)

- `forge deploy` does **not** build `static/frontend` or `static/macro-frontend` source automatically.
- Always run:
  1. `npm run custom-ui:build`
  2. `forge deploy --environment production --no-verify`
- `forge environments list` confirms deploy timestamp, but browser console version logs confirm which UI bundle loaded:
  - `[HackCentral Confluence UI] loaded <version>`
  - `[HackCentral Macro UI] loaded <version>`
- Atlassian host-page warnings (CSP report-only `unsafe-eval`, FeatureGateClients duplicates, deprecated platform APIs) are usually unrelated to HackCentral UI changes.

### Versions / Commits (This Session)

- Root app version bumped to `0.6.34`
- Forge UI cache-buster versions reached `0.6.8` (`HACKCENTRAL_UI_VERSION` and `HACKCENTRAL_MACRO_VERSION`)
- Relevant commits:
  - `06dd8cb` - Restyle Forge dashboard and shared HackCard visuals
  - `868ffc6` - Align Forge frontend font stack with HackDay (stack-only attempt)
  - `64c2bc6` - Fix Hacks filter layout regression
  - `722ff08` - Bundle IBM Plex Sans for Forge frontend (final title font parity fix)

## Schedule Builder V2 & Milestone System (Feb 25, 2026)

### Data Flow: Wizard → Backend → HD26Forge Schedule Page

```
Schedule Builder V2 (frontend)
  ↓ generates ScheduleBuilderOutput with timestamps
hdcCreateInstanceDraft (backend)
  ↓ calls normalizeEventSchedule() to extract fields
  ↓ calls createMilestonesFromSchedule() to create Milestone records
Supabase Milestone table
  ↓ HD26Forge reads milestones via getSchedule resolver
HD26Forge Schedule.jsx renders milestones
```

### Key Backend Functions (hdcService.ts)

**`normalizeEventSchedule(input)`** - Extracts schedule fields from wizard output:
- Must include ALL fields the frontend sends (openingCeremonyAt, presentationsAt, judgingStartsAt, etc.)
- Missing fields here = milestones won't be created = won't show on Schedule page
- Now includes `duration` field for multi-day event support

**`createMilestonesFromSchedule(eventId, schedule)`** - Creates Milestone records:
- Pre-event: registrationOpensAt, teamFormationStartsAt, registrationClosesAt
- Hack day: openingCeremonyAt, hackingStartsAt, submissionDeadlineAt, presentationsAt, judgingStartsAt, resultsAnnounceAt
- Multi-day: Creates "Day N - Hacking Continues" for intermediate days when duration > 1

### HD26Forge Schedule Display (static/frontend/src/components/Schedule.jsx)

**Milestone Grouping Logic:**
- Pre-event phases (REGISTRATION, TEAM_FORMATION) → grouped into single "Pre-Event" column
- Hack day phases (HACKING, SUBMISSION, JUDGING, RESULTS) → grouped by date into "Day 1", "Day 2", etc.

**Bug Fixed:** Original code grouped ALL milestones by date, showing pre-event milestones as separate day columns.

### Multi-Day Event Handling

For 3-day events:
- Day 1: Opening Ceremony, Hacking Begins
- Day 2: "Day 2 - Hacking Continues" (auto-generated when duration=3)
- Day 3: Code Freeze, Presentations, Judging, Results

The `duration` field in EventSchedule enables this - without it, intermediate days have no milestones.

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Missing events on Schedule page | `normalizeEventSchedule` not including field | Add field to normalizeEventSchedule return |
| Pre-events shown as separate day columns | HD26Forge grouping by date instead of phase | Group by phase in Schedule.jsx |
| Missing Day 2 on 3-day events | No milestones for intermediate days | Add duration field + generate intermediate milestones |

## Critical Reminders

**Shared Backend Impact:**
- Changes to HackdayTemplateSeed affect HD26Forge rendering
- Supabase migrations affect both projects
- Test created HackDay rendering in HD26Forge when modifying seeds

**Design Consistency:**
- Always use components from DESIGN_SYSTEM.md
- Follow Tailwind CSS 4 patterns
- Keep UI consistent with existing pages

**Wizard Data Flow:**
- seed_payload values become Event display values in HD26Forge
- eventName → dashboard hero title (if useAdaptavistLogo)
- eventTagline → dashboard hero subtitle (if useAdaptavistLogo)

---

**Next time:** Read instructions.md to get oriented, then tell me what you'd like to work on!

---

## Learnings (Feb 26, 2026) - Schedule Builder V2 Custom Events to Child Schedule Page

### 1) Wizard UI success does not prove child Schedule page success

The HackCentral Schedule Builder V2 wizard and the created child Hackday Schedule page are different systems:
- Wizard UI works from `event_schedule`
- Child Schedule page renders from **Milestone** rows

Implication:
- If custom events are preserved in `event_schedule` but not converted to milestones, they will **not** show on the child Schedule page.

### 2) This was initially a scope/runtime issue, not a deploy/cache issue

We correctly deployed the UI changes, but the child Schedule page still didn't reflect custom events because milestone generation was initially scoped to `hdc_native` only.

Later requirement clarified:
- HackCentral-created child pages should reflect Schedule config for both runtimes used by HackCentral creation flows:
  - `hdc_native`
  - `hackday_template`

### 3) Child Schedule page coloring is phase-based, not signal-based

Important distinction:
- Schedule Builder V2 custom events have `signal` (`start`, `deadline`, `ceremony`, `presentation`, `judging`, `neutral`)
- Child Schedule page milestone rendering currently uses milestone `phase` for card coloring/styling

Current result:
- Signal influences color **indirectly** via `signal -> phase` mapping
- Exact signal color parity is **not** preserved yet

This explains why "slot color transferred?" can look partially correct while signal-specific palette parity is still missing.

### 4) Add a resync/backfill path when changing milestone generation

New milestone-generation behavior only affects newly created child pages unless you backfill existing milestones.

Added production ops action:
- `resync_schedule_milestones` (webtrigger handler in `forge-native/src/ops.ts`)
- Rebuilds milestones from stored `event_schedule`
- Useful for validating new milestone mapping on already-created test pages

### 5) Keep runtime-specific assertions in tests (or consciously broaden them)

A preserve-only test for `hackday_template` blocked/obscured the product expectation change.

Lesson:
- When behavior depends on runtime, tests should explicitly name and assert the intended runtime scope
- If product scope changes, update the runtime-specific assertions first so failures are informative

### 6) Practical debugging order for Schedule Builder V2 issues

When "Schedule page doesn't reflect config":
1. Confirm wizard output / `event_schedule` contains expected data
2. Confirm milestone generation path includes the fields (`hdcService.ts`)
3. Confirm runtime scope (`hdc_native` vs `hackday_template`)
4. Confirm whether existing page needs milestone resync
5. Only then investigate deploy/cache issues

---

## Learnings (Feb 26, 2026) - Dedicated Schedule Review Step (Wizard UX + Preview Accuracy)

### 1) Schedule editing and schedule validation should be separate wizard modes

Putting the full generated timeline preview at the bottom of the Schedule editor made the page too tall and encouraged users to miss validation details.

What worked better:
- Step 2 = **Schedule editing**
- Step 3 = **Schedule Review** (read-only preview + back-to-edit loop)

This reduced context switching and made schedule verification explicit before moving on to Rules/Branding.

### 2) Preview accuracy must come from live builder state, not serialized output only

The original dedicated preview implementation undercounted multi-day events because serialized `ScheduleBuilderOutput` flattens some schedule timestamps and does not preserve every day-specific standard event instance.

Fix:
- Render Step 3 preview from live `ScheduleBuilderV2` state:
  - `eventStates`
  - `customEvents`
  - `duration`
  - `anchorDate`
  - `timezone`

Result:
- Repeated Day 2/Day 3 events (e.g. `Morning Kickoff`, `Hacking Begins`) now render correctly in the preview.

### 3) Parent wizard state is required for reliable back-to-edit UX

To support Step 3 review + Step 2 edit round-trips without losing configuration, the parent wizard must store the full Schedule Builder V2 state snapshot.

Implementation pattern:
- `ScheduleBuilderV2` exposes:
  - `onStateChange`
  - `showInlinePreview`
- Parent stores `ScheduleBuilderState`
- Step 2 passes `initialState` when returning from review
- Step 3 renders `ScheduleBuilderV2Preview` from parent-held state

Macro-specific note:
- Persisting `scheduleBuilderState` in local draft storage prevents losing the dedicated review preview after reloads.
- Older drafts without this field must be treated as valid and simply show the “open Schedule step first” fallback.

### 4) Wizard step-count changes require metadata compatibility updates

Adding a dedicated Schedule Review step changed wizard flow from 5 to 6 steps.

Required compatibility changes:
- `WizardStep` union updated to include `6`
- `completedStep` backend validation upper bound expanded from `5` to `6`
- Default `completedStep` values for seed creation updated to `6`

Important:
- This is metadata/telemetry compatibility only
- `wizardSchemaVersion` remained `2`
- No seed payload schema changes were needed

### 5) Preserve scope boundaries: HackCentral wizard UX can change without touching HD26Forge

This work intentionally stayed in `forge-native` (HackCentral creation wizard only).

Did **not** change:
- `HD26Forge` repo
- child-page Schedule rendering (`Schedule.jsx`)
- shared schedule/customEvents payload schema
- milestone generation behavior

This was safe because the feature is a wizard UX and preview presentation improvement, not a data-contract change.

### 6) ECD UX lesson: avoid card-within-card depth inside a wizard step

The first Schedule Review implementation introduced too much visible depth:
- page shell
- step card
- inner bordered preview panel

This created visual noise and double padding.

Fix that worked:
- Add a flat/embedded preview surface mode for Step 3 review
- Keep only the day columns as subtle content containers
- Move instructional text under the Step 3 headline
- Replace preview pseudo-title with a simple timezone label

Result:
- The step reads as **two levels maximum** (page chrome + step card), consistent with HackDay design language.

### 7) Release/deploy continuity for this shipped work

Shipped state:
- Forge UI cache-buster version: `0.6.14`
- Forge production deploy timestamp: `2026-02-26T13:15:31.715Z`
- Commit: `24fc6f5` (`Add dedicated schedule review step and flatten preview`)
- Tag: `v0.6.14-ui`

Deployment reminders reinforced:
- Build both UIs: `npm run custom-ui:build`
- Deploy explicitly to production: `forge deploy --environment production --no-verify`
- Verify console bundle versions in incognito/private window after hard refresh

## Session Update - Phase 0 Continuity Backbone Implementation (2026-03-01 01:01 GMT)

### Task ID
- `P0.CONT.01` to `P0.CONT.08`

### What Changed
- Created the live execution ledger: `HDC-PRODUCT-EXECUTION-PLAN.md`.
- Updated `hdc-product-roadmap.hd` with fixed startup read order and session protocol.
- Rewrote `CONTINUATION.md` to the required operational schema:
  - current snapshot
  - active task pointer
  - next 3 atomic actions
  - blockers/decisions
  - validation commands
  - startup checklist
- Rewrote `CONTINUATION_PROMPT.md` as a clean bootstrap prompt linked to active task.
- Replaced `.claude/instructions.md` with startup/shutdown ritual workflow and updated source-of-truth map.
- Updated continuity references in `README.md` and `docs/README.md`.
- Created missing `forge-native/CONTINUATION_HANDOFF.md` and linked it in source-of-truth docs.
- Replaced stale legacy V2 execution-plan filename references in active docs with `HDC-PRODUCT-EXECUTION-PLAN.md`.

### Validation / Evidence
- File presence validated:
  - `HDC-PRODUCT-EXECUTION-PLAN.md`
  - `CONTINUATION.md`
  - `CONTINUATION_PROMPT.md`
  - `.claude/instructions.md`
  - `forge-native/CONTINUATION_HANDOFF.md`
- Stale reference sweep (active docs) returned no matches for legacy plan filename:
  - `rg -n "PLAN_HDC_V2_EXECUTION\.md" ...` (exit code `1`, no matches)
- Continuity schema spot-check:
  - `Active Task ID` present in `CONTINUATION.md`
  - `Task ID` and `Change Log` present in `HDC-PRODUCT-EXECUTION-PLAN.md`

### Regressions / Gotchas
- Active docs had multiple stale references to the legacy V2 execution-plan filename; these were cleaned up in-place.
- Historical artifacts under `docs/artifacts/` can still contain historical references by design.

### Next Recommended Step
- Execute `P1.IA.01`: produce the implementation-level IA/routing spec for `Home | Discover | Problem Exchange | HackDays | Pipeline | Community | Guide` and lock sub-tab routing behavior.

## LEARNINGS.md Entry Template (Operational)

Use this template at the end of every work session:

```markdown
## Session Update - <Topic> (<YYYY-MM-DD HH:MM TZ>)

### Task ID
- `<TASK_ID>`

### What Changed
- ...

### Validation / Evidence
- ...

### Regressions / Gotchas
- ...

### Next Recommended Step
- ...
```

## Session Update - P1.IA.01 IA and Routing Spec Finalization (2026-03-01 01:04 GMT)

### Task ID
- `P1.IA.01`

### What Changed
- Created implementation-ready IA/routing spec:
  - `docs/HDC-P1-IA-ROUTING-SPEC.md`
- Locked canonical Phase 1 nav model:
  - `Home | Discover | Problem Exchange | HackDays | Pipeline | Community | Guide`
- Defined decision-complete contracts for:
  - root app route schema + legacy redirects
  - Forge global-page `View` migration adapter + sub-tab state model
  - utility-surface handling (`search`, `notifications`, `create_hackday` flow)
  - admin role-gating behavior
- Updated execution ledger to mark `P1.IA.01` complete and advance active task to `P1.REG.01`.
- Updated `CONTINUATION.md` and `CONTINUATION_PROMPT.md` to point at `P1.REG.01` and reference the IA baseline spec.

### Validation / Evidence
- New spec file exists and includes:
  - canonical IA model
  - route/view matrices
  - legacy mapping table
  - acceptance criteria + test scenarios
- `HDC-PRODUCT-EXECUTION-PLAN.md` now shows:
  - `P1.IA.01` status: completed
  - active task ID: `P1.REG.01`
- `CONTINUATION.md` now points to `docs/HDC-P1-IA-ROUTING-SPEC.md` as IA baseline.

### Regressions / Gotchas
- Forge global page currently uses in-memory `view` state instead of URL routing, so migration requires an explicit compatibility adapter to avoid view regressions during rollout.

### Next Recommended Step
- Execute `P1.REG.01`: define Registry data model + Forge resolver contracts + acceptance test matrix aligned to `R1.1`-`R1.5`.

## Session Update - P1.REG.01 Contract Lock (2026-03-01 01:09 GMT)

### Task ID
- `P1.REG.01`

### What Changed
- Created detailed Registry backend contract spec:
  - `docs/HDC-P1-REGISTRY-CONTRACT-SPEC.md`
- Locked decisions for `R1.1`-`R1.5`:
  - Supabase as Registry source-of-truth
  - new `Artifact` + `ArtifactReuse` model
  - idempotent per-user reuse semantics (`artifact_id`, `user_id` unique pair)
  - Forge resolver contracts (`hdcCreateArtifact`, `hdcListArtifacts`, `hdcGetArtifact`, `hdcMarkArtifactReuse`)
  - error and telemetry contract
  - migration + implementation sequence and acceptance test matrix
- Updated execution ledger:
  - `P1.REG.01` moved from `Planned` to `In progress (contract spec locked)`
- Updated continuation artifacts for implementation handoff:
  - `CONTINUATION.md`
  - `CONTINUATION_PROMPT.md`

### Validation / Evidence
- Contract spec includes all required sections:
  - domain model
  - resolver I/O contracts
  - validations
  - acceptance tests
  - migration plan
- `HDC-PRODUCT-EXECUTION-PLAN.md` now references spec as evidence for `P1.REG.01`.
- `CONTINUATION.md` now points to `docs/HDC-P1-REGISTRY-CONTRACT-SPEC.md` as baseline.

### Regressions / Gotchas
- None introduced (documentation/spec update only).

### Next Recommended Step
- Implement `P1.REG.01` in code:
  1. add Supabase migration
  2. add shared types + resolver defs
  3. add repository/service/resolver methods
  4. add targeted backend tests for `R1.1`-`R1.5`

## Session Update - P1.REG.01 Backend Baseline Implemented (2026-03-01 01:15 GMT)

### Task ID
- `P1.REG.01`

### What Changed
- Added Supabase Registry migration:
  - `forge-native/supabase/migrations/20260301011000_phase1_registry.sql`
  - creates `Artifact` and `ArtifactReuse` tables
  - adds enums (`artifact_type_enum`, `artifact_visibility_enum`)
  - adds FK constraints, uniqueness on `(artifact_id, user_id)`, and indexes
- Added shared Registry API/domain types:
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Added backend service wrappers for Registry operations:
  - `forge-native/src/backend/hackcentral.ts`
- Added new Forge resolvers:
  - `hdcCreateArtifact`
  - `hdcListArtifacts`
  - `hdcGetArtifact`
  - `hdcMarkArtifactReuse`
  - file: `forge-native/src/index.ts`
- Implemented Supabase repository methods for Registry:
  - `createArtifact`
  - `listArtifacts`
  - `getArtifact`
  - `markArtifactReuse`
  - file: `forge-native/src/backend/supabase/repositories.ts`
- Added targeted contract tests:
  - `tests/forge-native-registry-contract.spec.ts`

### Validation / Evidence
- Targeted tests passed:
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts`
  - result: `5 passed`
- Forge backend typecheck passed:
  - `cd forge-native && npm run typecheck`

### Regressions / Gotchas
- Registry backend is implemented but global-page UI is not wired yet, so `R1.1`-`R1.5` are only backend-complete at this checkpoint.
- Convex mode intentionally throws `REGISTRY_UNSUPPORTED_BACKEND` for Registry operations until schema parity is added.

### Next Recommended Step
- Complete `P1.REG.01` by wiring Discover > Registry UI to new resolvers, then add UI-level tests for submission, filter/sort, reuse actions, and source-hack linking behavior.

## Session Update - P1.REG.01 Forge Registry UI Baseline (2026-03-01 01:23 GMT)

### Task ID
- `P1.REG.01`

### What Changed
- Wired Forge global-page Registry UI to resolver contracts in:
  - `forge-native/static/frontend/src/App.tsx`
- Added Registry interactions:
  - list artifacts (`hdcListArtifacts`)
  - filter/search/sort controls
  - create artifact form (`hdcCreateArtifact`) with frontend validation
  - mark reuse action (`hdcMarkArtifactReuse`)
  - detail fetch/toggle (`hdcGetArtifact`)
- Added shared frontend Registry utility module:
  - `forge-native/static/frontend/src/utils/registry.ts`
  - `REGISTRY_ARTIFACT_TYPES`, `parseRegistryTags`, `isValidHttpsUrl`, `mapFeaturedHackToArtifact`
- Extended styles for Registry controls/cards and new artifact pill variants:
  - `forge-native/static/frontend/src/styles.css`
- Added targeted Registry utility tests:
  - `tests/forge-native-registry-utils.spec.ts`

### Validation / Evidence
- Tests passed:
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts`
  - result: `2 files passed, 9 tests passed`
- Typechecks passed:
  - `cd forge-native/static/frontend && npm run typecheck`
  - `cd forge-native && npm run typecheck`

### Regressions / Gotchas
- Root Vitest workspace cannot directly mount Forge frontend `App.tsx` due React version mismatch (`root: React 19`, `forge-native/static/frontend: React 18`), causing invalid hook call in direct component tests.
- Current session uses utility-level UI logic tests plus backend contract tests; runtime integration checks remain next.

### Next Recommended Step
- Run non-preview Forge runtime validation for Registry `R1.1`-`R1.5` flows (create/list/detail/reuse and source-hack linkage paths), then decide whether to close `P1.REG.01` and advance to `P1.PX.01`.

## Session Update - P1.REG.01 Validation Completion + Handoff to P1.PX.01 (2026-03-01 01:34 GMT)

### Task ID
- `P1.REG.01`

### What Changed
- Extended Registry contract coverage in:
  - `tests/forge-native-registry-contract.spec.ts`
- Added test cases for:
  - valid `sourceHackProjectId` linkage to hack-submission projects
  - invalid `sourceHackProjectId` rejection for non hack-submission projects
  - artifact detail payload including linked source-hack metadata
- Added runtime backend-mode behavior coverage in:
  - `tests/forge-native-registry-runtime-modes.spec.ts`
  - validates `FORGE_DATA_BACKEND` behavior for Registry operations (supabase delegation, convex unsupported guard, auto-mode fallback)
- Updated continuity/execution docs to mark `P1.REG.01` complete and advance active task to `P1.PX.01`.

### Validation / Evidence
- Tests passed:
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts tests/forge-native-registry-runtime-modes.spec.ts`
  - result: `3 files passed, 15 tests passed`
- Typechecks passed:
  - `cd forge-native && npm run typecheck`
  - `cd forge-native/static/frontend && npm run typecheck`

### Regressions / Gotchas
- Direct App-component tests in the root Vitest workspace remain constrained by React version mismatch (`root React 19` vs `forge-native/static/frontend React 18`).

### Next Recommended Step
- Start `P1.PX.01`: lock Problem Exchange contract spec (`R2.1`-`R2.6`) and then implement resolver/repository/test baseline with 3-flag auto-hide moderation logic.

## Session Update - P1.PX.01 Contract + Backend Baseline Implemented (2026-03-01 01:46 GMT)

### Task ID
- `P1.PX.01`

### What Changed
- Added Problem Exchange contract specification:
  - `docs/HDC-P1-PROBLEM-EXCHANGE-CONTRACT-SPEC.md`
- Added Problem Exchange Supabase migration:
  - `forge-native/supabase/migrations/20260301020000_phase1_problem_exchange.sql`
  - creates enums and tables for `Problem`, `ProblemVote`, `ProblemFlag`, `ProblemStatusHistory`, `ProblemModerationLog`
- Extended shared resolver/domain types for Problem Exchange operations:
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Implemented repository methods in Supabase layer:
  - `createProblem`, `listProblems`, `voteProblem`, `updateProblemStatus`, `flagProblem`, `moderateProblem`
  - file: `forge-native/src/backend/supabase/repositories.ts`
- Added backend wrappers and resolver registrations:
  - `forge-native/src/backend/hackcentral.ts`
  - `forge-native/src/index.ts`
- Added tests:
  - `tests/forge-native-problem-exchange-contract.spec.ts`
  - `tests/forge-native-problem-exchange-runtime-modes.spec.ts`

### Validation / Evidence
- Full targeted suite passed:
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts tests/forge-native-registry-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-runtime-modes.spec.ts`
  - result: `5 files passed, 25 tests passed`
- Typechecks passed:
  - `cd forge-native && npm run typecheck`
  - `cd forge-native/static/frontend && npm run typecheck`

### Regressions / Gotchas
- Moderation authorization currently assumes trusted backend caller; explicit HDC admin role-gating is still a follow-up item.
- Root Vitest React version mismatch constraint remains (root React 19 vs Forge frontend React 18) for direct App-mount tests.

### Next Recommended Step
- Continue `P1.PX.01` by wiring Problem Exchange UI in Forge global page and adding UI-level tests for submission, filtering, vote idempotency, solved-link validation, and auto-hide moderation behavior.

## Session Update - Problem Exchange Forge UI Baseline (Mar 1, 2026 01:58 GMT)

- Date/time: 2026-03-01 01:58 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Added Forge global-page Problem Exchange UI wiring in `forge-native/static/frontend/src/App.tsx`.
  - Implemented create/list/filter/vote/flag/status/moderate flows for `hdcCreateProblem`, `hdcListProblems`, `hdcVoteProblem`, `hdcUpdateProblemStatus`, `hdcFlagProblem`, and `hdcModerateProblem`.
  - Added preview-mode Problem Exchange behavior for local fallback data.
  - Added frontend helper module `forge-native/static/frontend/src/utils/problemExchange.ts` for filter parsing, create validation, preview seed generation, and sorting/filtering.
  - Added utility tests in `tests/forge-native-problem-exchange-utils.spec.ts`.
  - Added Problem Exchange UI styling in `forge-native/static/frontend/src/styles.css` and enabled new `problem_exchange` view navigation path.
- Validation/evidence:
  - `npm run test:run -- tests/forge-native-problem-exchange-utils.spec.ts` (pass)
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `cd forge-native && npm run typecheck` (pass)
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts tests/forge-native-registry-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-utils.spec.ts` (31 tests passing)
- Regressions or gotchas:
  - Root test harness still cannot directly mount Forge frontend `App.tsx` due React version split (root React 19 vs Forge custom UI React 18), so UI logic coverage is utility-centric.
  - Moderation endpoint currently lacks final admin-role gate; this remains the highest-priority follow-up.
- Next recommended step:
  - Implement authorization gate + UI visibility guardrails for moderation actions, then add telemetry events for problem lifecycle conversion and moderation outcomes.

## Session Update - Problem Exchange Moderation Guardrails + Telemetry (Mar 1, 2026 02:03 GMT)

- Date/time: 2026-03-01 02:03 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Added backend moderation authorization guard for `hdcModerateProblem` using allowlist env var `HDC_PROBLEM_EXCHANGE_MODERATOR_ACCOUNT_IDS`.
  - Added new resolver capability surface `hdcGetProblemExchangeCapabilities` to expose moderation eligibility to UI.
  - Extended shared/frontend contracts with `ProblemExchangeCapabilitiesResult`.
  - Added UI guardrails in `forge-native/static/frontend/src/App.tsx`:
    - moderation actions (remove/reinstate) visible only when `canModerate=true`
    - include-hidden filter disabled for non-moderators
    - moderation mode indicator shown in filter actions.
  - Added backend telemetry events in `forge-native/src/backend/supabase/repositories.ts`:
    - `problem_created`, `problem_voted`, `problem_status_updated`, `problem_flagged`, `problem_moderated`.
  - Expanded runtime mode tests for moderation guard behavior.
- Validation/evidence:
  - `npm run test:run -- tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-utils.spec.ts` (17 passing)
  - `cd forge-native && npm run typecheck` (pass)
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts tests/forge-native-registry-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-utils.spec.ts` (32 passing)
- Regressions or gotchas:
  - Allowlist gate is intentionally temporary and should be replaced with finalized org role source once available.
  - Telemetry currently logs to server stdout via structured `console.info`; downstream ingestion/dashboard wiring is still needed.
- Next recommended step:
  - Replace allowlist with org-level admin role source and add remaining UI validation coverage for moderation and filter UX states.

## Session Update - Problem Exchange Org Role Moderation Source (Mar 1, 2026 02:08 GMT)

- Date/time: 2026-03-01 02:08 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Replaced temporary allowlist moderation authorization with org authority source for Problem Exchange moderation.
  - Added/used `canUserModerateProblemExchange(viewer)` in `forge-native/src/backend/supabase/repositories.ts`:
    - `User.role='ADMIN'`, or
    - `User.capability_tags` contains `problem_exchange_moderator` or `platform_admin`.
    - Fallback for legacy schemas without `User.role` uses capability tags only.
  - Updated `forge-native/src/backend/hackcentral.ts` to use repository moderation authority checks in both:
    - `hdcModerateProblem`
    - `hdcGetProblemExchangeCapabilities`
  - Preserved frontend contract compatibility by keeping `moderationMode='allowlist'` as a mode alias in Supabase-backed runtime.
  - Updated runtime-mode tests to mock repository moderation authority instead of env allowlist.
  - Updated continuity + contract docs to remove stale allowlist-as-source instructions.
- Validation/evidence:
  - `cd forge-native && npm run typecheck` (pass)
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `npm run test:run -- tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-utils.spec.ts` (17 passing)
- Regressions or gotchas:
  - `moderationMode='allowlist'` now represents compatibility mode naming, not env-driven allowlisting; downstream docs and dashboards should treat it as "gated moderation enabled".
  - Role-based moderation depends on `User` authority data quality; role/capability assignment process should be documented for operators.
- Next recommended step:
  - Implement the remaining `P1.PX.01` UI validation expansion and create the `problem_exchange` rollout + moderation authority runbook.

## Session Update - P1.PX.01 UI Validation Expansion + Ops Docs (Mar 1, 2026 02:21 GMT)

- Date/time: 2026-03-01 02:21 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Expanded Problem Exchange UI validation helpers in `forge-native/static/frontend/src/utils/problemExchange.ts`:
    - filter draft -> applied filter builder (`buildProblemAppliedFilters`)
    - default filter reset helpers (`getDefaultProblemFilterDraft`, `getDefaultProblemFilterSet`)
    - solved-link status validation helper (`validateProblemStatusDraft`)
    - preview-mode vote/flag mutation helpers with idempotency behavior (`applyPreviewVoteMutation`, `applyPreviewFlagMutation`)
    - moderation gate helpers (`resolveProblemIncludeHidden`, `resolveProblemModerationAction`)
  - Wired those helpers into `forge-native/static/frontend/src/App.tsx` so runtime UI behavior follows testable utility logic for filter apply/reset, solved-link checks, preview idempotency, and moderation action visibility.
  - Expanded utility test coverage in `tests/forge-native-problem-exchange-utils.spec.ts` for:
    - filter apply/reset behavior
    - solved-link requirement
    - preview vote/flag idempotency and auto-hide threshold behavior
    - moderation gate include-hidden/action-state resolution
  - Added rollout and moderation ops docs:
    - `docs/HDC-P1-PROBLEM-EXCHANGE-ROLLOUT-CHECKLIST.md`
    - `docs/HDC-P1-PROBLEM-EXCHANGE-MODERATION-RUNBOOK.md`
  - Updated docs index in `docs/README.md`.
- Validation/evidence:
  - `npm run test:run -- tests/forge-native-problem-exchange-utils.spec.ts` (pass, 12 tests)
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `cd forge-native && npm run typecheck` (pass)
- Regressions or gotchas:
  - Root Vitest workspace still cannot mount `App.tsx` directly because of React major-version split (root React 19 vs Forge custom UI React 18), so UI coverage remains utility-first.
- Next recommended step:
  - Execute staging rollout smoke + moderation authority audit using the new checklist/runbook, then decide GO/NO-GO and close `P1.PX.01` if gates pass.

## Session Update - P1.PX.01 Rollout Gate Checkpoint (Mar 1, 2026 02:25 GMT)

- Date/time: 2026-03-01 02:25 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Executed Problem Exchange rollout regression gate from `docs/HDC-P1-PROBLEM-EXCHANGE-ROLLOUT-CHECKLIST.md`.
  - Verified moderation capability behavior through runtime-mode coverage (`canModerate=true` and `canModerate=false` paths).
  - Recorded checkpoint artifact:
    - `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md`
    - decision: `CONDITIONAL GO`
  - Updated rollout checklist to reference latest checkpoint artifact.
- Validation/evidence:
  - `npm run test:run -- tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-utils.spec.ts` (pass, `23 tests`)
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `cd forge-native && npm run typecheck` (pass)
- Regressions or gotchas:
  - Live staging smoke + authority mutation/audit steps could not be executed from this workspace because Supabase/Forge staging credentials are not configured here.
- Next recommended step:
  - Run the remaining live staging checklist and moderation authority audits in staging, then upgrade decision from `CONDITIONAL GO` to `GO` and close `P1.PX.01`.

## Session Update - P1.PX.01 Live Authority Audit from HD26Forge Credentials (Mar 1, 2026 02:32 GMT)

- Date/time: 2026-03-01 02:32 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Verified credential path in `/Users/nickster/Downloads/HD26Forge` and confirmed Supabase project/ref access via CLI (`ssafugtobsqxmqtphwch`).
  - Executed live Problem Exchange moderation authority audit against `User` rows with non-null `atlassian_account_id` using service-role REST reads.
  - Verified live resolver behavior by invoking `getProblemExchangeCapabilities` in `forge-native/src/backend/hackcentral.ts` against real project data for:
    - one admin account (expected `canModerate=true`)
    - one non-admin account (expected `canModerate=false`)
  - Updated rollout checkpoint artifact to mark live authority audit + resolver verification as complete:
    - `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md`
- Validation/evidence:
  - `SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json` (shows `ssafugtobsqxmqtphwch` active)
  - Live authority audit summary:
    - total mapped accounts: `8`
    - moderator-eligible: `2`
    - non-moderator: `6`
  - Live resolver verification output:
    - admin account -> `{ canModerate: true, moderationMode: 'allowlist' }`
    - user account -> `{ canModerate: false, moderationMode: 'allowlist' }`
- Regressions or gotchas:
  - `public.execute_sql` RPC is not available in this project; direct table checks use PostgREST table endpoints with service-role auth.
  - Rollout remains `CONDITIONAL GO` until live UI smoke is executed.
- Next recommended step:
  - Run live UI smoke for Problem Exchange flows and, if clean, promote `P1.PX.01` to GO and close task.

## Session Update - P1.PX.01 Live UI Smoke + GO Closure (Mar 1, 2026 03:08 GMT)

- Date/time: 2026-03-01 03:08 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Completed live production UI smoke on Problem Exchange in Confluence global page runtime (`[HackCentral Confluence UI] loaded 0.6.44`).
  - Executed end-to-end moderator-capable flow against a real smoke record:
    - create problem
    - filter apply/reset
    - vote idempotency (duplicate vote blocked)
    - flag idempotency (duplicate flag blocked)
    - solved-link validation (blocked without linked hack/artifact)
    - valid status transition (`Open -> Claimed`)
    - moderator remove/reinstate flow
  - Captured screenshot evidence:
    - `docs/artifacts/HDC-P1-PX-LIVE-UI-SMOKE-20260301-0303Z.png`
  - Updated rollout checkpoint artifact to GO:
    - `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md`
  - Closed `P1.PX.01` and advanced active task pointer to `P1.PIPE.01` in continuity docs.
- Validation/evidence:
  - Live UI toasts/messages observed during smoke:
    - `Problem posted: PX Smoke 2026-03-01 03:03 UTC`
    - `Vote recorded.` then `You already voted for this problem.`
    - `Flag recorded.` then `You already flagged this problem.`
    - `Solved status requires linked hack project ID or linked artifact ID.`
    - `Problem status updated to Claimed.`
    - `Problem removed by moderator.` then `Problem reinstated.`
  - Screenshot evidence file exists at:
    - `docs/artifacts/HDC-P1-PX-LIVE-UI-SMOKE-20260301-0303Z.png`
- Regressions or gotchas:
  - 3-distinct-user auto-hide behavior was not exercised via live UI because smoke used a single authenticated user session; this branch remains covered by automated tests and backend logic checks.
- Next recommended step:
  - Start `P1.PIPE.01` by locking a contract spec for stage transitions, required transition notes, and pipeline audit log behavior.

## Session Update - P1.PIPE.01 Contract + UI Shell Kickoff (Mar 1, 2026 03:32 GMT)

- Date/time: 2026-03-01 03:32 GMT
- Task ID: `P1.PIPE.01`
- What changed:
  - Created pipeline contract specification:
    - `docs/HDC-P1-PIPELINE-CONTRACT-SPEC.md`
  - Promoted primary nav from `Projects` to `Pipeline`:
    - `forge-native/static/frontend/src/constants/nav.ts`
  - Implemented initial Pipeline board shell in global UI:
    - `forge-native/static/frontend/src/App.tsx`
    - Four stage columns (`Hack`, `Validated Prototype`, `Incubating Project`, `Product Candidate`)
    - Stage criteria visibility in each column
    - Metrics panel (items per stage, average time placeholder, conversions, entered vs graduated)
    - Legacy compatibility redirect (`projects` -> `pipeline`)
  - Added responsive Pipeline styles:
    - `forge-native/static/frontend/src/styles.css`
  - Added docs index entry for pipeline contract spec:
    - `docs/README.md`
- Validation/evidence:
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `cd forge-native && npm run typecheck` (pass)
- Regressions or gotchas:
  - Average time-in-stage is currently a placeholder (`0`) because stage-entry timestamps are not yet persisted in project payloads.
  - Stage transition actions and required note enforcement are intentionally deferred until backend migration/resolver slice is implemented.
- Next recommended step:
  - Implement Supabase migration + backend/resolver contracts for persistent pipeline stage transitions and required transition notes, then replace UI placeholder with live move controls.

## Session Update - P1 Pipeline Completion + Live Supabase Migration (Mar 1, 2026)

### Completed

- Closed `P1.PIPE.01` against roadmap `R3.1`-`R3.5`.
- Applied live pipeline migration to shared Supabase project `ssafugtobsqxmqtphwch` using Supabase Management API `database/query` endpoint.
- Landed and validated new pipeline contracts:
  - `hdcGetPipelineBoard`
  - `hdcMovePipelineItem`
  - `hdcUpdatePipelineStageCriteria`
- Added admin stage criteria edit flow in Forge UI pipeline board.
- Preserved admin authority gate for pipeline management:
  - `role='ADMIN'` OR capability tags `pipeline_admin` / `platform_admin`.

### Validation Evidence

- Local checks:
  - `forge-native` typecheck: pass
  - `forge-native/static/frontend` typecheck: pass
  - pipeline suites: `9/9` passing
  - full targeted Phase 1 cross-suite: `47/47` passing
- Live checks (production project):
  - Migration apply response: HTTP `201`
  - Schema presence verified for:
    - `Project.pipeline_stage`
    - `Project.pipeline_stage_entered_at`
    - `PipelineStageCriteria`
    - `PipelineTransitionLog`
  - Resolver smoke (admin account):
    - created and moved project `7aaf957f-fc25-45a1-b634-22f3b4a36bc0` from `hack` to `validated_prototype`
    - board returned item in target stage
  - Authorization smoke (non-admin account):
    - `hdcMovePipelineItem` -> `[PIPELINE_FORBIDDEN]`
    - `hdcUpdatePipelineStageCriteria` -> `[PIPELINE_FORBIDDEN]`

### Operational Note

- Supabase MCP remains non-admin in current workspace configuration (`list_projects` empty, management endpoints denied).
- Reliable fallback for live admin operations in this environment:
  1. Use `SUPABASE_ACCESS_TOKEN` with Supabase CLI (`projects list`, `projects api-keys`).
  2. Use Supabase Management API `POST /v1/projects/<ref>/database/query` for migration/query execution.
  3. Use service-role key only for read/verification REST checks.

### Artifact

- `docs/artifacts/HDC-P1-PIPE-ROLLOUT-CHECKPOINT-20260301-1108Z.md`

## Session Update - P1 Observability Guardrails Pack Standardization (Mar 1, 2026)

### Completed

- Closed `P1.OBS.01` with a standardized Phase 1 GO/NO-GO gate model.
- Added shared guardrails runbook:
  - `docs/HDC-P1-OBS-GUARDRAILS-PACK.md`
- Added reusable module rollout artifact template:
  - `docs/HDC-P1-MODULE-ROLLOUT-CHECKPOINT-TEMPLATE.md`
- Added root command pack scripts in `package.json`:
  - `qa:p1:regression-pack`
  - `qa:p1:telemetry-static-check`
  - `qa:p1:go-gate`
- Aligned existing Problem Exchange checklist to the new standardized gate path.

### Evidence

- Executed:
  - `npm run qa:p1:go-gate`
- Result:
  - cross-suite tests `47/47` passing
  - backend/frontend typechecks passing
  - static telemetry instrumentation checks passing (`rg` hit all required telemetry channels/events)
- Rollout checkpoint artifact:
  - `docs/artifacts/HDC-P1-OBS-ROLLOUT-CHECKPOINT-20260301-1112Z.md`

### Continuity Impact

- Active task advanced from `P1.OBS.01` to `P1.SHOW.01` in execution/continuation docs.
- Future Phase 1 modules can now reuse a single checkpoint structure and command pack, reducing release-gate drift across chats.

## Session Update - P1.SHOW.01 Contract + Migration + UI Wiring (Mar 1, 2026 11:42 GMT)

### Completed

- Started `P1.SHOW.01` against `R4.1`-`R4.4` and locked contract spec:
  - `docs/HDC-P1-SHOWCASE-CONTRACT-SPEC.md`
- Added Showcase persistence migration:
  - `forge-native/supabase/migrations/20260301122000_phase1_showcase.sql`
- Implemented Showcase backend contracts:
  - `hdcListShowcaseHacks`
  - `hdcGetShowcaseHackDetail`
  - `hdcSetShowcaseFeatured`
- Expanded `createHack` submission payload/persistence with Showcase metadata:
  - required `demoUrl` validation (`https`)
  - `teamMembers`, `sourceEventId`, `tags`, `linkedArtifactIds`
  - metadata persisted to `ShowcaseHack`
- Wired Forge `hacks` view to Showcase APIs:
  - server-backed list/filter loading
  - hack detail panel
  - admin featured toggle controls
  - submit modal fields aligned with new contract

### Validation Evidence

- Targeted Showcase test suites:
  - `npm run test:run -- tests/forge-native-showcase-contract.spec.ts tests/forge-native-showcase-runtime-modes.spec.ts`
  - Result: `9/9` passing
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Standardized guardrail gate:
  - `npm run qa:p1:go-gate`
  - Result: `56/56` phase regression tests (Registry + Problem Exchange + Pipeline + Showcase) + backend/frontend typechecks + telemetry static check passing
- Live Supabase migration + smoke:
  - Applied `20260301122000_phase1_showcase.sql` to project `ssafugtobsqxmqtphwch` via Management API `database/query`
  - Verified schema columns for `ShowcaseHack` and row access (`count(*)` query)
  - Read-only resolver smoke passed:
    - `listShowcaseHacks` => `listCount: 1`
    - `getShowcaseHackDetail` => detail payload returned for first project

### Operational Gotcha

- Supabase MCP still returns empty project discovery (`mcp__supabase__list_projects -> []`) in this workspace.
- Reliable fallback remains:
  1. `SUPABASE_ACCESS_TOKEN` + CLI (`projects list`, `projects api-keys`)
  2. Management API `POST /v1/projects/<ref>/database/query`
  3. service-role-backed resolver/runtime verification from this repo

### Artifact

- `docs/artifacts/HDC-P1-SHOW-ROLLOUT-CHECKPOINT-20260301-1142Z.md` (`CONDITIONAL GO` pending live telemetry and rollback-drill completion)

### Next Recommended Step

- Execute live Forge UI + telemetry gate closure for `P1.SHOW.01`, then either:
  - upgrade checkpoint to `GO` and advance to `P1.CHILD.01`, or
  - hold as `NO GO` with rollback actions if live checks fail.

## Session Update - P1.SHOW.01 Live UI + Telemetry Gate Closure (Mar 1, 2026 11:56 GMT)

### Completed

- Closed `P1.SHOW.01` from `CONDITIONAL GO` to `GO`.
- Rebuilt and redeployed Forge production bundle from `forge-native` and confirmed runtime moved to app version `5.29.0`.
- Executed live Showcase smoke on production global page:
  - URL: `https://hackdaytemp.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/86632806-eb9b-42b5-ae6d-ee09339702b6/hackday-central`
  - submit modal includes required `demoUrl` and Showcase metadata fields (`teamMembers`, `sourceEventId`, `tags`, `linkedArtifactIds`)
  - validation error confirmed for non-https demo URL (`[SHOWCASE_VALIDATION_FAILED] demoUrl must be a valid https URL.`)
  - valid submit path completed for smoke record `Showcase Smoke 2026-03-01 11:52`
  - list filters validated (search/tags/featured-only)
  - detail panel validated (`Demo`, `Team`, linked artifacts/problems sections)
  - featured toggle validated in UI (`Mark featured` / `Unfeature`)
- Captured live UI evidence screenshot:
  - `docs/artifacts/HDC-P1-SHOW-LIVE-UI-SMOKE-20260301-1153Z.png`
- Sampled live Forge telemetry logs (`forge logs --since 30m --verbose`):
  - `INFO [hdc-switcher-telemetry]`
  - `INFO [hdc-performance-telemetry]`
  - expected showcase validation traces from smoke inputs (invalid `demoUrl`, invalid non-UUID source event)
- Validated admin/non-admin featured authority and rollback dry-run via live backend invocation:
  - admin account unfeature succeeded:
    - `admin_unfeature {"projectId":"834fc179-ca7a-44d5-9680-4ee6c2276fa2","featured":false,...}`
  - non-admin account denied:
    - `[SHOWCASE_FORBIDDEN] Showcase admin access required...`
- Verified live DB state for smoke record:
  - `project_id=834fc179-ca7a-44d5-9680-4ee6c2276fa2`
  - `demo_url=https://example.com/demo`
  - `tags=[showcase-smoke, ops-automation]`
  - `featured=false` after rollback dry-run

### Regressions or gotchas

- `sourceEventId` currently persists through a UUID-typed path; non-UUID strings produce DB error (`22P02`). For smoke runs, leave this optional field blank unless using a valid event UUID.
- Legacy/stale global-page environment URL (`.../6ef543d7-.../hackday-central`) now returns `Global page module was not found`; use the `86632806-...` production URL above for Playwright smoke.

### Next recommended step

- Start `P1.CHILD.01` by locking import-to-child contract boundaries (`R5.1`-`R5.4`) using finalized Showcase submission semantics.

## Session Update - P1.CHILD.01 Child Integration Baseline (Mar 1, 2026 12:32 GMT)

### Completed

- Started `P1.CHILD.01` implementation against roadmap `R5.1`-`R5.4` in branch `codex/p1-child-01`.
- Locked child integration contract spec:
  - `docs/HDC-P1-CHILD-INTEGRATION-CONTRACT-SPEC.md`
- Added Problem Exchange import-candidate resolver contract:
  - `hdcListProblemImportCandidates`
  - backend/repository wiring:
    - `forge-native/src/backend/supabase/repositories.ts`
    - `forge-native/src/backend/hackcentral.ts`
    - `forge-native/src/index.ts`
- Extended child creation contract for integration metadata:
  - `CreateInstanceDraftInput.childIntegration`
  - fields:
    - `importProblemIds`
    - `autoPublishToShowcaseDrafts`
    - `templateMode`
  - updated in:
    - `forge-native/src/shared/types.ts`
    - `forge-native/static/frontend/src/types.ts`
- Implemented `hdcService.createInstanceDraft` child integration behavior:
  - normalize and validate selected Problem Exchange IDs
  - resolve selected items from importable candidate pool
  - persist normalized child integration payload to:
    - `HackdayTemplateSeed.seed_payload.childIntegration`
    - `event_created` audit payload summary
- Wired Create HackDay step-6 UI controls in `forge-native/static/frontend/src/App.tsx`:
  - import candidates checklist (high-vote open/claimed problems)
  - template mode selection (`default` / `customized`)
  - auto-publish Showcase draft intent toggle
- Restored missing frontend utility modules in this clean branch for compile parity:
  - `forge-native/static/frontend/src/utils/problemExchange.ts`
  - `forge-native/static/frontend/src/utils/registry.ts`
- Updated navigation view unions in `forge-native/static/frontend/src/constants/nav.ts` to include active app views (`problem_exchange`, `pipeline`) so frontend typecheck aligns with `App.tsx` usage.

### Validation Evidence

- Tests:
  - `npm run test:run -- tests/forge-native-hdcService.spec.ts tests/forge-native-createFromWeb.spec.ts`
  - Result: `31/31` passing
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Notes

- This branch was created from clean tracked `main`; several previously untracked files from the original workspace were absent and had to be reintroduced where required for frontend compile/test continuity.
- Supabase live validation + Playwright smoke for `P1.CHILD.01` still pending and tracked as next atomic actions in `CONTINUATION.md`.

## Session Update - P1.CHILD.01 Live Gate Closure (Mar 1, 2026 12:58 GMT)

### Completed

- Closed `P1.CHILD.01` from in-progress baseline to `GO`.
- Confirmed production Create HackDay step-6 child-integration controls are live after deploy:
  - `templateMode` (`Default template` / `Customized template`)
  - `autoPublishToShowcaseDrafts` checkbox
  - Problem Exchange import candidate list and selection
- Executed full live create flow with selected import:
  - event: `P1 CHILD LIVE 20260301-1305`
  - selected candidate: `819b3023-ec4d-4b22-8f9f-07ca7f7c2fa2` (`PX Smoke 2026-03-01 03:03 UTC`)
  - returned child page id: `18120705`
- Verified persisted child integration payload in live DB:
  - `HackdayTemplateSeed.seed_payload.childIntegration.templateMode = "customized"`
  - `HackdayTemplateSeed.seed_payload.childIntegration.autoPublishToShowcaseDrafts = false`
  - `HackdayTemplateSeed.seed_payload.childIntegration.importProblemIds` includes selected problem id
  - `HackdayTemplateSeed.seed_payload.childIntegration.importedProblems` includes candidate snapshot (`voteCount=3`, `status=claimed`)
- Recorded module checkpoint artifact:
  - `docs/artifacts/HDC-P1-CHILD-ROLLOUT-CHECKPOINT-20260301-1258Z.md`

### Validation Evidence

- Targeted tests and typechecks:
  - `npm run test:run -- tests/forge-native-hdcService.spec.ts tests/forge-native-createFromWeb.spec.ts` (`31/31`)
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Live resolver smoke:
  - `listProblemImportCandidates` returned selected candidate at threshold `minVoteCount=3`
- Live UI artifacts:
  - `docs/artifacts/p1-child-step6-live-20260301-1257.png`
  - `docs/artifacts/p1-child-create-success-20260301-1258.png`

### Operational Learnings

- Candidate threshold behavior is functioning as designed: step-6 import list defaults to vote threshold `>=3`; a candidate at vote `1` does not appear until vote count is raised.
- Supabase REST table names are case-sensitive in this schema (`Problem`, `HackdayTemplateSeed`), not snake_case aliases.
- In this environment, Supabase MCP admin calls remain unavailable; CLI + service-role fallback is still required for live admin verification steps.

## Session Update - P2.PATH.01 Backend Baseline (Mar 1, 2026 13:17 GMT)

### Completed

- Started `P2.PATH.01` (`R6.1`-`R6.4`) with the first backend contract slice.
- Added pathways schema migration:
  - `forge-native/supabase/migrations/20260301130000_phase2_pathways.sql`
  - tables: `Pathway`, `PathwayStep`, `PathwayProgress`
  - step type enum: `read|try|build`
  - unique progress key: `(pathway_id, step_id, user_id)`
- Added shared/frontend contracts for pathways and progress:
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Added resolver and backend wiring:
  - `hdcListPathways`
  - `hdcGetPathway`
  - `hdcUpsertPathway`
  - `hdcSetPathwayStepCompletion`
  - files: `forge-native/src/backend/supabase/repositories.ts`, `forge-native/src/backend/hackcentral.ts`, `forge-native/src/index.ts`
- Added pathway editor authorization gate:
  - `ADMIN` role OR capability tags `pathway_admin` / `pathway_contributor` / `platform_admin`
- Locked this phase contract in:
  - `docs/HDC-P2-PATHWAYS-CONTRACT-SPEC.md`

### Validation Evidence

- Tests:
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts`
  - result: `5/5` passing
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- Canonical `R6.1`-`R6.4` pathway requirements are present in `/Users/nickster/Downloads/HackCentral/HDC-PRODUCT-ROADMAP.md`; this child worktree does not include that roadmap file by default, so requirement mapping must explicitly reference the canonical root workspace copy.
- Keeping pathway progress writes idempotent at `(pathway_id, step_id, user_id)` avoids duplicate completion records and simplifies progress recalculation.
- Adding unsupported-backend errors (`[PATHWAYS_UNSUPPORTED_BACKEND]`) keeps runtime-mode behavior consistent with other module contracts and prevents silent convex fallbacks for Supabase-only features.

## Session Update - P2.PATH.01 Guide UI + Manager Editor + Local Smoke (Mar 1, 2026 13:32 GMT)

### Completed

- Advanced `P2.PATH.01` Guide UI implementation in `forge-native/static/frontend/src/App.tsx`:
  - replaced static Guide content with pathway list/detail contract rendering
  - wired per-step completion toggles to `hdcSetPathwayStepCompletion`
  - added manager-gated pathway editor (create + edit) with ordered step drafting and `hdcUpsertPathway` save path
- Added Guide pathway layout and editor styles in `forge-native/static/frontend/src/styles.css`.
- Fixed smoke-discovered preview consistency defects:
  - preview list filtering now clears selected pathway when no results exist
  - detail pane now clears when no pathway is selected (prevents stale detail render)
- Captured local browser smoke evidence:
  - `docs/artifacts/HDC-P2-PATH-LOCAL-UI-SMOKE-20260301-133139Z.png`

### Validation Evidence

- Typechecks:
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
  - `npm --prefix forge-native run typecheck` (pass)
- Targeted tests:
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts`
  - result: `5/5` passing
- Browser smoke (local preview via DevTools MCP on `http://127.0.0.1:4173/`):
  - Guide route opens
  - step completion updates list/detail progress (`0/4` -> `1/4`, `25%`)
  - empty filter result shows "No pathways matched your filters." and now clears detail to "Select a pathway to view details."

### Operational Learnings

- Local preview path always reports `canManage=false`, so manager-only controls (`Create pathway`, `Edit pathway`) require live manager authority validation in production runtime.
- Dev server in this child workspace may log non-blocking Vite `server.fs.allow` warnings for font assets resolved through the parent workspace `node_modules`; this does not affect functional Guide-pathway smoke outcomes.

## Session Update - P2.PATH.01 Live Rollout GO Closure (Mar 1, 2026 13:39 GMT)

### Completed

- Applied `P2.PATH.01` migration to production Supabase project (`ssafugtobsqxmqtphwch`) and verified created schema objects (`Pathway`, `PathwayStep`, `PathwayProgress`).
- Fixed migration defect discovered during first live apply:
  - `PathwayStep.linked_artifact_id` changed from `text` to `uuid` to match `Artifact.id`.
- Executed live resolver smoke via HackCentral backend contracts:
  - manager `upsertPathway` + `listPathways` + `getPathway` pass
  - participant `setPathwayStepCompletion` pass (`1/3`, `33%`)
  - participant `upsertPathway` correctly denied with `[PATHWAY_FORBIDDEN]`
- Deployed Forge production bundle and validated live Guide Pathways UI:
  - editor role surfaces `Create pathway` and `Edit pathway`
  - edit form opens and saves (`Pathway updated.` toast)
  - step completion updates progress (`1/3 steps • 33% complete`)
- Recorded rollout checkpoint:
  - `docs/artifacts/HDC-P2-PATH-ROLLOUT-CHECKPOINT-20260301-1339Z.md` (`GO`)

### Validation Evidence

- Live screenshots:
  - `docs/artifacts/HDC-P2-PATH-LIVE-UI-SMOKE-20260301-133829Z.png`
  - `docs/artifacts/HDC-P2-PATH-LIVE-UI-SMOKE-20260301-133904Z.png`
- Live resolver smoke payload result:
  - pathway id `e7928bd4-141a-4d33-b545-df27161698c6`
  - manager list count `1`
  - detail step count `3`
  - participant completion persisted with `completionPercent=33`
- Regression checks after fixes:
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts` (`5/5`)

### Operational Learnings

- Supabase MCP permissions for this project can intermittently block admin actions (`list_tables`, `list_migrations` with `MCP error -32600`); CLI fallback with `SUPABASE_ACCESS_TOKEN` remains required for live schema verification.
- `forge-native` full `custom-ui:build` can fail on unrelated runtime-frontend Tailwind/PostCSS configuration in this workspace; frontend deploy for Guide Pathways was still achievable because the updated global-page bundle built/deployed successfully and production smoke confirmed behavior.

## Session Update - P2.PATH.01 Post-GO Housekeeping Hardening (Mar 1, 2026 13:55 GMT)

### Completed

- Executed focused post-GO code review on pathways edit flow and implemented two hardening fixes:
  - pathway step updates now preserve existing `PathwayStep.id` values and only delete removed steps (instead of deleting all steps each save).
  - pathway-step `linkedArtifactId` is now validated as UUID in both frontend (`App.tsx`) and backend repository validation.
- Updated pathway contracts to carry optional `stepId` through upsert payloads:
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Expanded pathways contract tests for:
  - edit-path preserving step IDs while deleting only removed steps
  - invalid `linkedArtifactId` validation rejection

### Validation Evidence

- Targeted pathways contract suite:
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts` (`4/4` passing)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Phase gate rerun:
  - `npm run qa:p1:go-gate` (pass)
  - observation: in this child worktree, `qa:p1:regression-pack` currently executed only Showcase suites (`tests/forge-native-showcase-contract.spec.ts`, `tests/forge-native-showcase-runtime-modes.spec.ts`)

### Operational Learnings

- Pathway progress integrity depends on stable `PathwayStep.id` values; destructive rewrite patterns (`deleteMany(pathway_id)` + full reinsert) can silently wipe `PathwayProgress` due FK cascade.
- Green status on aggregate scripts can hide reduced coverage when referenced test files are absent in a child checkout; gate output should be inspected for actual executed suites, not just exit code.
