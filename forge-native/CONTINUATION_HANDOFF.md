# Forge Native Continuation Handoff

Date: 2026-02-15
Workspace: `/Users/nickster/Downloads/HackCentral`

## Current state

- Forge app architecture is Custom UI (`manifest.yml` resource points to `static/frontend/dist`, no `render: native`).
- Frontend redesign is applied in:
  - `static/frontend/src/App.tsx`
  - `static/frontend/src/styles.css`
- Localhost blank-page issue is fixed with localhost preview mode.

## Local preview behavior

When opened at `localhost` / `127.0.0.1`:
- App uses mock bootstrap data.
- Banner indicates preview mode.
- Write buttons simulate success messages and do not call Forge resolvers.

This exists so UI can be designed locally without Atlassian iframe context.

## Deploy status

- Development deploy/install succeeded earlier in this session (version output indicated `3.3.0`).
- The latest localhost-preview patch was applied **after** that deploy.
- If you want Confluence to include the newest patch, redeploy.

## Commands for immediate continuation

### 1) Local UI work

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
npm run frontend:dev
```

Open: `http://localhost:5173/`

### 2) Build validation

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native/static/frontend
npm run build
```

### 3) Deploy latest to development

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
npm run frontend:build
forge deploy --non-interactive -e development
forge install --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence --environment development
```

## Known caveats

- Forge CLI warns if local Node is not 20/22/24. Current machine shows Node 25 warning.
- Convex bundle warning about `utf-8-validate` may appear; deploy still succeeds.
- Automated browser checks may land on Atlassian login page if MCP browser is not authenticated.
