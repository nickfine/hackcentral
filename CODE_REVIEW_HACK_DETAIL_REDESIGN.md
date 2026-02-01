# Code Review: Consistency & Integrity (Hack Detail Redesign)

**Date:** Feb 1, 2026  
**Scope:** Hack Detail page redesign — AssetDetailContent.tsx refactor and LibraryAssetDetail.tsx updates.

---

## Summary

- **Implementation** is consistent with the codebase and design system. No breaking changes; props and data flow preserved.
- **Integrity:** Convex usage, types, and navigation are correct. Edge cases (empty Details, example tabs) handled.
- **Minor opportunities:** Centralize type labels, align toast copy, and use shared design tokens where beneficial.

---

## 1. Routing & Navigation — Consistent ✓

| Area | Status | Notes |
|------|--------|--------|
| Detail route | ✓ | `/library/:assetId` unchanged; LibraryAssetDetail renders AssetDetailContent |
| Back / Close | ✓ | `onClose` → `navigate('/hacks?tab=completed')` — canonical Completed Hacks URL |
| More like this | ✓ | `onSelectAsset` → `navigate(\`/library/${id}\`)` — same pattern as Library AssetCard |
| Redirects | ✓ | Existing `?asset=` redirect in Library still applies; no change needed |

---

## 2. Naming & Terminology — Consistent ✓

| Layer | Status | Notes |
|-------|--------|--------|
| Display copy | ✓ | "Back to Completed Hacks", "Featured Hacks", "Record use", "Attach to project", "Core prompt", "How to use", "More like this", "Details" |
| Hack vs asset | ✓ | User-facing copy uses "hack(s)"; internal names (assetId, asset, libraryAssets) unchanged |
| Status labels | ✓ | "Verified", "Deprecated", "In progress" — matches qualityGateLabels in design-system.ts |

---

## 3. Constants & Labels — Minor Inconsistency

### 3.1 Duplicate type labels

AssetDetailContent defines local `ASSET_TYPE_LABELS`:

```ts
const ASSET_TYPE_LABELS: Record<string, string> = {
  prompt: 'Prompt',
  skill: 'Skill',
  app: 'App',
};
```

**Same pattern** in: HackCard (`TYPE_LABELS`), Search (`ASSET_TYPE_LABELS`), Library (`ASSET_TYPES` array).

**Design system** has `assetTypeLabels` in `src/lib/design-system.ts` but it is **not used** anywhere in the codebase. All components use local definitions.

**Verdict:** Matches existing pattern. Optional: later refactor to import `assetTypeLabels` from design-system for single source of truth.

### 3.2 Status display

Status badge uses inline logic:

```ts
{asset.status === 'verified' ? 'Verified' : asset.status === 'deprecated' ? 'Deprecated' : 'In progress'}
```

This matches `qualityGateLabels` (draft/in_progress → "In progress"). `qualityGateLabels` is unused elsewhere; current approach is acceptable.

---

## 4. Toast Messages — Minor Variance

| Context | Toast | Location |
|---------|-------|----------|
| Copy prompt | "Prompt copied to clipboard" | AssetDetailContent |
| Copy hack (QuickStart) | "Copied!" | QuickStartHacks |
| Record use | "Use recorded. Thanks for contributing!" | AssetDetailContent |
| Attach | "Hack attached to project!" | AssetDetailContent |
| Status update | "Hack marked as verified." / etc. | AssetDetailContent |

**Note:** "Prompt copied to clipboard" is more specific than "Copied!" and appropriate for the detail page. No change required; document as intentional variance.

---

## 5. Design System & Styling — Consistent ✓

| Element | Status | Notes |
|---------|--------|-------|
| Badges | ✓ | `HACK_TYPE_BADGE_COLORS`, `badge-verified`, `badge-secondary` from existing system |
| Cards | ✓ | `rounded-xl border border-border bg-card shadow-sm p-6` — matches dashboard cards |
| Buttons | ✓ | `btn btn-primary`, `btn btn-outline`, `btn btn-ghost` |
| Testimonial | ✓ | Same quote as WallOfThanksStrip ("Saved my team 5 hours with this hack!" — Alex M.); amber gradient styling |
| Verified corner | ✓ | Green corner flash on SimilarHackCard matches HackCard and Library AssetCard |

---

## 6. SimilarHackCard vs AssetCard — Alignment ✓

| Aspect | Library AssetCard | SimilarHackCard | Match |
|--------|-------------------|-----------------|-------|
| Layout | Icon, title, description, type badge, reuse count | Icon, title, description, type badge | ✓ (no reuse in getSimilar) |
| Verified flash | `pr-8` + green corner | Same | ✓ |
| Deprecated | `opacity-75` | Same | ✓ |
| stripSeedDescriptionSuffix | Yes | Yes | ✓ |
| HACK_TYPE_BADGE_COLORS | Yes | Yes | ✓ |
| Type labels | ASSET_TYPES / singular | ASSET_TYPE_LABELS / singular | ✓ |

---

## 7. Data & Type Integrity ✓

| Area | Status | Notes |
|------|--------|-------|
| Props | ✓ | AssetDetailContentProps unchanged; asset shape matches getById response |
| Convex queries | ✓ | getById, getReuseCountForAsset, getSimilar, projects.list — correct usage |
| Mutations | ✓ | recordReuse, attachToProject, libraryAssets.update — correct args |
| Content extraction | ✓ | getDisplayablePrompt handles string, `{prompt}`, `{systemPrompt}`, fallback JSON |
| Optional metadata | ✓ | All metadata fields optional; conditional rendering for Details card |

---

## 8. Edge Cases & Accessibility ✓

| Case | Handling |
|------|----------|
| No displayable prompt | Core prompt card hidden |
| No usage, no examples | How to use card hidden |
| Empty Details (no metadata, not author, not verified) | Details card hidden |
| Example tabs | Initial tab from exampleInput ?? exampleOutput |
| Similar assets empty | "No other {type}s in Completed Hacks yet." |
| Copy failure | toast.error('Failed to copy') |
| SimilarHackCard | aria-label="View ${asset.title}" |

---

## 9. Import Paths — Consistent ✓

- Convex: `../../../convex/_generated/api` (relative from `src/components/library/`)
- Utils/constants: `@/lib/utils`, `@/constants/project`
- Matches patterns in Library, HackCard, etc.

---

## 10. LibraryAssetDetail — Container & States ✓

| Aspect | Status |
|--------|--------|
| Container | `mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8` — consistent with typical page layout |
| Loading | Centered "Loading..." with same container |
| Not found | Card with "Hack not found", Back button; same container |
| Success | AssetDetailContent with onClose / onSelectAsset wiring |

---

## 11. Recommendations

| Priority | Item | Action |
|----------|------|--------|
| None | — | No required fixes; implementation is consistent and correct |
| Low | Type labels | Consider importing `assetTypeLabels` from design-system in future refactor |
| Low | Toast copy | "Prompt copied to clipboard" vs "Copied!" — intentional; keep as-is |

---

## 12. Files Touched (Reference)

- `src/components/library/AssetDetailContent.tsx` — full refactor
- `src/pages/LibraryAssetDetail.tsx` — container, remove wrapper card, loading/not-found layout
