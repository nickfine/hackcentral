# Phase 2: Core Features

**Goal:** Complete core modules and workflows (dashboard, library quality/reuse, recognition, AI-assisted features, close/archive capture).

**Status:** In progress  
**Started:** Dashboard completion (Recent Activity + Top Contributors)  
**Reference:** ROADMAP.md § Phase 2 (Weeks 7–10)

---

## Done in Phase 2 (so far)

### ✅ Dashboard – Activity & Leaderboard (v0.4.1)
- **Backend:** `convex/metrics.ts`
  - `getRecentActivity` – last 15 contributions with user + asset/project labels
  - `getTopContributors` – top 10 by contribution count (last 30 days)
- **Frontend:** `src/pages/Dashboard.tsx`
  - Recent Activity list with relative time, empty/loading states
  - Top Contributors leaderboard with counts, empty/loading states
- **Existing:** Metric cards, maturity bar, and `getDashboardMetrics` were already in place.

### ✅ Library – Submit Asset, Verification, Reuse Recording (v0.4.2+)
- Submit Asset modal, author verification workflow (draft/verified/deprecated), “Verified by” display, reuse counts on cards, attach-to-project (v0.4.2).
- **Reuse recording:** `convex/libraryReuse.ts` – `recordReuse(assetId, reuseType, projectId?)`; when `projectId` is provided, also ensures `projectLibraryAssets` row. `src/pages/Library.tsx` – asset detail “I used this” quick action (Copied / Referenced / Linked + “Record use” button) so reuse can be recorded without attaching to a project.

### ✅ Library – More like this / Similar assets (v0.4.9)
- **Backend:** `convex/libraryAssets.ts` – `getSimilar(assetId, limit?)` returns same-type assets with same visibility rules; returns `[]` if asset not found or not visible.
- **Frontend:** `src/pages/Library.tsx` – asset detail “More like this” section (up to 6 similar assets); clicking one opens that asset’s detail (`onSelectAsset`). Empty state: “No other X in the library yet.”

### ✅ Library – Deprecation UX (v0.4.10)
- **Frontend:** `src/pages/Library.tsx` – “All Assets” list down-ranks deprecated assets (verified first, then draft, then deprecated) so deprecated appear last in default views; still findable via status filter.

### ✅ Library – Improved search (AI-assisted)
- **Frontend:** `src/pages/Library.tsx` – Library search now matches **title**, **description**, **asset type** (e.g. “prompt”), and **metadata** (intendedUser, context, limitations, riskNotes). No new backend or API; extends existing client-side filter so queries like “security” or “developers” match metadata.

### ✅ Recognition – Leaderboards (first slice)
- **Backend:** `convex/metrics.ts` – `getTopMentors` (top 10 by completed sessions, last 30d), `getMostReusedAssets` (top 10 by reuse events, last 30d; public/org only).
- **Frontend:** `src/pages/Dashboard.tsx` – "Top Mentors" card (GraduationCap), "Most Reused Assets" card (BookOpen), empty/loading states.

### ✅ Impact Stories (first slice)
- **Backend:** `convex/impactStories.ts` – `create` mutation (headline, storyText?, projectId?, assetId?, metrics?, featured?); `list` query (limit?, featuredOnly?) with authorName, projectTitle, assetTitle for display.
- **Frontend:** `src/pages/Dashboard.tsx` – "Impact Stories" section with feed (headline, author, optional project/asset, date, story text); "Share your story" button (authenticated) opens modal with form (headline required, story text, optional project/asset links), submit → toast and close.

### ✅ Derived badges (recognition)
- **Backend:** `convex/recognition.ts` – `getDerivedBadgesForCurrentUser()` query: computes mentor_champion (completed sessions in last 30d), most_verified (assets verified by user), most_reused (reuse events on user's assets in last 30d); returns { badgeType, label, metricValue }[].
- **Frontend:** `src/pages/Dashboard.tsx` – "Your recognition" section (authenticated only): badge chips with Award icon, label, and ×N when metricValue > 1; loading and empty states.

### ✅ Close/Archive Capture (first slice)
- **Backend:** `convex/projects.ts` – `getById` returns `ownerFullName`.
- **Frontend:** `src/pages/Projects.tsx` – ProjectDetailModal (card click), owner “Close or archive” (Mark completed / Archive) with learning form (lessons learned, time saved, AI tools, workflow transformed); learning summary when completed/archived; comments inline + “View in full”.

---

## Remaining Phase 2 Tasks (in suggested order)

### 1. AI Maturity Dashboard – Optional polish
- **Team comparison view** (with privacy): e.g. anonymized or opt-in team-level maturity.
- **Polling note:** Convex is reactive; no explicit polling needed unless we add a “stale after 5 min” UX.
- **Scope:** Low. Dashboard is functionally complete.

### 2. Library – Optional enhancements
- **AI-assisted submission:** Optional suggest title, description, or metadata from content (e.g. LLM API).
- **Better search:** Improve text matching and/or semantic/metadata search.

### 3. Recognition – Optional
- **Badge persistence:** Write derived badges into `recognitionBadges` (e.g. scheduled job) for history/analytics.
- **fastest_pull_through:** Add badge type if desired.
- **Celebration UI:** Optional animations or toasts when someone gets a badge or story is published.

### 4. AI-Assisted Features
- **Search:** ✅ Library search now matches title, description, asset type, and metadata (intendedUser, context, limitations, riskNotes). Semantic/LLM search deferred.
- **Recommendations:** “More like this” (same-type) done; “Recommended for you” by reuse patterns or embeddings deferred.
- **Deliverables:** Improved search (done); optional AI-assisted submission and semantic search later.

---

## Dependencies & Notes

- **Recognition** can use existing `aiContributions` and mentor data; badge logic can be implemented in Convex (scheduled or on-demand).
- **AI-assisted features** may require an external API (e.g. embeddings/LLM); start with better text search and reuse-based recommendations.

---

## Success Criteria for Phase 2 Complete

- [x] Dashboard: activity + leaderboard live; optional team comparison (deferred).
- [x] Library: submit assets, quality gates (Draft/Verified/Deprecated), verification + deprecation, reuse tracking and counts, similar assets, deprecation down-rank.
- [x] Recognition: derived badges and leaderboards; impact stories feed.
- [x] AI-assisted: improved library search (title, description, type, metadata); recommendations via “More like this”; optional AI-assisted submission deferred.
- [x] Close/archive: form with learning capture and learning summary display.

---

*Last updated: after improved library search (Phase 2 success criteria complete).*
