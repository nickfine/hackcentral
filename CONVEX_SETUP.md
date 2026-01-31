# Convex Setup Guide

HackCentral uses Convex as its backend platform for database, real-time updates, and server functions.

## Initial Setup

1. **Install Convex CLI** (if not already installed):
   ```bash
   npm install -g convex
   ```

2. **Login to Convex**:
   ```bash
   npx convex login
   ```

3. **Initialize Convex** (first time only):
   ```bash
   npx convex dev
   ```

   This will:
   - Create a new Convex project (or connect to existing)
   - Generate your deployment URL
   - Start the Convex development server
   - Watch for changes in `convex/` directory

4. **Update Environment Variables**:
   - Copy the deployment URL from the terminal
   - Add it to `.env.local`:
     ```
     VITE_CONVEX_URL=https://your-deployment-name.convex.cloud
     ```

5. **Seed Initial Data**:
   - Open the Convex Dashboard: https://dashboard.convex.dev
   - Go to your project
   - Navigate to "Functions" tab
   - Run the `seedData:seedCapabilityTags` internal mutation

## Development Workflow

### Run the Development Server

```bash
npm run dev
```

This starts both:
- Convex backend (`convex dev`)
- Vite frontend (`vite`)

Or run them separately:
```bash
# Terminal 1: Convex backend
npm run dev:backend

# Terminal 2: Vite frontend
npm run dev:frontend
```

### Schema Changes

1. Edit files in `convex/` directory
2. Convex dev server auto-detects changes and validates schema
3. No manual migrations needed - schema is defined in TypeScript!

### Adding New Functions

Create new query/mutation functions in `convex/` directory:

**Query Example** (`convex/myQueries.ts`):
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getItem = query({
  args: { id: v.id("myTable") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
```

**Mutation Example** (`convex/myMutations.ts`):
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createItem = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const id = await ctx.db.insert("myTable", { name });
    return id;
  },
});
```

## Deployment

### Deploy to Production

```bash
npm run convex:deploy
```

This creates a production deployment. You'll get a new production URL - add it to your production environment variables.

### Environment-Specific Deployments

Convex supports multiple deployments (dev, staging, prod):

```bash
# Deploy to specific environment
npx convex deploy --prod
npx convex deploy --dev
```

## Authentication

Convex auth is handled through the built-in authentication system. The current user identity is available in all queries and mutations via:

```typescript
const identity = await ctx.auth.getUserIdentity();
```

## Key Convex Concepts

### Schema (`convex/schema.ts`)
- TypeScript-based schema definition
- No SQL migrations needed
- Automatic validation and type generation

### Queries (`query`)
- Read-only operations
- Reactive - automatically update UI when data changes
- Cached by default

### Mutations (`mutation`)
- Write operations
- Can modify database
- Trigger reactive query updates

### Indexes
- Defined in schema using `.index()`
- Used for efficient queries
- Example: `.withIndex("by_user", (q) => q.eq("userId", userId))`

## Useful Commands

```bash
# Start dev server
npx convex dev

# Deploy to production
npx convex deploy

# Open dashboard
npx convex dashboard

# View logs
npx convex logs

# Import data
npx convex import

# Export data
npx convex export
```

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [Convex Dashboard](https://dashboard.convex.dev)
- [Convex React Quickstart](https://docs.convex.dev/quickstart/react)

## Migration from Supabase

This project was migrated from Supabase to Convex. Key changes:

1. **Database**: PostgreSQL → Document database
2. **Queries**: SQL → TypeScript query functions
3. **Auth**: Supabase Auth → Convex built-in auth
4. **Real-time**: Selective subscriptions → Everything reactive by default
5. **Schema**: SQL migrations → TypeScript schema definition

The schema in `convex/schema.ts` was converted from the original Supabase SQL schema, maintaining the same data model and relationships.
