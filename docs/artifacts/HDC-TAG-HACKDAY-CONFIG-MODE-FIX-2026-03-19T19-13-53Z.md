# tag-hackday Config Mode Fix

Date: `2026-03-19T19:13:53Z`

## Summary

Fixed the `tag-hackday.atlassian.net` child-page Config Mode permission regression by aligning runtime admin checks with persisted `EventAdmin` membership.

The old failure path was:

- runtime `resolveConfigModeAccess` checked only platform-admin role or seed-email match
- freshly provisioned tenant events already had `EventAdmin` rows, but Config Mode ignored them
- child pages could render while Config Mode threw `Only platform admins or event admins can use Config Mode`

## Code Changes

- [`forge-native/src/runtime/index.js`](/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/index.js)
  - added shared runtime helpers to resolve actor identity and event-admin access
  - `resolveConfigModeAccess` now checks `EventAdmin` by `event_id` + `user_id` before seed-email fallback
  - `getEventPhase` now uses the same helper for `configModeCapabilities`
  - `resolveEventBrandingAdminContext` now uses the same helper, keeping branding/admin behavior aligned
- [`forge-native/tests/backend/runtime-config-mode-access-contract.test.mjs`](/Users/nickster/Downloads/HackCentral/forge-native/tests/backend/runtime-config-mode-access-contract.test.mjs)
  - added contract coverage for the shared `EventAdmin`-first resolver path

## Local Validation

- `./scripts/with-node22.sh node --test forge-native/tests/backend/runtime-config-mode-access-contract.test.mjs` ✅
- `./scripts/with-node22.sh npm run typecheck --prefix forge-native` ✅
- `./scripts/with-node22.sh npm run test:backend --prefix forge-native`
  - new Config Mode contract test passed
  - suite still has one unrelated pre-existing failure in [`forge-native/tests/backend/supabase-security-integrity-contract.test.mjs`](/Users/nickster/Downloads/HackCentral/forge-native/tests/backend/supabase-security-integrity-contract.test.mjs) against [`forge-native/supabase/migrations/20260304023500_phase9_security_policy_search_path_hardening.sql`](/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260304023500_phase9_security_policy_search_path_hardening.sql)

## Tenant Deploy

Deployed from the isolated tenant checkout:

- `/private/tmp/HackCentral-tag-hackday.MzsiuS`

Commands completed:

- staging predeploy snapshot ✅
  - `/private/tmp/HackCentral-tag-hackday.MzsiuS/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260319-190449Z.json`
  - `/private/tmp/HackCentral-tag-hackday.MzsiuS/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260319-190449Z.md`
- staging deploy/install ✅
- production predeploy snapshot ✅
  - `/private/tmp/HackCentral-tag-hackday.MzsiuS/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260319-190558Z.json`
  - `/private/tmp/HackCentral-tag-hackday.MzsiuS/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260319-190558Z.md`
- production deploy/install ✅

Forge install result for both environments:

- `Site is already at the latest version`

## Hosted Validation

Validated against the existing smoke child page:

- page URL: [132087809](https://tag-hackday.atlassian.net/wiki/pages/viewpage.action?pageId=132087809)
- direct app URL: [runtime child app](https://tag-hackday.atlassian.net/wiki/apps/22696465-0692-48af-9741-323e1cfc2631/1c797890-3b54-448e-85da-4ecbe9e9e777/hackday-app?pageId=132087809)
- auth state used: `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`

Observed in Playwright after deploy:

- runtime loaded from the Atlassian CDN iframe
- `Config Mode` toggle was present with initial text `CONFIG OFF`
- toggling it switched the page to `CONFIG ON`
- `Show Actions` became visible
- the old error text `Only platform admins or event admins can use Config Mode` was not present
- runtime first-load telemetry still resolved event/page context successfully for `eventId=f000ed27-4149-4b56-8f3e-91dfa2f68f5b`, `pageId=132087809`

Additional log check:

- `forge logs --environment production --since 5m --limit 200 | rg "Only platform admins or event admins can use Config Mode"` returned no matches after the post-deploy validation run
