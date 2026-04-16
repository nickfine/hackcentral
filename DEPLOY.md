# Deploy HackCentral — tag-hackday tenant

**Directory:** `/Users/nickster/Downloads/HackCentral-tag-hackday/forge-native`

---

## Tenant

- **Site:** `tag-hackday.atlassian.net`
- **App ID:** `22696465-0692-48af-9741-323e1cfc2631`
- **Production env ID:** `1c797890-3b54-448e-85da-4ecbe9e9e777`
- **Staging env ID:** `15ac566f-3a62-4ffd-9fd6-1e50e5a47c9b`

---

## CRITICAL: Always build before deploying

`forge deploy` does **not** rebuild frontend bundles. It packages whatever is in `dist/`.
If you skip the build, the old bundle ships and your changes are invisible.

Use the npm scripts — they always build first:

```bash
# Production (tag-hackday.atlassian.net) — standard deploy
cd /Users/nickster/Downloads/HackCentral-tag-hackday/forge-native
npm run deploy:prod
```

```bash
# Development environment
npm run deploy
```

```bash
# If only the runtime frontend changed (faster)
npm run runtime:build && forge deploy --environment production
```

### What the scripts do

| Script | Equivalent |
|--------|-----------|
| `npm run deploy:prod` | `npm run custom-ui:build && forge deploy --environment production` |
| `npm run deploy` | `npm run custom-ui:build && forge deploy` |
| `npm run custom-ui:build` | builds all 3 frontends: `frontend`, `macro-frontend`, `runtime-frontend` |

---

## Canonical app URLs

| Environment | URL |
|-------------|-----|
| Production | `https://tag-hackday.atlassian.net/wiki/apps/22696465-0692-48af-9741-323e1cfc2631/1c797890-3b54-448e-85da-4ecbe9e9e777/hackday-central` |
| Staging | `https://tag-hackday.atlassian.net/wiki/apps/22696465-0692-48af-9741-323e1cfc2631/15ac566f-3a62-4ffd-9fd6-1e50e5a47c9b/hackday-central` |

---

## Confluence still showing old version? Use staging

Staging has no CDN cache — you see the bundle you just deployed immediately.

```bash
npm run custom-ui:build && forge deploy --environment staging
```

Then open the staging URL above.

---

## Apps installed on this tenant

- **HackCentral** (`hackday-central-global-page`) — participant-facing
- **HackCentral Runtime (Internal)** (`hackday-runtime-global-page`) — event management

> **HD26Forge (HackDay 2026) was uninstalled Apr 16 2026.** It was the legacy standalone HackDay app, now fully replaced by HackCentral's built-in runtime (`HDC_RUNTIME_OWNER=hackcentral`).

---

## Install a new isolated tenant

1. Create a tenant-specific git clone of the repo.
2. Register a new Forge app in that clone: `forge register`
3. Set the full tenant Forge env contract:
   - `FORGE_SITE_URL`
   - `CONFLUENCE_HDC_PARENT_PAGE_ID`
   - `CONFLUENCE_HDC_PARENT_PAGE_URL`
   - `HDC_RUNTIME_OWNER=hackcentral`
   - `HDC_RUNTIME_APP_ID` / `HDC_RUNTIME_ENVIRONMENT_ID` / `HDC_RUNTIME_MACRO_KEY`
   - `FORGE_APP_ID` / `FORGE_MACRO_KEY`
   - Supabase vars
4. Deploy: `npm run deploy:prod`
5. Install on site: `forge install -e production --upgrade --non-interactive --site <site> --product confluence`

Reference runbook: [`docs/HDC-TENANT-INSTALL-RUNBOOK.md`](./docs/HDC-TENANT-INSTALL-RUNBOOK.md)

---

## Showcase Page-Only Rollout Flag

Set at build-time for `forge-native/static/frontend`:

```bash
VITE_HDC_SHOWCASE_PAGE_ONLY_V1=true
```

- `false` (default): hybrid mode
- `true`: page-only mode (all cards route to Confluence pages)

Guardrail before enabling: run `npm run qa:phase8:showcase-backfill -- --apply` until `legacyCount=0`.
