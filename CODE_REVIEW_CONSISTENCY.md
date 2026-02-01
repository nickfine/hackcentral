# Code Review: Consistency & Integrity

**Date:** 2025-01-30  
**Scope:** Profile, People, Library, Dashboard, Convex backend (mentorRequests, libraryAssets, metrics).

## Summary

The codebase is **consistent and intact**. Schema alignment, naming, and patterns match across frontend and backend. A few small improvements were applied; optional follow-ups are listed below.

---

## What Was Checked

### 1. Schema & API alignment

- **Profiles:** `fullName`, `email`, `mentorCapacity`, `mentorSessionsUsed` used consistently. No `.name` usage; `fullName` is used everywhere (People, Profile, Dashboard via metrics `name`/`userName` from `profile?.fullName ?? profile?.email`).
- **Library assets:** `getById` returns `verifiedByFullName` (and `verifiedAt` via `...asset`). Frontend `AssetDetailContentProps` and status/verification UI match.
- **Metrics:** `getRecentActivity` returns `userName`; `getTopContributors` returns `name`. Dashboard consumes both correctly. `profile?.fullName ?? profile?.email` and `project?.title` are correct (no legacy `.name` on project).

### 2. Error handling

- **Pattern:** `try/catch` + `toast.error` + optional `console.error` for debugging.
- **Profile.tsx / People.tsx (MentorRequestModal):** Use both `console.error` and `toast.error` with user-friendly fallback messages.
- **Library.tsx:** `handleAttachSubmit` already had `console.error`; `handleStatusChange` and `SubmitAssetModal` did not. **Fixed:** added `console.error` in both catch blocks so all async error paths log and toast consistently.

### 3. Modals & toasts

- Modals: shared pattern (backdrop click to close, inner click stopPropagation, aria labels, close button). No duplicate toasts: e.g. Library submit success only toasts in the parent `onSubmitSuccess` callback; modal does not toast on success.

### 4. Shared constants

- **Profile:** Uses `EXPERIENCE_LEVEL_LABELS`, `EXPERIENCE_LEVELS`, `VISIBILITY_OPTIONS` from `src/constants/profile.ts`.
- **Library:** Defines its own `VISIBILITY_OPTIONS` (same values, slightly different labels: “Organization (colleagues)” vs “Organization”). Acceptable for asset vs profile context; optional to later centralize if desired.
- **People:** Experience filter dropdown uses hardcoded labels (“AI Newbie”, etc.). Values match `EXPERIENCE_LEVEL_LABELS`; optional to use `EXPERIENCE_LEVEL_LABELS` for the options to avoid drift.

### 5. Types & backend

- **TabButton:** Has `onClick` and is used correctly in Profile.
- **Mentor requests:** Creation, status updates, and cancellation validated on backend; frontend passes correct args and handles errors.
- **Library create/update:** `create` sets `status: "draft"` and logs to `aiContributions`; `update` sets `verifiedById`/`verifiedAt` when `status === "verified"`. Frontend does not send `verifiedById`/`verifiedAt`; backend owns that. Integrity is good.

### 6. Linting

- No linter errors reported for `Profile.tsx`, `Library.tsx`, `People.tsx`, or `Dashboard.tsx`.

---

## Changes Made

1. **Library.tsx**
   - In `SubmitAssetModal` submit catch: added `console.error('Failed to submit asset:', err)` before `toast.error`.
   - In `handleStatusChange` catch: added `console.error('Failed to update asset status:', err)` before `toast.error`.

---

## Optional Follow-ups

- **People.tsx:** Use `EXPERIENCE_LEVEL_LABELS` (and optionally `EXPERIENCE_LEVELS`) for the experience filter dropdown so labels stay in sync with Profile/constants.
- **Library.tsx:** Consider importing visibility options from `src/constants/profile.ts` and using `option.label` (and optionally `option.description`) for consistency, if you want identical wording for “Organization” / “Private” / “Public” across the app.
- **Docs:** Keep `learnings.md` and any phase summaries updated when adding new patterns or backend contracts.

---

## Verdict

**Consistency and integrity are in good shape.** Backend and frontend are aligned, error handling and logging are now consistent in Library, and no structural or schema mismatches were found. Optional follow-ups are minor and can be done when touching those areas.
