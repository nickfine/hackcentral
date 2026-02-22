# Hack Detail Page — Flagship Upgrade Checklist

**Date:** Feb 1, 2026  
**Goal:** Make the hack detail page (Meeting Notes Summarizer / asset detail) the flagship gold-standard view.

---

## 1. What Was Improved

| Area | Status | Notes |
|------|--------|--------|
| **Repository / Source** | ✅ | Optional `sourceRepo` in schema; `RepoLink` and `RepoLinkOrSuggest` in shared; Core Prompt card shows source link (or "Suggest adding repo" when no repo); simple variant: ghost btn + GitBranch + "Source on {platform}" |
| **Back link** | ✅ | "Back to Completed Hacks" at very top with ArrowLeft, `btn btn-ghost btn-sm`, `min-h-11`, focus-visible ring |
| **Header** | ✅ | Title `text-2xl md:text-3xl font-bold tracking-tight`; description with `id="asset-detail-description"`; badges row; stats pill (reuses / projects) |
| **Sticky quick actions** | ✅ | Sticky bar with "I used this" dropdown, Record use (primary), Attach to project (outline); `min-h-11` and focus-visible on buttons |
| **Core Prompt card** | ✅ | `p-6`; RepoLinkOrSuggest + Copy prompt in same row; card hover `hover:shadow-md hover:scale-[1.01] hover:-translate-y-0.5`; Copy button success toast (sonner); Check icon theme `text-[var(--color-success)]`; `aria-label` and `aria-describedby` on copy |
| **Details sidebar** | ✅ | Card `p-6` + hover; `dl/dt/dd` with `dt` uppercase `text-xs font-medium text-muted-foreground tracking-wide`, `dd text-sm text-foreground` |
| **How to use** | ✅ | Card `p-6` + hover; TabButton (underline) for Example Input / Example Output; content `bg-muted/30 p-5 rounded-xl`; `role="tabpanel"` |
| **Testimonial** | ✅ | Quote icon top-left; quote text; author `text-sm italic text-muted-foreground`; card hover |
| **More like this** | ✅ | Section title `text-xl font-semibold`; horizontal scroll with `snap-x snap-mandatory`; SimilarHackCard `min-w-[280px] snap-start`; verified badge `top-3 right-3 size-5 bg-[var(--color-success)] rounded-full`; card `p-5 md:p-6`, hover, focus-visible; same style as dashboard HackCard |
| **Spacing** | ✅ | `space-y-6` between major sections; card internals consistent |
| **Theme & consistency** | ✅ | No hardcoded green/gray for verified/Check; theme vars; focus-visible on interactive elements |
| **Accessibility** | ✅ | Back and copy buttons `min-h-11`; focus-visible rings; `aria-label` on copy; `aria-describedby` where helpful |

---

## 2. New / Updated Components

| Component | Location | Purpose |
|-----------|----------|--------|
| **RepoLink** | `src/components/shared/RepoLink.tsx` | Renders link to source repo (GitHub/GitLab/Bitbucket); simple (ghost btn) or rich (pill with version + relative time + `title` tooltip) |
| **RepoLinkOrSuggest** | same file | Renders RepoLink when `sourceRepo` exists; otherwise optional "Suggest adding repo" ghost button |
| **Exports** | `src/components/shared/index.ts` | RepoLink, RepoLinkOrSuggest, and types (SourceRepo, RepoPlatform, RepoLinkProps, RepoLinkOrSuggestProps) |

---

## 3. Data Shape

**Convex `libraryAssets`:** Optional field:

```ts
sourceRepo: v.optional(v.object({
  url: v.string(),
  platform: v.union(v.literal("github"), v.literal("gitlab"), v.literal("bitbucket")),
  version: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
  repoName: v.optional(v.string()),
  description: v.optional(v.string()),
  commitMessage: v.optional(v.string()),
})),
```

**Frontend `AssetDetailContentProps.asset`:** `sourceRepo?: SourceRepo | null`.

---

## 4. Files Touched

| File | Changes |
|------|--------|
| `convex/schema.ts` | Added optional `sourceRepo` to `libraryAssets` |
| `src/components/shared/RepoLink.tsx` | **New** — RepoLink, RepoLinkOrSuggest |
| `src/components/shared/index.ts` | Exported RepoLink, RepoLinkOrSuggest and types |
| `src/components/library/AssetDetailContent.tsx` | Back at top, RepoLinkOrSuggest, card hovers, TabButton for Example tabs, testimonial italic author, More like this snap + SimilarHackCard style, focus-visible, Copy toast, theme Check |
| `src/pages/TeamPulse.tsx` | Fixed Info icon: wrapped in `<span title="...">` (Lucide Info does not accept `title` prop) |
| `PLAN_HACK_DETAIL_FLAGSHIP.md` | Upgrade plan |
| `CHECKLIST_HACK_DETAIL_FLAGSHIP.md` | This checklist |

---

## 5. Remaining Global Tasks (Optional)

| Task | Priority | Notes |
|------|----------|--------|
| **a11y audit** | Optional | Full axe or similar; skip-link, landmark order, screen reader flow |
| **Dark mode** | Optional | Testimonial gradient and badges in dark; theme vars already used |
| **Loading states** | Done | LibraryAssetDetail uses SkeletonCard (wide) while loading |
| **Add sourceRepo to create/update** | Optional | Allow authors to set `sourceRepo` when creating/editing a hack (UI + Convex mutation) |
| **"Suggest adding repo" action** | Optional | Wire `onSuggestAdd` to feedback or edit flow if desired |

---

## 6. Summary

The hack detail page is now the flagship detail view: Back link at top, clear hierarchy, RepoLink in Core Prompt card, consistent card padding and hover, underline Example Input/Output tabs, testimonial with Quote and italic author, More like this carousel with snap and HackCard-style cards, theme-based colors, and focus-visible throughout. No new UI libraries; native `title` for RepoLink tooltip. Build passes; Convex codegen run after schema change.
