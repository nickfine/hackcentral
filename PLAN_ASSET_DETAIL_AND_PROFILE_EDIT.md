# Asset Detail View and Profile Editing Plan

## Part A: Asset Detail View

### Goal

When a user clicks an asset card on the Library page, open a modal that shows full asset metadata (title, description, type, status, intended user, context, limitations, risk notes, example input/output) and content. Close via button or overlay click. No new backend; use existing `convex/libraryAssets.ts` `getById` query.

### Backend

No changes. `convex/libraryAssets.ts` already exports `getById(assetId)` which returns the asset (with visibility check) or null. Asset shape includes: `title`, `description`, `assetType`, `status`, `content` (v.any()), `metadata` (optional: `intendedUser`, `context`, `limitations`, `riskNotes`, `exampleInput`, `exampleOutput`), `visibility`, `isArsenal`, `authorId`.

### Frontend: Library page

**File:** `src/pages/Library.tsx`

1. **State**
   - `selectedAssetId: Id<"libraryAssets"> | null`. When non-null, the detail modal is open for that asset.

2. **AssetCard**
   - Make the card clickable: add `onClick` that calls a handler (e.g. `onSelect(asset._id)`). Pass `onSelect` from Library so that `setSelectedAssetId(asset._id)` runs when a card is clicked. Use `role="button"` and `tabIndex={0}` on the card div if not using a button, for accessibility.

3. **Detail modal**
   - When `selectedAssetId !== null`, render a modal (same overlay pattern as Projects create modal): fixed overlay, centered card, overlay `onClick` sets `selectedAssetId` to null; card `onClick` stopPropagation.
   - Inside the modal: `const asset = useQuery(api.libraryAssets.getById, selectedAssetId ? { assetId: selectedAssetId } : "skip");` (only run query when selectedAssetId is set). Show loading while `asset === undefined`; if `asset === null` (no access or not found), show "Asset not found" and a close button; otherwise render detail.
   - **Detail content:**
     - Title, description, asset type badge, status badge, Arsenal badge if applicable.
     - **Metadata section** (if `asset.metadata`): intended user, context, limitations, risk notes, example input, example output (each only if present). Use labels and readable layout (e.g. stacked).
     - **Content section:** `asset.content` may be string or object. If string, show in `<pre>` or styled block; if object, show `JSON.stringify(asset.content, null, 2)` in `<pre>`. Truncate or allow scroll if large.
   - **Close:** "Close" button and overlay click set `selectedAssetId` to null.

4. **Accessibility**
   - Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the modal title (e.g. asset title).

### Files to change (Part A)

| Action | File |
|--------|------|
| Edit | `src/pages/Library.tsx` – state `selectedAssetId`, AssetCard onClick, detail modal with getById and metadata/content display |

---

## Part B: Profile Editing

### Goal

When a user clicks "Edit Profile" on the Profile page, open a modal with a form to update full name, experience level, profile visibility, and capability tags. Submit via existing `api.profiles.upsert`; on success close and let the profile query refetch. Reuse the form structure and patterns from `src/components/profile/ProfileSetup.tsx` (experience levels, visibility options, capability tags by category with toggle buttons).

### Backend

No changes. `convex/profiles.ts` `upsert` accepts: `email` (required), `fullName`, `avatarUrl`, `experienceLevel`, `profileVisibility`, `capabilityTags`. For edit, pass current user email (from `profile?.email` or Clerk `user?.primaryEmailAddress?.emailAddress`), plus the fields being updated.

### Frontend: Profile page

**File:** `src/pages/Profile.tsx`

1. **State and mutation**
   - `editOpen: boolean` for modal visibility.
   - Form state: `fullName`, `experienceLevel`, `profileVisibility`, `selectedTags` (array of `Id<"capabilityTags">`), `isSubmitting`.
   - When opening edit (`editOpen` becomes true), populate form from current `profile` (fullName, experienceLevel, profileVisibility, selectedTags from profile.capabilityTags). If profile is null/undefined when opening, do not open or show a message.
   - `const upsertProfile = useMutation(api.profiles.upsert);`

2. **"Edit Profile" button**
   - Wire the existing "Edit Profile" button: `onClick` to open the edit modal (set `editOpen` to true and populate form from current `profile`). Use `type="button"`.

3. **Edit modal**
   - Same overlay + card pattern as Projects create modal. When `editOpen`, render overlay (click to close), card (stopPropagation), title "Edit Profile", and form.
   - **Form fields** (mirror ProfileSetup where possible):
     - Full name: text input, value `fullName`, required.
     - Experience level: radio group with same options as ProfileSetup (newbie, curious, comfortable, power_user, expert) and labels.
     - Profile visibility: radio group (private, org, public) with short labels/descriptions.
     - Capability tags: use existing `useQuery(api.capabilityTags.list)`; group by category; for each tag, a toggle button (selected if `selectedTags.includes(tag._id)`); click toggles tag in/out of `selectedTags`. Use existing design tokens (e.g. `btn`, or ProfileSetup-style classes).
   - **Actions:** "Cancel" (close modal, optionally reset form) and "Save" submit button (disabled when `isSubmitting` or required fields missing).
   - **Submit handler:** preventDefault; set isSubmitting true; call `upsertProfile({ email: profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? "", fullName, experienceLevel, profileVisibility, capabilityTags: selectedTags });` on success: set `editOpen` false and reset isSubmitting; on catch: alert and set isSubmitting false. Do not redirect; the profile query will update reactively.

4. **Outdated copy**
   - Replace the placeholder text "Sign in and connect to Supabase to see your contributions" on the Profile page with e.g. "Contributions will appear here once you have activity."

### Files to change (Part B)

| Action | File |
|--------|------|
| Edit | `src/pages/Profile.tsx` – state, edit modal, form (fullName, experienceLevel, profileVisibility, capabilityTags), wire Edit Profile button, fix contributions placeholder text |

---

## Shared patterns

- **Modals:** Overlay `fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50`, card `max-w-md w-full card p-6` (or `max-w-2xl` for profile edit if more space needed), overlay onClick close, card stopPropagation. Close button inside card.
- **Forms:** Same validation and submit pattern as Projects create (try/catch, alert on error, close on success). Use existing `input`, `btn` classes from the design system.

## Verification

- **Asset detail:** Click an asset on Library → modal opens with full metadata and content; Close or overlay closes modal. No access to private asset when not author (getById returns null).
- **Profile edit:** Click Edit Profile → modal opens with current values; change fields and Save → modal closes and profile section updates; Cancel closes without saving. Outdated Supabase reference removed.

## Out of scope

- Reuse tracking (logging when user views/copies an asset); backend exists, not required for this plan.
- Avatar URL editing (optional; can pass through from Clerk or leave as-is).
- Mentor capacity editing (schema supports it; not required for this plan).
