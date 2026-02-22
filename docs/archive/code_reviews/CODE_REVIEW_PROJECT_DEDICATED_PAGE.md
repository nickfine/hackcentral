# Code Review: Project Dedicated Page – Consistency & Integrity

**Date:** Feb 1, 2026  
**Scope:** Project detail route (`/projects/:projectId`), Projects list, ProjectDetail page, shared constants.

---

## Summary

The project dedicated page implementation is **consistent and sound**. One consistency improvement was applied (shared project status constants). No integrity issues were found; edge cases are handled and patterns match the rest of the app.

---

## Consistency

### 1. **Project status labels and badge colors** ✅ Fixed

- **Finding:** Status labels and badge colors were duplicated in three places: `ProjectDetail.tsx` (`STATUS_LABELS`), `Projects.tsx` `ProjectCard` (inline `statusLabels` / `statusColors`), and `Projects.tsx` `ProjectPlaceholder` (inline maps).
- **Change:** Introduced `src/constants/project.ts` with `PROJECT_STATUS_LABELS` and `PROJECT_STATUS_BADGE_COLORS`, following the pattern of `src/constants/profile.ts`. `ProjectDetail` and `Projects` (ProjectCard and ProjectPlaceholder) now use these constants.
- **Result:** Single source of truth for project status display; future status changes only need to be made in one file.

### 2. **Imports**

- **App.tsx** uses `@/` for components and pages (e.g. `@/pages`, `@/components/auth/AuthGuard`). Page components use relative paths for Convex and hooks (`../../convex/_generated/api`, `../hooks/useAuth`). This matches the rest of the codebase (Library, Dashboard, etc.) and is acceptable.

### 3. **Error handling and loading**

- **ProjectDetail:** Uses `console.error` + `toast.error` in handlers; loading states for project and comments; explicit handling for missing `projectId`, loading (`project === undefined`), and not found (`project === null`) with appropriate messages and “Back to projects” link. Aligned with patterns used elsewhere (e.g. Library, Projects create flow).

### 4. **Routing**

- **App.tsx:** `projects/:projectId` is declared under Layout before the catch-all `*`, so the route is correct. ProjectDetail is only rendered when the URL matches; `useParams` is used correctly.

---

## Integrity

### 1. **URL parameter and Convex usage**

- `projectId` from `useParams` is typed as `string | undefined`. It is cast to `Id<'projects'> | undefined` and passed to Convex only when truthy (`projectId ? { projectId } : 'skip'`). Invalid or non-existent IDs are handled by `getById` returning `null`, and the UI shows “Project not found” with a back link. No change required.

### 2. **Visibility and auth**

- Project visibility and membership are enforced in `convex/projects.ts` `getById` (returns `null` when the user may not see the project). ProjectDetail does not bypass this. Comment form is gated by `isAuthenticated`; close/archive is owner-only via `isOwner`. Behavior is correct.

### 3. **Types**

- `projectWithOwner` cast in ProjectDetail (`project as typeof project & { ownerFullName?: string }`) is defensive; the backend returns `ownerFullName` in `getById`. The cast is safe and keeps TypeScript happy if generated types lag.

### 4. **Accessibility and semantics**

- ProjectDetail: “Back to projects” is a `Link` with `aria-label`. Section headings use `h1` (title) and `h2` (Learning summary, Close or archive, Comments). Form controls have `id`/`htmlFor`. ProjectCard: `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter, `aria-label` for view/comments. No issues found.

### 5. **Scroll to comments**

- `useEffect` scrolls to `#comments` when `project` is loaded and `window.location.hash === '#comments'`. The comments block has `id="comments"` and `scroll-mt-4`. Behavior is correct and does not introduce integrity concerns.

### 6. **No dead code**

- After removing the modals, Projects no longer uses `addComment` or `updateProject`; those mutations were removed from the list page. No leftover references found.

---

## Optional follow-ups (not required)

- **Semicolon style:** Dashboard uses no semicolons; ProjectDetail and Projects use semicolons. Purely stylistic; can be normalized later if the team adopts a single style.
- **Convex ID format:** For URLs like `/projects/not-a-valid-id`, Convex may throw or return `null` depending on validation. Current handling of `null` is sufficient; an explicit client-side format check could be added later if desired.

---

## Files touched in this review

| File | Action |
|------|--------|
| `src/constants/project.ts` | **New.** `PROJECT_STATUS_LABELS`, `PROJECT_STATUS_BADGE_COLORS`. |
| `src/pages/ProjectDetail.tsx` | Use `PROJECT_STATUS_LABELS` from constants; remove local `STATUS_LABELS`. |
| `src/pages/Projects.tsx` | Use `PROJECT_STATUS_LABELS` and `PROJECT_STATUS_BADGE_COLORS` in ProjectCard and ProjectPlaceholder; remove inline maps. |

Build and lint pass after these changes.
