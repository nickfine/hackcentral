# Code Review: Derived Badges (Your recognition)

**Date:** 2026-01-30  
**Scope:** Derived badges backend and Dashboard UI (`convex/recognition.ts`, `src/pages/Dashboard.tsx`).

## Summary

The derived badges implementation is **consistent and sound**. Badge types align with the recognition schema; logic uses existing data correctly; Dashboard section follows existing patterns. No lint errors.

---

## What Was Checked

### 1. Schema & backend alignment

- **recognitionBadges schema:** Badge types `most_reused`, `most_verified`, `fastest_pull_through`, `mentor_champion`. Derived logic uses `mentor_champion`, `most_verified`, `most_reused` (no write to table; `fastest_pull_through` not implemented in this slice). ✅
- **getDerivedBadgesForCurrentUser:** No args; returns `[]` when no identity or no profile. Uses `thirtyDaysAgo` (same formula as metrics.ts). ✅
- **Mentor champion:** `mentorRequests` with index `by_mentor`, filter `status === "completed"` and `_creationTime >= thirtyDaysAgo`. Count ≥ 1 → push badge. ✅
- **Most verified:** `libraryAssets` where `verifiedById === profile._id` (any time). Count ≥ 1 → push badge. ✅
- **Most reused:** Assets where `authorId === profile._id`; `libraryReuseEvents` in last 30d; count events where `assetId` in user's assets. Total ≥ 1 → push badge. ✅
- **Return shape:** `{ badgeType, label, metricValue }[]`; `BADGE_LABELS` used for display labels. ✅

### 2. Frontend & backend data flow

- **Dashboard:** `useQuery(api.recognition.getDerivedBadgesForCurrentUser)`; section only when `isAuthenticated`. ✅
- **Feed:** Uses `badge.badgeType` (key), `badge.label`, `badge.metricValue` (display + tooltip; ×N when > 1). All returned by query. ✅

### 3. Dashboard UI consistency

- **Section:** Card `p-6`, heading with Award icon (`h-5 w-5 text-muted-foreground`), same structure as Top Mentors / Most Reused Assets. ✅
- **Loading:** `derivedBadges === undefined` → "Loading…". ✅
- **Empty:** `derivedBadges.length === 0` → actionable copy ("Complete mentor sessions, verify library assets..."). ✅
- **List:** Flex wrap of badge chips; each chip: Award icon, label, optional "×N" when `metricValue > 1`; `title` attribute for tooltip. ✅
- **Placement:** Section appears above Impact Stories (authenticated-only block). ✅

### 4. Linting

- No linter errors in `recognition.ts` or `Dashboard.tsx`. ✅

---

## Verdict

**Derived Badges (Phase 2)** are **consistent and production-ready**. Backend logic matches schema and existing data; Dashboard section matches existing patterns; Playwright tests confirmed rendering and badge display. No issues found.
