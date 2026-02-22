# Code Review: Consistency & Integrity — Featured Hacks (Hack Types & CTAs)

**Date:** Feb 1, 2026  
**Scope:** Featured hacks flow (getFeaturedHacks, HackCard, FeaturedHacksShowcase, QuickStartHacks), type-appropriate CTAs (prompt/skill vs app vs story), and at least one of each hack type on dashboard and in libraries.

---

## Summary

**Consistency:** One fix applied — QuickStartHacks was not passing `assetType` from the API and StarterCard always showed "Copy" + "View", so app-type starter hacks incorrectly showed a Copy button. QuickStartHacks now passes `assetType` and StarterCard hides Copy for apps (View only, primary), aligned with HackCard.

**Integrity:** Data flow (Convex → mapApiHackToItem → HackCard/StarterCard), types (FeaturedHack vs FeaturedHackItem), and getFeaturedHacks “at least one of each type” logic are sound. One optional improvement: Featured Hacks list semantics (role="list" with listitem on wrapper).

---

## 1. Consistency

### 1.1 Type-appropriate CTAs (Copy vs View only)

- **HackCard** (FeaturedHacksShowcase): Prompt/skill assets → "Copy Hack" + "View Details"; app assets → only "View Details" (primary); stories → "Copy Story" + "View Details"; fallback (asset, no assetType) → "Copy Hack" + "View Details". Logic is correct and tested (tests/featured-hacks-HackCard.spec.tsx).
- **QuickStartHacks StarterCard:** Was showing "Copy" + "View" for every hack. **Fix:** mapApiHackToItem now includes `assetType`; StarterCard shows Copy only when `hack.type === 'story'` or `(hack.type === 'asset' && hack.assetType !== 'app')`; when only View is shown, that button is primary. Aligns with HackCard.

### 1.2 API → frontend type shape

- **Convex** `FeaturedHack`: `assetId?: Id<"libraryAssets">`, `storyId?: Id<"impactStories">`, `assetType?: "prompt" | "skill" | "app"`. Stories omit assetType.
- **Frontend** `FeaturedHackItem`: same shape with string ids (Convex serializes Ids to strings). Optional `assetType` for stories and backwards compatibility.
- **mapApiHackToItem** (FeaturedHacksShowcase and QuickStartHacks): both now pass through `assetType` so HackCard and StarterCard receive it.

### 1.3 Placeholder and fallbacks

- **PLACEHOLDER_HACKS:** First item has `assetType: 'prompt'` (shows Copy Hack); story placeholder has no assetType. Consistent with HackCard.
- **Blurb fallback (Convex):** Uses `asset.assetType.replace("_", " ")`; schema only has "prompt" | "skill" | "app" (no underscore). Harmless; could remove replace for clarity or keep as legacy guard.
- **Library/Search:** Same `assetType.replace('_', ' ')` for display; schema values have no underscore. No change required.

### 1.4 Naming and display copy

- Dashboard: "Community Hacks", "Copy Hack" / "Copy Story", "View Details", "Starter Hacks", "Completed Hacks". Library: "Completed Hacks", "Featured Hacks", type labels "prompt" / "skill" / "app". design-system `assetTypeLabels`: prompt, skill, app. Consistent.

---

## 2. Integrity

### 2.1 getFeaturedHacks (at least one of each type)

- **Logic:** Build sorted list (assets + stories); take best-of-type (prompt, skill, app) into `mustHave`; build `result = [...mustHave]`, then fill from sorted list until `result.length >= limit`, dedupe by id; sort result; return `result.slice(0, limit)`. Ensures the returned set includes at least one asset of each type when available.
- **Types:** `mustHave` filtered and cast to `FeaturedHack[]`; no undefined in result. Convex typecheck passes.

### 2.2 HackCard

- **viewDetailsTo:** Asset with assetId → `/library?asset=${assetId}`; story or no assetId → `/library`. Correct.
- **Copy payload:** Asset: title + blurb + "View: <url>"; story: title + blurb. No clipboard for app (button not rendered). Correct.
- **Accessibility:** Copy button has `aria-label={copyLabel}`; View Details has `aria-label={viewLabel}`. Copy only rendered when showCopy; labels used only when buttons/links are present.

### 2.3 FeaturedHacksShowcase

- **Data:** `useQuery(api.metrics.getFeaturedHacks, { limit: GRID_CARD_COUNT })`; loading → empty array; then displayHacks = hacks or PLACEHOLDER_HACKS; gridHacks = slice to GRID_CARD_COUNT. Correct.
- **List semantics:** Section uses `role="list"` and `aria-label="Featured hacks"` on the grid container; children are `motion.div` (no `role="listitem"`). **Optional:** Add `role="listitem"` to the wrapper div (or the article) so list semantics are complete for assistive tech.

### 2.4 QuickStartHacks (after fix)

- **Data:** Same API; mapApiHackToItem now includes assetType; starters = first STARTER_LIMIT. StarterCard receives full FeaturedHackItem; showCopy derived from type + assetType; View primary when Copy hidden. No duplicate ids; correct.

### 2.5 Seed and libraries

- **Seed (seedAIArsenal):** At least one prompt, one skill, one app; comment documents intent for dashboard and Library.
- **Library page:** Lists all assets; filter by type; no Copy button in list cards. Type display uses assetType; no inconsistency with dashboard CTA rules.

---

## 3. Recommendations

| Item | Priority | Action |
|------|----------|--------|
| QuickStartHacks: pass assetType, hide Copy for apps | Done | mapApiHackToItem + StarterCard conditional Copy and View primary |
| Featured Hacks list: listitem role | Optional | Add `role="listitem"` to card wrapper in FeaturedHacksShowcase |
| assetType.replace('_', ' ') | Low | Schema has no underscore; remove replace or keep as guard; either is fine |

---

## 4. Files touched (review / fix)

- **Reviewed:** convex/metrics.ts, convex/seedData.ts, src/components/dashboard/FeaturedHacks/HackCard.tsx, FeaturedHacksShowcase.tsx, QuickStartHacks/QuickStartHacks.tsx, src/pages/Library.tsx (references), src/lib/design-system.ts, tests/featured-hacks-HackCard.spec.tsx.
- **Fixed:** QuickStartHacks: mapApiHackToItem accepts and passes `assetType`; StarterCard shows Copy only for prompt/skill/story (not app), View primary when Copy hidden.
