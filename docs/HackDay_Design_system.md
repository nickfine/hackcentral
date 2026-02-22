# HackDay 2026 Design System

> Authoritative visual reference for all HackDay 2026 UI surfaces.
> Derived from iterative dashboard refinement (Feb 2026).
> Attach this document to every Codex task that touches UI.

---

## 1. Colour Palette

### Primary accent

| Token | Value | Usage |
|-------|-------|-------|
| `teal-500` | `#14b8a6` | Primary CTA backgrounds, active nav states, active phase indicator, hero left-border accent, imminent date badges |
| `teal-500/10` | `rgba(20,184,166,0.1)` | Icon background tints (e.g. hero icon circle) |

Teal is the **only** accent colour. Nothing else competes with it for attention.

### Semantic status (used exclusively on status indicators, never as decoration)

| Colour | Token | Meaning |
|--------|-------|---------|
| Green | `emerald-500` | Complete, ready, active, healthy |
| Amber | `amber-500` | Warning, pending, unassigned |
| Red | `red-500` | Blocked, critical, error |

### Avatar palette (deterministic, hash-based assignment)

Assign based on a hash of the user's display name, modulo 5. All hues share consistent saturation and lightness so they sit comfortably next to teal.

| Index | Name | Light mode | Dark mode |
|-------|------|------------|-----------|
| 0 | Slate blue | `hsl(215, 40%, 45%)` | `hsl(215, 40%, 55%)` |
| 1 | Warm gray | `hsl(30, 20%, 50%)` | `hsl(30, 20%, 60%)` |
| 2 | Dusty rose | `hsl(350, 35%, 50%)` | `hsl(350, 35%, 60%)` |
| 3 | Sage | `hsl(150, 30%, 45%)` | `hsl(150, 30%, 55%)` |
| 4 | Muted gold | `hsl(40, 40%, 48%)` | `hsl(40, 40%, 58%)` |

No other colours should appear on avatar circles. If a colour exists on the page that is not teal, not a semantic status colour, and not from this avatar set, it should be a neutral gray.

### Neutrals

Use Tailwind's `gray` scale consistently. Do not mix `slate`, `zinc`, or `neutral` scales.

---

## 2. Typography

### Four-tier hierarchy

Every text element on every page must belong to exactly one tier.

| Tier | Purpose | Size | Weight | Example |
|------|---------|------|--------|---------|
| 1 - Page title | One per page, primary heading (Dashboard, Schedule, Rules, Hack Ideas & Teams) | `text-4xl sm:text-5xl` (2.25rem / 3rem) | `font-black` | "Hack Ideas & Teams", "Schedule", "Rules", "Mission status" |
| 2 - Section context | Key callouts, actionable context | `text-lg` (1.125rem) | `font-semibold` | "Next action: Find a Team" |
| 3 - Body | Descriptive text, feed items, labels | `text-sm` (0.875rem) | `font-normal` | "Maya Rodriguez joined Rescue House" |
| 4 - Meta/timestamp | Relative times, footers, sublabels | `text-xs` (0.75rem) | `font-normal` | "2m ago", "UNTIL NEXT PHASE" |

**Page title (Tier 1):** Use `text-4xl sm:text-5xl font-black tracking-tight` with the page’s primary text colour (e.g. `text-text-primary` or design-system Tier 1 colours) so that Dashboard, Schedule, Rules, and Hack Ideas & Teams share the same large title treatment.

### Tier colour mapping

| Tier | Light mode | Dark mode |
|------|------------|-----------|
| 1 | `text-gray-900` | `text-white` |
| 2 | `text-gray-800` | `text-gray-100` |
| 3 | `text-gray-700` | `text-gray-300` |
| 4 | `text-gray-500` | `text-gray-400` |

### Rules

- If a text element does not fit a tier, it is the wrong size or weight
- **Page titles** (one per page on Dashboard, Schedule, Rules, Hack Ideas & Teams): use `text-4xl sm:text-5xl font-black tracking-tight` for consistency across these main app pages
- Section headings and subpage titles (e.g. within a detail view) use `text-2xl font-bold` where a smaller heading is appropriate
- Hero headings and main page titles are Tier 1 with the large size above; in-card or detail-view headings may use Tier 2
- Metric numbers (e.g. Event Pulse counts) use Tier 3 size with `font-semibold`

---

## 3. Spacing

### Base unit: 24px (`gap-6` / `space-y-6`)

| Context | Value | Tailwind |
|---------|-------|----------|
| Between major sections (card to card) | 24px | `gap-6` / `mb-6` |
| Major page section breaks | 48px | `gap-12` / `mb-12` |
| Internal card padding | 20px | `p-5` |
| Tight internal spacing (feed items, metric rows) | 12px | `gap-3` / `space-y-3` |
| Section label to card content below it | 8px | `pb-2` |

### Rules

- Every vertical gap must snap to a multiple of 12px
- No arbitrary spacing values
- Horizontal gaps between side-by-side cards: 24px (`gap-6`)
- Consistent padding within all cards: `p-5`

---

## 4. Cards

### Standard card

| Property | Light mode | Dark mode |
|----------|------------|-----------|
| Background | `white` | `gray-800` or current dark surface |
| Border | `border border-gray-200` | `border border-gray-700` |
| Radius | `rounded-xl` | `rounded-xl` |
| Shadow | `shadow-sm` | none |

### Hero card

| Property | Light mode | Dark mode |
|----------|------------|-----------|
| Background | `white` | `gray-900` |
| Left accent | `border-l-2 border-teal-500` | `border-l-2 border-teal-500` |
| Other borders | `border border-gray-200` | `border border-gray-700` |
| Radius | `rounded-xl` | `rounded-xl` |
| Shadow | `shadow-sm` | none |
| Logo | `filter: saturate(0.6)` | `filter: brightness(1.25) saturate(0.85)` |

No gradients on any cards. Ever.

### Card rules

- No coloured card borders except the hero's teal left accent
- Section labels (YOUR READINESS, LIVE ACTIVITY, etc.) live **inside** the card as the first element
- Section labels: uppercase, `text-xs`, `font-semibold`, `tracking-wider`, `text-gray-500` (light) / `text-gray-400` (dark)
- Card footer zones (links like "View all activity"): separated by `border-t border-gray-100` (light) / `border-t border-gray-700` (dark), with `pt-3 mt-3` spacing. Footer links use `font-medium`.

---

## 5. Buttons

### Primary action (e.g. "Open Next Step")

| Property | Value |
|----------|-------|
| Background | `bg-teal-500` |
| Text | `text-white` |
| Radius | `rounded-lg` (not `rounded-full`) |
| Size | Standard app button - `text-sm`, moderate horizontal padding |
| Hover | `bg-teal-600` |

### Rules

- No pill-shaped buttons (`rounded-full`) anywhere in the application
- All primary buttons use the same teal treatment for consistency
- Secondary/ghost buttons: `border border-gray-300` (light) / `border border-gray-600` (dark) with transparent background
- Button size should be consistent across all pages - the hero CTA should not be larger than primary buttons elsewhere

---

## 6. Status indicators

### Readiness pills

| State | Dot colour | Text colour |
|-------|-----------|-------------|
| Complete/Ready | `emerald-500` | `emerald-600` (light) / `emerald-400` (dark) |
| Warning/Pending | `amber-500` | `amber-600` (light) / `amber-400` (dark) |
| Blocked/Not ready | `red-500` | `red-600` (light) / `red-400` (dark) |

### Readiness strip (container for pills)

| Mode | Background | Border |
|------|------------|--------|
| Light | `bg-gray-50` | `border border-gray-200 rounded-lg` |
| Dark | `bg-gray-800/50` | `border border-gray-700 rounded-lg` |

The strip should be barely visible. The pills carry the colour information.

### Progress bars

| Element | Light mode | Dark mode |
|---------|------------|-----------|
| Fill | `bg-teal-500` (solid, single tone, no gradient) | `bg-teal-500` |
| Track | `bg-gray-200` | `bg-gray-700` |

### Date badges

| State | Light mode | Dark mode |
|-------|------------|-----------|
| Imminent/active | `bg-teal-500 text-white` | `bg-teal-500 text-white` |
| Future | `bg-gray-100 text-gray-500` | `bg-gray-700 text-gray-400` |

### Live indicator

Green dot + "Live" text only. No pill background, no tinted container.

| Element | Light mode | Dark mode |
|---------|------------|-----------|
| Dot | `bg-emerald-500` | `bg-emerald-500` |
| Text | `text-gray-500` | `text-gray-400` |

---

## 7. Navigation

### Phase stepper

The phase stepper is a subtle progress indicator, not a navigation bar.

| Element | Treatment |
|---------|-----------|
| Label size | `text-xs` |
| Active phase | `text-teal-500 font-semibold` |
| Completed phases | `text-gray-500` (light) / `text-gray-300` (dark) |
| Future phases | `text-gray-400` in both modes |
| Connector lines | `1px` thickness |
| Active/completed connector | `bg-teal-500` |
| Future connector | `bg-gray-200` (light) / `bg-gray-700` (dark) |

---

## 8. Metric displays (Event Pulse pattern)

| Element | Light mode | Dark mode |
|---------|------------|-----------|
| Label | `text-gray-600`, `font-normal`, `text-sm` | `text-gray-300`, `font-normal`, `text-sm` |
| Number | `text-gray-900`, `font-semibold`, `text-sm` | `text-white`, `font-semibold`, `text-sm` |
| Row separator | `border-b border-gray-100` | `border-b border-gray-700` |

Section zone dividers (e.g. between metrics and "Coming Up"): `border-t` with `pt-4` breathing room.

---

## 9. Activity feeds

| Element | Treatment |
|---------|-----------|
| Avatar circle | 32px, `rounded-full`, colour from avatar palette |
| Avatar initials | `text-xs`, `font-semibold`, `text-white` |
| User name in text | `font-semibold` (Tier 3 size) |
| Action verb | `font-normal` (Tier 3 size) |
| Target name | `font-semibold` (Tier 3 size) |
| Timestamp | Tier 4 meta treatment |
| Item spacing | 12px between items |

---

## 10. Dark mode rules

- Dark mode is not an afterthought - every component must be designed for both modes simultaneously
- Dark mode surfaces: `gray-900` (page background), `gray-800` (card background)
- Never rely on shadow for card definition in dark mode - use borders instead
- Text contrast must meet WCAG AA minimum in both modes
- Test every change in both modes before considering it complete
- The hero logo needs a brightness/saturation filter in dark mode to remain visible

---

## 11. Anti-patterns (never do these)

- ❌ Gradients on cards or surfaces
- ❌ Pill-shaped buttons (`rounded-full`)
- ❌ Random or uncontrolled avatar colours
- ❌ Section labels floating outside their cards
- ❌ More than one accent colour competing with teal
- ❌ Text sizes larger than `text-2xl`
- ❌ Arbitrary spacing values that don't snap to 12px multiples
- ❌ Dark strips/bars in light mode cards
- ❌ Mixing Tailwind gray scales (stick to `gray`, not `slate`/`zinc`/`neutral`)
- ❌ Using status colours (green/amber/red) as decoration
- ❌ Marketing-style CTAs (oversized, pill-shaped, gradient backgrounds)

---

## 12. Applying to new pages

When working on any page that is not yet aligned with this design system:

1. Screenshot the current state in both light and dark modes
2. Audit every element against this document - identify deviations
3. Write a remediation prompt that references specific sections of this design system
4. Execute fixes and verify both modes
5. Repeat if needed - expect 2-3 passes for complex pages

This document is the single source of truth. If a visual decision is not covered here, discuss it before implementing, and add the decision to this document once agreed.
