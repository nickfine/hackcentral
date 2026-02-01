# Code Review: Consistency & Integrity (Post v0.4.13)

**Date:** Jan 30, 2026  
**Scope:** Full codebase after project dedicated page (v0.4.12) and pre–Phase 3 UX improvements (v0.4.13). Focus: consistency (shared constants, patterns, terminology) and integrity (routing, data flow, types, edge cases).

---

## Summary

The codebase is **consistent and sound**. One optional consistency tweak was applied (Dashboard: `useQuery(api.projects.list, {})` to match other empty-arg queries). No integrity issues were found; routing, Convex usage, error handling, and accessibility are aligned across the reviewed areas.

---

## 1. Consistency

### 1.1 Project status (single source of truth) ✅

- **`src/constants/project.ts`** defines `PROJECT_STATUS_LABELS` and `PROJECT_STATUS_BADGE_COLORS` for all five statuses: idea, building, incubation, completed, archived.
- **Projects.tsx:** Uses both constants for the list and filter (ProjectCard badge, ProjectPlaceholder, dropdown options). Tab values (`''`, `'idea'`, `'building'`, `'completed'`) match; dropdown adds `incubation` and `archived`. Filter logic uses `statusFilter` and `p.status`; status values align with Convex schema.
- **ProjectDetail.tsx:** Uses `PROJECT_STATUS_LABELS` only; status is shown with `badge badge-outline` (deliberate difference from list badges). No duplication.
- **Convex schema** (`projects.status`): `idea` | `building` | `incubation` | `completed` | `archived` — matches constants.

### 1.2 EmptyState usage ✅

- **Component:** `src/components/shared/EmptyState.tsx` — single definition; supports `icon`, `title`, optional `description`, optional `action` (`to` or `onClick`), `variant` (default | compact). Exported from `src/components/shared/index.ts`.
- **Usage:**
  - **Projects:** (1) No projects → "No projects yet" + New Project button (`onClick`). (2) No match → "No projects match your filters" (no action). Pattern consistent.
  - **Library:** No assets match filters → "No assets found" + contextual description (filter vs first contributor). No action; consistent.
  - **People:** (1) No profiles → "No profiles yet" (no action). (2) No match → "No people match your filters" (no action). Consistent.

### 1.3 Terminology (assets vs artefacts) ✅

- **User-facing copy:** "AI assets", "Library activity", "reusable AI assets", "1 asset" on project cards, etc. No "artefacts" in UI.
- **Internal types:** `src/types/database.ts` and `src/types/project.ts` retain "artefact" (e.g. `project_ai_artefact`, `has_ai_artefacts`). Intentional split: UI = "assets", internal/backend = "artefact" where already defined. No change needed.

### 1.4 Profile: Activity tab and Library activity stat ✅

- **Tab:** Internal state `ActiveTab = 'contributions' | 'projects' | ...`; display label is "Activity". Single tab; no mismatch.
- **Stat card:** Label is "Library activity" (not "Library Contributions"). Matches Activity/Recent Activity wording.
- **Section:** "Recent Activity" with subtitle "Your library and project contributions." Coherent.

### 1.5 Header (search, notifications, mobile menu) ✅

- Search: `readOnly`, `aria-label="Search (coming soon)"`, `title="Coming soon"` on wrapper and input. Prevents implying working search.
- Notifications: `title="Coming soon"`, `aria-label="Notifications (coming soon)"`. Decorative dot has `aria-hidden`.
- Mobile menu: `aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}`. Consistent with pre–Phase 3 review.

### 1.6 Page-level headings ✅

- **Dashboard:** One h1 ("AI Maturity Dashboard"); sections use h2.
- **Profile:** One h1 ("My Profile"); user name in card is h2; sections (Recent Activity, My Projects, etc.) are h2.
- **Projects:** One h1 ("Projects"); modal uses h2 for "New Project".
- **Library:** One h1 ("Library"); AI Arsenal / All Assets and modals use h2.
- **People:** One h1 ("People"); sections use h2.
- **ProjectDetail:** One h1 (project title); Learning summary, Close or archive, Comments are h2. No skipped levels.

### 1.7 useQuery style ✅ Applied

- **Dashboard:** All empty-arg queries now use the same shape: `useQuery(api.projects.list, {})`, `useQuery(api.libraryAssets.list, {})`, `useQuery(api.recognition.getDerivedBadgesForCurrentUser, {})`. Consistent with the earlier fix for `libraryAssets.list` and `getDerivedBadgesForCurrentUser`.

---

## 2. Integrity

### 2.1 Routing ✅

- **App.tsx:** Routes under Layout: index → `/dashboard`, then `dashboard`, `people`, `library`, `projects`, `projects/:projectId`, `profile`; catch-all `*` → `/dashboard`. Order is correct; `projects/:projectId` is not shadowed. No duplicate routes.

### 2.2 Project detail flow ✅

- **Navigation:** Projects list uses `navigate(\`/projects/${project._id}\`)` on card click and `navigate(\`/projects/${project._id}#comments\`)` on comment icon. ProjectDetail uses `useParams<{ projectId: string }>()` and casts to `Id<'projects'> | undefined`; Convex is called with `projectId ? { projectId } : 'skip'`.
- **Edge cases:** Missing `projectId` → "Invalid project." + Back link. `project === undefined` → "Loading project…". `project === null` → "Project not found." + Back link. Comments and close/archive forms are gated; no submission with invalid state.
- **Back link:** Single "Back to projects" `Link` to `/projects` with `aria-label`. No duplicate navigation.

### 2.3 Convex usage ✅

- **ProjectDetail:** `getById`, `listForProject` (comments), `add` (comment), `update` (project). All receive valid `projectId` or are skipped when `!projectId`. Owner check uses `project.ownerId === profile._id`; close/archive only when `isOwner && !isClosed`.
- **Projects:** `listWithCounts` (no args). Filtering is client-side by `statusFilter` and search; correct.
- **Dashboard:** `getDashboardMetrics`, `getRecentActivity`, `getTopContributors`, `getTopMentors`, `getMostReusedAssets`, `impactStories.list`, `projects.list`, `libraryAssets.list`, `getDerivedBadgesForCurrentUser`. Queries that require args receive them (e.g. `libraryAssets.list` and `getDerivedBadgesForCurrentUser` use `{}`). First-time CTA uses `recentActivity !== undefined && recentActivity.length === 0`; no race assumption.

### 2.4 Types and casts ✅

- **ProjectDetail:** `projectWithOwner = project as typeof project & { ownerFullName?: string }` used only for display of `ownerFullName` returned by backend. Safe.
- **Projects:** `ProjectWithCounts` and project status from API; badge fallback `PROJECT_STATUS_BADGE_COLORS[project.status] ?? 'bg-gray-100 ...'` handles unknown status. `ProjectPlaceholderProps.status` includes `'incubation'`; consistent with schema.

### 2.5 Accessibility and semantics ✅

- **ProjectDetail:** Back link has `aria-label`. Form fields have `id` / `htmlFor`. Comment submit disabled when `!commentContent.trim()` or `isSubmittingComment`. Section headings (h2) and `id="comments"` for hash scroll are correct.
- **Projects:** ProjectCard has `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter, `aria-label={`View ${project.title}`}`. Buttons for Like, Offer help, View comments are present and labeled in snapshot.
- **EmptyState:** Renders `h3` for title; action is either `Link` or `button` with no duplicate focus issues.

### 2.6 No dead code ✅

- Projects list no longer uses `addComment`, `updateProject`, or modal state for project/comments; navigation only. Profile still uses `getInitials`; shared components and constants are imported and used. No leftover references to removed modals found.

---

## 3. Optional follow-ups

| Item | Priority | Notes |
|------|----------|--------|
| ~~`useQuery(api.projects.list, {})` in Dashboard~~ | Done | Applied for consistency. |
| ~~Semicolon style~~ | Done | Dashboard now uses semicolons to match ProjectDetail/Projects. |

---

## 4. Files and areas reviewed

| Area | Files / locations |
|------|--------------------|
| Routing | `src/App.tsx` |
| Project constants | `src/constants/project.ts` |
| Project list & detail | `src/pages/Projects.tsx`, `src/pages/ProjectDetail.tsx` |
| Shared UI | `src/components/shared/EmptyState.tsx`, `index.ts`, `Header.tsx` |
| Profile | `src/pages/Profile.tsx` (headings, Activity tab, Library activity stat) |
| Dashboard | `src/pages/Dashboard.tsx` (CTA, useQuery, terminology) |
| Library | `src/pages/Library.tsx` (subtitle copy, EmptyState) |
| People | `src/pages/People.tsx` (EmptyState usage) |
| Convex | `convex/schema.ts` (projects.status), `convex/projects.ts`, `convex/libraryAssets.ts`, `convex/recognition.ts` |
| Terminology | Grep for "artefact" in `src` (only in types) |

---

## 5. Conclusion

- **Consistency:** Shared project constants, EmptyState, terminology (assets in UI, artefact in internal types), Profile Activity/Library activity, Header placeholders, and heading hierarchy are consistent.
- **Integrity:** Routing, project detail flow, Convex usage, type casts, accessibility, and removal of obsolete modal code are sound.

No blocking issues. Safe to proceed with Phase 3 or further feature work.
