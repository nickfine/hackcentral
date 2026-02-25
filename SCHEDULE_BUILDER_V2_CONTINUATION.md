# Schedule Builder V2 - Continuation File

**Last Updated:** 2026-02-25
**UI Version:** 0.6.2
**Status:** Debug logging removed, deployed, but user seeing cached version

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

- **Production deployed:** Version 0.6.2
- **Working:** Phase tabs, event toggles, offset/time inputs, signal colors
- **Fixed:** Removed debug logging spam
- **Caveat:** User may need incognito window to see latest version

## What's NOT Done (Phase 2 & 3)

### Phase 2: Custom Events & Timeline Polish
- [ ] Custom event creation (button exists, handler is stubbed)
- [ ] Custom event editing/deletion
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
   forge deploy --no-verify
   ```

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
