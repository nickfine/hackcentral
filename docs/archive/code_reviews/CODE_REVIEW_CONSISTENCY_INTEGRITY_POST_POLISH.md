# Code Review: Consistency & Integrity (Post–Final 5–10% Polish)

**Date:** Feb 1, 2026  
**Scope:** Consistency and integrity of the codebase after the Final 5–10% Polish Pass (v0.6.14). Builds on CODE_REVIEW_CONSISTENCY_INTEGRITY_FEB1.md.

---

## 1. Summary

| Area | Status | Notes |
|------|--------|--------|
| **Shared components** | ✅ Aligned | SectionHeader (titleSuffix, titleId, action size); PersonCard, StatCard, BadgeGroup (+N tooltip); card padding p-5/p-6, focus-visible, hover |
| **People** | ✅ Aligned | SectionHeader with count badges; space-y-10 between sections; PersonCard usage |
| **Dashboard** | ✅ Aligned | WelcomeHero subtitle; FeaturedHacks ArrowRight; QuickActions FAB theme + hover |
| **Team Pulse** | ✅ Aligned | CollectiveProgressCard SectionHeader, progress theme; EnhancedMetricCard; Gini theme + Info; Export btn-sm |
| **Our Hacks** | ✅ Aligned | HackCard/AssetCard/ProjectCard verified badge, padding, focus; Library Featured inset shadow; Hacks sticky header; SkeletonGrid for featured |
| **AssetDetailContent** | ⚠️ Minor gap | Verified badge and SimilarHackCard still use old style + hardcoded green |
| **Theme colors** | ⚠️ Optional | Some badges/fallbacks still use hardcoded green/gray; auth/setup flows use gray palette |

---

## 2. What’s Consistent

### 2.1 Page & section headers

- **SectionHeader** is used for page titles where applicable: People, Team Pulse, Hacks, Library, Projects, Profile, Search, Notifications, Guide, Onboarding, ProfileAccount.
- **titleSuffix** is used for count badges on People (“HackCentral Helpers (12)”, “Hackers (12)”).
- **titleId** is used where needed for a11y (CollectiveProgressCard, modals).
- **action.size: 'sm'** is used for Team Pulse Export; other pages use default `btn-md`.

### 2.2 Card patterns

- **Padding:** PersonCard, StatCard, HackCard, Library AssetCard, Projects ProjectCard use `p-5 md:p-6` or `p-6`. CollectiveProgressCard uses `p-5 md:p-6`. EnhancedMetricCard uses `p-6`.
- **Hover:** Interactive cards use `hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 ease-out` (or equivalent).
- **Focus:** PersonCard, StatCard, HackCard, AssetCard (Library), ProjectCard, QuickActionsPanel FAB use `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`.

### 2.3 Verified badge (main grids)

- **HackCard** (dashboard): `absolute top-3 right-3 size-5 bg-[var(--color-success)] text-white rounded-full p-0.5`, `aria-label="Verified"`.
- **Library AssetCard**: Same.
- **Projects ProjectCard**: No verified badge (project status only).

### 2.4 Loading & empty states

- **Library:** SkeletonGrid for featured (4 cols) and all-assets (3 cols); EmptyState for no results.
- **People:** SkeletonGrid (compact) while loading; EmptyState for no profiles / no matches.
- **Projects:** EmptyState for no projects / no matches; custom ProjectPlaceholder for loading (optional to keep).
- **Search / Notifications / Profile:** SkeletonCard or EmptyState where appropriate.

### 2.5 Spacing

- **People:** `space-y-10` between HackCentral Helpers and Hackers sections.
- **Card internals:** `space-y-4` used in PersonCard, AssetCard (Library), ProjectCard, EnhancedMetricCard, StatCard where applicable.

---

## 3. Gaps & Recommendations

### 3.1 AssetDetailContent (verified badge & theme)

**Location:** `src/components/library/AssetDetailContent.tsx`

- **Hero “Verified” pill:** Uses `Check` with `text-green-600`. Prefer theme: `text-[var(--color-success)]` or utility `text-success` if defined.
- **SimilarHackCard (carousel):**
  - Verified badge: Still `absolute top-0 right-0 w-6 h-6 … bg-green-600 … rounded-bl-md`. Should match grid cards: `absolute top-3 right-3 size-5 bg-[var(--color-success)] text-white rounded-full p-0.5`.
  - Card padding: Uses `p-4` and `pr-8` when verified. Optional: align to `p-5 md:p-6` and drop `pr-8` with the new badge position.

**Recommendation:** Update verified badge and Check color in AssetDetailContent for consistency with HackCard/Library AssetCard.

### 3.2 ProjectPlaceholder (Projects.tsx)

**Location:** `src/pages/Projects.tsx` — `ProjectPlaceholder`

- Uses `card p-4`; ProjectCard uses `p-5 md:p-6`. Low impact (skeleton only).

**Recommendation:** Optional: change to `p-5 md:p-6` for visual consistency when loading.

### 3.3 Hardcoded colors (optional follow-up)

These still use Tailwind green/gray (or hex) rather than theme variables:

- **BadgeGroup.tsx:** `verified: 'bg-green-100 text-green-800 border border-green-200'`. Could use `bg-success/10 text-success border-success/30` (or theme vars) if design allows.
- **PersonCard.tsx:** `EXPERIENCE_BADGE_CLASSES` uses `bg-gray-100`, `bg-green-50`, etc. for experience levels. Intentional palette; optional to map to theme where it fits.
- **constants/project.ts:** `completed: 'bg-green-100 ...'`, `archived: 'bg-gray-100 ...'`. Shared constants; change only if standardizing all badges to theme.
- **ProjectDetail.tsx:** One badge `bg-green-100 text-green-800 border-green-200`.
- **Projects.tsx:** Fallback for status badge `bg-gray-100 text-gray-800 border-gray-200`.
- **ProfileSetup.tsx / AuthGuard.tsx / SignUpButton.tsx:** Full gray/green palette for auth and setup. Often kept as-is for that flow.

**Recommendation:** Treat as optional polish; prioritize AssetDetailContent verified badge and Check color first.

### 3.4 Raw `<h2>` section titles

- **Library:** “Featured Hacks”, “Graduated hacks” use `<h2 className="text-xl font-semibold">`. Section-internal; no change required.
- **Team Pulse:** “Knowledge Distribution”, “Frontline vs leader contributions” use `<h2>`. Same; hierarchy is correct.

No change required for consistency.

---

## 4. Integrity Checks

- **No broken imports or refs:** SectionHeader, PersonCard, BadgeGroup, StatCard, EmptyState, SkeletonGrid, ModalWrapper used from shared or local paths correctly.
- **Sticky Hacks header:** Wrapper `sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2` around SectionHeader on Hacks page; no layout regressions observed.
- **CollectiveProgressCard:** Uses SectionHeader with `titleId="collective-progress-heading"`; progress bar uses `bg-border/50` and `from-[var(--color-primary-600)] to-[var(--color-primary-400)]`.
- **GiniRadialProgress:** Uses `var(--color-success)`, `var(--color-warning)`, `var(--color-destructive)`.

---

## 5. Checklist (post–polish)

- [x] SectionHeader used for page titles; titleSuffix for counts where needed.
- [x] Interactive cards use p-5/p-6, space-y-4, hover lift, focus-visible ring.
- [x] Verified badge on HackCard and Library AssetCard: top-3 right-3, theme success, rounded-full.
- [x] People: count badges and space-y-10 between sections.
- [x] Dashboard: subtitle muted; Browse All Hacks with ArrowRight; FAB theme + hover.
- [x] Team Pulse: CollectiveProgressCard SectionHeader; progress theme; stat cards; Gini Info + theme colors; Export btn-sm.
- [x] Hacks: sticky header; Library Featured inset shadow; SkeletonGrid for featured loading.
- [ ] **Optional:** AssetDetailContent verified badge + Check color aligned with grid cards.
- [ ] **Optional:** ProjectPlaceholder padding; theme-based badge classes where appropriate.

---

## 6. Conclusion

The codebase is **consistent and intact** after the Final 5–10% Polish Pass. Remaining items are **optional** and localized:

1. **Recommended:** Align AssetDetailContent verified badge and Check icon with the new theme and position used on HackCard/Library AssetCard.
2. **Optional:** ProjectPlaceholder padding; replacing remaining hardcoded green/gray in badges with theme vars where it fits product and design.

No blocking consistency or integrity issues were found.
