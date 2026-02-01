# Code Review: Hero & Responsiveness Refinement — Consistency & Integrity

**Date:** Feb 1, 2026  
**Scope:** WelcomeHero, CollectiveProgressCard, Dashboard layout reorder, Community Wins responsiveness, touch targets, exports.

## Summary

Review focused on consistency with the rest of the codebase and data/UX integrity after the hero and responsiveness refinement. One fix was applied (removed unused ref); stage definitions and anchor/scroll behavior are consistent. No integrity issues found.

---

## Fixes Applied

### 1. Unused ref removal
- **WelcomeHero:** Removed unused `sectionRef` and `useRef` import. The section does not need a ref for scroll-into-view (scroll target is `#community-wins` on the Dashboard wrapper).

### 2. Documentation
- **CollectiveProgressCard:** Added JSDoc note that stage names/thresholds (Spark 25, Momentum 50, Scale 75, Transformation 100) align with HeroJourneyVisualization for future maintainers.

---

## Consistency Notes

### Stage definitions
- **Dashboard:** Inline `maturityStages` (name + threshold) used to derive `currentStage`, `nextStage`, `nextMilestoneCopy` for WelcomeHero and CollectiveProgressCard.
- **WelcomeHero:** Local `STAGES` (name + threshold) used only for `getStageName(progress)` when `currentStageName` is not passed; thresholds match Dashboard.
- **CollectiveProgressCard:** Local `STAGES` (name, threshold, icon, color) for progress bar and stage icons; thresholds and names match HeroJourneyVisualization and Dashboard.
- **HeroJourneyVisualization:** Still exported from `dashboard/index.ts` but no longer used on the Dashboard page; kept for backward compatibility or reuse elsewhere. Stage thresholds (25, 50, 75, 100) and names are identical across all components.

### Anchor and scroll
- **Dashboard:** Wraps Community Wins in `<div id="community-wins" className="scroll-mt-6">` so WelcomeHero’s “Browse Community Wins” can scroll to it; `scroll-mt-6` keeps the section from sitting under a fixed header.
- **WelcomeHero:** `scrollToWins` uses `document.getElementById('community-wins')?.scrollIntoView({ behavior: 'smooth', block: 'start' })` when `onScrollToWins` is not provided. Consistent with single source of id.

### Types and data flow
- **WelcomeHero:** Receives `currentProgress`, `currentStageName`, `nextMilestoneCopy` from Dashboard; all optional with sensible defaults.
- **CollectiveProgressCard:** Receives `currentProgress` and `metrics` (aiContributorPercentage, projectsWithAiPercentage); same shape as former HeroJourneyVisualization props.
- **Dashboard:** Maturity derivation uses `maturityWidth` (average of two percentages, capped at 100); `currentStage` is always defined via `?? maturityStages[maturityStages.length - 1]`; `nextMilestoneCopy` is a string like `"33% to Transformation"` or `undefined` when at 100%.

### Responsiveness and a11y
- **WelcomeHero:** CTAs use `min-h-[44px] min-w-[44px] touch-manipulation`; `aria-label` on primary/secondary buttons; section has `aria-label="Welcome to HackDay Central"`; slim maturity hint has `role="status"` and `aria-label` with stage and next milestone.
- **FeaturedWinsShowcase:** Carousel cards use `min-w-[min(300px,calc(100vw-2rem))]` on small screens; prev/next and dot buttons use 44px touch targets on mobile (`min-h-[44px] min-w-[44px]`), reduced on `sm+`; `role="region"`, `aria-label`, keyboard arrows; dots have `role="tab"` and `aria-selected`.
- **Stat cards:** Grid is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; no overflow issues.

### Exports
- **dashboard/index.ts:** Exports `WelcomeHero`, `CollectiveProgressCard`, and their prop types; still exports `HeroJourneyVisualization`, `ParticleEffect`, `MilestoneMarker` for reuse. Dashboard page imports only WelcomeHero and CollectiveProgressCard from dashboard.

---

## Integrity

- **Routing:** No change; Dashboard remains the default route; Community Wins is in-page only (`#community-wins`).
- **Convex:** No new queries; Dashboard continues to use `getDashboardMetrics` and existing queries for maturity and metrics.
- **Lint:** No linter errors in WelcomeHero, CollectiveProgressCard, Dashboard, or FeaturedWinsShowcase after the ref removal and JSDoc update.

---

## Optional Follow-ups

- **Single source of truth for stages:** Stage names and thresholds (Spark 25, Momentum 50, Scale 75, Transformation 100) are duplicated in Dashboard, WelcomeHero, CollectiveProgressCard, and HeroJourneyVisualization. Consider a shared constant (e.g. `src/constants/maturityStages.ts`) if stages are extended or reused elsewhere.
- **HeroJourneyVisualization:** If it is never used outside Dashboard, it could be deprecated or removed from the dashboard index to reduce surface area; currently kept for compatibility.

---

## Build & Lint

- `npm run build` passes.
- No linter errors in the reviewed files.
