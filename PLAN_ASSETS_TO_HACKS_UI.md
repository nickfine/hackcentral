# Plan: Rename "Assets" to "Hacks" in UI Copy Only

**Goal:** Replace all user-facing instances of "Asset(s)" / "asset(s)" with "Hack(s)" / "hack(s)". Internal identifiers (e.g. `libraryAssets`, `assetId`, `createAsset`), API/Convex names, and URLs (e.g. `/library?asset=...`) stay unchanged. We accept the dual meaning of "hack" (project + reusable item).

---

## Scope: Display-only changes

| Do change | Do not change |
|-----------|----------------|
| Page titles, headings, button labels | Variable/function/type names |
| Toast messages, empty states, descriptions | Convex table/query/mutation names |
| Tab labels, list headers, link text | URL query params (`?asset=`) |
| Placeholder text, aria-labels where they mirror visible copy | File/component names (e.g. `AssetCard` can stay) |

---

## File-by-file changes

### 1. `src/pages/Library.tsx`

| Current (user-facing) | New |
|------------------------|-----|
| File comment: "Shows reusable AI **assets**" | "Shows reusable AI **hacks**" |
| Modal title: "**Submit Asset**" | "**Submit Hack**" |
| Placeholder: "Brief description of the **asset**" | "Brief description of the **hack**" |
| Placeholder: "When to use this **asset**" | "When to use this **hack**" |
| Toast: "Failed to submit **asset**" | "Failed to submit **hack**" |
| "**Loading asset details**" | "**Loading hack details**" |
| "**Asset not found**" / "This **asset** may be private..." | "**Hack not found**" / "This **hack** may be private..." |
| "Reusable AI **assets**... **All Assets**" | "Reusable AI **hacks**... **All Hacks**" |
| Button: "**Submit Asset**" | "**Submit Hack**" |
| Toast: "**Asset** submitted!" | "**Hack** submitted!" |
| "High-trust, curated collection of proven AI **assets**" | "proven AI **hacks**" |
| "**Graduated assets**" | "**Graduated hacks**" |
| "**Assets** with 10+ reuses" | "**Hacks** with 10+ reuses" |
| "**All Assets**" (section header) | "**All Hacks**" |
| "**No assets found**" | "**No hacks found**" |
| "No **assets** match your filters..." / "Be the first to contribute an AI **asset**!" | "No **hacks** match..." / "...contribute an AI **hack**!" |
| "**X assets**" (count label) | "**X hacks**" |
| "**Asset** attached to project!" | "**Hack** attached to project!" |
| "**Asset** marked as verified/deprecated." / "**Asset** reverted to draft." | "**Hack** marked as verified/deprecated." / "**Hack** reverted to draft." |
| aria-label: "How you used this **asset**" | "How you used this **hack**" |

(Keep: `SubmitAssetModal`, `createAsset`, `selectedAssetId`, `AssetCard`, `AssetDetailContent`, `assetId`, `asset`, etc.)

---

### 2. `src/pages/Guide.tsx`

| Current | New |
|---------|-----|
| "A short intro to AI **assets** and how to use..." | "AI **hacks** and how to use..." |
| "What are AI **assets**?" | "What are AI **hacks**?" |
| "AI **assets** are reusable building blocks..." | "AI **hacks** are reusable building blocks..." |
| "How do I reuse an **asset**?" | "How do I reuse a **hack**?" |
| "curated, verified **assets**. Click an **asset** to see..." | "curated, verified **hacks**. Click a **hack** to see..." |
| "Submit a new **asset**... (**Submit Asset**). ... Attach **assets** to your..." | "Submit a new **hack**... (**Submit Hack**). ... Attach **hacks** to your..." |
| "Browse and submit AI **assets**" | "Browse and submit AI **hacks**" |
| "Curated, high-trust **assets**" | "Curated, high-trust **hacks**" |
| "attach **assets**" (in Hacks In Progress bullet) | "attach **hacks**" |

---

### 3. `src/pages/Onboarding.tsx`

| Current | New |
|---------|-----|
| "Choose a path to start using AI **assets** in your work." | "AI **hacks** in your work." |
| "New to AI **assets**? Learn what they are..." | "New to AI **hacks**? ..." |

---

### 4. `src/pages/Dashboard.tsx`

| Current | New |
|---------|-----|
| Comment: "X new team **assets**" | "X new team **hacks**" |
| "X% of projects using AI **assets**" / "Projects using AI **assets**" | "AI **hacks**" |
| "Link to Completed Hacks **asset** (optional)" | "Link to Completed Hacks **hack** (optional)" |
| "attach **assets**" (in nudge copy) | "attach **hacks**" |
| "**your assets** to earn badges" | "**your hacks** to earn badges" |
| "**Reusable AI assets**" (metric description) | "**Reusable AI hacks**" |

(Keep: `libraryAssets`, `mostReusedAssets`, `storyAssetId`, `newAssetsCount`, etc.)

---

### 5. `src/pages/Projects.tsx`

| Current | New |
|---------|-----|
| Comment: "projects with AI **assets**" | "projects with AI **hacks**" |
| "Create your first project with AI **assets**" | "AI **hacks**" |
| "**X asset(s)**" (attached count) | "**X hack(s)**" |
| "-- AI **assets** attached" | "-- AI **hacks** attached" |

---

### 6. `src/pages/Search.tsx`

| Current | New |
|---------|-----|
| Comment: "results from **assets** and profiles" | "results from **hacks** and profiles" |
| "View all **X assets** →" | "View all **X hacks** →" |

(Keep: `matchAsset`, `allAssets`, `filteredAssets`, `asset` in code.)

---

### 7. `src/pages/Profile.tsx`

| Current | New |
|---------|-----|
| "Project AI **asset**" (badge/label) | "Project AI **hack**" |

---

### 8. `src/components/dashboard/FeaturedHacks/HackCard.tsx`

- No visible "Asset" button text; copy label is "Copy {title} to clipboard". Optional: if any aria-label or tooltip says "asset", change to "hack". (Code and `type: 'asset'` stay.)

---

### 9. `src/components/dashboard/FeaturedHacks/FeaturedHacksShowcase.tsx`

| Current | New |
|---------|-----|
| Comment: "copies an **asset**/story" | "copies a **hack**/story" |
| Blurb: "Share a reusable AI **asset** from Completed Hacks" | "Share a reusable AI **hack** from Completed Hacks" |

(Keep: `type: 'asset'` in data.)

---

### 10. `src/components/dashboard/Recognition/TabbedRecognition.tsx`

| Current | New |
|---------|-----|
| Tab label: "Most Reused" | "Most Reused Hacks" (or keep "Most Reused" if context is clear) |
| Any prose referring to "library assets" | "completed hacks" |

(Keep: tab id `'assets'`, `mostReusedAssets`, `assetId`, `assetTitle`.)

---

### 11. `src/components/dashboard/LiveActivityPulse.tsx`

| Current | New |
|---------|-----|
| "**X new asset(s) this week**" | "**X new hack(s) this week**" |

(Keep: `newAssetsThisWeek` in code/API.)

---

### 12. `src/components/dashboard/Engagement/EngagementNudge.tsx`

| Current | New |
|---------|-----|
| Comment: "X new team **assets**" | "X new team **hacks**" |
| "**X new team asset(s)** — copy one?" | "**X new team hack(s)** — copy one?" |
| "**X new team asset(s) this week** — copy one?" | "**X new team hack(s) this week** — copy one?" |

(Keep: `newAssetsCount` prop name.)

---

### 13. `src/components/dashboard/QuickActions/QuickActionsPanel.tsx`

| Current | New |
|---------|-----|
| `id: 'submit-asset'` (can stay for analytics) | — |
| Label: "**Submit your first asset**" | "**Submit your first hack**" |
| Sublabel: "**Copy top asset**" | "**Copy top hack**" |

---

### 14. `src/components/dashboard/WelcomeHero/WelcomeHero.tsx`

| Current | New |
|---------|-----|
| Comment: "floating **asset** icons" | "floating **hack** icons" (optional) |
| aria-label: "Copy your first **asset**..." | "Copy your first **hack**..." |
| "**Copy Your First Asset**" (button) | "**Copy Your First Hack**" |

---

### 15. `src/lib/design-system.ts`

| Current | New |
|---------|-----|
| Comment: "**Asset** type display labels" | "**Hack** type display labels" (optional; comment only) |

---

## Out of scope (do not change)

- **convex/** — table names, field names, function names (e.g. `libraryAssets`, `getGraduatedAssets`).
- **src/types/** — type names and property names (e.g. `LibraryAsset`, `assetId`).
- **URLs** — `/library?asset=...` stays.
- **Component/variable names** — e.g. `AssetCard`, `AssetDetailContent`, `createAsset`, `selectedAssetId` remain for consistency with Convex/schema.

---

## After implementation

1. Run the app and spot-check: Library, Guide, Onboarding, Dashboard, Projects, Search, Profile, Featured Hacks, Recognition tabs, Live pulse, Engagement nudge, Quick actions, Welcome hero.
2. Optionally run Playwright E2E if available; update `learnings.md` with results.
3. Bump version, commit, and push.

---

## Summary

- **~13–15 files** with display-only string replacements.
- **One pass per file**: replace user-visible "asset(s)" with "hack(s)" and "Asset(s)" with "Hack(s)" where it denotes the reusable library item.
- **Leave code identifiers and APIs as-is** so the dual meaning of "hack" is only in copy.
