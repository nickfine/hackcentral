# Code Review: Consistency & Integrity (Post Team Up)

**Scope:** Review after Team Up page redesign, bulletin board, and SectionHeader variant changes.

---

## 1. Summary

| Area | Status | Notes |
|------|--------|-------|
| **SectionHeader variants** | ⚠️ | Main nav pages (Hacks, Team Up, Team Pulse) use `variant="page"`; other pages and embedded sections mixed |
| **Duplicate type labels** | ⚠️ | `ASSET_TYPE_LABELS` duplicated in Search.tsx, AssetDetailContent.tsx |
| **CollectiveProgressCard** | ⚠️ | Uses SectionHeader without `variant="section"`; imports from direct path |
| **Dashboard / page titles** | ⚠️ | Dashboard uses WelcomeHero (different pattern); Profile, Search, etc. use default SectionHeader size |
| **Import paths** | ✅ | `@/` used for shared modules; convex remains relative (no alias) |
| **Design system** | ✅ | Textareas use `.textarea`; HACK_TYPES unified |
| **helpRequests API** | ✅ | Schema, CRUD, and list query correct |

---

## 2. Consistency Issues

### 2.1 SectionHeader variant usage

**Current state:**

| Page / Component | Title | variant | Size |
|------------------|-------|---------|------|
| Hacks | Our Hacks | `page` | text-3xl md:text-4xl |
| Team Up | Team Up | `page` | text-3xl md:text-4xl |
| Team Pulse | Team Pulse | `page` | text-3xl md:text-4xl |
| People (sections) | Bulletin Board, HackCentral Helpers, Hackers | `section` | text-xl |
| Profile | My Profile | (none) | text-2xl md:text-3xl |
| Search | Search | (none) | text-2xl md:text-3xl |
| Notifications | Notifications | (none) | text-2xl md:text-3xl |
| Library (standalone) | Completed Hacks | (none) | text-2xl md:text-3xl |
| Projects (standalone) | Hacks In Progress | (none) | text-2xl md:text-3xl |
| Guide | AI 101 micro-guide | (none) | text-2xl md:text-3xl |
| Onboarding | Get started | (none) | text-2xl md:text-3xl |
| ProfileAccount | Account | (none) | text-2xl md:text-3xl |
| CollectiveProgressCard | Our Collective Progress | (none) | text-2xl md:text-3xl |

**Recommendation:**

- **CollectiveProgressCard** — Add `variant="section"` (it's a section within Team Pulse, not a top-level page title).
- **Other top-level pages** (Profile, Search, Notifications, Guide, Onboarding, ProfileAccount, Library, Projects) — Consider adding `variant="page"` for consistent page title sizing across the app. Low priority if the current hierarchy is acceptable.

### 2.2 Duplicate ASSET_TYPE_LABELS

Three definitions of hack-type display labels (singular form):

| Location | Name | Content |
|----------|------|---------|
| `src/constants/project.ts` | `HACK_TYPE_LABELS` | plural: Prompts, Skills, Apps |
| `src/pages/Search.tsx` | `ASSET_TYPE_LABELS` | singular: Prompt, Skill, App |
| `src/components/library/AssetDetailContent.tsx` | `ASSET_TYPE_LABELS` | singular: Prompt, Skill, App |

**Recommendation:** Add `HACK_TYPE_LABELS_SINGULAR` (or similar) to `@/constants/project` and use it in Search.tsx and AssetDetailContent.tsx to avoid duplication.

### 2.3 CollectiveProgressCard import

`CollectiveProgressCard.tsx` imports:

```ts
import { SectionHeader } from '@/components/shared/SectionHeader';
```

Other components typically use:

```ts
import { SectionHeader } from '@/components/shared';
```

**Recommendation:** Switch to `@/components/shared` for consistency.

---

## 3. Integrity Issues

### 3.1 helpRequests list when status is "all"

`BulletinBoard.tsx` passes `statusFilter === 'all'` by omitting the status arg:

```ts
const helpRequests = useQuery(
  api.helpRequests.list,
  statusFilter === 'all'
    ? { category: categoryFilter || undefined }
    : { status: statusFilter, category: categoryFilter || undefined }
);
```

`helpRequests.list` correctly handles the case when `status` is omitted (full table query). No issue.

### 3.2 Bulletin Board convex import

`BulletinBoard.tsx` uses relative import:

```ts
import { api } from '../../../convex/_generated/api';
```

Convex lives outside `src`, and there is no `@/convex` alias. This matches the pattern used elsewhere; acceptable.

---

## 4. Structure & Layout

### 4.1 Team Up page

- Page title: Team Up, variant="page" ✅
- Bulletin Board at top ✅
- HackCentral Helpers, Hackers sections with variant="section" ✅
- Bulletin Board SectionHeader with variant="section" ✅

### 4.2 helpRequests schema and API

- `helpRequests` table with indexes ✅
- `create`, `list`, `getByCurrentUser`, `markResolved`, `update`, `remove` ✅
- Auth checks and author-only updates ✅

---

## 5. Recommendations (priority)

| Priority | Item | Effort |
|----------|------|--------|
| Medium | Add `variant="section"` to CollectiveProgressCard SectionHeader | Trivial |
| Medium | Consolidate ASSET_TYPE_LABELS into constants (add singular labels) | Low |
| Low | Change CollectiveProgressCard to import from `@/components/shared` | Trivial |
| Low | Add `variant="page"` to other top-level page SectionHeaders for consistency | Low |

---

## 6. Files Reviewed

- `src/pages/People.tsx`
- `src/pages/Hacks.tsx`
- `src/pages/TeamPulse.tsx`
- `src/components/shared/SectionHeader.tsx`
- `src/components/team/BulletinBoard.tsx`
- `src/components/team/PostHelpRequestModal.tsx`
- `src/components/dashboard/CollectiveProgress/CollectiveProgressCard.tsx`
- `convex/helpRequests.ts`
- `convex/schema.ts`
- `src/pages/Search.tsx`
- `src/components/library/AssetDetailContent.tsx`
- `src/constants/project.ts`
