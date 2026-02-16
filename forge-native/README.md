# HackCentral Forge App (Confluence + Convex, Custom UI)

This Forge app renders a **Confluence global page** with a **Custom UI frontend** and resolver-driven backend.

## Architecture

- Module type: `confluence:globalPage`
- UI model: **Custom UI** (no `render: native`)
- Frontend source: `static/frontend/src`
- Frontend bundle served by Forge: `static/frontend/dist`
- Backend resolvers: `src/index.ts` -> `src/backend/hackcentral.ts`
- Data source: Convex (`CONVEX_URL` + `convex/forgeBridge.ts`)

### Architecture guardrails

- Treat Custom UI as the default path for page design flexibility; do not regress this module to UI Kit.
- Always build frontend assets before deploy (`npm run frontend:build`), because Forge does not build `static/frontend/dist` automatically.
- Use `forge tunnel` for resolver debugging only; frontend visual updates still require build + deploy.
- Keep local Node aligned with Forge runtime (`nodejs22.x`).

## Data flow

1. Custom UI frontend calls Forge resolvers with `@forge/bridge` `invoke()`.
2. Resolver methods call Convex query/mutations.
3. UI renders HackCentral summary, hacks, projects, people, and write actions.

## Prerequisites

- Node.js 20.x or 22.x
- Forge CLI authenticated (`forge login`)
- Convex deployment with this repo's functions deployed

## Required Forge variables

```bash
forge variables set CONVEX_URL https://<deployment>.convex.cloud -e development
forge variables set CONVEX_FORGE_QUERY forgeBridge:getGlobalPageData -e development
forge variables set CONVEX_FORGE_CREATE_HACK forgeBridge:createHackFromForge -e development
forge variables set CONVEX_FORGE_CREATE_PROJECT forgeBridge:createProjectFromForge -e development
forge variables set CONVEX_FORGE_UPDATE_MENTOR forgeBridge:updateMentorProfileFromForge -e development
```

## Local development

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
npm install
npm run frontend:install
npm run frontend:dev
```

### Localhost preview mode (outside Atlassian)

- `static/frontend/src/App.tsx` includes a localhost-safe preview mode for `localhost` / `127.0.0.1`.
- In this mode:
  - Mock bootstrap data is rendered so the page can be visually designed in a normal browser tab.
  - Write actions are simulated (no resolver/Convex writes).
  - A UI banner indicates preview mode is active.
- This avoids the blank page caused by `@forge/bridge` when not running inside an Atlassian iframe.

## Build + deploy

Custom UI assets must be built before every deploy.

```bash
cd /Users/nickster/Downloads/HackCentral
npx convex dev --once

cd /Users/nickster/Downloads/HackCentral/forge-native
npm install
npm run frontend:install
npm run frontend:build
forge deploy --non-interactive -e development
forge install --upgrade --non-interactive --site https://<your-site>.atlassian.net --product confluence --environment development
```

## Notes

- `forge tunnel` is useful for resolver debugging, but frontend visual changes still require `npm run frontend:build` + deploy.
- Backend egress is scoped to `*.convex.cloud`.
