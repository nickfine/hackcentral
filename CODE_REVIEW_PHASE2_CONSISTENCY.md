# Code Review: Phase 2 – Consistency & Integrity (Jan 31, 2026)

## Scope
Review of codebase after Phase 2 dashboard completion (Recent Activity, Top Contributors), Library Submit Asset, and metrics schema fix. Focus: **consistency** (patterns, naming, error handling) and **integrity** (schema alignment, types, auth).

---

## Overall Assessment: 4.5/5

**Strengths:**
- Schema usage is correct: `profiles.fullName` and `projects.title` used consistently; metrics fix applied.
- Modals and dialogs follow a consistent pattern (role, aria-labelledby, backdrop close).
- Lint passes; TypeScript and Convex types align with schema.
- Submit Asset flow is type-safe and matches backend.

**Issues:**
- 1 **minor** consistency: error handling in catch blocks varies (instanceof vs cast, generic vs err.message).
- 1 **optional** improvement: centralize or document visibility-option duplication (profile vs asset).

---

## 1. Integrity

### 1.1 Schema alignment ✅
- **Profiles:** Codebase uses `fullName` (and `email`) everywhere. No remaining `profile.name` or `profile?.name`.
- **Projects:** Codebase uses `title` for project name. No `project.name`. Metrics fix (`project?.title`) is in place.
- **Convex:** `convex/metrics.ts` uses `profile?.fullName`, `project?.title`. `convex/projectComments.ts` returns `author.fullName`. `convex/mentorRequests.ts` returns `fullName` for requester/mentor. All match schema.

### 1.2 Frontend usage of Convex data ✅
- **People.tsx:** `profile.fullName`, `mentor.fullName`, `selectedMentorProfile?.fullName` – correct.
- **Profile.tsx:** `profile.fullName`, `profile?.fullName` – correct.
- **Projects.tsx:** `project.title`, `author?.fullName` (from comments) – correct.
- **Library.tsx:** `asset.title`, `p.title` (projects in attach dropdown) – correct.
- **Dashboard.tsx:** `entry.name` from `getTopContributors` (backend returns `profile?.fullName`) – correct.

### 1.3 Auth and mutations ✅
- Library `create` and `update` require auth and author check where appropriate.
- Mentor requests validate requester ≠ mentor, capacity, and no duplicate pending.
- No integrity issues identified in auth or mutation logic.

---

## 2. Consistency

### 2.1 Modal / dialog pattern ✅
All modals reviewed use:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` pointing to the modal title
- Backdrop `onClick={onClose}` (or equivalent)
- Inner content `onClick={(e) => e.stopPropagation()}` so clicks inside don’t close

**Files:** Library (Submit Asset, Asset Detail), People (Profile Detail, Mentor Request), Profile (Edit Profile), Projects (Create Project, Comments).

### 2.2 Toast usage ✅
- **Success:** Descriptive messages (“Asset submitted!”, “Profile updated!”, “Comment added!”, etc.).
- **Error:** Used in try/catch and validation; messages are user-facing and non-technical where appropriate.

### 2.3 Error handling in catch blocks ⚠️ Minor
Patterns in use:
- **Library (Submit Asset):** `err instanceof Error ? err.message : 'Failed to submit asset'` – good.
- **People (Mentor Request):** `(error as Error).message || 'Failed to send request...'` – cast only; if `error` is not an `Error`, `.message` can be undefined. Prefer `error instanceof Error ? error.message : '...'`.
- **Profile (edit, mentor actions):** Generic messages only (e.g. “Failed to update profile”) – consistent and safe.
- **Projects (create, comment, like, offer help):** Generic “Failed to…” or “Something went wrong.” – consistent; could optionally surface `err.message` in development or for known error types.

**Recommendation:** Standardize on `err instanceof Error ? err.message : fallback` when surfacing server/validation errors, and keep generic fallbacks for user-facing messages. Optionally align People mentor-request catch with that pattern.

### 2.4 Constants – visibility options ⚠️ Optional
- **Profile visibility:** `src/constants/profile.ts` – `VISIBILITY_OPTIONS` (private, org, public) with descriptions for profile settings.
- **Asset visibility:** `src/pages/Library.tsx` – local `VISIBILITY_OPTIONS` (same values, different labels: “Organization (colleagues)”, etc.).

Same semantics, different copy. Acceptable as-is. If labels are ever unified, consider a shared constant or a single source with context-specific labels.

### 2.5 Import order
- React → external libs → Convex → types → constants/hooks/components – generally consistent across pages. No change required.

---

## 3. Code quality

### 3.1 Library Submit Asset ✅
- Form state and validation (title, content required) are clear.
- `createAsset` args match `libraryAssets.create` (title, description, assetType, content, visibility, metadata).
- Success path: toast, close modal, open new asset in detail view; list count updates (e.g. 24 → 25).
- Optional metadata (intended user, context, limitations, risk notes) is optional and sent only when at least one field is set.

### 3.2 Metrics (convex/metrics.ts) ✅
- `getRecentActivity`: Uses `profile?.fullName`, `project?.title`, `asset?.title`. Contribution type labels centralized.
- `getTopContributors`: Uses `profile?.fullName`; Map key type `Id<"profiles">` is correct.
- No N+1 beyond intended (one profile/asset/project lookup per contribution/entry); acceptable for current scale.

### 3.3 Dashboard ✅
- Uses `getDashboardMetrics`, `getRecentActivity`, `getTopContributors`.
- Loading and empty states for Recent Activity and Top Contributors.
- Relative time formatting and list layout are consistent.

---

## 4. Optional improvements

### 4.1 getRecentActivity ordering
- Uses `query("aiContributions").order("desc").take(15)` with no index on `_creationTime`. Convex supports default ordering; for very large tables, an index on creation time could improve performance. Low priority unless contribution volume grows.

### 4.2 Error handling in People.tsx (Mentor Request) ✅ Fixed
- Replaced `(error as Error).message` with `error instanceof Error ? error.message : 'Failed to send request. Please try again.'` for type safety and consistent behavior when non-Error values are thrown.

### 4.3 Projects.tsx (Like / Offer help)
- Currently: `toast.error('Something went wrong. Please try again.')`. Optional: use `err instanceof Error ? err.message : '...'` if you want to surface specific Convex/auth errors in development or for certain error types. Not required for consistency if you prefer a single user-facing message.

---

## 5. Summary

| Area              | Status   | Notes                                                |
|-------------------|----------|------------------------------------------------------|
| Schema alignment  | ✅ Pass  | fullName / title used consistently; metrics fixed    |
| Modal/dialog      | ✅ Pass  | role, aria, backdrop close consistent                |
| Toast usage       | ✅ Pass  | Success/error used appropriately                     |
| Error in catch    | ✅ Fixed | People mentor request now uses instanceof + err.message |
| Constants         | ✅ OK    | Visibility options duplicated; optional to centralize|
| Lint / TypeScript | ✅ Pass  | No issues reported                                   |

**Conclusion:** Integrity is good; schema and types are aligned. Consistency is high; the only suggested change is tightening error handling in People (Mentor Request) and optionally elsewhere. No blocking issues; optional improvements can be done in a follow-up.

---

## 6. Addendum: Verification Workflow (Library)

**Scope:** Review after adding Library verification workflow (Mark as Verified / Deprecated / Revert to Draft, Verified by display).

### 6.1 Integrity ✅

- **Backend (`convex/libraryAssets.ts`):**
  - `getById` returns `verifiedByFullName` (from verifier profile: `fullName ?? email`); schema uses `profiles.fullName` – correct.
  - `update` sets `verifiedById` and `verifiedAt` when `status === "verified"`; only author can update – correct.
  - Author check: `asset.authorId !== profile._id` → "Not authorized" – correct.
- **Frontend (`src/pages/Library.tsx`):**
  - `AssetDetailContentProps.asset` includes `authorId`, `verifiedByFullName?`, `verifiedAt?` – matches `getById` return.
  - `isAuthor = profile?._id && asset.authorId === profile._id` – correct.
  - Status section and "Verified by" only shown when appropriate (author vs non-author, status verified).

### 6.2 Consistency ✅

- **Toast:** Success messages for status change: "Asset marked as verified.", "Asset marked as deprecated.", "Asset reverted to draft." – consistent.
- **Error:** `err instanceof Error ? err.message : 'Failed to update status.'` – matches Library Submit Asset pattern.
- **Date display:** `new Date(asset.verifiedAt).toLocaleDateString()` – same pattern as Profile.tsx for request dates; appropriate for "Verified on date".
- **Buttons:** Disabled while `isUpdatingStatus`; "Updating…" label – consistent with other forms.

### 6.3 Behaviour ✅

- When status is set to draft or deprecated, backend does not clear `verifiedById`/`verifiedAt`; UI only shows "Verified by" when `status === 'verified'` – no stale display.
- Re-verifying overwrites `verifiedById` and `verifiedAt` – correct.

### 6.4 Summary (addendum)

| Area                    | Status  | Notes                                              |
|-------------------------|--------|----------------------------------------------------|
| getById verifiedByFullName | ✅ Pass | Uses profile.fullName/email                        |
| update verifiedById/At | ✅ Pass | Set only when status === 'verified'; author-only   |
| Frontend asset type     | ✅ Pass | authorId, verifiedByFullName?, verifiedAt?          |
| Status actions / Verified by | ✅ Pass | Author-only actions; Verified by when verified    |
| Toast / error handling  | ✅ Pass | Consistent with existing Library patterns          |

**Conclusion (addendum):** Verification workflow is consistent and integrity is maintained; no further changes required.
