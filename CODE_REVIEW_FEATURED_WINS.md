# Code Review: Featured Wins Polish — Consistency & Integrity

**Date:** Feb 1, 2026  
**Scope:** Featured Wins & Reusable Magic showcase, Convex `getFeaturedWins`, WinCard, WallOfThanksStrip, Dashboard integration.

## Summary

Review focused on consistency with the rest of the codebase and data/UX integrity. Several fixes were applied; no blocking issues remained.

---

## Fixes Applied

### 1. Navigation consistency
- **FeaturedWinsShowcase:** Replaced `<a href="/library">` with `<Link to="/library">` so in-app navigation uses the SPA router like Dashboard, Sidebar, and other pages.

### 2. Dead prop removal
- **WinCard:** Removed unused `onShareStory` from props and from `FeaturedWinsShowcase` so WinCard’s interface matches actual usage (reserved for future story CTA if needed).

### 3. Documentation
- **Dashboard.tsx:** Updated file comment from "impact stories" to "featured wins showcase" to reflect current layout.
- **convex/metrics.ts:** JSDoc for `getFeaturedWins` changed "&lt; 3" to "fewer than 3 total contributions" for clearer source readability.

### 4. Carousel index integrity
- **FeaturedWinsShowcase:** Added a `useEffect` that clamps `currentScrollIndex` when `displayWins.length` changes (e.g. placeholder → real data or vice versa), so the selected dot and scroll target stay in bounds.

### 5. Clipboard robustness
- **WinCard:** Copy handler now checks for `navigator.clipboard?.writeText` before use and shows "Clipboard not available" toast when missing (e.g. non-secure context), and uses a single `text` construction for both asset and story.

---

## Consistency Notes (No Change)

- **Types:** Backend `FeaturedWin` uses Convex `Id<>`; frontend `FeaturedWinItem` uses `string` for `id`/`assetId`/`storyId`. Convex serializes IDs as strings, so this is correct.
- **Exports:** `ImpactStoriesCarousel` and `WallOfWins` remain in `dashboard/index.ts` for reuse elsewhere; Dashboard page correctly uses only `FeaturedWinsShowcase`.
- **Queries:** Dashboard still uses `api.impactStories.list` for export payload (`impactStoriesCount`); no redundant fetch for the showcase (that uses `api.metrics.getFeaturedWins`).
- **Accessibility:** Featured Wins section uses `aria-labelledby`, `aria-label` on region/buttons, `role="tablist"`/`tab` for carousel dots, and `aria-live="polite"` on WallOfThanksStrip, in line with other dashboard components.
- **Motion:** All three components respect `useReducedMotion()` for animations, consistent with HeroJourney and ImpactStoriesCarousel.

---

## Optional Follow-ups

- **Empty state:** When there are no wins, the UI shows both placeholder cards and the "Be the first to share your win today!" box. Consider either dropping the extra box and keeping only the placeholder cards + inline nudge, or the reverse, for a single clear empty pattern.
- **Library deep link:** "View Details" goes to `/library?asset=...`. The Library page does not yet scroll to or highlight that asset; that could be a later enhancement.
- **WallOfThanksStrip data:** Currently uses hardcoded `SAMPLE_THANKS`. A future schema/API for reuser comments could drive this strip.

---

## Build & Lint

- `npm run build` passes.
- No linter errors in `src/components/dashboard/FeaturedWins`, `src/pages/Dashboard.tsx`, or `convex/metrics.ts`.
