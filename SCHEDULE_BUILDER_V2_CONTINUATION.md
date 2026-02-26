# Schedule Builder V2 - Continuation File

**Last Updated:** 2026-02-26
**UI Version:** 0.6.8
**Status:** Phase 1 + Phase 2 shipped; child-page custom-event milestone generation + resync shipped; Phase 3 preview page and exact signal-color parity remain

## URGENT: Console Log Spam Issue

### Problem
User was seeing massive console.log spam from `[ScheduleBuilderV2]` logs firing on every render. These logs were in the `buildOutputPayload` function which runs on every state change via useEffect.

### What Was Done
1. **Removed all debug console.log statements** from:
   - `static/frontend/src/components/schedule-builder-v2/index.tsx`
   - `static/macro-frontend/src/components/schedule-builder-v2/index.tsx`

2. **Verified built bundles contain ZERO `ScheduleBuilderV2` log strings**

3. **Deployed version 0.6.2** with clean bundles

### The Remaining Issue
User is still seeing spam because **browser/CDN is serving cached bundles**. The new bundles are:
- Frontend: `index-DxTN3BXY.js`
- Macro: `index-CXO6lhGb.js`

### To Fix (User Action Required)
1. **Open incognito/private browser window** - bypasses all cache
2. OR clear browser cache completely
3. OR wait for CDN cache to expire

If user still sees old bundle hash (like `index-D1qzAkCI.js`), they're on cached version.

---

## What Was Done Previously

### Phase 1 Complete: Core Schedule Builder V2

Implemented a new phase-based schedule builder to replace the old cascade-based single-page form.

#### Files Created (22 files total - 11 in each frontend)

**In both `static/frontend/` and `static/macro-frontend/`:**

```
src/types/scheduleBuilderV2.ts           # Type definitions
src/schedule-builder-v2/scheduleEvents.ts # Event definitions + helpers
src/schedule-builder-v2/signalStyles.ts   # Signal color system
src/components/schedule-builder-v2/
├── index.tsx                             # Main component
├── ConfigStrip.tsx                       # Duration/Anchor/Timezone
├── PhaseTabBar.tsx                       # Phase tab navigation
├── PhaseContent.tsx                      # Event list for active phase
├── EventCard.tsx                         # Individual event row
├── TimelineMinimap.tsx                   # Footer with timeline bar
└── styles.css                            # All component styles
```

#### Key Features Implemented

1. **ConfigStrip** - Teal panel with:
   - Duration selector (1d/2d/3d buttons)
   - Anchor date + time pickers
   - Timezone dropdown

2. **PhaseTabBar** - Horizontal tabs:
   - Pre-Event (milestones before hack)
   - Hack Day 1/2/3 (based on duration)

3. **EventCard** - Signal-colored cards with:
   - Toggle checkbox to enable/disable
   - Offset input for pre-event (days before anchor)
   - Time picker for hack day events
   - Signal colors: teal (start), red (deadline), orange (ceremony), pink (presentation), blue (judging)

4. **TimelineMinimap** - Footer with:
   - Clickable timeline bar showing phases
   - Status text (event count, phase position)
   - NO navigation buttons (removed to avoid duplication with wizard)

5. **Integration** - Both frontends updated:
   - `App.tsx` imports `ScheduleBuilderV2`
   - Wizard Step 2 uses V2 instead of old ScheduleBuilder
   - Output syncs timezone/duration back to wizard state

## Current State

- **Production deployed:** UI cache-busters `0.6.8` (frontend + macro)
- **Working:** Phase tabs, event toggles, offset/time inputs, signal colors
- **Fixed:** Removed debug logging spam
- **Completed (Phase 2 UI):** Custom event create / edit / delete shipped in both frontends
- **Completed (child Schedule rendering path):**
  - `customEvents` preserved in `Event.event_schedule` and `HackdayTemplateSeed.seed_payload.schedule`
  - custom events converted to milestones during child-page creation for both HackCentral runtimes (`hdc_native`, `hackday_template`)
  - existing-page backfill/resync action added (`resync_schedule_milestones`)
- **Remaining caveat:** exact signal-color parity on the child Schedule page is not implemented yet (colors are phase-mapped)
- **Caveat:** User may need incognito window to see latest version

## Remaining Work (Phase 3 + Follow-up Polish)

### Phase 2 Follow-ups (Optional / Nice-to-have)
- [ ] Drag-to-reorder (cut from MVP - may not be needed)
- [ ] Timeline minimap visual improvements

### Phase 3: Preview Page
- [ ] SchedulePreview component
- [ ] Multi-column layout matching HackDay schedule page
- [ ] Hacking filler blocks (auto-generated blocks between events)
- [ ] Final review before wizard completion

## Known Issues / Notes

1. **CDN Caching** - Bump version in both App.tsx files when deploying:
   - `static/frontend/src/App.tsx` - `HACKCENTRAL_UI_VERSION`
   - `static/macro-frontend/src/App.tsx` - `HACKCENTRAL_MACRO_VERSION`

2. **Two Frontends** - HackCentral has TWO separate UI bundles:
   - `static/frontend/` - Global page (HackDays dashboard)
   - `static/macro-frontend/` - Confluence macro (embedded in pages)
   - **Both need updates** when changing wizard components

3. **Deployment Commands:**
   ```bash
   cd forge-native
   npm run custom-ui:build
   forge deploy --environment production --no-verify
   ```

4. **Prod-only workflow** - Keep Forge deploys simple and explicit:
   - Use production only (`--environment production`)
   - Do not rely on the active/default Forge environment

4. **Local Testing** - Localhost doesn't work well because Forge requires Confluence context. Use `forge tunnel` for local development.

## Quick Start for Next Session

```
Read .claude/instructions.md
Read SCHEDULE_BUILDER_V2_CONTINUATION.md
```

Then tell me what to work on:
- "Continue with Phase 2 - custom events"
- "Build the Preview page (Phase 3)"
- "Fix [specific issue]"

---

## Update (Feb 26, 2026) - Phase 2 UI + Child Schedule Rendering

### Phase 2 (Custom Events UI) - Shipped

Implemented in **both** HackCentral frontends:
- `forge-native/static/frontend/.../schedule-builder-v2/`
- `forge-native/static/macro-frontend/.../schedule-builder-v2/`

What shipped:
- Custom event create / edit / delete
- Explicit confirm flow for new custom events
- Confirmed custom events collapse into inline rows
- Inline ordering by phase timepoint (pre-event offset / hack-day time)

### Backend Milestone Generation for Custom Events - Shipped

Custom events now generate Schedule-page milestones in HackCentral backend during child-page creation:
- File: `forge-native/src/backend/hdcService.ts`

Important scope update:
- Initial implementation was `hdc_native`-only
- **Current production behavior includes BOTH HackCentral child runtimes:**
  - `hdc_native`
  - `hackday_template`

This still does **not** modify original HD26Forge code directly; it changes HackCentral's milestone generation before child pages render.

### Existing Child Pages (Retroactive Fix) - Resync Action Added

Existing already-created child pages do not update automatically. A production ops webtrigger action was added to rebuild milestones from stored `event_schedule`:
- Ops file: `forge-native/src/ops.ts`
- Action: `resync_schedule_milestones`
- Webtrigger key: `phase5-migration-wt`

Resync behavior:
- Deletes existing milestones for the event
- Recreates milestones from the saved schedule (standard + custom events)
- Skips events with no custom events

Example usage (production):

```bash
cd forge-native
forge webtrigger create -f phase5-migration-wt -e production -p Confluence -s <site>.atlassian.net

curl -X POST "<WEBTRIGGER_URL>" \
  -H "Content-Type: application/json" \
  -d '{"action":"resync_schedule_milestones","eventId":"<hdc_event_id>"}'
```

### Signal Colors on Child Schedule Page (Important Caveat)

Custom event **signal colors are not transferred exactly** to the child Schedule page yet.

Current behavior:
- HackCentral custom event `signal` is mapped to a milestone `phase`
- Child Schedule page colors cards by `phase` (not original `signal`)

So users get:
- Correct time placement ✅
- Correct phase grouping ✅
- Approximate color semantics via phase mapping ✅
- Exact signal color parity (ceremony/presentation/judging palette) ❌

This requires a separate "proper fix" (persist signal metadata + child Schedule renderer support).

### Current Production Status (Feb 26)

- Phase 2 custom events UI: deployed
- Custom-event milestone generation on child pages: deployed
- Existing-page milestone resync action: deployed

### Next Recommended Work

1. Plan proper signal-color parity fix (child Schedule page)
2. Decide metadata path (`signal` on milestone or milestone metadata)
3. Implement renderer fallback behavior (`signal` -> style, else `phase`)
