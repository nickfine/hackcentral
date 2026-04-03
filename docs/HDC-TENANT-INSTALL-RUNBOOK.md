# HackCentral Tenant Install Runbook

## Purpose

Provision HackCentral as an isolated Forge tenant on a new Confluence site without coupling it to the existing `hackdaytemp` production app or database.

This runbook is the canonical path for `tag-hackday.atlassian.net` and any future tenant installs.

## Fixed target for this rollout

- Confluence site: `tag-hackday.atlassian.net`
- Forge site URL: `https://tag-hackday.atlassian.net`
- Runtime owner: `hackcentral`
- Product: `confluence`
- Validation scope: full parent-page to child-HackDay create flow

## Prerequisites

You need all of the following before deployment:

- Forge CLI login with permission to register new apps and install to `tag-hackday.atlassian.net`
- Confluence admin access on `tag-hackday.atlassian.net`
- A dedicated Supabase project for this tenant with the HackCentral and HD26Forge schema applied
- A dedicated HD26Forge tenant deployed for the same Atlassian site
- A new parent Confluence page on `tag-hackday.atlassian.net` that will host the HackCentral macro

## Tenant topology

Do not reuse the current `hackdaytemp` production app or its Supabase project.

Use this isolation model instead:

- HackCentral: separate Forge app registration for `tag-hackday`
- HD26Forge: separate Forge app registration for `tag-hackday`
- Supabase: separate project and service-role key for `tag-hackday`
- Confluence parent page: separate page ID and page URL on `tag-hackday.atlassian.net`

## HackCentral tenant bootstrap

### 1. Create a tenant-specific working copy

Use a separate git clone so the registered app ID for `tag-hackday` does not replace the canonical repo app ID for `hackdaytemp`.

Example:

```bash
git clone https://github.com/nickfine/hackcentral.git /Users/nickster/Downloads/HackCentral-tag-hackday
cd /Users/nickster/Downloads/HackCentral-tag-hackday
git checkout -b tenant/<tenant-name> origin/main
```

Rules for the tenant branch:

- keep it local-only; do not push `tenant/<tenant-name>` to origin
- keep tenant-only changes minimal, ideally:
  - `forge-native/manifest.yml`
  - `TENANT-README.md`
  - untracked local env files such as `.env.local`
- land shared product changes in `/Users/nickster/Downloads/HackCentral` first, then `git fetch && git rebase origin/main` in the tenant clone before deploy

### 2. Register a dedicated Forge app

From the tenant clone:

```bash
cd /Users/nickster/Downloads/HackCentral-tag-hackday/forge-native
../scripts/with-node22.sh forge register "HackCentral (tag-hackday)" -y
```

Record the new Forge app ID written into `manifest.yml`. That value becomes:

- `FORGE_APP_ID`
- `HDC_RUNTIME_APP_ID`

### 3. Build and deploy staging first

```bash
cd /Users/nickster/Downloads/HackCentral-tag-hackday
./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --apply --environment staging --site tag-hackday.atlassian.net
cd /Users/nickster/Downloads/HackCentral-tag-hackday/forge-native
../scripts/with-node22.sh npm run custom-ui:build
../scripts/with-node22.sh forge deploy --environment staging --no-verify
../scripts/with-node22.sh forge install -e staging --non-interactive --site tag-hackday.atlassian.net --product confluence
```

### 4. Set the full Forge env contract

Export the tenant values, then run:

```bash
cd /Users/nickster/Downloads/HackCentral-tag-hackday/forge-native
ENVIRONMENT=staging ./set-tenant-forge-vars.sh
ENVIRONMENT=production ./set-tenant-forge-vars.sh
```

Required values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SCHEMA`
- `FORGE_DATA_BACKEND`
- `FORGE_APP_ID`
- `FORGE_MACRO_KEY`
- `HDC_RUNTIME_OWNER=hackcentral`
- `HDC_RUNTIME_APP_ID`
- `HDC_RUNTIME_ENVIRONMENT_ID`
- `HDC_RUNTIME_MACRO_KEY`
- `HACKDAY_TEMPLATE_APP_ID`
- `HACKDAY_TEMPLATE_ENVIRONMENT_ID`
- `HACKDAY_TEMPLATE_MACRO_KEY`
- `CONFLUENCE_HDC_PARENT_PAGE_ID`
- `CONFLUENCE_HDC_PARENT_PAGE_URL`
- `HACKDAY_CREATE_APP_URL`
- `HACKDAY_CREATE_WEB_SECRET`
- `FORGE_SITE_URL=https://tag-hackday.atlassian.net`

### 5. Deploy production

```bash
cd /Users/nickster/Downloads/HackCentral-tag-hackday
./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --apply --environment production --site tag-hackday.atlassian.net
cd /Users/nickster/Downloads/HackCentral-tag-hackday/forge-native
../scripts/with-node22.sh npm run custom-ui:build
../scripts/with-node22.sh forge deploy --environment production --no-verify
../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site tag-hackday.atlassian.net --product confluence
```

## HD26Forge dependency

HackCentral child-page creation depends on the matching HD26Forge tenant metadata even when the child page itself renders via HackCentral runtime.

You must provision a matching isolated HD26Forge tenant and wire these values back into HackCentral:

- `HACKDAY_TEMPLATE_APP_ID`
- `HACKDAY_TEMPLATE_ENVIRONMENT_ID`
- `HACKDAY_TEMPLATE_MACRO_KEY`

If those are missing or reference another site’s app, HackCentral can still create the child page and seed rows, but the child page will not render the intended HackDay runtime automatically.

Current deployment note:

- When `HDC_RUNTIME_OWNER=hackcentral` and `HDC_RUNTIME_MACRO_KEY=hackday-runtime-macro`, created child pages render HackCentral `runtime-ui-frontend`.
- When `HDC_RUNTIME_OWNER=hd26forge`, created child pages are expected to render the legacy HD26Forge child macro path instead.

## Validation

Run local validation before deploy:

```bash
cd /Users/nickster/Downloads/HackCentral
./scripts/with-node22.sh npm run typecheck --prefix forge-native
./scripts/with-node22.sh npm run test:backend --prefix forge-native
cd /Users/nickster/Downloads/HackCentral/forge-native
../scripts/with-node22.sh npm run custom-ui:build
```

Run tenant validation on `tag-hackday.atlassian.net`:

1. Open the HackCentral global page and confirm it loads.
2. Open the parent page and confirm the macro is in parent mode.
3. Create one HackDay instance.
4. Confirm redirect to the child page.
5. Confirm the child page contains the expected runtime macro for the configured runtime owner and loads the correct event.
   - For the current `tag-hackday` rollout (`HDC_RUNTIME_OWNER=hackcentral`), expect HackCentral `hackday-runtime-macro` / `runtime-ui-frontend`.
   - Only expect the legacy HD26Forge child macro when `HDC_RUNTIME_OWNER=hd26forge`.
6. Confirm the dedicated Supabase project contains:
   - `Event.runtime_type = hackday_template`
   - `Event.template_target = hackday`
   - `HackdayTemplateSeed.confluence_page_id = <child page id>`
7. Create a second child page and confirm page-scoped isolation.
8. Generate and complete a smoke artifact:

```bash
npm -C /Users/nickster/Downloads/HackCentral run qa:spinout:template-smoke-scaffold -- \
  --parent-url "https://tag-hackday.atlassian.net/wiki/pages/viewpage.action?pageId=<parentId>" \
  --child-url "https://tag-hackday.atlassian.net/wiki/pages/viewpage.action?pageId=<childId>" \
  --event-name "<eventName>" \
  --primary-admin-email "<adminEmail>"
```

## Evidence to capture

- Forge deploy/install output for HackCentral staging and production
- Forge deploy/install output for HD26Forge staging and production
- Predeploy snapshot artifacts for `tag-hackday`
- Completed template provision smoke artifact under `docs/artifacts/`
- Confluence URLs for the parent page and at least one child page
- Supabase verification snippets confirming the seed/event rows in the dedicated tenant project
