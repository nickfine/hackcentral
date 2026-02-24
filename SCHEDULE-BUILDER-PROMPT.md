# Schedule Builder — Implementation Prompt for Claude Code

## Reference Prototype

The file `schedule-builder-v5.jsx` is a working React prototype of the Schedule step (Step 2 of 5) in the HackDay creation flow. **Use it as a visual and interaction reference — not as production code.** Adapt it to the existing Forge customUI architecture, component patterns, state management, and design system documented in `HACKDAY-DESIGN-SYSTEM.md`.

---

## What This Page Does

This is the schedule configuration step where a hackathon organiser defines the timeline for their event. The organiser works through phases one at a time: Pre-Event, then each Hack Day, building the schedule linearly.

### Core Decisions (in order)

1. **Duration** — 1, 2, or 3 hack days
2. **Anchor date + time** — when hacking starts
3. **Timezone** — event base timezone
4. **Pre-Event milestones** — registration, team formation, etc. with relative date offsets ("14 days before hack start")
5. **Hack Day events** — timed events for each day. The last hack day includes closing events (code freeze, presentations, judging, results)

### Page Layout

- **Header** — step indicator, title, description
- **Config strip** — duration selector (1d/2d/3d buttons), anchor date+time pickers, timezone selector. Sits in a teal-tinted panel. This is the primary action area.
- **Phase tabs** — horizontal tab bar: Pre-Event | Hack Day 1 [| Hack Day 2 | Hack Day 3]. No post-event phase — closing events live on the last hack day.
- **Phase content** — single column (max-width ~800px), showing events for the active phase. Each event is a card with a toggle, name, description, and date/time controls.
- **Sticky footer** — timeline minimap, phase-to-phase navigation, "Next Step" button on the last phase.

### Event Card Anatomy

Each event row contains:
- **Checkbox toggle** — include/exclude this event
- **Event name** (bold) + description (secondary text)
- **Date or time control** — depends on phase type:
  - Pre-Event: relative offset input ("14 days before") + calculated date display
  - Hack Days: time picker
- **Signal colour** — left-edge bar (3px) for start events (teal) and deadline events (red). Tinted background matching signal. Neutral events have white background, no colour bar.

### Signal Colour System

Only two semantic colours:
- **Teal** (`#14b8a6`) — starts and openings (Registration Opens, Hacking Begins, etc.)
- **Red** (`#ef4444`) — deadlines and closings (Registration Closes, Code Freeze, etc.)
- **Neutral** — everything else. White card, grey border, no colour accent.

Additional subtle tints for ceremony (amber), presentation (pink), judging (blue) — these are background-only, not border accents. See the prototype for the exact mapping.

No emojis or icons. Colour and typography carry the visual hierarchy.

---

## Custom Events

### Adding a Custom Event

Each phase has an "Add custom event" button at the bottom of the event list (dashed border, appears on hover with teal accent).

When clicked, it should:

1. Insert a new event card at the bottom of the current phase's list, in an **inline editing state**
2. The card should have:
   - A text input for the event name (auto-focused)
   - A text input for the description (optional)
   - The appropriate date/time control for the phase type (offset picker for pre-event, time picker for hack days)
   - A signal selector — simple toggle or dropdown: Start / Deadline / Neutral. This determines the card's colour treatment.
3. On blur or Enter, the card saves and becomes a normal event card
4. Custom events should be draggable to reorder within their phase
5. Custom events can be deleted (show a delete/remove action on hover or via a context menu)

### Data Model for Custom Events

```typescript
interface CustomEvent {
  id: string;           // generated UUID
  name: string;
  description?: string;
  signal: 'start' | 'deadline' | 'neutral';
  // Pre-event phase:
  offsetDays?: number;  // negative = before hack start
  // Hack day phase:
  time?: string;        // HH:MM format
  phase: 'pre' | `hack-${number}`;
  order: number;        // position within phase
  isCustom: true;
}
```

---

## Preview Page (Next Step)

After the organiser completes the schedule builder and clicks "Next Step", they should land on a **Schedule Preview** page. This is a read-only view showing the complete schedule they've built.

### Layout

The preview should match the existing HackDay schedule page layout — the three-column (or multi-column) view that participants see:

- **Pre-Event column** — milestone cards with dates
- **Hack Day column(s)** — timed event cards in chronological order
- All columns visible at once in a horizontal grid

### Column Structure

```
| Pre-Event          | Day 1 — Hack Day     | Day 2 — Submissions  |
| 1 Jun - 20 Jun     | Sun 21 June 2026     | Mon 22 June 2026     |
|                    |                       |                       |
| Registration Opens | 09:00  Opening        | 08:00  Morning Kickoff|
| Team Formation     | 09:30  Hacking        | ...                   |
| Registration Closes| 12:00  Hacking        | 14:00  Code Freeze    |
|                    | 15:00  Hacking        | 15:00  Presentations  |
|                    | ...                   | 16:30  Judging        |
|                    |                       | 18:00  Results        |
```

### Hacking Filler Blocks

**Critical:** Any unscheduled time gaps between events on hack days must be filled with "Hacking" filler blocks. These communicate to participants that unscheduled time is dedicated hacking time.

Rules for generating hacking fillers:
1. Look at the hack day's events sorted by time
2. For any gap between two events, insert a "Hacking" block that spans from the end of the previous event to the start of the next
3. The filler block should use the `start` signal style (teal tint) since hacking is the core activity
4. If the first event of the day doesn't start at the day's beginning, add a "Hacking" filler from the start
5. Filler blocks should be visually slightly lighter/more subtle than real events — perhaps a dashed border or lower opacity — so organisers can distinguish them from configured events
6. Filler blocks are not editable or removable — they're generated automatically from the gaps

Example for a 1-day hack:
```
09:00  Opening Ceremony      [ceremony - configured]
09:30  Hacking Begins        [start - configured]
09:30  ┄ Hacking ┄           [filler - auto-generated]
14:00  Code Freeze           [deadline - configured]
14:00  ┄ Hacking ┄           [filler - auto-generated until presentations]
15:00  Presentations         [presentation - configured]
16:30  Judging               [judging - configured]
18:00  Results Announced     [ceremony - configured]
```

Wait — actually, re-reading the logic: after "Hacking Begins" there should be a continuous hacking filler until Code Freeze. After Code Freeze, there's no hacking filler since submissions are done. So the filler logic is:

1. After "Hacking Begins" event, fill all gaps with "Hacking" filler blocks **until Code Freeze**
2. After Code Freeze, no hacking fillers — the remaining events (presentations, judging, results) fill the rest of the day
3. On multi-day hacks, day 2+ starts with an implied "Hacking continues" filler from the Morning Kickoff until the first non-hacking event

### Preview Page Actions

- **Edit** button — returns to the schedule builder on the relevant phase
- **Back** button — returns to the schedule builder (last viewed phase)
- **Next** button — proceeds to Step 3 of the creation flow

### Card Design on Preview

Match the existing HackDay schedule card design:
- Icon circle (left) with signal-appropriate tint
- Time label in monospace, coloured by signal
- Category badge (small uppercase pill)
- Event name in bold
- Cards have subtle borders and signal-appropriate background tints
- Refer to the existing schedule page component for exact styling

---

## Technical Notes

- The schedule data should be stored in a structure that can be serialised to the Forge storage backend
- Relative date offsets for pre-event milestones should be recalculated whenever the anchor date changes
- Duration changes should preserve event states where possible (e.g. switching from 2 days to 1 day should keep day 1 events, merge closing events onto day 1)
- The phase tab state and scroll position should be preserved when navigating back from the preview page
- All times should be stored and displayed in the configured timezone
- Default events start as enabled. The organiser deselects what they don't need.

---

## Files to Reference

- `schedule-builder-v5.jsx` — interaction and layout prototype (this file)
- `HACKDAY-DESIGN-SYSTEM.md` — visual design system, tokens, component specs
- Existing schedule page component — for preview page card design and column layout
