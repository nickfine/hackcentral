# Code Review: Close/Archive Capture (Phase 2)

**Date:** 2026-01-30  
**Scope:** Projects detail modal, learning capture, close/archive flow (`src/pages/Projects.tsx`, `convex/projects.ts`).

## Summary

The close/archive capture implementation is **consistent and well-integrated**. Schema alignment, error handling, modal patterns, and toast usage match existing code. No lint errors.

---

## What Was Checked

### 1. Schema & backend alignment

- **Projects schema (`convex/schema.ts`):** Has `failuresAndLessons`, `timeSavedEstimate`, `aiToolsUsed`, `workflowTransformed` (required boolean, defaults to `false` on create).
- **`convex/projects.ts`:**
  - `create` sets `workflowTransformed: false` ✅
  - `update` accepts all learning fields as optional ✅
  - `getById` returns `ownerFullName` (from `profile.fullName ?? profile.email ?? "Unknown"`) ✅
  - All mutations check auth and ownership before updating ✅

### 2. Frontend & backend data flow

- **ProjectDetailModal:** Uses `useQuery(api.projects.getById, { projectId })` to fetch project with `ownerFullName`.
- **Close form:** Submits via `updateProject({ projectId, status, failuresAndLessons, timeSavedEstimate, workflowTransformed, aiToolsUsed })`.
  - `failuresAndLessons` is required (client-side validation: `!failuresAndLessons.trim()` → `toast.error('Please add lessons learned.')`).
  - `timeSavedEstimate`: `timeSavedEstimate === '' ? undefined : Number(timeSavedEstimate)` ✅
  - `aiToolsUsed`: split by comma, trimmed, filtered ✅
- **Learning summary display:** Shown when `isClosed && (failuresAndLessons || timeSavedEstimate != null || aiToolsUsed?.length > 0 || workflowTransformed)` ✅

### 3. Error handling

All async handlers use consistent pattern:
- `try/catch` + `console.error` + `toast.error` (user-friendly message) + `finally` (reset loading state).
- Examples: `handleCreateSubmit`, `handleCommentSubmit`, `handleCloseSubmit`, like/offer-help click handlers.

### 4. Modal patterns

- **ProjectDetailModal:**
  - Backdrop `onClick={onClose}`, inner div `onClick={e => e.stopPropagation()}` ✅
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` ✅
  - Loading state (project === undefined) and not-found state (project === null) ✅
- Consistent with Library `AssetDetailContent` and Profile `EditProfileModal`.

### 5. Toast usage

- Success: `'Project marked as completed.'`, `'Project archived.'`, `'Comment added!'`, `'Project created successfully!'`
- Error: `'Failed to save. Please try again.'`, `'Please add lessons learned.'`, `'Failed to add comment. Please try again.'`
- Consistent with Library and Profile.

### 6. Card click interaction

- **ProjectCard:** `onClick={onCardClick}`, `role="button"`, `tabIndex={0}`, `onKeyDown={(e) => e.key === 'Enter' && onCardClick()}` ✅
- Footer buttons (Like, Offer help, Comments) call `e.stopPropagation()` so they don't trigger card click ✅

### 7. Learning summary condition

- `isClosed && (failuresAndLessons || timeSavedEstimate != null || (aiToolsUsed?.length ?? 0) > 0 || workflowTransformed)` ✅
- Correctly shows learning section only when status is completed/archived AND at least one learning field is populated.

### 8. Linting

- No linter errors in `Projects.tsx` or `projects.ts` ✅

---

## Minor Notes (pre-existing, not from this change)

- **Status tabs:** `<TabButton active>All</TabButton>` etc. don't have `onClick` handlers, so they're not functional. This is pre-existing; tabs are display-only.
- **"More Filters" button:** No-op placeholder; clicking it doesn't open a filter UI. Pre-existing.

---

## Verdict

**Close/Archive capture (Phase 2)** is **consistent and production-ready**. Backend and frontend are aligned, error handling is uniform, modal patterns match existing code, and learning summary displays as expected. Playwright tests confirmed all UI and data flows work correctly. No issues found.
