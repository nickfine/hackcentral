# Convex env vars for HackDays (Phase 1)

The **HackDays** page needs these in your Convex project so it can list events from Supabase and show the "Create HackDay" button.

## Option A — Convex dashboard

1. Open [Convex dashboard](https://dashboard.convex.dev) → your project → **Settings** → **Environment Variables**.
2. Add:

| Name | Required | Description |
|------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (read access to `Event` and `HackdayTemplateSeed`) |
| `CONFLUENCE_HDC_PARENT_PAGE_URL` | No | Full URL to the HDC Confluence parent page; if unset, the Create button is hidden |
| `SUPABASE_SCHEMA` | No | Schema name if not `public` |

Use the **same** Supabase project as HDC/HD26Forge (same DB).

## Option B — CLI script (from env)

From the repo root, set the vars in your environment and run:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
CONFLUENCE_HDC_PARENT_PAGE_URL='https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=YOUR_PARENT_PAGE_ID' \
npm run convex:env:set
```

Or export them first, then:

```bash
export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export CONFLUENCE_HDC_PARENT_PAGE_URL='https://hackdaytemp.atlassian.net/wiki/...'
npm run convex:env:set
```

The script runs `npx convex env set` for each var. Optional vars can be omitted.

**Where to get the values:**

- **SUPABASE_URL** — Supabase project → Settings → API → Project URL.
- **SUPABASE_SERVICE_ROLE_KEY** — Same page → Project API keys → `service_role` (secret; never commit).
- **CONFLUENCE_HDC_PARENT_PAGE_URL** — The Confluence page where the HackDay Central macro lives (parent page). Example: `https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5668895` (replace with your parent page ID).

Verify:

```bash
npx convex env list
```
