# Schedule Builder V2 - Continuation File

**Last Updated:** 2026-02-24
**Last Commit:** b0b4ac6
**UI Version:** 0.6.0

## What Was Done

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

- **Production deployed:** Version 0.6.0
- **Working:** Phase tabs, event toggles, offset/time inputs, signal colors
- **Removed:** Duplicate navigation buttons from footer

## Architecture Decisions

1. **Plain objects** instead of Map for `eventStates` (better serialization)
2. **Inline sub-components** in ConfigStrip (no separate files for Duration/Anchor/Timezone)
3. **Footer navigation removed** - Wizard handles step progression, phase tabs handle phase navigation

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
   forge deploy --environment production --no-verify
   forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence
   ```

4. **Local Testing** - Localhost doesn't work well because Forge requires Confluence context. Use `forge tunnel` for local development.

## Reference Files

- `SCHEDULE_BUILDER_V2_PLAN.md` - Original implementation plan
- `SCHEDULE-BUILDER-PROMPT.md` - Requirements and guidance
- `schedule-builder-v5.jsx` - Prototype reference (not production code)
- `.claude/instructions.md` - Project context and deployment notes

## Quick Start for Next Session

```
Read .claude/instructions.md
Read SCHEDULE_BUILDER_V2_CONTINUATION.md
```

Then tell me what to work on:
- "Continue with Phase 2 - custom events"
- "Build the Preview page (Phase 3)"
- "Fix [specific issue]"
