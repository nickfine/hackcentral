# Code Review: Consistency & Integrity (Feb 1)

**Scope:** Align all major pages with the design system established on Dashboard and Profile (gold standard). Shared components live in `src/components/shared/`.

---

## 1. Summary

| Area | Status | Notes |
|------|--------|--------|
| **Dashboard** | ✅ Aligned | Uses ModalWrapper, design tokens |
| **Profile** | ✅ Aligned | SectionHeader, StatCard, ActivityItem, ModalWrapper, EmptyState, SkeletonCard |
| **Team Pulse** | ✅ Aligned | SectionHeader, dashboard components (Phase 2) |
| **People** | ✅ Aligned | SectionHeader, ModalWrapper (×2), SkeletonGrid, EmptyState (Phase 2) |
| **Hacks** | ✅ Aligned | SectionHeader, dynamic action (Phase 2) |
| **Library** | ✅ Aligned | SectionHeader (standalone), ModalWrapper, SkeletonGrid, EmptyState (Phase 2) |
| **Projects** | ✅ Aligned | SectionHeader (standalone), ModalWrapper, EmptyState, TabButton (Phase 2) |
| **ProjectDetail** | ✅ Aligned | min-w-0 space-y-6 layout (Phase 3); forms remain inline by design |
| **LibraryAssetDetail** | ✅ Aligned | SkeletonCard loading, min-w-0 space-y-6 (Phase 3) |
| **Guide** | ✅ Aligned | SectionHeader, min-w-0 (redesign Phase 4) |
| **Onboarding** | ✅ Aligned | SectionHeader, min-w-0 (redesign Phase 4) |
| **Notifications** | ✅ Aligned | SectionHeader, EmptyState, SkeletonCard, min-w-0 (redesign Phase 4) |
| **Search** | ✅ Aligned | SectionHeader, EmptyState, SkeletonCard loading, min-w-0 (redesign Phase 4) |
| **ProfileAccount** | ✅ Aligned | SectionHeader, min-w-0 (final review) |

---

## 2. Page headers

**Standard:** `SectionHeader` with `title`, optional `description`, optional `action` (primary/outline button).

- **People:** Uses raw `<h1 className="text-3xl font-bold tracking-tight">` + `<p className="text-muted-foreground mt-2">` + primary button. **Fix:** Use `SectionHeader` with `title="People"`, `description="Find HackCentral Helpers and mentors..."`, `action={{ label: "Get Paired with Mentor", icon: <UserPlus />, onClick }}`.
- **Team Pulse:** Raw `<h1 className="text-2xl font-bold">Team pulse</h1>`. **Fix:** Use `SectionHeader` with `title="Team Pulse"`; optional `action` for Export (outline).
- **Hacks:** Raw `<h1 className="text-3xl font-bold tracking-tight">Our Hacks</h1>` and tab-specific primary button. **Fix:** Use `SectionHeader` with dynamic `action` (Submit Hack vs New Project).
- **Library (standalone):** Same pattern when `!embedded`. **Fix:** Use `SectionHeader` when not embedded.
- **Projects (standalone):** Same when `!embedded`. **Fix:** Use `SectionHeader` when not embedded.

---

## 3. Modals

**Standard:** `ModalWrapper` (backdrop, card, title, close button, Escape, scroll).

- **People – ProfileDetailModal:** Custom `fixed inset-0 bg-black/50` + `card p-6`. **Fix:** Wrap content in `ModalWrapper` with `title="Profile"`, `maxWidth="md"`.
- **People – MentorRequestModal:** Same. **Fix:** `ModalWrapper` with `title="Request Mentoring"`, `maxWidth="2xl"`.
- **Library – SubmitAssetModal:** Same. **Fix:** `ModalWrapper` with `title="Submit Hack"`, `maxWidth="xl"`.
- **Projects – Create project modal:** Same; missing explicit close button in header. **Fix:** `ModalWrapper` with `title="New Project"`, `maxWidth="md"`.

---

## 4. Loading skeletons

**Standard:** `SkeletonGrid` + `SkeletonCard` (variant `default` | `compact` | `wide` | `stat`).

- **People:** Local `PlaceholderCard` × 3 in a grid. **Fix:** `<SkeletonGrid count={6} columns={3} variant="compact" />` (person-like cards).
- **Library:** Local `AssetPlaceholder` × 3. **Fix:** `<SkeletonGrid count={6} columns={3} />` (default card variant).
- **Projects:** Local `ProjectPlaceholder` × 3 with status badge. **Optional:** Keep custom placeholder for status, or use `SkeletonGrid` with default for consistency.

---

## 5. Cards & buttons

- **Cards:** Pages use `card p-4` or `card p-6` consistently. Library/Projects use `hover:shadow-md transition-shadow` on list cards; PersonCard uses `hover:scale-[1.02] hover:-translate-y-0.5`. No change required for this pass.
- **Buttons:** Profile/Dashboard use `btn btn-primary`, `btn btn-outline`. People/Hacks use `btn btn-primary btn-md`. `btn-md` exists in `globals.css`. **Fix (Hacks):** One branch uses long custom classes; replace with `btn btn-primary btn-md` for "Submit Hack".

---

## 6. Layout container

**Standard:** Main content wrapper `min-w-0 space-y-6` (or `space-y-6` only) for consistent spacing and overflow.

- **Team Pulse:** Already uses `min-w-0 space-y-6`.
- **People:** Uses `space-y-6` only. **Optional:** Add `min-w-0` for overflow safety.
- **Hacks / Library / Projects:** Use `space-y-6`. **Optional:** Add `min-w-0` when used as main content.

---

## 7. People – PersonCard vs ProfileCard

**PersonCard** (shared) expects `PersonCardProfile`: `capabilityTags: Array<{ id: string; label: string }>`. **ProfileCard** (local) uses API shape `capabilityTags: Id<'capabilityTags'>[]` + lookup. Migrating to PersonCard would require mapping `capabilityTags` to `{ id, label }` and passing `onClick`; otherwise keep ProfileCard and align styling (e.g. `rounded-xl border border-border`) in a later pass.

---

## 8. Integrity checks

- **Exports:** `src/components/shared/index.ts` exports all new components and types. ✅
- **Imports:** Dashboard and Profile use `@/components/shared` or `../components/shared`. Some pages use `../components/shared` or `@/components/shared`; no broken imports. ✅
- **Design tokens:** Cards use `border-border`, `bg-card`, `text-muted-foreground`; buttons use `btn btn-primary` / `btn-outline`. ✅
- **Accessibility:** Modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`. ModalWrapper centralizes this. ✅

---

## 9. Recommended next steps (Phase 2)

1. **Apply consistency fixes (this pass):**
   - People: SectionHeader, ModalWrapper for both modals, SkeletonGrid (compact) for loading.
   - Team Pulse: SectionHeader (title "Team Pulse", optional Export action).
   - Hacks: SectionHeader with dynamic action; unify "Submit Hack" button to `btn btn-primary btn-md`.
   - Library: ModalWrapper for SubmitAssetModal; SkeletonGrid for loading when `allAssets === undefined`.
   - Projects: ModalWrapper for create project modal; optionally SkeletonGrid for loading.
2. **Phase 3:** ProjectDetail modals/forms, LibraryAssetDetail, any remaining raw modals; consider PersonCard migration for People.
3. **Doc:** Update any "design system" or "component usage" doc to reference SectionHeader, ModalWrapper, SkeletonGrid for new pages.

---

## 10. Fixes applied (same session)

- **People:** SectionHeader (title + description + “Get Paired with Mentor”); ModalWrapper for ProfileDetailModal and MentorRequestModal; SkeletonGrid (compact) for loading; removed PlaceholderCard and duplicate modal markup; dropped unused `X` import.
- **Team Pulse:** SectionHeader (“Team Pulse” + “Export metrics” outline action); export logic moved into `handleExport`.
- **Hacks:** SectionHeader (“Our Hacks” + dynamic primary action “Submit Hack” / “New Project”); unified primary button to design system.
- **Library:** SectionHeader when not embedded (“Completed Hacks” + “Submit Hack”); ModalWrapper for SubmitAssetModal; SkeletonGrid for asset loading; removed AssetPlaceholder and unused `X` import.
- **Projects:** SectionHeader when not embedded (“Hacks In Progress” + “New Project”); ModalWrapper for create-project modal.
- **Build:** `npm run build` succeeds after removing unused `AssetPlaceholder` from Library.

---

## 11. Phase 3 (continuation)

- **ProjectDetail:** Main container uses `min-w-0 space-y-6` for layout consistency; close/readiness/sponsor/learning-summary forms remain inline (no overlay modals).
- **LibraryAssetDetail:** Loading state uses shared `SkeletonCard` (variant `wide`); page wrapper uses `min-w-0 space-y-6`.
- **Documentation:** DESIGN_SYSTEM.md added; CODE_REVIEW summary table updated to show all major pages aligned.

---

## 12. Redesign Phase 4 (continuation)

- **Guide:** SectionHeader (title "AI 101 micro-guide", description); min-w-0 space-y-6; removed raw h1/p.
- **Onboarding:** SectionHeader ("Get started", description); min-w-0 space-y-6.
- **Notifications:** SectionHeader ("Notifications", description); EmptyState for no notifications; SkeletonCard (wide) for loading; min-w-0 space-y-6.
- **Search:** SectionHeader ("Search", dynamic description); EmptyState when no query; SkeletonCard (compact) for Library/People section loading; min-w-0 space-y-6.
- **People:** Migrated local ProfileCard to shared **PersonCard**; added `toPersonCardProfile()` to map profile + capabilityTags to PersonCardProfile; People page wrapper uses min-w-0 space-y-6.
- **Build:** Removed unused `BookOpen` import from Guide. All pages aligned with design system.

---

*Review completed Feb 1; Phase 2, Phase 3, and Phase 4 (redesign) applied.*
