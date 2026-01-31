# Learnings

## Project Development

### Setup & Configuration

**Backend Migration: Supabase → Convex (Jan 31, 2026)**
- Migrated from Supabase (PostgreSQL) to Convex (document database)
- Reason: Convex offers better TypeScript-first DX, built-in real-time, and simpler auth
- Migration completed before any database migrations were applied, minimizing switching cost

**Key Setup Steps:**
1. Installed Convex: `npm install convex`
2. Created TypeScript schema in `convex/schema.ts` (converted from SQL)
3. Set up query/mutation functions in TypeScript (no SQL needed)
4. Updated React app to use `ConvexProvider`
5. Removed Supabase dependencies

### Technical Insights

**Convex vs Supabase Design Differences:**
- **Schema**: SQL migrations → TypeScript schema definitions
- **Queries**: SQL → TypeScript query functions with type safety
- **Real-time**: Selective subscriptions → Everything reactive by default
- **Auth**: Row Level Security → Built-in auth with validators
- **Data Model**: Relational (foreign keys) → Document-based with references

**Schema Conversion Patterns:**
- SQL `UUID` → Convex `v.id("tableName")`
- SQL `TEXT[]` → Convex `v.array(v.string())`
- SQL `JSONB` → Convex `v.any()` or structured `v.object({})`
- SQL `CHECK` constraints → TypeScript union types (e.g., `v.union(v.literal("draft"), ...)`)
- SQL foreign keys → Convex ID references with indexes

### Challenges & Solutions

**Challenge**: Complex relational schema with 12+ tables and foreign keys
**Solution**: Used Convex indexes to maintain relationships (e.g., `.index("by_user", ["userId"])`)

**Challenge**: Row Level Security policies from Supabase
**Solution**: Implemented visibility checks in Convex query/mutation handlers using `ctx.auth.getUserIdentity()`

**Challenge**: SQL materialized views for reuse counts
**Solution**: Deferred to Phase 2 - will use Convex aggregation queries or scheduled functions

### Best Practices

**Convex Schema Design:**
- Define indexes for all foreign-key-like fields
- Use compound indexes for common query patterns
- Prefer TypeScript union types over strings for enums
- Use `v.optional()` for nullable fields

**Query Organization:**
- Group related queries/mutations in the same file
- Always check auth in mutations before modifying data
- Use descriptive function names (e.g., `getCurrentProfile`, not `get`)

**Development Workflow:**
- Run `npm run dev` to start both Convex backend and Vite frontend
- Convex auto-validates schema changes on save
- Use Convex dashboard to run internal mutations (e.g., seed data)

### Tools & Technologies

**Added:**
- Convex 1.31.7 - Backend platform (database, real-time, server functions)
- ConvexReactClient - React integration

**Removed:**
- @supabase/supabase-js - No longer needed

**Retained:**
- React 19.2.0
- TypeScript 5.9.3
- Vite 7.2.4
- Tailwind CSS 4.1.18
- Framer Motion 12.29.2
- Vitest 4.0.18

---

## Authentication Integration (Jan 31, 2026)

### Clerk + Convex Integration

**Setup Requirements:**
1. Create JWT template in Clerk Dashboard named exactly `convex`
2. Add Clerk domain to `convex/auth.config.ts`
3. Use `ConvexProviderWithClerk` wrapper in React app

**auth.config.ts Pattern:**
```typescript
export default {
  providers: [
    {
      domain: "https://your-app.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

**Common Error: "No auth provider found"**
- Cause: Missing or misconfigured `auth.config.ts`
- Fix: Ensure domain matches your Clerk instance URL exactly

**Common Error: "404 on /tokens/convex"**
- Cause: JWT template not created in Clerk or named incorrectly
- Fix: Create JWT template named exactly `convex` (lowercase) in Clerk Dashboard

---

## Critical Bug Patterns (Jan 31, 2026)

### Async Filter Anti-Pattern

**Problem**: Using `async` callback in `.filter()` always returns truthy (Promise objects):
```typescript
// ❌ WRONG - Returns array of Promises, not filtered results
const filtered = items.filter(async (item) => {
  const result = await someAsyncCheck(item);
  return result;
});
```

**Solution**: Use `Promise.all()` with `.map()` then `.filter()`:
```typescript
// ✅ CORRECT
const results = await Promise.all(
  items.map(async (item) => {
    const passes = await someAsyncCheck(item);
    return passes ? item : null;
  })
);
const filtered = results.filter((item) => item !== null);
```

**Impact**: This bug caused our Projects list to always return empty array.

---

## Type Safety Improvements (Jan 31, 2026)

### Convex ID Types

**Best Practice**: Use proper Convex ID types instead of `any`:
```typescript
// ❌ Avoid
interface Props {
  profile: {
    _id: any;
    capabilityTags: any[];
  };
}

// ✅ Preferred
import type { Id } from '../convex/_generated/dataModel';

interface Props {
  profile: {
    _id: Id<"profiles">;
    capabilityTags: Id<"capabilityTags">[];
  };
}
```

### Optional Query Parameters

**Challenge**: Convex union validators reject empty strings.

**Solution**: Build query args conditionally:
```typescript
const queryArgs: {
  assetType?: "prompt" | "template" | "agent_blueprint";
  status?: "draft" | "verified" | "deprecated";
} = {};

if (selectedType) {
  queryArgs.assetType = selectedType as typeof queryArgs.assetType;
}

const results = useQuery(api.assets.list, queryArgs);
```

---

## ESLint Configuration (Jan 31, 2026)

### Ignoring Generated/System Files

**Problem**: macOS creates `._*` resource fork files that break ESLint.

**Solution**: Add to `eslint.config.js`:
```typescript
export default defineConfig([
  globalIgnores([
    'dist',
    '**/._*',            // macOS resource fork files
    'convex/_generated', // Convex generated files
  ]),
  // ... rest of config
]);
```

Also add to `.gitignore`:
```
._*
```

---

## Seed Data Strategy (Jan 31, 2026)

### Internal Mutations for Seeding

**Pattern**: Use Convex internal mutations for seed data:
```typescript
// convex/seedData.ts
import { internalMutation } from "./_generated/server";

export const seedCapabilityTags = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("capabilityTags").first();
    if (existing) {
      return { message: "Already seeded" };
    }
    
    // Insert seed data
    const tags = [/* ... */];
    for (const tag of tags) {
      await ctx.db.insert("capabilityTags", tag);
    }
    
    return { message: "Seeded successfully", count: tags.length };
  },
});
```

**Execution**: Run via Convex Dashboard → Functions → Run, or via MCP.

### System Profile for Seeded Assets

**Pattern**: Create a system profile to own seeded library assets:
```typescript
let systemProfile = await ctx.db
  .query("profiles")
  .withIndex("by_email", (q) => q.eq("email", "system@hackcentral.internal"))
  .first();

if (!systemProfile) {
  const id = await ctx.db.insert("profiles", {
    userId: "system",
    email: "system@hackcentral.internal",
    fullName: "HackCentral System",
    // ...
  });
  systemProfile = await ctx.db.get(id);
}
```

---

## Code Review Process (Jan 31, 2026)

### Automated Checks

**Run Before Committing:**
```bash
# TypeScript compilation
npx tsc --noEmit

# Linting
npm run lint

# Check terminal for Convex errors
# Look for "Convex functions ready!" message
```

### Common Issues Found

1. **Unused imports** - Remove with ESLint `@typescript-eslint/no-unused-vars`
2. **`let` vs `const`** - Use `const` for variables never reassigned
3. **`any` types** - Replace with proper Convex ID types
4. **Async filter bug** - See pattern above
5. **Duplicate initialization** - Consolidate to single instance

### Documentation Artifacts

**Created during review:**
- `CODE_REVIEW.md` - Detailed findings and fixes
- `CODE_REVIEW_SUMMARY.md` - Executive summary

---

## Error Boundary & Browser Testing (Jan 31, 2026)

### Error Boundary Implementation

**What was added:**
- Class component `ErrorBoundary` in `src/components/shared/ErrorBoundary.tsx`
- Wraps `<App />` inside `ConvexProviderWithClerk` in `main.tsx`
- Catches render/lifecycle errors and shows fallback UI: "Something went wrong", error message, "Reload Page" button
- `componentDidCatch` logs "Error caught by boundary:" plus error and errorInfo to console

### Testing with Playwright MCP

**Tools used:**
- `browser_navigate` - Navigate to app URL (e.g. `http://localhost:5174/`)
- `browser_wait_for` - Wait for text ("Something went wrong") or time (seconds)
- `browser_snapshot` - Capture accessibility tree (headings, paragraphs, buttons with refs)
- `browser_click` - Click by ref (e.g. "Reload Page" button ref=e9)
- `browser_console_messages` - Get console messages by level (e.g. `level: "error"`)

**Test flow:**
1. Start dev server (`npm run dev:frontend`); note port (5174 if 5173 in use).
2. Temporarily throw in a component that renders for unauthenticated users (e.g. `AuthGuard` unauthenticated branch) so the Error Boundary triggers without signing in.
3. Navigate to app root; wait for "Something went wrong" or 2s.
4. Snapshot confirms: heading "Something went wrong", paragraph with error message, button "Reload Page".
5. Console (level=error) confirms: React's error overlay message and "Error caught by boundary: Error: ..." from `ErrorBoundary.componentDidCatch`.
6. Click "Reload Page" button; page reloads (error boundary shows again while throw is present).
7. Remove temporary throw; navigate again; snapshot shows normal sign-in screen ("Welcome to HackCentral", Sign Up / Sign In).

**Takeaway:** Playwright MCP is sufficient for testing Error Boundary UI and console output. Use a throw in an unauthenticated path so tests don't require auth.

---

## Project Creation UI & Playwright Testing (Jan 31, 2026)

### Project Creation UI Implementation

**What was added:**
- Create-project modal on [src/pages/Projects.tsx](src/pages/Projects.tsx): overlay + card with form (title required, description optional, visibility select, anonymous checkbox).
- Both "New Project" buttons (header and empty state) open the modal; submit calls `api.projects.create`; on success modal closes and list updates reactively.
- Cancel and overlay click close the modal; submit disabled when title empty or submitting.

### Testing with Playwright MCP

**Tools used:**
- `browser_navigate` – Navigate to app (e.g. `http://localhost:5174/projects`).
- `browser_wait_for` – Wait for page to settle (time).
- `browser_snapshot` – Capture accessibility tree to verify visible UI.

**Test results (unauthenticated session):**
1. Navigate to `http://localhost:5174/projects` → After load, snapshot shows "Welcome to HackCentral", "Sign Up", "Sign In" (AuthGuard redirect). **Pass:** unauthenticated users cannot access Projects page and see sign-in instead.
2. Same for `/dashboard` → Same sign-in screen. **Pass:** auth guard behaves as expected.

**Limitation:** The Project Creation modal and full create flow live behind AuthGuard. The Playwright MCP browser session had no authenticated user, so the following could not be automated without test auth (e.g. Clerk test mode or seeded session):
- Open /projects (authenticated).
- Click "New Project" and verify modal (heading "New Project", form fields, Cancel/Create).
- Fill title, optional description, visibility, anonymous; submit; verify modal closes and new project appears in list.

**Manual test steps (when signed in):**
1. Sign in and complete profile if needed.
2. Go to **Projects** (`/projects`).
3. Click **New Project** (header or empty state) → Modal opens with "New Project", title input, description textarea, visibility select, "Submit anonymously" checkbox, Cancel and Create.
4. Leave title empty → Create button disabled.
5. Enter title (e.g. "Test Project"), optionally description and visibility → Click **Create** → Modal closes, new project card appears in list with status "Idea".
6. Click **New Project** again → Fill form and click **Cancel** (or click overlay) → Modal closes without creating.

**Takeaway:** Playwright MCP confirmed auth redirect behavior. Full automation of the create flow would require an authenticated test session (Clerk test user or similar).

---

## Asset Detail View & Profile Edit – Playwright Testing (Jan 31, 2026)

### What was implemented

**Asset Detail View ([src/pages/Library.tsx](src/pages/Library.tsx)):**
- Clicking an asset card (Arsenal or All Assets) opens a modal with full asset metadata (title, description, type, status, Arsenal badge) and optional metadata (intended user, context, limitations, risk notes, example input/output). Content shown as string or JSON. Close via button or overlay click. Uses `api.libraryAssets.getById(assetId)`.

**Profile Edit ([src/pages/Profile.tsx](src/pages/Profile.tsx)):**
- "Edit Profile" button opens a modal with form: full name, experience level (radio), profile visibility (radio), capability tags (toggle by category). Save calls `api.profiles.upsert`; on success modal closes and profile section updates. Cancel and overlay close without saving. Contributions placeholder text updated from "Sign in and connect to Supabase..." to "Contributions will appear here once you have activity."

### Testing with Playwright MCP

**Tools used:** `browser_navigate`, `browser_wait_for`, `browser_snapshot` (same as Project Creation UI testing).

**Test results (unauthenticated session):**
1. Navigate to `http://localhost:5174/library` → After load, snapshot shows "Welcome to HackCentral", "Sign Up", "Sign In" (AuthGuard redirect). **Pass:** unauthenticated users cannot access Library and see sign-in instead.
2. Navigate to `http://localhost:5174/profile` → Same sign-in screen. **Pass:** unauthenticated users cannot access Profile; auth guard behaves as expected.

**Limitation:** Asset detail modal and profile edit modal live behind AuthGuard. The Playwright MCP browser session had no authenticated user, so the following could not be automated without test auth:
- Library: click an asset card and verify detail modal (metadata, content, Close).
- Profile: click Edit Profile and verify edit modal (form fields, Save/Cancel); change fields and Save; verify profile section updates.

**Manual test steps (when signed in):**

**Asset Detail View:**
1. Sign in and go to **Library** (`/library`).
2. Click any asset card (in AI Arsenal or All Assets) → Modal opens with asset title, description, type/status/Arsenal badges, optional Details (intended user, context, limitations, risk notes, example input/output), and Content (string or JSON).
3. Click **Close** or click the overlay → Modal closes.
4. Click another asset → Different asset details shown.

**Profile Edit:**
1. Sign in and go to **Profile** (`/profile`).
2. Click **Edit Profile** → Modal opens with "Edit Profile", full name, experience level (radio), profile visibility (radio), capability tags (toggle buttons by category), Cancel and Save.
3. Change full name and/or experience level and/or visibility and/or tags → Click **Save** → Modal closes; profile header and Capability Tags section update to new values.
4. Click **Edit Profile** again → Change something and click **Cancel** (or overlay) → Modal closes without saving; profile unchanged.
5. Verify contributions section shows "Contributions will appear here once you have activity" (no Supabase reference).

**Takeaway:** Playwright MCP confirmed unauthenticated redirect for `/library` and `/profile`. Full automation of asset detail and profile edit flows would require an authenticated test session.

---

## Project Comments & Support Events – Browser Testing (Jan 31, 2026)

### What was implemented

**Comments ([convex/projectComments.ts](convex/projectComments.ts), [src/pages/Projects.tsx](src/pages/Projects.tsx)):**
- `listForProject(projectId)` – comments with author info; `add(projectId, content, isAiRelated?)` – add comment (auth + project access required).
- Projects page: each project card shows comment count; "Comments" control opens a modal with comment list and (when signed in) add form (textarea + "Mark as AI-related" checkbox).

**Support events ([convex/projectSupportEvents.ts](convex/projectSupportEvents.ts)):**
- `getCountsForProject`, `toggleLike`, `toggleOfferHelp`, `getCurrentUserSupport`.
- Projects page: each card shows like count (heart) and help-offer count (hand icon). When signed in, Like and Offer help are buttons (toggle); when not signed in, counts only.

**Projects list with counts ([convex/projects.ts](convex/projects.ts)):**
- `listWithCounts` – same visibility as `list`, returns projects with `commentCount`, `likeCount`, `helpOfferCount`, `userLiked`, `userOfferedHelp`.

### Playwright MCP test results (unauthenticated)

**Tools used:** `browser_navigate`, `browser_wait_for`, `browser_snapshot`, `browser_click`, `browser_console_messages`.

1. Navigate to `http://localhost:5177/projects` → After load, snapshot shows "Welcome to HackCentral", "Sign Up", "Sign In" (AuthGuard). **Pass:** unauthenticated users cannot access Projects.
2. Click "Sign In" → Clerk sign-in modal opens (GitHub, Google, email/password). **Pass:** auth flow reachable.
3. Console messages (level: error) → No errors. **Pass.**

**Limitation:** Comments modal, like/offer-help buttons, and add-comment form live behind AuthGuard. Full E2E requires an authenticated session (sign in manually, then run steps below).

### Manual test steps (when signed in)

**Comments:**
1. Sign in and go to **Projects** (`/projects`).
2. On any project card, confirm footer shows comment count (e.g. "0"), like count, help-offer count.
3. Click the comment count / message icon → Comments modal opens with title "Comments", optional list, and (when signed in) "Add a comment" textarea and "Mark as AI-related" checkbox.
4. Leave content empty → "Post comment" disabled. Enter text, optionally check "Mark as AI-related" → Click **Post comment** → Comment appears in list; form clears.
5. Close modal (X or overlay). Reopen Comments for same project → New comment still visible.

**Support (Like / Offer help):**
6. On a project card, click the heart (Like) → Like count increments; heart appears filled. Click again → Count decrements; heart unfilled (toggle).
7. Click the hand icon (Offer help) → Help-offer count increments; button styled as active. Click again → Count decrements (toggle).
8. Refresh page → Counts and your like/offer-help state persist (Convex reactivity).

**Takeaway:** Playwright MCP confirmed unauthenticated redirect and no console errors. Manual testing after sign-in is required to verify comments modal, add comment, and like/offer-help toggles.

---

## Code Review: Comments & Support Events (Jan 31, 2026)

### Scope

Reviewed [convex/projectComments.ts](convex/projectComments.ts), [convex/projectSupportEvents.ts](convex/projectSupportEvents.ts), [convex/projects.ts](convex/projects.ts) (listWithCounts), and [src/pages/Projects.tsx](src/pages/Projects.tsx) for consistency with the rest of the app and for integrity (auth, visibility, XSS, errors).

### Consistency

- **Modal pattern:** Comments modal matches create-project and Library/Profile modals: fixed overlay, overlay click closes, inner content `stopPropagation`, `role="dialog"`, `aria-modal="true"`, labelled heading. **Pass.**
- **Error handling:** Create project and Comments add use try/catch, `console.error`, and `alert`. Like/Offer help mutations were fire-and-forget; added `.catch()` with console + alert for consistency. **Fixed.**
- **Naming:** Renamed filter variable from `query` to `searchLower` to avoid shadowing the concept of Convex `useQuery`. **Fixed.**

### Integrity

- **Auth and visibility:** All comment and support mutations require identity and profile; project access is checked via `userHasProjectAccess` (same rules as `projects.getById`). `listForProject`, `getCountsForProject`, and `getCurrentUserSupport` enforce project visibility before returning data. **Pass.**
- **XSS:** Comment content is rendered as plain text in `<p>{comment.content}</p>`; no `dangerouslySetInnerHTML` in the app. **Pass.**
- **Comment length:** Backend now rejects comments over 2000 characters to limit abuse. **Added.**
- **Status badge:** Project card status uses `statusColors[project.status]` and `statusLabels[project.status]`; added fallbacks (`?? 'bg-gray-100...'`, `?? project.status`) for unexpected status values. **Fixed.**

### Duplication (optional future refactor)

- `userHasProjectAccess` is duplicated in `projectComments.ts` and `projectSupportEvents.ts`. Logic matches `projects.getById`/`list`. Extracting to a shared Convex helper (e.g. internal query or shared module that receives `ctx`) would reduce duplication; leaving as-is keeps each module self-contained. **Not changed.**

### Result

- Lint and build pass.
- Changes made: filter variable rename, status badge fallbacks, error handling for like/offer-help, comment length limit (2000 chars).

---

## Current Project Status (Jan 31, 2026)

### Completed ✅
- Convex backend with 12 tables
- Clerk authentication integration
- Profile creation flow
- Library page with 24 AI Arsenal assets
- People directory
- Projects page with create-project modal
- Dashboard metrics (convex/metrics.ts + Dashboard wired)
- Asset detail modal (Library – click card to view full metadata and content)
- Profile edit modal (Edit Profile – full name, experience, visibility, capability tags)
- **Project comments** (list, add, modal with "Mark as AI-related")
- **Support events** (like and offer-help toggles with counts on project cards)
- Error Boundary (tested via Playwright MCP)
- All critical bugs fixed
- 0 TypeScript errors
- 0 ESLint errors

### In Progress 🚧
- Reuse tracking UI (backend ready)

### Next Steps
1. Reuse tracking UI
2. Optional: extract shared constants/components (EXPERIENCE_LEVELS, TabButton)

---

## Documentation Index

| File | Purpose |
|------|---------|
| `README.md` | Project overview and setup |
| `ROADMAP.md` (v2.3) | Complete technical plan |
| `IMPLEMENTATION_PLAN.md` | Phased development |
| `NEXT_STEPS.md` | Immediate action items |
| `CODE_REVIEW.md` | Detailed code review |
| `CODE_REVIEW_SUMMARY.md` | Review summary |
| `FIX_AUTH.md` | Authentication troubleshooting |
| `CONVEX_SETUP.md` | Convex backend setup |
| `CLERK_SETUP.md` | Clerk auth setup |
| `learnings.md` | This file - project learnings |
