# LEARNINGS.md - HackCentral Session Notes

**Last Updated:** February 28, 2026

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

**Version:** 0.6.34 (root app)
**Forge UI Cache-Busters:** 0.6.21 (`HACKCENTRAL_UI_VERSION` / `HACKCENTRAL_MACRO_VERSION`)
**Tech Stack:** React 19 + TypeScript + Vite + Convex + Forge Native

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

- None identified in recent work
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
