# Code Review: Dashboard Polish — Consistency & Integrity

**Date:** Feb 1, 2026  
**Scope:** Slim hero, EngagementNudge, QuickStartWins, Live badge, first-copy confetti, responsiveness fixes.

## Summary

Review focused on consistency and integrity after the dashboard polish (slim hero, engagement nudge, QuickStart row, Live badge, first-copy confetti, responsiveness). One fix was applied (QuickStartWins mapApiWinToItem aligned with API/FeaturedWinItem via authorLevel). No integrity issues found.

---

## Fixes Applied

### 1. QuickStartWins mapApiWinToItem
- **QuickStartWins:** Added `authorLevel` to the `mapApiWinToItem` parameter type and return so it matches the API shape from `getFeaturedWins` and `FeaturedWinItem`. Keeps Starter cards in sync with FeaturedWinsShowcase and avoids dropping API data.

---

## Consistency Notes

### Data flow
- **Dashboard:** Fetches `pulse` (getActivityPulse) for EngagementNudge (`newAssetsCount`) and for first-copy confetti (no direct use of pulse in confetti; confetti is session-only via `hackcentral_first_copy_done`). Passes `handleFirstCopySuccess` to FeaturedWinsShowcase and QuickStartWins; passes `scrollToCommunityWins` to EngagementNudge.
- **EngagementNudge:** Receives `displayName` (profile?.fullName), `newAssetsCount` (pulse?.newAssetsThisWeek), `onScrollToWins`. Renders null when `count === 0 && !showName`; otherwise shows "Hey [Name], X new team assets — copy one?" or fallbacks. Consistent with PersonalizedNudge pattern (conditional render).
- **QuickStartWins:** Fetches `getFeaturedWins` independently; Convex caches, so no duplicate network cost. Maps to `FeaturedWinItem`; returns null when `starters.length === 0`. Same `FeaturedWinItem` type as WinCard/FeaturedWinsShowcase.

### First-copy confetti
- **Dashboard:** `handleFirstCopySuccess` checks `sessionStorage.getItem('hackcentral_first_copy_done')`; if not set, fires restrained confetti and sets the key. Respects `shouldReduceMotion`. Key is distinct from `hackcentral_weekly_active` (weekly-active celebration). No conflict.
- **WinCard:** Calls `onCopySuccess?.()` after successful clipboard write. FeaturedWinsShowcase and QuickStartWins pass `onCopySuccess` from Dashboard. StarterCard in QuickStartWins has its own copy handler and calls `onCopySuccess?.()` after toast. Consistent.

### Scroll to Community Wins
- **Dashboard:** Defines `scrollToCommunityWins` as `document.getElementById('community-wins')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Passed to EngagementNudge only; WelcomeHero uses its own internal `scrollToWins` (same logic when `onScrollToWins` not provided). Single DOM id `community-wins`; consistent.

### Live badge
- **FeaturedWinsShowcase:** Uses `pulse` (getActivityPulse) and `wins` to derive `liveBadgeCopy`: "Live: X new wins this week" when `newAssetsThisWeek > 0`, else "X Rising Stars" when any rising stars. Badge has `role="status"` and `aria-label`. Consistent with LiveActivityPulse usage of getActivityPulse.

### Responsiveness
- **Layout:** Main and inner wrapper have `min-w-0`; Dashboard root has `min-w-0`. Prevents flex overflow.
- **WelcomeHero:** `max-h-[35vh]`, `overflow-y-auto overflow-x-hidden`; floating icons `hidden sm:block`; sub has `break-words`.
- **EngagementNudge:** `flex-col sm:flex-row`, button `w-full sm:w-auto`, text `min-w-0 break-words`.
- **QuickStartWins / FeaturedWinsShowcase / WinCard:** `min-w-0`, `break-words` where needed; touch targets 44px on mobile. Consistent with earlier responsiveness review.

### Duplication (acceptable)
- **mapApiWinToItem:** Defined in both FeaturedWinsShowcase and QuickStartWins. Shapes now aligned (authorLevel included in QuickStartWins). Optional follow-up: extract to shared util (e.g. `src/lib/featuredWins.ts`) if more consumers appear.
- **getAssetDetailUrl / getAssetDetailUrlForCard:** Same logic in WinCard (internal) and QuickStartWins (getAssetDetailUrlForCard). Optional: export getAssetDetailUrl from WinCard and use in QuickStartWins.

---

## Integrity

- **Routing:** No change; Dashboard remains default route; `#community-wins` is in-page only.
- **Convex:** Dashboard uses getActivityPulse (pulse); FeaturedWinsShowcase uses getFeaturedWins and getActivityPulse; QuickStartWins uses getFeaturedWins. No redundant or conflicting queries.
- **Session storage keys:** `hackcentral_first_copy_done` (first-copy confetti), `hackcentral_weekly_active` (weekly-active confetti). Distinct; no collision.
- **Lint:** No linter errors in the reviewed files after the authorLevel fix.

---

## Optional Follow-ups

- **Shared mapApiWinToItem:** Extract to a small shared module if more components consume getFeaturedWins and need the same mapping.
- **Shared getAssetDetailUrl:** Export from WinCard (or a lib) and reuse in QuickStartWins to avoid duplicate URL construction.
- **Single getFeaturedWins fetch:** Dashboard could fetch getFeaturedWins once and pass `wins` to both QuickStartWins and FeaturedWinsShowcase to avoid two useQuery calls; current approach is valid (Convex dedupes) and keeps components self-contained.

---

## Build & Lint

- `npm run build` passes.
- No linter errors in Dashboard, WelcomeHero, EngagementNudge, QuickStartWins, FeaturedWinsShowcase, WinCard.
