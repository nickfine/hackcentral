# Schedule Builder V2 - Implementation Plan

## Executive Summary

Complete redesign of the HackDay creation wizard Step 2 (Schedule). Replaces the current cascade-based single-page form with a phase-by-phase workflow featuring tabbed navigation, visual signal system, and a preview page with auto-generated schedule visualization.

**Scope:** HackCentral wizard Step 2 only (both frontend and macro)
**Estimated Components:** 15+ new files
**Backward Compatibility:** Backend payload structure remains unchanged

---

## 1. Architecture Overview

### 1.1 Current vs. New

| Aspect | Current (Cascade Model) | New (Phase Builder) |
|--------|-------------------------|---------------------|
| **Navigation** | Single page, vertical scroll | Tabbed phases (Pre-Event, Day 1, Day 2, Day 3) |
| **User Flow** | Pick anchor → all phases auto-calculate | Build phase-by-phase → preview → next step |
| **Input Types** | datetime-local for all phases | Relative offsets (pre-event), time pickers (hack days) |
| **Visual System** | Minimal styling, icons | Signal colors (teal/red/neutral + ceremony/presentation/judging) |
| **Customization** | Override + reset per phase | Add custom events, drag to reorder, assign signals |
| **Preview** | None (direct to Step 3) | Multi-column schedule preview with hacking fillers |

### 1.2 Data Flow

```
User Config Strip (Duration, Anchor, Timezone)
         ↓
Phase Selection (Tabs: Pre-Event, Day 1, Day 2, Day 3)
         ↓
Event Configuration (Toggle, Offset/Time, Custom Events)
         ↓
Schedule State (enabledEvents, eventTimes, customEvents)
         ↓
Preview Page (Multi-column, Hacking Fillers)
         ↓
Wizard Payload (Same structure as before)
```

### 1.3 Component Hierarchy

```
ScheduleBuilderV2/
├── ConfigStrip
│   ├── DurationSelector (1d/2d/3d buttons)
│   ├── AnchorPicker (date + time)
│   └── TimezoneSelector (dropdown)
├── PhaseTabBar
│   └── PhaseTab[] (Pre-Event, Day 1, Day 2, Day 3)
├── PhaseContent
│   ├── PhaseHeader (title, date, description)
│   ├── EventList
│   │   └── EventCard[] (toggle, name, desc, offset/time, signal color)
│   └── AddCustomEventButton
├── TimelineMinimap (sticky footer)
│   ├── PhaseSegments[] (visual timeline)
│   └── NavigationButtons (prev phase, next phase)
└── SchedulePreview (separate page/step)
    ├── PreEventColumn (milestone cards)
    ├── HackDayColumn[] (timed event cards + hacking fillers)
    └── PreviewActions (Edit, Back, Next)
```

---

## 2. File Structure

### 2.1 New Files to Create

**Core Components:**
```
/forge-native/static/macro-frontend/src/components/schedule-builder-v2/
├── index.tsx                          # Main ScheduleBuilderV2 component
├── ConfigStrip.tsx                    # Duration, anchor, timezone
├── PhaseTabBar.tsx                    # Horizontal phase tabs
├── PhaseContent.tsx                   # Current phase event list
├── EventCard.tsx                      # Individual event row
├── TimelineMinimap.tsx                # Sticky footer timeline
├── AddCustomEventButton.tsx           # "Add custom event" button
├── CustomEventEditor.tsx              # Inline custom event form
├── SchedulePreview.tsx                # Preview page with columns
└── styles.css                         # Component styles
```

**Data & Logic:**
```
/forge-native/static/macro-frontend/src/schedule-builder-v2/
├── scheduleEvents.ts                  # Event definitions with signals
├── scheduleState.ts                   # State management utilities
├── scheduleCalculations.ts            # Date/time calculations
├── signalStyles.ts                    # Color system utilities
└── hackingFillers.ts                  # Auto-generate hacking blocks
```

**Types:**
```
/forge-native/static/macro-frontend/src/types/
└── scheduleBuilderV2.ts               # Type definitions
```

### 2.2 Files to Modify

```
/forge-native/static/macro-frontend/src/
├── App.tsx                            # Replace ScheduleBuilder with ScheduleBuilderV2
├── types.ts                           # Add new types (keep existing)
└── styles.css                         # Add schedule-builder-v2 styles
```

### 2.3 Files to Keep (Unchanged)

```
/forge-native/static/macro-frontend/src/
├── ScheduleBuilder.tsx                # Keep as fallback during development
├── cascadeSchedule.ts                 # Keep timezone utilities
├── EventSelectionPanel.tsx            # Archive (not used in new design)
└── scheduleEvents.ts (original)       # Archive (replaced by v2 version)
```

---

## 3. Type Definitions

### 3.1 Core Types

```typescript
// /forge-native/static/macro-frontend/src/types/scheduleBuilderV2.ts

export type EventDuration = 1 | 2 | 3;

export type EventSignal =
  | 'start'       // Teal - openings, begins
  | 'deadline'    // Red - closings, due dates
  | 'ceremony'    // Orange/Amber - kickoffs, awards
  | 'presentation'// Pink - presentations
  | 'judging'     // Blue - judging period
  | 'neutral';    // Gray - everything else

export type PhaseType = 'pre-event' | 'hack-day';

export type PhaseKey = 'pre' | `hack-${number}`;

export interface EventDefinition {
  id: string;
  name: string;
  description: string;
  signal: EventSignal;
  phase: PhaseType;

  // Pre-event fields
  defaultOffsetDays?: number;  // -14 = 14 days before anchor

  // Hack day fields
  defaultTime?: string;        // HH:MM format
  lastDayOnly?: boolean;       // Only show on final hack day

  // Conditional rendering
  dayIndexTransform?: (dayIndex: number, isLastDay: boolean) => {
    name?: string;
    signal?: EventSignal;
  };
}

export interface CustomEvent {
  id: string;  // UUID
  name: string;
  description?: string;
  signal: EventSignal;
  phase: PhaseKey;
  order: number;  // Position within phase

  // Pre-event
  offsetDays?: number;

  // Hack day
  time?: string;  // HH:MM

  isCustom: true;
}

export interface EventState {
  enabled: boolean;

  // Pre-event
  offsetDays?: number;

  // Hack day
  time?: string;
}

export interface ScheduleBuilderState {
  duration: EventDuration;
  anchorDate: string;      // ISO date string
  anchorTime: string;      // HH:MM format
  timezone: string;

  activePhase: PhaseKey;

  // eventId → state
  eventStates: Map<string, EventState>;

  // Custom events
  customEvents: CustomEvent[];
}

export interface ScheduleBuilderOutput {
  timezone: string;
  duration: EventDuration;

  // Same fields as current implementation
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  teamFormationStartsAt?: string;
  teamFormationEndsAt?: string;
  openingCeremonyAt?: string;
  hackingStartsAt?: string;
  submissionDeadlineAt?: string;
  votingStartsAt?: string;
  votingEndsAt?: string;
  resultsAnnounceAt?: string;

  // New: custom events serialized
  customEvents?: Array<{
    name: string;
    description?: string;
    timestamp: string;  // ISO
    signal: EventSignal;
  }>;
}
```

### 3.2 Phase Definitions

```typescript
export interface PhaseDefinition {
  key: PhaseKey;
  label: string;
  type: PhaseType;
  dayIndex?: number;  // For hack-day phases (0, 1, 2)
}
```

---

## 4. Event Definitions

### 4.1 Pre-Event Milestones

```typescript
// /forge-native/static/macro-frontend/src/schedule-builder-v2/scheduleEvents.ts

export const PRE_EVENT_MILESTONES: EventDefinition[] = [
  {
    id: 'registration-opens',
    name: 'Registration Opens',
    description: 'Portal opens for sign-ups',
    signal: 'start',
    phase: 'pre-event',
    defaultOffsetDays: -14,
  },
  {
    id: 'team-formation',
    name: 'Team Formation Opens',
    description: 'Marketplace opens for team building',
    signal: 'start',
    phase: 'pre-event',
    defaultOffsetDays: -7,
  },
  {
    id: 'registration-closes',
    name: 'Registration Closes',
    description: 'Final deadline to register',
    signal: 'deadline',
    phase: 'pre-event',
    defaultOffsetDays: -1,
  },
];
```

### 4.2 Hack Day Events

```typescript
export const HACK_DAY_EVENTS: EventDefinition[] = [
  {
    id: 'opening',
    name: 'Opening Ceremony',
    description: 'Kickoff and announcements',
    signal: 'ceremony',
    phase: 'hack-day',
    defaultTime: '09:00',
    dayIndexTransform: (dayIndex, isLastDay) => {
      if (dayIndex > 0) {
        return {
          name: 'Morning Kickoff',
          signal: 'ceremony',
        };
      }
      return {};
    },
  },
  {
    id: 'hacking-begins',
    name: 'Hacking Begins',
    description: 'Teams start building',
    signal: 'start',
    phase: 'hack-day',
    defaultTime: '09:30',
  },
  {
    id: 'code-freeze',
    name: 'Code Freeze',
    description: 'Final submissions due',
    signal: 'deadline',
    phase: 'hack-day',
    defaultTime: '14:00',
    lastDayOnly: true,
  },
  {
    id: 'presentations',
    name: 'Presentations',
    description: 'Teams present their projects',
    signal: 'presentation',
    phase: 'hack-day',
    defaultTime: '15:00',
    lastDayOnly: true,
  },
  {
    id: 'judging',
    name: 'Judging Period',
    description: 'Judges evaluate submissions',
    signal: 'judging',
    phase: 'hack-day',
    defaultTime: '16:30',
    lastDayOnly: true,
  },
  {
    id: 'results',
    name: 'Results Announced',
    description: 'Winners announced and celebrated',
    signal: 'ceremony',
    phase: 'hack-day',
    defaultTime: '18:00',
    lastDayOnly: true,
  },
];
```

### 4.3 Helper Functions

```typescript
export function getEventsForPhase(
  phase: PhaseDefinition,
  duration: EventDuration
): EventDefinition[] {
  if (phase.type === 'pre-event') {
    return PRE_EVENT_MILESTONES;
  }

  const isLastDay = phase.dayIndex === duration - 1;

  return HACK_DAY_EVENTS
    .filter(e => !e.lastDayOnly || isLastDay)
    .map(e => {
      if (e.dayIndexTransform && phase.dayIndex !== undefined) {
        const transform = e.dayIndexTransform(phase.dayIndex, isLastDay);
        return { ...e, ...transform };
      }
      return e;
    });
}
```

---

## 5. Signal Color System

### 5.1 Color Tokens

```typescript
// /forge-native/static/macro-frontend/src/schedule-builder-v2/signalStyles.ts

export const SIGNAL_COLORS = {
  start: {
    name: 'Start',
    bg: '#f0fdfa',       // tealBg
    border: '#14b8a635', // teal with opacity
    accent: '#14b8a6',   // teal
    text: '#0d9488',     // tealDark
    iconBg: '#ccfbf1',   // tealLight
  },
  deadline: {
    name: 'Deadline',
    bg: '#fee2e2',       // redLight
    border: '#ef444425', // red with opacity
    accent: '#ef4444',   // red
    text: '#991b1b',     // redDark
    iconBg: '#ef444412', // red with opacity
  },
  ceremony: {
    name: 'Ceremony',
    bg: '#fff7ed',       // orangeLight
    border: '#f9731620', // orange with opacity
    accent: '#f97316',   // orange
    text: '#9a3412',     // orangeDark
    iconBg: '#f9731612', // orange with opacity
  },
  presentation: {
    name: 'Presentation',
    bg: '#fce7f3',       // pinkLight
    border: '#ec489920', // pink with opacity
    accent: '#ec4899',   // pink
    text: '#9d174d',     // pinkDark
    iconBg: '#ec489912', // pink with opacity
  },
  judging: {
    name: 'Judging',
    bg: '#dbeafe',       // blueLight
    border: '#3b82f620', // blue with opacity
    accent: '#3b82f6',   // blue
    text: '#1e40af',     // blueDark
    iconBg: '#3b82f612', // blue with opacity
  },
  neutral: {
    name: 'Neutral',
    bg: '#ffffff',       // white
    border: '#e5e7eb',   // gray200
    accent: '#9ca3af',   // gray400
    text: '#374151',     // gray700
    iconBg: '#f3f4f6',   // gray100
  },
};

export function getSignalStyle(signal: EventSignal) {
  return SIGNAL_COLORS[signal];
}
```

### 5.2 CSS Classes

```css
/* /forge-native/static/macro-frontend/src/components/schedule-builder-v2/styles.css */

.event-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  transition: all 0.15s;
}

.event-card--signal-start {
  background: #f0fdfa;
  border: 1.5px solid #14b8a635;
  border-left: 3px solid #14b8a6;
}

.event-card--signal-deadline {
  background: #fee2e2;
  border: 1.5px solid #ef444425;
  border-left: 3px solid #ef4444;
}

/* ... similar for ceremony, presentation, judging, neutral */

.event-card--disabled {
  opacity: 0.45;
  background: #ffffff;
  border: 1.5px solid #e5e7eb;
  border-left: 1.5px solid #e5e7eb;
}
```

---

## 6. Component Specifications

### 6.1 ScheduleBuilderV2 (Main)

**Responsibilities:**
- Manage overall schedule state
- Coordinate phase navigation
- Emit final payload

**State:**
```typescript
const [duration, setDuration] = useState<EventDuration>(2);
const [anchorDate, setAnchorDate] = useState('');
const [anchorTime, setAnchorTime] = useState('09:00');
const [timezone, setTimezone] = useState('Europe/London');
const [activePhase, setActivePhase] = useState<PhaseKey>('pre');
const [eventStates, setEventStates] = useState<Map<string, EventState>>(new Map());
const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
```

**Props:**
```typescript
interface ScheduleBuilderV2Props {
  timezone: string;
  onChange: (output: ScheduleBuilderOutput) => void;
}
```

---

### 6.2 ConfigStrip

**Responsibilities:**
- Display duration selector (1d/2d/3d)
- Display anchor date + time pickers
- Display timezone selector
- Emit changes to parent

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ DURATION  │  HACKING STARTS       │  TIMEZONE              │
│ [1d][2d]  │  [Date] [Time]        │  [Europe/London ▼]     │
│   [3d]    │                       │                        │
└────────────────────────────────────────────────────────────┘
```

**Styling:**
- Teal background (#f0fdfa)
- Teal border (1.5px solid #14b8a620)
- Rounded corners (16px)
- Padding: 16px 20px
- Dividers between sections (1px solid #14b8a618)

---

### 6.3 PhaseTabBar

**Responsibilities:**
- Display tabs for all phases (Pre-Event, Hack Day 1, Hack Day 2, Hack Day 3)
- Highlight active phase
- Show indicator dot if phase has enabled events

**Props:**
```typescript
interface PhaseTabBarProps {
  phases: PhaseDefinition[];
  activePhase: PhaseKey;
  onPhaseChange: (phase: PhaseKey) => void;
  phaseHasEvents: (phase: PhaseKey) => boolean;
}
```

**Tab Styling:**
- Active: Teal border, teal background, bold text
- Inactive: Transparent, gray text
- Hover: Light teal background
- Event indicator: 6px teal dot (top right of tab)

---

### 6.4 EventCard

**Responsibilities:**
- Display event name, description, signal color
- Toggle enabled/disabled
- Show offset input (pre-event) or time picker (hack day)
- Support drag-to-reorder (for custom events)

**Props:**
```typescript
interface EventCardProps {
  event: EventDefinition | CustomEvent;
  enabled: boolean;
  onToggle: () => void;

  // Pre-event
  offsetDays?: number;
  onOffsetChange?: (days: number) => void;
  anchorDate?: string;  // For preview calculation

  // Hack day
  time?: string;
  onTimeChange?: (time: string) => void;

  // Custom events
  isCustom?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;

  timezone: string;
}
```

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ [✓] Name                                   [14 days before] │
│     Description                             Jun 7, 2026    │
└──────────────────────────────────────────────────────────┘
```

---

### 6.5 TimelineMinimap

**Responsibilities:**
- Visual representation of full schedule
- Show relative lengths of phases
- Allow click-to-navigate

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ [Pre-Event──────][Day1────][Day2────]                      │
│                  ↑ You are here                            │
│                                                            │
│ [← Prev Phase]     5 events · 2 of 4 phases   [Next →]   │
└────────────────────────────────────────────────────────────┘
```

**Styling:**
- Sticky footer (position: sticky, bottom: 0)
- White background, gray top border
- Phase segments: 6px height, rounded, colored (active=teal, hack=tealLight, pre=gray200)
- Clickable segments change phase

---

### 6.6 SchedulePreview

**Responsibilities:**
- Multi-column layout (Pre-Event | Day 1 | Day 2 | Day 3)
- Display all enabled events in chronological order
- Auto-generate "Hacking" filler blocks
- Match existing Schedule page design

**Columns:**
```
┌────────────┬────────────┬────────────┬────────────┐
│ Pre-Event  │ Day 1      │ Day 2      │ Day 3      │
│ Jun 1-20   │ Jun 21     │ Jun 22     │ Jun 23     │
├────────────┼────────────┼────────────┼────────────┤
│ Reg Opens  │ 09:00 Open │ 08:00 Kick │            │
│ Team Form  │ 09:30 Hack │ ─── Hack ──│            │
│ Reg Closes │ ─── Hack ──│ 14:00 Code │            │
│            │ 18:00 Dine │ 15:00 Pres │            │
│            │            │ 18:00 Rslt │            │
└────────────┴────────────┴────────────┴────────────┘
```

**Hacking Filler Logic:**
1. After "Hacking Begins", fill gaps until "Code Freeze"
2. Filler blocks have dashed border, lighter opacity
3. Show "Hacking" label with time range
4. On multi-day events, day 2+ continues with implicit hacking from morning until code freeze

---

## 7. Implementation Phases

### Phase 1: Core Builder (Days 1-3)

**Goal:** Replace cascade model with phase-based builder

**Tasks:**
1. Create type definitions (`scheduleBuilderV2.ts`)
2. Create event definitions (`scheduleEvents.ts`)
3. Create signal color system (`signalStyles.ts`)
4. Build ConfigStrip component
5. Build PhaseTabBar component
6. Build EventCard component (basic version, no custom events yet)
7. Build PhaseContent component (orchestrates EventCard list)
8. Build ScheduleBuilderV2 main component
9. Wire up state management
10. Calculate output payload (map to existing field names)

**Deliverable:** Working phase builder with duration selector, anchor picker, phase tabs, event toggles, offset/time inputs

**Testing:**
- Select different durations → phase tabs update
- Toggle events on/off → payload reflects changes
- Change anchor date → pre-event calculated dates update
- Switch phases → correct events shown for phase
- Last day → closing events appear

---

### Phase 2: Timeline & Custom Events (Days 4-5)

**Goal:** Add timeline minimap and custom event functionality

**Tasks:**
1. Build TimelineMinimap component
2. Implement phase navigation from minimap
3. Build AddCustomEventButton
4. Build CustomEventEditor (inline form)
5. Implement custom event CRUD (create, update, delete)
6. Add drag-to-reorder for custom events
7. Add signal selector for custom events
8. Update payload to include custom events

**Deliverable:** Full-featured builder with custom events and timeline navigation

**Testing:**
- Click minimap segment → phase changes
- Add custom event → appears in event list
- Edit custom event name/description → updates
- Change custom event signal → color changes
- Delete custom event → removed from list
- Drag custom event → reorders within phase

---

### Phase 3: Preview Page (Days 6-7)

**Goal:** Create schedule preview with hacking fillers

**Tasks:**
1. Build SchedulePreview component
2. Build PreEventColumn component
3. Build HackDayColumn component
4. Implement hacking filler generation logic (`hackingFillers.ts`)
5. Style columns to match existing Schedule page
6. Add Edit/Back/Next navigation buttons
7. Insert preview step between Step 2 and Step 3 in wizard flow

**Deliverable:** Preview page showing full multi-column schedule with auto-generated hacking blocks

**Testing:**
- Create 1-day event → 1 hack column
- Create 2-day event → 2 hack columns
- Create 3-day event → 3 hack columns
- Verify hacking fillers appear between events
- Click Edit → returns to builder
- Click Next → proceeds to Step 3 (Rules)

---

### Phase 4: Styling & Polish (Days 8-9)

**Goal:** Match prototype design exactly

**Tasks:**
1. Fine-tune ConfigStrip styling (teal panel)
2. Refine event card signal colors and borders
3. Add animations (phase changes, event toggles, cascade flashes)
4. Add responsive styles (mobile breakpoints)
5. Test accessibility (keyboard navigation, screen readers)
6. Add loading states
7. Add error states (validation messages)
8. Polish preview page card design

**Deliverable:** Production-ready builder matching prototype

**Testing:**
- Desktop, tablet, mobile viewports
- Keyboard-only navigation
- Screen reader compatibility
- Dark mode (if applicable)

---

### Phase 5: Integration & Deployment (Days 10-11)

**Goal:** Replace old builder, deploy to production

**Tasks:**
1. Update App.tsx to use ScheduleBuilderV2
2. Migrate state management (load existing wizard drafts)
3. Update backend payload handling (if needed)
4. Test full wizard flow end-to-end
5. Build both frontends (frontend + macro)
6. Deploy to PRODUCTION environment
7. Verify in production
8. Archive old ScheduleBuilder files

**Deliverable:** ScheduleBuilderV2 live in production

**Testing:**
- Create HackDay from start to finish
- Verify Confluence child page created
- Verify HackDay seed payload correct
- Verify HD26Forge renders created event correctly
- Test with different durations (1d, 2d, 3d)
- Test with custom events
- Test preview page

---

## 8. Migration Strategy

### 8.1 Parallel Development

- Build ScheduleBuilderV2 in separate directory
- Keep old ScheduleBuilder functional
- Test new builder in isolation
- Switch via feature flag initially (optional)

### 8.2 Wizard State Migration

**Current state fields:**
```typescript
const [scheduleOutput, setScheduleOutput] = useState<ScheduleBuilderOutput>(null);
const [eventDuration, setEventDuration] = useState<EventDuration>(2);
const [selectedEvents, setSelectedEvents] = useState<ScheduleEventType[]>([]);
```

**New state fields:**
```typescript
const [scheduleBuilderState, setScheduleBuilderState] = useState<ScheduleBuilderState>({
  duration: 2,
  anchorDate: '',
  anchorTime: '09:00',
  timezone: 'Europe/London',
  activePhase: 'pre',
  eventStates: new Map(),
  customEvents: [],
});
```

**Conversion utility:**
```typescript
function migrateToV2State(oldState: any): ScheduleBuilderState {
  // Convert old state to new format
  // Handle missing fields with sensible defaults
}
```

### 8.3 Backend Compatibility

**No backend changes needed!**

The output payload structure remains the same:
- `registrationOpensAt`, `hackingStartsAt`, etc. (existing fields)
- `customEvents` array (new field, optional)

HD26Forge backend already creates milestones for any schedule fields that exist, so custom events can be added later as an enhancement.

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Components to test:**
- `getEventsForPhase()` - returns correct events for phase type and day index
- `calculatePreEventDate()` - calculates correct date from anchor and offset
- `generateHackingFillers()` - creates filler blocks in correct positions
- `signalStyles()` - returns correct colors for each signal type
- `buildSchedulePayload()` - converts state to wizard payload

### 9.2 Integration Tests

**User flows to test:**
1. Create 1-day HackDay with minimal events
2. Create 2-day HackDay with all default events
3. Create 3-day HackDay with custom events
4. Change duration mid-editing (2d → 3d)
5. Override defaults, then reset
6. Add custom event, then delete
7. Navigate phases via tabs and minimap
8. Preview schedule, go back to edit, continue

### 9.3 Visual Regression Tests

**Screenshots to capture:**
- Config strip (all 3 duration states)
- Phase tabs (pre-event, day 1, day 2, day 3)
- Event cards (each signal type, enabled/disabled)
- Timeline minimap (all phase combinations)
- Preview page (1-day, 2-day, 3-day layouts)
- Custom event editor (inline editing state)

### 9.4 Accessibility Tests

**WCAG AA compliance:**
- All interactive elements keyboard accessible (Tab, Enter, Escape)
- Focus indicators visible
- Color contrast ratios pass (text on backgrounds)
- ARIA labels for icon-only buttons
- Screen reader announces phase changes
- Form validation messages announced

---

## 10. Rollout Plan

### 10.1 Development Environment

1. Create feature branch: `feature/schedule-builder-v2`
2. Build components incrementally
3. Test locally in macro with `forge tunnel`
4. Deploy to DEVELOPMENT environment
5. Internal testing

### 10.2 Staging Environment (Optional)

1. Deploy to STAGING environment (if available)
2. Create test HackDays
3. Verify end-to-end flow
4. Invite team for feedback

### 10.3 Production Deployment

1. Merge feature branch to main
2. Bump version in package.json
3. Build both frontends: `npm run custom-ui:build`
4. Deploy to PRODUCTION: `forge deploy --environment production --no-verify`
5. Verify changes live: Test creation flow
6. Monitor for errors: `forge logs -e production --since 1h`

### 10.4 Rollback Plan

If critical issues discovered:
1. Revert to previous git commit
2. Rebuild and redeploy
3. Or: Add feature flag to switch back to old builder temporarily

---

## 11. Open Questions

### 11.1 Wizard Flow

**Question:** Should preview be a separate step (Step 2.5) or modal overlay?

**Options:**
- A) New step: Wizard becomes 6 steps (Basic, Schedule, **Preview**, Rules, Branding, Review)
- B) Modal: Preview opens as modal, closes to return to Step 2
- C) Same page: Preview expands below builder, click "Edit" to collapse

**Recommendation:** Option A (new step) - clearest UX, matches prompt specification

---

### 11.2 Custom Events

**Question:** Where should custom events be stored in the backend?

**Options:**
- A) Serialize to JSON in seed_payload (schedule.customEvents array)
- B) Separate table in Supabase
- C) Encoded in milestone titles/descriptions

**Recommendation:** Option A (JSON in payload) - simplest, no schema changes needed

---

### 11.3 Hacking Fillers

**Question:** Should hacking fillers be editable or purely generated?

**Options:**
- A) Read-only, auto-generated from gaps
- B) Editable (users can override labels/times)
- C) Optional (toggle to show/hide fillers)

**Recommendation:** Option A (read-only) - matches prompt, prevents confusion

---

### 11.4 Multi-Day Repeating Events

**Question:** How to handle events that repeat daily (lunch, check-ins)?

**Options:**
- A) Separate events per day (Lunch Day 1, Lunch Day 2, Lunch Day 3)
- B) Single event with "repeat daily" toggle
- C) Clone event to other days with one click

**Recommendation:** Option A (separate events) - explicit, no magic, easier to customize per day

---

## 12. Success Criteria

### 12.1 Functional Requirements

✅ Duration selector (1/2/3 days) updates phase tabs
✅ Anchor date/time picker calculates pre-event dates
✅ Phase tabs switch between Pre-Event and Hack Days
✅ Event cards show correct signal colors
✅ Pre-event events use relative offset inputs
✅ Hack day events use time pickers
✅ Last day events only appear on final hack day
✅ Custom events can be added, edited, deleted
✅ Timeline minimap shows visual schedule overview
✅ Preview page shows multi-column layout
✅ Hacking fillers auto-generate in gaps
✅ Output payload matches existing structure

### 12.2 Non-Functional Requirements

✅ Page load < 1 second
✅ Phase changes animate smoothly (< 300ms)
✅ No console errors or warnings
✅ Mobile responsive (breakpoints at 640px, 768px)
✅ Keyboard navigation works (Tab, Enter, Escape)
✅ WCAG AA accessible
✅ Works in Chrome, Firefox, Safari, Edge

### 12.3 Business Requirements

✅ Users can create HackDays faster than before
✅ Schedule preview reduces confusion about timeline
✅ Custom events enable flexible event planning
✅ Existing HackDays continue to work (backward compatible)
✅ No breaking changes to HD26Forge integration

---

## 13. Risk Assessment

### 13.1 High Risk

**Complexity:** This is a large redesign touching many files

**Mitigation:**
- Build incrementally in phases
- Keep old builder as fallback
- Test thoroughly in development before production

---

### 13.2 Medium Risk

**Browser Compatibility:** Time inputs, date calculations

**Mitigation:**
- Test in all major browsers
- Use polyfills if needed
- Fallback to text inputs if datetime-local not supported

---

### 13.3 Low Risk

**Backend Changes:** Minimal, payload structure mostly unchanged

**Mitigation:**
- Custom events are optional field
- HD26Forge already handles variable milestone fields

---

## 14. Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1: Core Builder** | 3 days | Working phase-based builder |
| **Phase 2: Timeline & Custom Events** | 2 days | Full-featured builder |
| **Phase 3: Preview Page** | 2 days | Schedule preview with fillers |
| **Phase 4: Styling & Polish** | 2 days | Production-ready UI |
| **Phase 5: Integration & Deployment** | 2 days | Live in production |
| **Total** | **11 days** | Complete redesign deployed |

**Buffer:** Add 2-3 days for unexpected issues, testing, feedback iterations

**Realistic Total:** 13-14 days

---

## 15. Next Steps

1. **Review this plan** - Confirm approach, ask questions, adjust timeline
2. **Set up branch** - Create `feature/schedule-builder-v2` branch
3. **Start Phase 1** - Create type definitions and event definitions
4. **Build ConfigStrip** - First visible component
5. **Iterate** - Build, test, demo, refine

---

## Appendix A: File Checklist

### New Files to Create (18 files)

- [ ] `/src/types/scheduleBuilderV2.ts`
- [ ] `/src/schedule-builder-v2/scheduleEvents.ts`
- [ ] `/src/schedule-builder-v2/scheduleState.ts`
- [ ] `/src/schedule-builder-v2/scheduleCalculations.ts`
- [ ] `/src/schedule-builder-v2/signalStyles.ts`
- [ ] `/src/schedule-builder-v2/hackingFillers.ts`
- [ ] `/src/components/schedule-builder-v2/index.tsx`
- [ ] `/src/components/schedule-builder-v2/ConfigStrip.tsx`
- [ ] `/src/components/schedule-builder-v2/PhaseTabBar.tsx`
- [ ] `/src/components/schedule-builder-v2/PhaseContent.tsx`
- [ ] `/src/components/schedule-builder-v2/EventCard.tsx`
- [ ] `/src/components/schedule-builder-v2/TimelineMinimap.tsx`
- [ ] `/src/components/schedule-builder-v2/AddCustomEventButton.tsx`
- [ ] `/src/components/schedule-builder-v2/CustomEventEditor.tsx`
- [ ] `/src/components/schedule-builder-v2/SchedulePreview.tsx`
- [ ] `/src/components/schedule-builder-v2/PreEventColumn.tsx`
- [ ] `/src/components/schedule-builder-v2/HackDayColumn.tsx`
- [ ] `/src/components/schedule-builder-v2/styles.css`

### Files to Modify (2 files)

- [ ] `/src/App.tsx` - Replace ScheduleBuilder with ScheduleBuilderV2
- [ ] `/src/styles.css` - Import schedule-builder-v2 styles

### Files to Archive (2 files)

- [ ] `/src/EventSelectionPanel.tsx` → `/src/_archive/EventSelectionPanel.tsx`
- [ ] `/src/scheduleEvents.ts` (original) → `/src/_archive/scheduleEvents.ts`

---

**End of Implementation Plan**

This plan provides a complete roadmap for rebuilding the Schedule Builder from the ground up. Each phase has clear deliverables, testing criteria, and estimated timelines. The modular approach allows for incremental development and testing while maintaining backward compatibility.
