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

## Current Project Status (Jan 31, 2026)

### Completed ✅
- Convex backend with 12 tables
- Clerk authentication integration
- Profile creation flow
- Library page with 24 AI Arsenal assets
- People directory
- Projects page (structure ready)
- Error Boundary (tested via Playwright MCP)
- All critical bugs fixed
- 0 TypeScript errors
- 0 ESLint errors

### In Progress 🚧
- Dashboard metrics implementation
- Project creation UI
- Asset detail views

### Next Steps
1. Implement dashboard metrics queries
2. Add project creation modal
3. Add asset detail modal
4. Implement comments system
5. Add support events (likes, help offers)

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
