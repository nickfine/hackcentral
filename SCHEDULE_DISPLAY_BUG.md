# Schedule Builder V2 - Multi-Day Display Bug

**Created:** 2026-02-25
**Status:** Fixed (2026-02-25)
**Priority:** High

## Fix Applied

The bug was fixed by implementing per-day composite keys for hack day event states.

### Changes Made

**1. `scheduleEvents.ts` (both frontends)**
- Added `getEventStateKey(phaseKey, eventId)` - returns composite key like `hack-0:opening`
- Updated `initializeEventStates(duration)` - creates per-day states for each hack day
- Added `ensureEventStatesForDuration()` - handles duration changes by adding missing day states

**2. `PhaseContent.tsx` (both frontends)**
- Now uses `getEventStateKey(phase.key, event.id)` for state lookups
- Passes composite key to toggle/change handlers

**3. `index.tsx` (both frontends)**
- Updated `phaseHasEvents()` to use composite keys for hack days
- Updated `handleDurationChange()` to ensure states exist for new days
- Updated `buildOutputPayload()` to iterate through each day

### New State Key Format
```
Before: eventStates["opening"] = { enabled: true, time: "09:00" }
After:  eventStates["hack-0:opening"] = { enabled: true, time: "09:00" }
        eventStates["hack-1:opening"] = { enabled: true, time: "10:00" }
```

---

## Problem Summary

When configuring a multi-day hackathon (2-day or 3-day), all hack days share the same event states. Changing the time of an event on Day 1 also changes it on Day 2/3 because the state is keyed by event ID only, not by day+event ID.

## Expected Behavior

- User selects "2 Day" duration
- Two tabs appear: "Hack Day 1" and "Hack Day 2"
- Each day should have **independent** times for recurring events
- Example: "Morning Kickoff" on Day 2 can be at 10:00 even if "Opening Ceremony" on Day 1 is at 09:00

## Actual Behavior

1. **Shared state across days:** The `eventStates` object uses event ID as key (e.g., `"opening"`) rather than day+ID (e.g., `"hack-0:opening"`)
2. **Time changes propagate:** If you set "Opening Ceremony" to 10:00 on Day 1, switch to Day 2, "Morning Kickoff" also shows 10:00
3. **Output only uses Day 0:** In `buildOutputPayload()`, non-lastDayOnly events always output to the first day:
   ```typescript
   const dayOffset = event.lastDayOnly ? duration - 1 : 0;
   ```

## What Works Correctly

- **Visual differentiation:** Day 2+ shows "Morning Kickoff" instead of "Opening Ceremony" (via `getEventsForPhase`)
- **Last day events:** `lastDayOnly` events (Code Freeze, Presentations, Judging, Results) only appear on the final day
- **Date display:** Each tab shows the correct date (Day 1 = anchor, Day 2 = anchor+1, etc.)

## Root Cause

### 1. Flat Event State Storage (`index.tsx:142-144`)
```typescript
const [eventStates, setEventStates] = useState<Record<string, EventState>>(
  initialState?.eventStates ?? initializeEventStates()
);
```
Keys: `"opening"`, `"hacking-begins"`, etc. — no day prefix.

### 2. Shared Event Definitions (`scheduleEvents.ts:50-104`)
`HACK_DAY_EVENTS` array is shared across all days. The `getEventsForPhase()` function only filters (lastDayOnly) and transforms names (Opening→Morning Kickoff), but doesn't create per-day state.

### 3. Output Generation (`index.tsx:79-91`)
```typescript
HACK_DAY_EVENTS.forEach((event) => {
  const state = eventStates[event.id];  // Same state for all days
  if (state?.enabled && state.time) {
    const dayOffset = event.lastDayOnly ? duration - 1 : 0;  // Always 0 or last
    // ...
  }
});
```

## Recommended Fix: Per-Day Event Keys

### Step 1: Change event state keys to include day index

```typescript
// Current
eventStates["opening"] = { enabled: true, time: "09:00" }

// Proposed
eventStates["hack-0:opening"] = { enabled: true, time: "09:00" }
eventStates["hack-1:opening"] = { enabled: true, time: "10:00" }
```

### Step 2: Update `initializeEventStates()`

```typescript
export function initializeEventStates(duration: EventDuration = 2) {
  const states: Record<string, EventState> = {};

  // Pre-event milestones (same as before)
  PRE_EVENT_MILESTONES.forEach((event) => {
    states[event.id] = { enabled: true, offsetDays: event.defaultOffsetDays };
  });

  // Hack day events - create per-day states
  for (let day = 0; day < duration; day++) {
    const isLastDay = day === duration - 1;
    HACK_DAY_EVENTS.forEach((event) => {
      // Skip lastDayOnly events on non-last days
      if (event.lastDayOnly && !isLastDay) return;
      // Skip non-lastDayOnly events on last day (they only appear on first day)
      // Actually, opening/hacking appear on ALL days, just with different names
      if (!event.lastDayOnly || isLastDay) {
        states[`hack-${day}:${event.id}`] = { enabled: true, time: event.defaultTime };
      }
    });
  }

  return states;
}
```

### Step 3: Update `PhaseContent.tsx` to use per-day keys

```typescript
const state = eventStates[`${phase.key}:${event.id}`] || { ... };
```

### Step 4: Update handlers in `index.tsx`

```typescript
const handleEventToggle = useCallback((eventId: string, phaseKey: PhaseKey) => {
  const key = phaseKey === 'pre' ? eventId : `${phaseKey}:${eventId}`;
  setEventStates((prev) => ({
    ...prev,
    [key]: { ...prev[key], enabled: !prev[key]?.enabled },
  }));
}, []);
```

### Step 5: Update `buildOutputPayload()` to iterate per-day

```typescript
// Process hack day events per day
for (let day = 0; day < duration; day++) {
  const isLastDay = day === duration - 1;
  HACK_DAY_EVENTS.forEach((event) => {
    if (event.lastDayOnly && !isLastDay) return;

    const stateKey = `hack-${day}:${event.id}`;
    const state = eventStates[stateKey];
    if (state?.enabled && state.time) {
      const outputField = `${EVENT_TO_OUTPUT_FIELD[event.id]}Day${day + 1}`;
      // Or modify the API to accept arrays: openingCeremonyAt: ["2026-03-10T09:00", "2026-03-11T10:00"]
    }
  });
}
```

## Files to Modify

1. `src/types/scheduleBuilderV2.ts` - No changes needed (EventState is already flexible)
2. `src/schedule-builder-v2/scheduleEvents.ts` - Update `initializeEventStates()`
3. `src/components/schedule-builder-v2/index.tsx` - Update handlers and `buildOutputPayload()`
4. `src/components/schedule-builder-v2/PhaseContent.tsx` - Pass phase key, use composite keys

**Remember:** Changes must be made in BOTH frontends:
- `static/frontend/src/...`
- `static/macro-frontend/src/...`

## API Considerations

The current API output format may need updates to support per-day events:

**Current format (single timestamp per event):**
```json
{
  "openingCeremonyAt": "2026-03-10T09:00:00Z",
  "hackingStartsAt": "2026-03-10T09:30:00Z"
}
```

**Proposed options:**

Option A: Suffixed fields
```json
{
  "openingCeremonyAtDay1": "2026-03-10T09:00:00Z",
  "morningKickoffAtDay2": "2026-03-11T10:00:00Z"
}
```

Option B: Array format
```json
{
  "dailySchedule": [
    { "day": 1, "openingAt": "09:00", "hackingStartsAt": "09:30" },
    { "day": 2, "kickoffAt": "10:00", "hackingStartsAt": "10:30" }
  ]
}
```

This needs to be coordinated with HD26Forge which consumes this data.

## Reproduction Steps

1. Go to Confluence macro wizard
2. Navigate to Step 2 (Schedule Builder)
3. Select "2 Day" or "3 Day" duration
4. On "Hack Day 1" tab, set "Opening Ceremony" to 10:00
5. Switch to "Hack Day 2" tab
6. Observe: "Morning Kickoff" also shows 10:00 (bug)
7. Expected: "Morning Kickoff" should still be at default 09:00 (independent)

## Related Files

- `static/frontend/src/components/schedule-builder-v2/index.tsx`
- `static/frontend/src/components/schedule-builder-v2/PhaseContent.tsx`
- `static/frontend/src/schedule-builder-v2/scheduleEvents.ts`
- `static/frontend/src/types/scheduleBuilderV2.ts`
