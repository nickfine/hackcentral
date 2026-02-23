# Schedule Step: Anchor and Cascade Timeline Builder

## 1. Current state and scope

**Where the Schedule step lives**

- **Web app (primary):** [src/pages/CreateHackDay.tsx](../src/pages/CreateHackDay.tsx) — step 2 (lines 272–315) is a timezone text input plus **9 raw `<input type="datetime-local">`** in a 2-column grid. All state is 9 separate `useState` strings; `buildPayload()` passes them into `schedule: { timezone, registrationOpensAt, ..., resultsAnnounceAt }`.
- **Forge macro:** [forge-native/static/macro-frontend/src/App.tsx](../forge-native/static/macro-frontend/src/App.tsx) holds the same wizard state (9 schedule strings, `WizardDraftState`) and builds the same payload for `hdcCreateInstanceDraft`. The current parent-page UI only shows a link to the web app ("Open Create HackDay in app"); the doc [HDC-CREATE-CHILD-HACKDAY-FLOW.md](HDC-CREATE-CHILD-HACKDAY-FLOW.md) describes an inline 5-step wizard. The **new Schedule component should be built so it can be reused in the web app first and, if the macro ever renders the wizard inline, in the Forge CustomUI iframe.**

**Payload contract (unchanged)**  
Backend and Convex expect the same shape. No API changes.

- [convex/hackdays.ts](../convex/hackdays.ts): `CreateHackDayWizardPayload.schedule` — `timezone` + 9 optional ISO date-time strings.
- [forge-native/src/createFromWeb.ts](../forge-native/src/createFromWeb.ts) and [forge-native/src/backend/hdcService.ts](../forge-native/src/backend/hdcService.ts): same schedule shape.

**Design system**

- [HackDay_Design_system.md](HackDay_Design_system.md): teal primary (`teal-500`), cards `rounded-xl`, hero/accent `border-l-2 border-teal-500`, spacing `gap-6` / `p-5`, typography tiers (Tier 1 page title, Tier 2 section, Tier 3 body, Tier 4 meta), no gradients/pills, gray neutrals only.
- [src/lib/design-system.ts](../src/lib/design-system.ts): tokens (colors, spacing, typography, animations). Use for any shared constants.

---

## 2. Phase sequence and cascade rules

**Fixed phase order (top to bottom)**  

1. Registration Opens
2. Registration Closes
3. Team Formation Starts
4. Team Formation Ends
5. **Hacking Starts (anchor)**
6. Submission Deadline
7. Voting Starts
8. Voting Ends
9. Results Announced

**Default cascade rules (relative to Hacking Starts)**  

| Phase                 | Offset from anchor |
| --------------------- | ------------------ |
| Registration Opens    | -14 days           |
| Registration Closes   | -3 days            |
| Team Formation Starts | -5 days            |
| Team Formation Ends   | -1 day             |
| Hacking Starts        | 0 (anchor)         |
| Submission Deadline   | +2 days            |
| Voting Starts         | +2 days            |
| Voting Ends           | +4 days            |
| Results Announced     | +5 days            |

All derived times should use the **same clock time** as the anchor (e.g. 09:00) unless a future requirement says otherwise. Timezone: single value (e.g. from existing timezone field) applied to all.

---

## 3. Architecture and data flow

- **Single source of truth:** Anchor date-time (and timezone) plus the set of **overridden** phase IDs. For each phase, if it is overridden, use the user-edited value; otherwise use the **suggested** value from the cascade engine.
- **Cascade engine:** Pure function: `(anchor: Date, timezone: string, overrides: Map<PhaseId, Date>) => Map<PhaseId, Date>`. Uses the rules table; for overridden phases, returns the override; for others, anchor + offset in that timezone.
- **Validation:** After computing/merging dates, check ordering (each phase start before next). If a phase end is after the next phase start (sequence order violation), show an **inline warning on the connector** between the two affected cards (design system: semantic amber/red, Tier 3/4). Negative gaps (overlap) are shown as **"Overlap"** on the duration pill in amber, not as a separate connector warning.

---

## 4. Component and file plan

**New files**

| File                                             | Purpose                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/create/ScheduleStep.tsx`         | Main container: **dedicated anchor section** (Tier 1/2 heading, Tier 4 subtitle, prominent date-time trigger), timezone, phase cards stack, connectors, mini timeline. Owns local overrides state; exposes `schedule` and `onScheduleChange`. When schedule has existing dates, treat all as overrides and set anchor from hackingStartsAt (see section 5). |
| `src/components/create/CascadeScheduleEngine.ts` | Cascade rules table (phase order + offsets) and `computeSuggestedSchedule(anchor, timezone)`, `mergeWithOverrides(suggested, overrides)`. No UI.                                                                                                                                                                                                            |
| `src/components/create/PhaseCard.tsx`            | Single phase card: teal left border, rounded-xl, phase icon, phase name, inline date-time (popover), optional "Reset to suggested" when overridden.                                                                                                                                                                                                         |
| `src/components/create/PhaseConnector.tsx`       | Dashed line between two cards + duration pill with human-readable label ("Same day", "X days", or "Overlap" in amber). Warning slot for **sequence order violations only** (phase end after next phase start).                                                                                                                                              |
| `src/components/create/ScheduleMiniTimeline.tsx` | Read-only horizontal bar: **equal-width** segments, one per phase; each segment shows phase name (Tier 4, truncated) and resolved date (Tier 4). Teal-500 anchor, teal-100 either side, gray-100 others.                                                                                                                                                    |
| `src/components/create/DateTimePopover.tsx`      | Wrapper around **react-aria** DatePicker + TimeField; value/onChange as ISO string; design system classes on all elements. See section 7.                                                                                                                                                                                                                   |

**Files to modify**

| File                                                                              | Changes                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [CreateHackDay.tsx](../src/pages/CreateHackDay.tsx)                               | Replace step 2 body with `<ScheduleStep timezone={timezone} schedule={...} onScheduleChange={...} />`. Replace the 9 schedule `useState` + timezone with a single `schedule` state object (or keep timezone separate) and one `setSchedule` (or callback that returns full schedule). Ensure `buildPayload()` still receives `schedule` in the same shape (timezone + 9 ISO strings). |
| [convex/hackdays.ts](../convex/hackdays.ts)                                       | No change to payload type. Optional: export a constant phase order list for consistency.                                                                                                                                                                                                                                                                                              |
| Forge macro [App.tsx](../forge-native/static/macro-frontend/src/App.tsx)          | If/when the inline wizard is restored: import and render the same `ScheduleStep` (or a Forge-build-specific path), and keep passing the same 9 schedule fields into `WizardDraftState` and `CreateInstanceDraftInput.schedule`.                                                                                                                                                       |

**Shared types**  
Define a small `ScheduleStepPhaseId` type and the cascade rule type (e.g. in `src/components/create/types.ts` or next to the engine) so the engine and UI agree on phase keys and order.

---

## 5. Props and state shape (ScheduleStep)

**Props (into ScheduleStep)**

- `timezone: string` — e.g. `Europe/London`.
- `schedule: { timezone?: string; registrationOpensAt?: string; ... }` — current full schedule (all 9 + timezone) so the component can initialise anchor and overrides from existing wizard state.
- `onScheduleChange: (schedule: Schedule) => void` — parent updates its state; payload shape matches `CreateHackDayWizardPayload.schedule`.

**Internal state**

- `anchor: Date | null` — "When does the hacking start?" (from `schedule.hackingStartsAt` on init, then user or cascade).
- `overrides: Set<PhaseId>` or `Map<PhaseId, string>` — which phases have been manually edited; for those, store the ISO string (or Date) so we don't overwrite on anchor change.
- Optional: debounced `onScheduleChange` when anchor or overrides change so parent always has a valid schedule for "Next" / "Create".

**Existing schedule on arrival**

If the component receives a `schedule` prop that already contains populated date values (user returning to edit a draft), **treat all 9 existing dates as manual overrides**. Do not attempt to reverse-engineer the anchor from existing data. Set the anchor to `schedule.hackingStartsAt` if present, and populate the overrides map with all other non-null date values. The user will see their existing dates intact, each card in overridden state, with "Reset to suggested" available on each. This is simpler and safer than inferring cascade intent from saved data.

**Derived**

- `suggested = computeSuggestedSchedule(anchor, timezone)`.
- `resolved = mergeWithOverrides(suggested, overrides)`.
- Validation: compare consecutive `resolved` dates; if any pair is out of order, mark that connector with a warning.

---

## 6. Cascade engine design

- **Rules table:** Array of `{ phaseId, label, offsetDays }` in display order. Offset in days from anchor (negative = before, positive = after). Same time-of-day as anchor.
- **Algorithm:** Given `anchor: Date` and `timezone: string`, for each phase compute `new Date(anchor)` plus `offsetDays` in that timezone (use `Intl` or a small date lib so DST is consistent). Output a map `PhaseId → ISO string`.
- **Overrides:** When user edits a phase, add that phase to `overrides` and store the chosen datetime. When anchor changes, recompute only non-overridden phases; overridden ones keep their stored value. "Reset to suggested" clears that phase from overrides.
- **Edge case:** If the user has overridden many phases and then changes the anchor, some overrides might now be out of order; validation should flag that on the connectors.

---

## 7. Date-time popover approach

**Requirement:** No raw browser `datetime-local` in the main card (styled inline date-time popover).

**Library:** Do **not** use react-datepicker. Use **react-aria** DatePicker and TimeField from `@react-aria/datepicker` and `@react-stately/datepicker`. These have first-class accessibility, work correctly inside iframes, and give full styling control. If the project already has any `@react-aria` or `@react-spectrum` packages installed, use those versions for consistency.

**Component:** Wrap everything in a single `DateTimePopover.tsx` component that:

- Accepts `value` as an ISO string.
- Outputs an ISO string on change via `onChange`.
- Applies design system classes to all elements (trigger, popover, calendar, time fields).

Ensure the popover is portalled or positioned so it is not clipped inside the Forge iframe (z-index and overflow).

---

## 8. Dependencies

- Add **@react-aria/datepicker** and **@react-stately/datepicker** (and their peer dependencies, e.g. **@internationalized/date** if not already present). Use existing **@react-aria** / **@react-spectrum** versions if the project already has them.
- If timezone handling is non-trivial, consider `date-fns-tz` or keep using native `Intl`/Date for offset math. Avoid adding a heavy moment-style bundle.

---

## 9. Visual and interaction details

**Anchor question (centrepiece)**

The anchor input must be **visually distinct** from the phase cards below. Use a **dedicated section** with:

- A larger Tier 1/2 heading: **"When does hacking start?"**
- A short subtitle in Tier 4: **"All other dates will be calculated from this"**
- A **prominent styled date-time trigger** (the same DateTimePopover component, but with stronger visual weight so it feels like the centrepiece of the step, not the first item in a list).

**Layout:** Single column; anchor section at top; then vertical stack of phase cards. Between each pair of cards: dashed connector line + duration pill (see below) and optional warning for order violations only.

**Phase card:** Left border `border-l-2 border-teal-500`, `rounded-xl`, padding `p-5`, background/border per design system card. Phase icon, phase name (Tier 2), date-time control (popover trigger). If overridden, show "Reset to suggested" (Tier 4).

**Duration pills (between cards):** Human-readable labels only. **"Same day"** for 0 days gap, **"X days"** for 1 or more. If any gap is **negative (overlap)**, show **"Overlap"** in **amber** on the pill. Reserve the **connector warning slot** for **sequence order violations only** (phase end after next phase start).

**Cascade animation:** When the anchor changes and downstream dates recalculate, animate **only the date value text** inside each affected phase card. Apply a **150 ms background-color transition** from **teal-50** to **transparent** on the **date display element only**. No movement, reflow, spring, sliding, or card opacity.

**Mini timeline bar:** **Equal-width segments**, one per phase, in phase order. Each segment: phase name (Tier 4, truncated) + resolved date (Tier 4). **Teal-500** for anchor phase, **teal-100** for phases either side, **gray-100** for all others. Read-only.

---

## 10. Implementation order

**Checkpoints:** Stop for review after steps 1, 3, 5, and 7 (see section 15). Do not implement all steps in one pass.

1. **Cascade engine and types** — Implement `CascadeScheduleEngine.ts` and shared phase IDs/order. **Unit-test** `computeSuggestedSchedule` and `mergeWithOverrides` with a fixed anchor and timezone **before building any UI**.
2. **DateTimePopover** — Add **@react-aria/datepicker** and **@react-stately/datepicker** (or use existing). Implement `DateTimePopover.tsx`: value/onChange as ISO string, design system classes. Use in a single PhaseCard first.
3. **PhaseCard** — One phase: icon, label, popover, override state, "Reset to suggested". Hook to engine suggested value and override map. Add 150 ms teal-50 → transparent background transition on the **date display element only** when value is recalculated from cascade.
4. **PhaseConnector** — Dashed line, duration pill ("Same day", "X days", or "Overlap" in amber); warning slot only for sequence order violations (`warning?: string`).
5. **ScheduleStep** — Compose **dedicated anchor section** (Tier 1/2 heading, Tier 4 subtitle, prominent date-time trigger), timezone, list of PhaseCards and PhaseConnectors from phase order, validation logic, and `onScheduleChange`. Initialise overrides from existing schedule when present. **Do not yet wire into CreateHackDay.**
6. **ScheduleMiniTimeline** — **Equal-width** segments, one per phase; phase name (Tier 4, truncated) + resolved date (Tier 4); teal-500 / teal-100 / gray-100. Place below the stack in ScheduleStep.
7. **Replace step 2 in CreateHackDay** — Remove 9 inputs and timezone input; render ScheduleStep; reduce state to one `schedule` object (or timezone + schedule) and ensure buildPayload() and validation (e.g. go_live checks) still work.
8. **Polish** — Cascade animation, accessibility, and Forge iframe check.

---

## 11. Forge CustomUI constraints and risks

- **Iframe:** Layout must be single column; avoid fixed pixel widths that break in narrow iframes.
- **No native datetime-local:** Popover approach avoids browser-default styling and behaviour in iframes.
- **z-index and overflow:** Popovers must render so they are not clipped; ensure portal target is inside the iframe document if applicable.
- **Validation:** The existing go_live check must still pass; the new step should always emit a full schedule when anchor is set and honour overrides.

---

## 12. Risks and mitigations

| Risk                      | Mitigation                                                                       |
| ------------------------- | --------------------------------------------------------------------------------- |
| Date/time library styling | Wrap in single component; use design system classes.                              |
| Timezone edge cases (DST) | Use same timezone for all phases; prefer `Intl` or small lib for add-days in zone. |
| Forge macro out of sync   | Keep payload shape identical; document reuse of ScheduleStep.                     |
| Override vs suggested     | Clear "Reset to suggested"; subtle styling for non-overridden vs overridden.      |

---

## 13. Design system reference summary

- **Colour:** Teal only for accent (`teal-500`); semantic amber/red for warnings; gray for neutrals.
- **Cards:** `rounded-xl`, `border border-gray-200` (light) / `border-gray-700` (dark), `p-5`; hero-style left accent `border-l-2 border-teal-500`.
- **Spacing:** `gap-6` between sections; `space-y-3` / `gap-3` for tight groups; 12px multiples.
- **Typography:** Tier 1 page title; Tier 2 section/phase names; Tier 3 body and date display; Tier 4 meta and "Reset to suggested".
- **Buttons/controls:** `rounded-lg` (no pills); primary teal. Per [HackDay_Design_system.md](HackDay_Design_system.md).

---

## 14. Build refinements (implementation checklist)

- **Anchor:** Dedicated section; Tier 1/2 "When does hacking start?", Tier 4 "All other dates will be calculated from this"; prominent date-time trigger; centrepiece.
- **Date-time:** Use **@react-aria/datepicker** and **@react-stately/datepicker** (not react-datepicker). Single `DateTimePopover.tsx`: value/onChange ISO string, design system classes.
- **Mini timeline:** Equal-width segments only; phase name (Tier 4, truncated) + date (Tier 4); teal-500 anchor, teal-100 either side, gray-100 others; read-only.
- **Duration pills:** "Same day" (0 days), "X days" (1+), "Overlap" in amber for negative gap; connector warning slot **only** for sequence order violations.
- **Cascade animation:** 150 ms background-color transition (teal-50 → transparent) on **date display element only**; no movement, reflow, spring, sliding, or card opacity.
- **Existing schedule:** If schedule has populated dates on mount, set anchor = `schedule.hackingStartsAt` and treat **all 9 dates as overrides**; do not reverse-engineer anchor.
- **Order:** Unit-test cascade engine before any UI. Then implement in section 10 order.

---

## 15. Checkpoints (stop for review)

Do **not** implement all steps in one pass. Stop and wait for review at the following points:

| After step                                                | Deliverable                 | Before proceeding                                                                                      |
| --------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Step 1** (cascade engine + types)                       | Engine code and test output | Show the engine code and test output before building any UI.                                           |
| **Step 3** (PhaseCard + DateTimePopover working together) | Single card rendering       | Show a screenshot or description of a single card rendering correctly before composing the full stack. |
| **Step 5** (ScheduleStep composed, not yet wired)         | Full step component         | Review before touching the live wizard flow (CreateHackDay).                                           |
| **Step 7** (CreateHackDay integration complete)          | Wizard flow end-to-end      | Final review before polish (step 8).                                                                   |

**React-aria / @internationalized/date:** If you encounter any ambiguity in the react-aria DatePicker API or the @internationalized/date types, **stop and ask** rather than improvising a workaround.
