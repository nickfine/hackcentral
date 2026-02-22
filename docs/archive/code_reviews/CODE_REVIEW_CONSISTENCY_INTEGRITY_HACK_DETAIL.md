# Code Review: Consistency & Integrity (Hack Detail & Library)

**Date:** Feb 1, 2026  
**Scope:** Hack detail dedicated page, Library navigation, URL params, and related links.

---

## Summary

- **Routing and hack detail flow** are consistent and correct: `/library/:assetId` before `/library`, dedicated page (no modal), "View Details" and Library cards navigate to the detail page, old `?asset=` redirects.
- **Integrity:** `?action=new` is now handled (Library opens Submit Hack modal; closing clears the param). `?arsenal=true` and `?filter=arsenal` are still not read; links to them show the generic Library view.
- **Minor:** Import style (alias vs relative) and `LibraryAssetDetail` not exported from `pages/index.ts` are acceptable and consistent with existing patterns.

---

## 1. Routing & Hack Detail — Consistent ✓

| Area | Status | Notes |
|------|--------|--------|
| Route order | ✓ | `library/:assetId` is declared before `library` in `App.tsx` so detail wins. |
| Dashboard → detail | ✓ | `HackCard` and `QuickStartHacks` use `/library/${assetId}` (no `?asset=`). |
| Library list → detail | ✓ | `AssetCard` and graduated list use `navigate(\`/library/${id}\`)`. |
| Submit success | ✓ | `onSubmitSuccess` navigates to `/library/${newAssetId}`. |
| Old URL redirect | ✓ | `Library` redirects `?asset=xxx` → `/library/xxx` with `replace: true`. |
| Detail page states | ✓ | Loading, not-found (null), and success all handled; "Back to Completed Hacks" and "More like this" navigate correctly. |
| Convex usage | ✓ | `libraryAssets.getById` and `getSimilar`; invalid `assetId` yields null and shows "Hack not found". |

---

## 2. Link & URL Param Integrity

### Handled by Library

- **`?q=...`** — Synced to search input via `searchParams.get('q')` and `useEffect`; Search page links like `/library?q=...` behave as intended. ✓

### Implemented after review

- **`?action=new`** — Library now opens the Submit Hack modal when this param is present (useEffect). Closing the modal navigates to `/library` (replace) so the URL is cleaned. Used by FeaturedHacksShowcase and QuickActionsPanel. ✓

### Not Handled (integrity gap)

These URLs are used in the app but **Library does not read** the params:

| URL | Used in | Intended (implied) | Actual behavior |
|-----|--------|--------------------|------------------|
| `/library?arsenal=true` | Sidebar "Featured Hacks", Onboarding, Guide | Focus/filter to Featured Hacks | Library loads; no scroll/filter |
| `/library?filter=arsenal` | QuickActionsPanel "Browse Featured Hacks" | Filter to curated hacks | Library loads; no filter applied |

**Recommendation:**

1. **`?arsenal=true` / `?filter=arsenal`** — Either:
   - **Option A:** In `Library.tsx`, set `queryArgs.arsenalOnly = true` when `searchParams.get('arsenal') === 'true'` or `searchParams.get('filter') === 'arsenal'`, so "All Hacks" shows only arsenal/featured, or  
   - **Option B:** Keep links as `/library` and rely on the existing Featured Hacks section (no param); simplify Sidebar/Onboarding/Guide/QuickActions to `/library` and remove the misleading params.

---

## 3. Naming & Terminology

- **User-facing:** "Completed Hacks", "Featured Hacks", "View Details", "Back to Completed Hacks", "Submit Hack" — used consistently in Library, LibraryAssetDetail, HackCard, QuickStartHacks, Sidebar.
- **Code:** `assetId`, `libraryAssets`, `AssetDetailContent`, `LibraryAssetDetail` retained for schema and APIs; no need to change for this review.

---

## 4. Import & Export Consistency

- **LibraryAssetDetail:** Lazy-loaded only in `App.tsx`; not exported from `pages/index.ts`. Matches other lazy-only pages (e.g. TeamPulse); **OK**.
- **Convex:** Pages use relative `../../convex/_generated/...`; `AssetDetailContent` uses `../../../convex/...`. **OK**.
- **Aliases:** `LibraryAssetDetail` uses `@/components/library/AssetDetailContent`; Library uses `../components/shared`. Mixed but consistent with rest of app. **OK**.

---

## 5. Types & Safety

- **LibraryAssetDetail:** `assetId` from `useParams` is `string`; cast to `Id<'libraryAssets'>` for Convex. Convex invalid IDs return `null` → "Hack not found". **OK**.
- **AssetDetailContent:** Receives `asset` and `assetId` from parent; `onClose` / `onSelectAsset` used for navigation. **OK**.

---

## 6. Search Page & Asset Links

- Search results link to **`/library?q=${encodeURIComponent(q)}`** so the Library opens with the same search query. **Correct.**
- Search does **not** link to individual hack detail (`/library/${asset._id}`). Optional enhancement: make each result row a link to the detail page (and keep or add a "Search Completed Hacks" link with `?q=...` for the list).

---

## 7. Recommendations (priority)

1. **Done:** `?action=new` — Library opens Submit Hack modal when param present; closing modal navigates to `/library` to clear param.
2. **Medium:** Either implement `?arsenal=true` / `?filter=arsenal` (e.g. set `arsenalOnly` or scroll to Featured Hacks) or change all such links to `/library` and drop the params.
3. **Low:** Consider linking Search result items to `/library/${asset._id}` for direct access to hack detail.

---

## 8. Files Touched (reference)

- `src/App.tsx` — route `library/:assetId`, lazy LibraryAssetDetail
- `src/pages/LibraryAssetDetail.tsx` — dedicated detail page
- `src/pages/Library.tsx` — redirect `?asset=`, navigate to detail, no modal
- `src/components/library/AssetDetailContent.tsx` — shared detail UI
- `src/components/dashboard/FeaturedHacks/HackCard.tsx` — View Details → `/library/${assetId}`
- `src/components/dashboard/QuickStartHacks/QuickStartHacks.tsx` — View → `/library/${assetId}`

Links using unhandled params: `Sidebar.tsx`, `FeaturedHacksShowcase.tsx`, `QuickActionsPanel.tsx`, `Onboarding.tsx`, `Guide.tsx`.
