# HDC Tag HackDay Tenant Bootstrap

Generated at (UTC): 2026-03-19T11:03:32Z

## Outcome

- HackCentral isolated Forge app registered for `tag-hackday.atlassian.net`
- HD26Forge isolated Forge app registered for `tag-hackday.atlassian.net`
- Both apps deployed and installed to staging
- Both apps deployed and installed to production
- Full tenant configuration and end-to-end create-flow validation remain blocked

## HackCentral Tenant App

- Temp working copy: `/private/tmp/HackCentral-tag-hackday.MzsiuS`
- App ID: `22696465-0692-48af-9741-323e1cfc2631`
- Staging environment ID: `15ac566f-3a62-4ffd-9fd6-1e50e5a47c9b`
- Production environment ID: `1c797890-3b54-448e-85da-4ecbe9e9e777`
- Staging installation ID: `a74ace0f-d13e-4bd3-b798-fc2478e89519`
- Production installation ID: `0f8b4d2f-e541-4cf0-aaab-f770596e1a31`

## HD26Forge Tenant App

- Temp working copy: `/private/tmp/HD26Forge-tag-hackday.UBlOIm`
- App ID: `4aaba451-2b35-4b5e-b903-ccd0dc325574`
- Staging environment ID: `2384fc12-3537-49a6-8b81-fb776ed795cc`
- Production environment ID: `e0f6d935-5f35-4005-95cd-fe9baf95a621`
- Staging installation ID: `4a1ec33c-2b3a-4bc9-8970-b6b67e92b596`
- Production installation ID: `c60d4b19-6ac8-4186-967d-a8212a854f93`

## Validation Completed

- Local repo changes validated:
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native`
  - `./scripts/with-node22.sh npm run test:backend --prefix forge-native`
  - `cd /Users/nickster/Downloads/HackCentral/forge-native && ../scripts/with-node22.sh npm run custom-ui:build`
- HackCentral tenant copy:
  - staging deploy: pass
  - staging install on `tag-hackday.atlassian.net`: pass
  - production deploy: pass
  - production install on `tag-hackday.atlassian.net`: pass
- HD26Forge tenant copy:
  - staging deploy: pass
  - staging install on `tag-hackday.atlassian.net`: pass
  - production deploy: pass
  - production install on `tag-hackday.atlassian.net`: pass

## Remaining Blockers

1. Dedicated Supabase project not provisioned.
   - `supabase projects list` returned `Unauthorized`
   - Supabase management access from this machine is not currently usable

2. HackCentral Forge env contract is incomplete.
   - `SUPABASE_URL` for the dedicated tenant project is not available yet
   - `SUPABASE_SERVICE_ROLE_KEY` for the dedicated tenant project is not available yet
   - `CONFLUENCE_HDC_PARENT_PAGE_ID` and `CONFLUENCE_HDC_PARENT_PAGE_URL` are not available yet

3. Browser access to the tenant site is not ready for parent-page setup.
   - Opening `https://tag-hackday.atlassian.net` redirected to Atlassian login / join-user-access flow
   - Parent page creation, macro placement, and runtime smoke could not be completed from this desktop session

## Repo Changes Landed

- Declared `FORGE_SITE_URL` and `CONFLUENCE_HDC_PARENT_PAGE_URL` in `forge-native/manifest.yml`
- Added `forge-native/set-tenant-forge-vars.sh`
- Added `docs/HDC-TENANT-INSTALL-RUNBOOK.md`
- Generalized `DEPLOY.md`, `TESTING_GUIDE.md`, `README.md`, and tenant helper scripts for isolated multi-tenant installs
