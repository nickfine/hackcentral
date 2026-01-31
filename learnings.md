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

## Next Steps

**Immediate (Post-Migration):**
1. Run `npx convex dev` to initialize Convex project and get deployment URL
2. Add `VITE_CONVEX_URL` to `.env.local`
3. Seed capability tags via Convex dashboard
4. Set up authentication (Clerk or Convex auth)
5. Test basic CRUD operations (profiles, projects, library assets)

**Phase 1 Completion (Weeks 1-6):**
- Complete authentication & profile creation flow
- Build People directory (read-only)
- Implement Library with AI Arsenal
- Create basic project management
- Add project comments and collaboration

**Documentation Updated:**
- Created `CONVEX_SETUP.md` with detailed setup instructions
- Updated `README.md` to reflect Convex architecture
- `ROADMAP.md` and `IMPLEMENTATION_PLAN.md` remain valid (backend-agnostic)
