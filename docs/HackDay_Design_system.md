# HackDay 2026 Design System

> Authoritative visual reference for all HackDay 2026 UI surfaces.
> The dashboard uses the **editorial dark UI system** (introduced v2.126.0, April 2026).
> Attach this document to every Codex task that touches UI.

---

## 1. Colour Palette

### Primary accent

| Token | Value | Usage |
|-------|-------|-------|
| `cyan-400` | `#22d3ee` | Phase badge, active timeline step, countdown tile numbers, stat card accent text, CTA backgrounds, progress bar fill |
| `cyan-400/10` | `rgba(34,211,238,0.1)` | Active phase tile background tint |
| `cyan-400/30` | `rgba(34,211,238,0.3)` | Active phase tile border |
| `--cyan-electric` | `#00f5ff` | Hero lightning bolt, nav active accent (CSS token) |

Cyan is the **only** accent colour. Nothing else competes with it for attention.

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

### Hero heading (dashboard only)

The dashboard hero uses **Fraunces** (the project’s heading typeface, loaded via `@fontsource/fraunces` and exposed as `--font-heading`). Apply as an inline style — Tailwind’s `font-serif` class does **not** map to Fraunces in this project’s config.

```jsx
// CORRECT
<h1 style={{ fontFamily: ‘var(--font-heading)’, lineHeight: 1.1 }}
    className="text-5xl font-semibold tracking-tight text-white lg:text-7xl">
  HackDay 2026
</h1>
```

### Eyebrow labels

Section eyebrows (e.g. "TOP PAIN POINTS", "UPCOMING SCHEDULE") use uppercase tracking:
`text-xs font-semibold uppercase tracking-[0.12em] text-white/50`

Phase badge: `rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300`

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

### Editorial card system (dashboard)

The dashboard uses flat dark cards. No glassmorphism, no gradient borders, no ambient effects.

| Property | Value |
|----------|-------|
| Background | `bg-white/[0.03]` (3% white, virtually invisible fill) |
| Border | `border border-white/8` (8% white border) |
| Radius | `rounded-[28px]` (large) or `rounded-[18px]` (inner cards) |
| Shadow | none |

Sub-cards within a container (e.g. countdown tiles, stat cards, schedule rows) use:
`bg-white/[0.06] rounded-[18px]` — slightly brighter fill, no border.

The dashboard page background is `bg-[#07111f]` (very dark blue-black). This is applied at the dashboard root, sitting inside AppLayout's background.

### Card rules

- No coloured card borders (cyan accent appears only on the active phase timeline step)
- Section eyebrows live **inside** the card as the first element, using the eyebrow label style above
- Card footer zones (links like "View full schedule"): `border-t border-white/8` with `pt-4 mt-4`. Footer links: `text-sm text-white/50 hover:text-white/80`.

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

- Dashboard primary CTA: `rounded-2xl bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-[#07111f]`
- Dashboard secondary CTA: `rounded-2xl border border-white/20 bg-white/8 px-6 py-2.5 text-sm font-semibold text-white`
- Non-dashboard pages: `rounded-lg bg-[var(--accent)] text-[var(--accent-on)]` (uses theme token)
- All primary buttons use the same cyan treatment for consistency on the dashboard
- Ghost buttons: `bg-transparent border border-transparent` with `hover:bg-arena-elevated`

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

### Editorial timeline (`EditorialTimeline`)

A seven-step horizontal row inside a `rounded-[24px] border border-white/8` container.

| Element | Treatment |
|---------|-----------|
| Container | `rounded-[24px] border border-white/8 p-4` |
| Step card | `flex-1 rounded-[16px] border border-white/6 p-3 text-center` |
| Active step | `border-cyan-400/30 bg-cyan-400/10` + label `text-cyan-300 font-semibold` |
| Inactive step | `text-white/50` label, `text-white/30` sub-status |
| Sub-status text | Phase open time (e.g. "Opens in 18d"), "Now", or "TBD" |

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

## 11. Gradient policy

Gradients are **prohibited** on panel fills and text — surfaces must be flat or translucent solid values.

Gradients are **permitted** in these contexts only:

| Context | Examples |
|---------|----------|
| Progress bars | Readiness bar fill (cyan → blue-600, `bg-gradient-to-r`) |
| Decorative watermark elements | Hero left-panel radial tint (`radial-gradient(ellipse at top-left, rgba(34,211,238,0.07), transparent)`) |
| AppLayout ambient | `body::before` / `body::after` background-image radial gradients (subtle nebula, scoped to the layout) |

No gradient borders. No ambient starfield. No outer glow box-shadows.

---

## 12. Anti-patterns (never do these)

- ❌ Gradients on panel fills or card surfaces
- ❌ Gradients on text
- ❌ `backdrop-filter: blur()` / glassmorphism on cards
- ❌ Gradient borders (mask-composite technique — retired with HoloPanel)
- ❌ Ambient starfield or nebula particle effects on the dashboard
- ❌ `HoloPanel`, `HoloHeroCard`, `HoloPhaseStepper`, `HoloKpiCard` — these components are deleted
- ❌ Random or uncontrolled avatar colours
- ❌ Section labels floating outside their cards
- ❌ More than one accent colour competing with cyan
- ❌ Arbitrary spacing values that don't snap to 12px multiples
- ❌ Using `font-serif` to target Fraunces — use `style={{ fontFamily: 'var(--font-heading)' }}` instead
- ❌ Using status colours (green/amber/red) as decoration
- ❌ Marketing-style CTAs with gradient backgrounds

---

## 13. Pain points editorial layout (`PainPointsSection`)

The pain points panel uses the editorial card system directly (no wrapper component).

| Zone | Styling |
|------|---------|
| Outer container | `rounded-[28px] border border-white/8 bg-white/[0.03] p-6` |
| Eyebrow | `text-xs font-semibold uppercase tracking-[0.12em] text-white/50` |
| Heading | `text-2xl font-semibold text-white` |
| Subtitle | `text-sm text-white/60` |
| Filter tabs | `rounded-full border px-4 py-1.5 text-sm font-medium` — active: `border-cyan-400/40 bg-cyan-400/10 text-cyan-300`, inactive: `border-white/10 text-white/40` |
| Composer | `rounded-[18px] bg-white/[0.04] border border-white/8 p-4` with raw `<textarea>` / `<input>` |
| Submit button | `rounded-xl bg-emerald-500 text-white text-sm font-semibold px-4 py-2` |
| Pain point card | `rounded-[18px] bg-white/[0.04] p-4` — vote tile left, content right |
| Vote tile | `rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-center` |
| Vote number | `text-lg font-bold text-white` |
| Tag pill | `rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/50` |
| Card action buttons | `rounded-lg border border-white/10 px-3 py-1 text-xs text-white/50 hover:text-white/80` |

**Form element decision**: Use raw `<textarea>`, `<input>`, `<button>` with the above Tailwind classes. The shared `TextArea`/`Input`/`Button` components from `components/ui/` target the shared design system tokens and would fight the editorial dark styling.

---

## 14. Applying to new pages

When working on any page that is not yet aligned with this design system:

1. Screenshot the current state in both light and dark modes
2. Audit every element against this document - identify deviations
3. Write a remediation prompt that references specific sections of this design system
4. Execute fixes and verify both modes
5. Repeat if needed - expect 2-3 passes for complex pages

This document is the single source of truth. If a visual decision is not covered here, discuss it before implementing, and add the decision to this document once agreed.
