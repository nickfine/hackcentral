# HackCentral Forge App (Confluence + Supabase, Custom UI)

This Forge app renders a **Confluence global page** and **Confluence macro** with Custom UI frontends and resolver-driven backend.

## Architecture

- Module types: `confluence:globalPage`, `macro`
- UI model: **Custom UI** (no `render: native`)
- Frontend sources:
  - Global page: `static/frontend/src`
  - Macro page: `static/macro-frontend/src`
- Frontend bundles served by Forge:
  - `static/frontend/dist`
  - `static/macro-frontend/dist`
- Backend resolvers: `src/index.ts` -> `src/backend/hackcentral.ts` + `src/backend/hdcService.ts`
- Data source: Supabase (REST via service-role key)

### Architecture guardrails

- Treat Custom UI as the default path for page design flexibility; do not regress this module to UI Kit.
- Always build frontend assets before deploy (`npm run custom-ui:build`), because Forge does not build Custom UI dist folders automatically.
- Use `forge tunnel` for resolver debugging only; frontend visual updates still require build + deploy.
- Keep local Node aligned with Forge runtime (`nodejs22.x`).

## Data flow

1. Custom UI frontend calls Forge resolvers with `@forge/bridge` `invoke()`.
2. Resolver methods call Supabase REST-backed repositories.
3. UI renders HackCentral summary, hacks, projects, people, and write actions.

## Prerequisites

- Node.js 20.x or 22.x
- Forge CLI authenticated (`forge login`)
- Supabase project with the required tables/columns

## Required Forge variables

```bash
forge variables set SUPABASE_URL https://<project>.supabase.co -e development
forge variables set SUPABASE_SERVICE_ROLE_KEY <service-role-key> -e development
forge variables set SUPABASE_SCHEMA public -e development
forge variables set FORGE_MACRO_KEY hackday-central-macro -e development
```

## Local development

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
npm install
npm run custom-ui:install
npm run frontend:dev
```

### Localhost preview mode (outside Atlassian)

- `static/frontend/src/App.tsx` includes a localhost-safe preview mode for `localhost` / `127.0.0.1`.
- In this mode:
  - Mock bootstrap data is rendered so the page can be visually designed in a normal browser tab.
- Write actions are simulated (no resolver/Supabase writes).
  - A UI banner indicates preview mode is active.
- This avoids the blank page caused by `@forge/bridge` when not running inside an Atlassian iframe.

## Build + deploy

Custom UI assets must be built before every deploy.

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
npm install
npm run custom-ui:install
npm run custom-ui:build
forge deploy --non-interactive -e development
forge install --upgrade --non-interactive --site https://<your-site>.atlassian.net --product confluence --environment development
```

## Notes

- `forge tunnel` is useful for resolver debugging, but frontend visual changes still require `npm run frontend:build` + deploy.
- Backend egress is scoped to `*.supabase.co`.
