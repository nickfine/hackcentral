# Hack Detail Page — Flagship Upgrade Plan

**Goal:** Make the hack detail page (Meeting Notes Summarizer / asset detail) the gold-standard flagship view: premium SaaS quality, Linear polish, clear hierarchy, warm Notion-like feel.

---

## 1. Summary of Changes

| Area | Change |
|------|--------|
| **Repository / Source** | New optional `sourceRepo` field; RepoLink component (GitHub/GitLab/Bitbucket) in Core Prompt card; fallback "Suggest adding repo" ghost when absent |
| **Visual & spacing** | All cards `p-6`; `space-y-6` between major sections; Details `dl/dt/dd` with `dt` uppercase `text-xs font-medium text-muted-foreground tracking-wide`, `dd text-sm`; testimonial with Quote icon top-left, author italic |
| **Micro-interactions** | Card hover: `hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5`; Copy prompt toast (sonner); Example Input/Output underline tabs; More like this horizontal scroll with snap, `min-w-[280px]`, same style as dashboard HackCard |
| **UX & hierarchy** | Sticky quick actions bar; header title `text-2xl md:text-3xl font-bold`; badges row + stats pill; Back link at very top `btn btn-ghost btn-sm` + ArrowLeft |
| **Consistency** | Theme vars (no hardcoded green/gray); Verified badge `top-3 right-3 size-5 bg-[var(--color-success)]`; focus-visible rings; mobile single-column stack, `min-h-11` tap targets |
| **Accessibility** | `aria-label` on copy; `aria-describedby` where helpful; focus-visible on interactive elements |

---

## 2. New Data Shape: `sourceRepo`

**Convex schema (`libraryAssets`):** Optional field:

```ts
sourceRepo: v.optional(v.object({
  url: v.string(),
  platform: v.union(
    v.literal("github"),
    v.literal("gitlab"),
    v.literal("bitbucket")
  ),
  version: v.optional(v.string()),   // e.g. "v1.2"
  updatedAt: v.optional(v.number()), // timestamp
  repoName: v.optional(v.string()),
  description: v.optional(v.string()),
  commitMessage: v.optional(v.string()),
})),
```

**Frontend prop (AssetDetailContentProps.asset):**

```ts
sourceRepo?: {
  url: string;
  platform: 'github' | 'gitlab' | 'bitbucket';
  version?: string;
  updatedAt?: number;
  repoName?: string;
  description?: string;
  commitMessage?: string;
};
```

- **UI (simple):** `btn btn-ghost btn-sm text-muted-foreground hover:text-primary` + `GitBranch` + "Source on GitLab" (or platform name).
- **UI (richer):** Small pill with platform icon + version + "3 days ago" + native `title` tooltip (repo name, description snippet, commit message). No Radix HoverCard to avoid new deps; use `title` for tooltip.

---

## 3. Files to Touch

| File | Changes |
|------|--------|
| `convex/schema.ts` | Add optional `sourceRepo` to `libraryAssets` |
| `convex/libraryAssets.ts` | No change to getById (returns spread of asset); create/update args if we allow editing sourceRepo later |
| `src/components/shared/RepoLink.tsx` | **New** — RepoLink component (simple link or rich pill with title tooltip) |
| `src/components/library/AssetDetailContent.tsx` | Back link, header, Core Prompt + RepoLink, all cards p-6 + hover, Details dl styling, How to use tabs (underline), testimonial Quote + italic author, More like this snap + SimilarHackCard aligned to HackCard, focus-visible, Copy toast |
| `src/pages/LibraryAssetDetail.tsx` | Back "Back to Completed Hacks" at very top with ArrowLeft (or keep inside AssetDetailContent and move to top) |

---

## 4. Section Headers

Use consistent **h2** for in-page sections (Core prompt, How to use, More like this) with class `text-xl font-semibold` — not SectionHeader (which renders h1). Optional action row next to section title (e.g. Copy prompt + Repo link) in same row.

---

## 5. Implementation Order

1. Schema + RepoLink component  
2. AssetDetailContent refactor (structure, RepoLink, spacing, tabs, testimonial, More like this cards)  
3. LibraryAssetDetail top Back link  
4. Final checklist
