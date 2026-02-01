# Code Review: Consistency and Integrity (Post Assets→Hacks UI Rename)

**Scope:** Consistency (user-facing copy vs internal identifiers) and structural integrity after the display-only "Assets" → "Hacks" rename. Internal code (Convex, types, URLs) intentionally unchanged per PLAN_ASSETS_TO_HACKS_UI.md.

**Date:** Feb 1, 2026.

---

## 1. User-facing copy consistency

### 1.1 Remaining "asset(s)" in display copy — fixed

- **PersonalizedNudge.tsx:** Copy said "Your asset has been reused {n}×. Get {remaining} more…" — **fixed** to "Your hack has been reused…" for consistency with EngagementNudge, LiveActivityPulse, and badge copy.
- **Library.tsx (AssetCard):** Badge for curated items showed "Arsenal" — **fixed** to "Featured Hacks" so it matches AssetDetailContent and the rest of the UI (sidebar "Featured Hacks", nav, etc.). `isArsenal` and API names remain unchanged.

### 1.2 Intentionally internal (not user-facing)

- **Type/data shape:** `type: 'asset' | 'story'` in FeaturedHackItem, API responses, and Convex — kept for schema/API consistency; not displayed as-is.
- **Variable/function names:** `assetId`, `createAsset`, `libraryAssets`, `mostReusedAssets`, `selectedAssetId`, `matchAsset`, etc. — all internal; no change per plan.
- **URLs:** `/library?asset=...` — unchanged; no breaking links.
- **IDs/aria:** `id="submit-asset"`, `aria-labelledby="submit-asset-title"`, `id="story-asset"` — internal/accessibility; optional to rename later for clarity, not required for copy consistency.
- **Comments:** e.g. "New assets count (e.g. from getActivityPulse.newAssetsThisWeek)" — internal; prop name is `newAssetsCount`.

**Verdict:** User-facing strings are consistent with "Hacks"/"hack(s)" for the reusable library item. Internal identifiers correctly preserved.

---

## 2. Naming and structure integrity

### 2.1 Terminology layers

| Layer | Convention | Examples |
|-------|------------|----------|
| **Display copy** | "Hack(s)" for reusable item; "Hacks In Progress" for projects | Submit Hack, All Hacks, Copy Hack, Reusable AI hacks, Most Reused Hacks |
| **Routes** | Unchanged | `/library`, `/projects` |
| **Convex / schema** | Unchanged | `libraryAssets`, `getArsenalWithReuseCounts`, `assetId`, `assetType` |
| **Types** | Unchanged | `LibraryAsset`, `LibraryAssetWithReuse`, `AssetCardProps` |
| **Component names** | Unchanged | `AssetCard`, `AssetDetailContent`, `SubmitAssetModal` |

**Verdict:** Clear separation: copy uses "Hacks"; code and APIs use "asset"/"libraryAssets" where they did before. No mixed user-facing "asset" left.

### 2.2 Navigation and page titles

- **Sidebar:** "Completed Hacks" → `/library`, "Hacks In Progress" → `/projects`, "Featured Hacks" → `/library?arsenal=true` — consistent.
- **Header:** Search placeholder "Search Completed Hacks and people" — consistent.
- **Library page:** H1 "Completed Hacks", subtitle "Reusable AI hacks…", "Submit Hack", "All Hacks", "Featured Hacks" section, "Graduated hacks" — consistent.
- **Guide / Onboarding / Dashboard / Projects / Search / Profile:** All updated copy checked; no stray "asset(s)" in display strings.

**Verdict:** Nav labels, page titles, and section headings align with Completed Hacks / Hacks In Progress / Featured Hacks and "hack(s)" for library items.

### 2.3 Constants and design system

- **src/constants/project.ts:** `HACK_TYPE_LABELS`, `HACK_TYPES`, `HACK_TYPE_BADGE_COLORS` — used for project hack type and library type filters; labels "Prompts", "Skills", "Apps" — consistent.
- **src/lib/design-system.ts:** Comment updated to "Hack type display labels (library item types: prompt, skill, app)"; `assetTypeLabels` name kept for API compatibility.
- **Library.tsx:** Uses local `ASSET_TYPES` for submit form (value/label); same set (prompt, skill, app) — consistent with schema and filters.

**Verdict:** Constants and design system align with hack types and display labels; no conflicting "asset" labels in UI.

---

## 3. Data and type integrity

### 3.1 Convex ↔ UI

- **Queries:** `api.libraryAssets.*`, `api.metrics.getGraduatedAssets`, `getMostReusedAssets`, `getActivityPulse` (e.g. `newAssetsThisWeek`) — all consumed by existing names; UI displays "hacks" in copy only.
- **Mutations:** `libraryAssets.create`, `libraryAssets.update`, `libraryReuse.*` — unchanged; success toasts and labels updated to "Hack" where user-facing.
- **Ids:** `Id<'libraryAssets'>`, `assetId` in components and URLs — unchanged; no broken references.

**Verdict:** Data flow and types are intact; no schema or API changes required for the rename.

### 3.2 Optional / edge cases

- **Empty states:** Library "No hacks found", "No hacks match your filters", "Be the first to contribute an AI hack!" — consistent.
- **Modal copy:** Submit Hack modal, Hack not found, Loading hack details, Hack attached to project!, Hack marked as verified/deprecated — consistent.
- **Recognition tab:** Tab label "Most Reused Hacks"; tab id remains `'assets'` for minimal code churn; no user-facing "assets" in that section.

**Verdict:** Edge cases and empty states use "hack(s)" consistently.

---

## 4. Summary and fixes applied

| Item | Status |
|------|--------|
| PersonalizedNudge "Your asset has been reused" | **Fixed** → "Your hack has been reused" |
| Library AssetCard badge "Arsenal" | **Fixed** → "Featured Hacks" |
| All other display "asset(s)" | Already updated in prior pass |
| Internal identifiers (vars, types, APIs, URLs) | Intentionally unchanged; consistent |
| Nav, routes, constants, Convex usage | Aligned; no integrity issues found |

**Conclusion:** After the two fixes above, the codebase is consistent for the Assets→Hacks UI rename: user-facing copy uses "Hacks"/"hack(s)" for the reusable library item and "Featured Hacks" for the curated set; internal names and APIs remain "asset"/"libraryAssets" as planned. No further consistency or integrity issues identified for this change set.
