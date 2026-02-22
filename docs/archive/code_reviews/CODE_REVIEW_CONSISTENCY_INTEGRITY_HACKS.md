# Code Review: Consistency & Integrity (Wins → Hacks Rename)

**Date:** Feb 1, 2026  
**Scope:** Post-rename consistency and integrity of the wins-to-hacks terminology and related code.

---

## 1. Summary

After the wins-to-hacks rename, the codebase was reviewed for:

- **Consistency:** Naming, comments, and user-facing copy use "hacks" (no stray "wins" in source).
- **Integrity:** Exports, imports, Convex API, and types align; no broken references.

---

## 2. Consistency Fixes Applied

### 2.1 WelcomeHero (comments and internal name)

- **Before:** Comment "snippet → copy → win", function `MiniSnippetCopyWin`, JSDoc "Compact snippet → copy → win".
- **After:** Comment "snippet → copy → hack", function `MiniSnippetCopyHack`, JSDoc "Compact snippet → copy → hack".
- **File:** `src/components/dashboard/WelcomeHero/WelcomeHero.tsx`

### 2.2 CollectiveProgressCard (JSDoc)

- **Before:** "Placed below Community Wins so hero stays welcoming and value-first."
- **After:** "Shown on Team pulse tab; Community Hacks is on Hacks tab. Keeps hero welcoming and value-first."
- **File:** `src/components/dashboard/CollectiveProgress/CollectiveProgressCard.tsx`

### 2.3 WallOfThanksStrip (already fixed during E2E test)

- Sample quote updated from "this win!" to "this hack!" in `WallOfThanksStrip.tsx`.

---

## 3. Integrity Verification

### 3.1 Exports and imports

| Location | Exports / usage | Status |
|----------|-----------------|--------|
| `src/components/dashboard/index.ts` | FeaturedHacksShowcase, HackCard, FeaturedHackItem from `./FeaturedHacks`; QuickStartHacks from `./QuickStartHacks`; WallOfHacks from `./Recognition/WallOfHacks` | OK |
| `src/pages/Dashboard.tsx` | Imports FeaturedHacksShowcase; uses `dashboardTab === 'hacks'`, `scrollToCommunityHacks`, `id="community-hacks"`, `onScrollToHacks={scrollToCommunityHacks}` | OK |
| `src/components/dashboard/FeaturedHacks/` | FeaturedHacksShowcase.tsx, HackCard.tsx, index.ts; WallOfThanksStrip | OK |
| `src/components/dashboard/QuickStartHacks/` | QuickStartHacks.tsx, index.ts; uses `api.metrics.getFeaturedHacks`, `FeaturedHackItem` from `../FeaturedHacks/HackCard` | OK |

### 3.2 Convex

| Item | Status |
|------|--------|
| `convex/metrics.ts` | `FeaturedHack` type, `getFeaturedHacks` query; handler uses `hacks` array; JSDoc "Unified featured hacks for showcase" | OK |
| Frontend usage | FeaturedHacksShowcase and QuickStartHacks both call `api.metrics.getFeaturedHacks`; Convex dedupes | OK |

### 3.3 Types

| Layer | Type | Notes |
|-------|------|--------|
| Convex | `FeaturedHack` | `Id<"libraryAssets">` / `Id<"impactStories">` for assetId/storyId | OK |
| Frontend | `FeaturedHackItem` | `string` for id/assetId/storyId (Convex serializes IDs as strings) | OK |
| Mapping | `mapApiHackToItem` | FeaturedHacksShowcase and QuickStartHacks each define; shapes aligned | OK |

### 3.4 Props and handlers

| Component | Prop / handler | Consumer | Status |
|-----------|----------------|----------|--------|
| WelcomeHero | `onScrollToHacks`, `scrollToHacks`, `#community-hacks` | Dashboard passes `scrollToCommunityHacks` | OK |
| EngagementNudge | `onScrollToHacks` | Dashboard passes `scrollToCommunityHacks` | OK |
| FeaturedHacksShowcase | `onCopySuccess`, `onShareStory`, `starterCount` | Dashboard | OK |

### 3.5 Remaining "win" in source (intentional)

- **`window`** — Used in HackCard, QuickStartHacks, ProfileSetup, ErrorBoundary, ProjectDetail, utils (browser checks). No change.
- **convex/seedData.ts** — "Quick wins (low effort, high impact)" is a generic prioritization term, not the feature name. Left as-is.

---

## 4. Documentation (historical)

The following files still describe the pre-rename state ("Wins", "getFeaturedWins", "WinCard", etc.) as historical record:

- `learnings.md` (older entries)
- `CODE_REVIEW_CONSISTENCY_INTEGRITY_FEB1.md`
- `CODE_REVIEW_DASHBOARD_POLISH.md`
- `CODE_REVIEW_FEATURED_WINS.md`
- `CODE_REVIEW_HERO_RESPONSIVENESS.md`
- `FINAL_POLISH_SUMMARY.md`

No code changes required; these document past behaviour. The new learnings entry **"Wins → Hacks rename E2E (Feb 1, 2026)"** describes the current behaviour.

---

## 5. Optional follow-ups

- **Shared `mapApiHackToItem`:** Still defined in both FeaturedHacksShowcase and QuickStartHacks. Could be extracted to e.g. `src/lib/featuredHacks.ts` if more consumers appear.
- **Shared `getAssetDetailUrl`:** Logic duplicated in HackCard and QuickStartHacks (`getAssetDetailUrlForCard`). Could export from HackCard or a lib and reuse.

---

## 6. Verdict

- **Consistency:** All user-facing and in-code references to the feature use "hacks"; comments and internal names updated.
- **Integrity:** No broken imports or exports; Convex and frontend types and API usage are aligned; props and IDs are consistent.
- **Lint:** No linter errors in the modified files.
