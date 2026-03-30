# tag-hackday Event-Admin Simulation Controls Restore

Date: `2026-03-19T22:23:24Z`

## Summary

Restored the runtime header/admin-panel simulation controls for event admins on the isolated `tag-hackday.atlassian.net` production tenant without enabling global dev mode.

Root cause:

- Config Mode and runtime admin capability checks now allow persisted `EventAdmin` membership.
- The runtime frontend still gated the old `DEV` controls to `ENABLE_DEV_MODE=true` or `user.role === 'admin'`.
- On `tag-hackday`, the affected user resolves as an event admin, so `CONFIG ON` worked while the `DEV` dropdown stayed hidden.

## Code Changes

- [`forge-native/static/runtime-frontend/src/components/AppLayout.jsx`](/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/AppLayout.jsx)
  - changed the header control gate from real-admin-only to `isDevMode || isRealAdmin || isEventAdmin`
  - kept `devModeActive` tied to local simulation state so event-admin access does not imply global dev mode
- [`forge-native/static/runtime-frontend/src/App.jsx`](/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/App.jsx)
  - kept Admin Panel phase simulation wired for event admins as well as full admins/dev mode
- [`tests/forge-native-runtime-simulation-controls.spec.ts`](/Users/nickster/Downloads/HackCentral/tests/forge-native-runtime-simulation-controls.spec.ts)
  - added a source contract so this gate cannot silently regress

## Local Validation

- Canonical workspace:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-runtime-simulation-controls.spec.ts tests/forge-native-runtime-branding-surface.spec.ts tests/forge-native-runtime-hook-imports.spec.ts` ✅
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend` ✅
- Isolated tenant checkout:
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend` ✅
  - root-level `vitest` was unavailable in the isolated copy, so the contract test was run in the canonical workspace against identical source

## Production Deploy

Tenant checkout used:

- `/private/tmp/HackCentral-tag-hackday.MzsiuS`

Commands completed:

- `./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --apply --environment production --site tag-hackday.atlassian.net` ✅
  - `/private/tmp/HackCentral-tag-hackday.MzsiuS/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260319-222210Z.json`
  - `/private/tmp/HackCentral-tag-hackday.MzsiuS/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260319-222210Z.md`
- `../scripts/with-node22.sh npm run custom-ui:build` ✅
- `../scripts/with-node22.sh forge deploy --environment production --no-verify` ✅
- `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site tag-hackday.atlassian.net --product confluence` ✅
  - Forge reported: `Site is already at the latest version`

## Postdeploy Evidence

- `forge logs --environment production --since 15m --limit 200` after deploy showed the fresh predeploy snapshot telemetry on the target tenant:
  - `event_backup_snapshot_created` for `eventId=f000ed27-4149-4b56-8f3e-91dfa2f68f5b`
  - `event_backup_snapshot_created` for `eventId=ba8a46b0-67c1-4853-ba66-43e2473a5e06`

## Hosted Validation Status

Hosted UI validation is still pending from this session.

Reason:

- the desktop Chrome context redirected to Atlassian login/join-user-access for `tag-hackday.atlassian.net`
- the saved auth state path exists (`/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`), but there is no Playwright runtime installed in the isolated tenant copy to replay it directly from this session

Expected runtime outcome after deploy:

- event admins on child page `132087809` should now see the `DEV` dropdown again
- role impersonation and local phase simulation should be available without promoting the user to full platform admin
- real backend admin-only actions remain unchanged

## Follow-up Hotfix

After deploy, a second runtime-only issue was reported:

- while simulating `Participant - Needs Signup`, clicking `Dashboard` appeared to do nothing
- the app was auto-replacing `dashboard` with `signup` because the global `isNewUser` redirect still ran during role simulation

Hotfix applied:

- [`forge-native/static/runtime-frontend/src/App.jsx`](/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/App.jsx)
  - skipped the dashboard-to-signup auto-redirect while `devRoleOverride` is active
- [`tests/forge-native-runtime-effective-phase.spec.ts`](/Users/nickster/Downloads/HackCentral/tests/forge-native-runtime-effective-phase.spec.ts)
  - added a source contract for this simulation redirect bypass

Hotfix validation:

- canonical workspace:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-runtime-effective-phase.spec.ts tests/forge-native-runtime-simulation-controls.spec.ts` ✅
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend` ✅
- isolated tenant checkout:
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend` ✅
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify` ✅
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site tag-hackday.atlassian.net --product confluence` ✅
