# Plan: Dashboard Polish (2026 Enterprise Aesthetic)

**Goal:** Highly polished, spacious, scannable dashboard with 8-point spacing, consistent grids, and professional hierarchy.

**Status:** Implemented  
**Reference:** Conversation summary (dashboard redesign), CODE_REVIEW_* docs

---

## Design principles

| Principle | Target |
|-----------|--------|
| **Spacing** | 8-point system (multiples of 4/8) for `p-*`, `gap-*` |
| **Page** | Generous outer padding; breathing room from header |
| **Grid** | Responsive columns; consistent gutters (`gap-6 md:gap-8`) |
| **Cards** | `rounded-xl`, subtle shadow, hover lift; internal `p-6` |
| **Typography** | Clear hierarchy; `text-lg` titles, `leading-relaxed` body |
| **Colors** | Soft borders (`gray-200`), light shadows, optional `bg-gray-50/50` hover |

---

## Workstreams and implementation order

| Order | Workstream | Key deliverables |
|-------|------------|-------------------|
| 1 | **Layout & page** | Main padding, section spacing, `space-y-10 lg:space-y-12` |
| 2 | **Featured / Latest Hacks grid** | `lg:grid-cols-3 2xl:grid-cols-4`, `gap-6 md:gap-8`, card styling |
| 3 | **HackCard** | Padding, title/description/metadata/buttons; hover `-translate-y-0.5` |
| 4 | **Recognition (Wall of Thanks)** | `p-8 lg:p-10`, `min-h-[220px]`, `rounded-xl` |
| 5 | **Sidebar & nudges** | Consistent padding; EngagementNudge, PersonalizedNudge polish |

---

## Concrete file/function changes (done)

### 1. Layout & page
- [x] **Layout.tsx**: Main padding → `px-6 py-8 md:px-8 lg:px-10 lg:pt-10 lg:pb-12 xl:px-12`.
- [x] **Dashboard.tsx**: Root `space-y-6` → `space-y-10 lg:space-y-12`; nudge card `p-6 sm:p-8 rounded-xl`, internal `gap-6`; recognition grid `gap-6 md:gap-8`; recognition cards `p-8 lg:p-10 rounded-xl min-h-[220px] flex flex-col`; badge heading `mb-6 gap-3`; badge lists `gap-3 mt-auto`.

### 2. Featured / Latest Hacks grid
- [x] **FeaturedHacksShowcase.tsx**: Section `space-y-6`; header row `gap-4`; grid `gap-6 md:gap-8 lg:grid-cols-3 2xl:grid-cols-4`; low-content blocks `p-8`, `mb-4`.

### 3. HackCard
- [x] **HackCard.tsx**: Card `p-6`, remove min/max width; `rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`; title `text-lg mb-3 leading-snug`; description `leading-relaxed mb-4`; badge row `mb-4 gap-3`; metadata `mt-auto gap-3`; buttons `gap-3 mt-4`; hover animation `y: -2`.

### 4. Recognition (Wall of Thanks)
- [x] **WallOfThanksStrip.tsx**: Container `min-h-[220px] rounded-xl p-8 lg:p-10`; inner `gap-6`.

### 5. Sidebar & nudges
- [x] **Sidebar.tsx**: Nav area `py-6 px-4`.
- [x] **EngagementNudge.tsx**: `px-5 py-4 sm:px-6 gap-4`.
- [x] **PersonalizedNudge.tsx**: `p-6 rounded-xl gap-4`.

---

## Done (check off)

- [x] 8-point spacing applied across dashboard, cards, grids.
- [x] Page padding and section spacing increased.
- [x] Latest Hacks grid: responsive columns and gutters.
- [x] HackCard: padding, hierarchy, hover, metadata/buttons.
- [x] Wall of Thanks: larger padding and min-height.
- [x] Sidebar and nudge components aligned.

---

## Next steps (optional)

| Step | Action |
|------|--------|
| **Visual review** | Run app; review dashboard on viewports (mobile, tablet, desktop) for spacing and hierarchy. |
| **Accessibility** | Confirm focus order and contrast on cards and CTAs. |
| **Tokens** | If desired, extract repeated values (e.g. `gap-6 md:gap-8`, `p-8 lg:p-10`) into Tailwind theme or shared constants for future consistency. |

---

## Notes

- All changes use Tailwind only; no custom CSS added.
- TypeScript and lint checks passed after implementation.
