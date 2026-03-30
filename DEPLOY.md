# Deploy HackCentral — Confluence Forge

**Directory:** `/Users/nickster/Downloads/HackCentral/forge-native`

---

## Current canonical tenant

- Current production tenant: `hackdaytemp.atlassian.net`
- Current canonical app id in this checkout: `f828e0d4-e9d0-451d-b818-533bc3e95680`

If you are deploying a new isolated tenant, use a separate checkout and register a new Forge app first. See [`docs/HDC-TENANT-INSTALL-RUNBOOK.md`](./docs/HDC-TENANT-INSTALL-RUNBOOK.md).

## Standard deploy (same app, any site/environment)

You must build the Custom UI first. Forge does not build it.

```bash
cd /Users/nickster/Downloads/HackCentral
./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --apply --environment <environment> --site <site>
cd /Users/nickster/Downloads/HackCentral/forge-native
../scripts/with-node22.sh npm run custom-ui:build
../scripts/with-node22.sh forge deploy --environment <environment> --no-verify
../scripts/with-node22.sh forge install -e <environment> --upgrade --non-interactive --site <site> --product confluence
```

Example for the existing `hackdaytemp` production tenant:

```bash
cd /Users/nickster/Downloads/HackCentral
./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --apply --environment production --site hackdaytemp.atlassian.net
cd /Users/nickster/Downloads/HackCentral/forge-native
../scripts/with-node22.sh npm run custom-ui:build
../scripts/with-node22.sh forge deploy --environment production --no-verify
../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence
```

## Install a new isolated tenant

For a new site such as `tag-hackday.atlassian.net`:

1. Create a tenant-specific copy of the repo.
2. Register a new Forge app in that copy.
3. Set the full tenant Forge env contract, including:
   - `FORGE_SITE_URL`
   - `CONFLUENCE_HDC_PARENT_PAGE_ID`
   - `CONFLUENCE_HDC_PARENT_PAGE_URL`
   - `HACKDAY_TEMPLATE_*`
4. Deploy staging first, then production.
5. Install a matching HD26Forge tenant on the same Confluence site.

Reference runbook:

- [`docs/HDC-TENANT-INSTALL-RUNBOOK.md`](./docs/HDC-TENANT-INSTALL-RUNBOOK.md)

---

## Showcase Page-Only Rollout Flag

Set this at build-time for `forge-native/static/frontend` when legacy showcase fallback can be retired:

```bash
VITE_HDC_SHOWCASE_PAGE_ONLY_V1=true
```

- `false` (default): hybrid mode (`Open page` for page-backed, legacy detail fallback for old rows).
- `true`: page-only mode (all cards route to Confluence pages; legacy drawer path disabled).

Recommended guardrail before enabling:
- Run `npm run qa:phase8:showcase-backfill -- --apply` until coverage report shows `legacyCount=0`.

---

## Confluence still old? Use staging (bypass CDN)

Staging has no CDN cache, so you see the bundle you just deployed.

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
../scripts/with-node22.sh npm run custom-ui:build
../scripts/with-node22.sh forge deploy --environment <environment> --no-verify
../scripts/with-node22.sh forge install -e <environment> --non-interactive --site <site> --product confluence
```

Get the staging environment ID:

```bash
forge environments list
```

Open the app via the **staging URL** (replace `STAGING_ENV_ID`):

```
https://<site>.atlassian.net/forge-apps/a/<app-uuid>/e/STAGING_ENV_ID/r/hackday-central
```

---

## Quick reference

| Directory       | Build step                | Deploy command                                          |
|-----------------|---------------------------|---------------------------------------------------------|
| `forge-native/` | `npm run custom-ui:build` | `forge deploy --environment production --no-verify` then `forge install ...`   |
