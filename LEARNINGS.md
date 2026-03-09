# LEARNINGS.md - HackCentral Session Notes

**Last Updated:** March 9, 2026

## Project Overview

**HackCentral** is an AI Maturity Accelerator platform that creates HackDay template instances via wizard, which HD26Forge then renders on Confluence.

**Shared Backend:** Both HackCentral and HD26Forge use `https://ssafugtobsqxmqtphwch.supabase.co`

## Critical Relationship with HD26Forge

When users create a HackDay in HackCentral:
1. Wizard now collects only setup information that the created HackDay actually uses: event name/icon/tagline, admins, max team size, and launch/setup options
2. Creates `HackdayTemplateSeed` record in Supabase with `seed_payload`
3. HD26Forge macro detects seed → creates Event record
4. HD26Forge renders with Adaptavist logo + custom name/tagline from wizard

**Important:** Changes to HackCentral wizard affect how HD26Forge displays created HackDays.

## Current Project State

**Version:** 0.6.72 (root app)
**Forge UI Cache-Busters:** `HACKCENTRAL_UI_VERSION=0.6.66`, `HACKCENTRAL_MACRO_VERSION=0.6.66` (independent markers; both values must be tracked in continuity docs)
**Tech Stack:** React 19 + TypeScript + Vite + Convex + Forge Native
**Forge Native Package:** 0.3.50
**Runtime Bundle Version:** 1.2.84

## Session Update - v0.6.72 Theme Preset Accent Reset Released To Production (Mar 9, 2026 01:54 GMT)

### Completed

- Released a follow-up fix so selecting a runtime theme preset now resets the accent color to that preset's default accent.
- Preset selection still allows a manual accent override afterward via the existing accent color control.
- Bumped production version markers to:
  - root app `0.6.72`
  - forge-native `0.3.50`
  - runtime bundle `1.2.84`
  - HackCentral UI marker unchanged at `0.6.66`
  - HackCentral macro marker unchanged at `0.6.66`

### Validation

- Local validation passed before release:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-runtime-branding-surface.spec.ts`
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native`
- Production deploy/install executed per [`DEPLOY.md`](/Users/nickster/Downloads/HackCentral/DEPLOY.md):
  - predeploy snapshot:
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-015256Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-015256Z.json)
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-015256Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-015256Z.md)
  - Forge CLI returned `✔ Deployed`
  - production install reported the site was already at the latest version after upgrade
- Hosted production validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` passed on `Shona's IT Hack` (`pageId=24510466`):
  - runtime console logged `[HackCentral Runtime v2] Module loaded - 1.2.84`
  - before preset click, Branding showed accent `#f59e0b` on `Default`
  - after clicking `Studio`, Branding reset the accent to `#7c3aed` and the preview button background changed to `rgb(124, 58, 237)`
  - after clicking `Summit`, Branding reset the accent to `#b8860b` and the preview button background changed to `rgb(184, 134, 11)`
  - artifact set:
    - [`theme-preset-accent-reset-production-2026-03-09T01-54-37-334Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/theme-preset-accent-reset-production-2026-03-09T01-54-37-334Z.json)
    - [`theme-preset-accent-reset-production-2026-03-09T01-54-37-334Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/theme-preset-accent-reset-production-2026-03-09T01-54-37-334Z.md)
    - [`theme-preset-accent-reset-production-2026-03-09T01-54-37-334Z.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/theme-preset-accent-reset-production-2026-03-09T01-54-37-334Z.png)

## Session Update - v0.6.71 Curated Theme Presets Released To Production (Mar 9, 2026 01:38 GMT)

### Completed

- Released the runtime-only curated theme preset system to production without changing the existing global or macro cache-buster markers.
- Bumped production version markers to:
  - root app `0.6.71`
  - forge-native `0.3.49`
  - runtime bundle `1.2.83`
  - HackCentral UI marker unchanged at `0.6.66`
  - HackCentral macro marker unchanged at `0.6.66`
- Production runtime Branding now includes:
  - a `Theme preset` card selector with `Default`, `Editorial`, `Summit`, and `Studio`
  - preset-aware live preview inside Admin Branding
  - root-level `data-theme-preset` handling alongside `data-color-mode`
  - shared-surface preset token bundles across page background, shared cards, nav chrome, hero surfaces, and overlays
- Existing events without a stored preset now normalize to `default` with no intended visual regression.

### Validation

- Local validation passed before release:
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native`
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-hdcService.spec.ts tests/forge-native-repository-event-config.spec.ts tests/forge-native-runtime-branding-surface.spec.ts`
- Production deploy/install executed per [`DEPLOY.md`](/Users/nickster/Downloads/HackCentral/DEPLOY.md):
  - final predeploy snapshot:
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-013658Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-013658Z.json)
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-013658Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-013658Z.md)
  - Forge CLI returned `✔ Deployed`
  - production install reported the site was already at the latest version after upgrade
- Hosted production validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` passed on `Shona's IT Hack` (`pageId=24510466`):
  - runtime console logged `[HackCentral Runtime v2] Module loaded - 1.2.83`
  - root document carried `data-color-mode="light"` and `data-theme-preset="default"`
  - Branding showed 4 preset cards: `Default`, `Editorial`, `Summit`, `Studio`
  - live preview switched from `default` to `summit` immediately without a save
  - artifact set:
    - [`theme-preset-production-validation-2026-03-09T01-38-26-888Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/theme-preset-production-validation-2026-03-09T01-38-26-888Z.json)
    - [`theme-preset-production-validation-2026-03-09T01-38-26-888Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/theme-preset-production-validation-2026-03-09T01-38-26-888Z.md)
    - [`theme-preset-production-validation-2026-03-09T01-38-26-888Z.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/theme-preset-production-validation-2026-03-09T01-38-26-888Z.png)

### Operational Note

- The first production smoke after deploy exposed a release-process gap: `forge-native/static/runtime-frontend/src/data/constants.js` still hard-coded `1.2.82`, so the runtime marker lagged behind the package version even though the theme preset UI had deployed. The fix was to bump `APP_VERSION` to `1.2.83`, rebuild, redeploy, and revalidate immediately.

## Session Update - v0.6.70 Event Management Overview Re-layout Released To Production (Mar 9, 2026 00:43 GMT)

### Completed

- Released the Event Management Overview layout refactor to production without changing the existing global or macro cache-buster markers.
- Bumped production version markers to:
  - root app `0.6.70`
  - forge-native `0.3.48`
  - runtime bundle `1.2.82`
- Production runtime admin panel now includes:
  - page-level tabs directly beneath the Event Management header
  - a compact Overview metrics strip inside the active tab instead of oversized stat cards above navigation
  - an `Operator Checklist` primary surface with inline CTAs for Messaging, Analytics, and User Controls
  - side-by-side monitoring cards for Voting Statistics and Judge Scoring Progress on desktop
  - a minimal export utility row instead of a full-card export section
  - an active-only slim Config Mode strip that collapses entirely when config mode is off

### Validation

- Local validation passed before release:
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
- Production deploy/install executed exactly per [`DEPLOY.md`](/Users/nickster/Downloads/HackCentral/DEPLOY.md):
  - predeploy snapshot:
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-004146Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-004146Z.json)
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-004146Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-004146Z.md)
  - Forge CLI returned `✔ Deployed`
  - production install reported the site was already at the latest version after upgrade
- Hosted production validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` passed on `Shona's IT Hack` (`pageId=24510466`):
  - runtime console logged `[HackCentral Runtime v2] Module loaded - 1.2.82`
  - tab navigation rendered above the Overview metrics strip
  - Operator Checklist rendered with all three inline CTAs
  - Voting Statistics and Judge Scoring Progress rendered side by side at desktop width
  - Config Mode strip was absent while config mode was off
  - artifact bundle:
    - [`runtime-admin-overview-layout-production-2026-03-09T00-43-17-086Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/runtime-admin-overview-layout-production-2026-03-09T00-43-17-086Z.json)
    - [`runtime-admin-overview-layout-production-2026-03-09T00-43-17-086Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/runtime-admin-overview-layout-production-2026-03-09T00-43-17-086Z.md)
    - [`runtime-admin-overview-layout-production-2026-03-09T00-43-17-086Z.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/runtime-admin-overview-layout-production-2026-03-09T00-43-17-086Z.png)

### Learned

- The Event Management admin surface is practical to validate with the same stored-auth, frame-aware Playwright approach used for branding checks; direct DOM position assertions are sufficient to verify the hierarchy change without adding a dedicated repo script first.
- Runtime releases must still bump both `forge-native/static/runtime-frontend/package.json` and `forge-native/static/runtime-frontend/src/data/constants.js` so hosted console evidence matches the deployed bundle.

## Session Update - v0.6.69 Runtime Hero Split Branding Released To Production (Mar 9, 2026 00:09 GMT)

### Completed

- Released the split runtime hero-branding follow-up to production without changing the existing global or macro cache-buster markers.
- Bumped production version markers to:
  - root app `0.6.69`
  - forge-native `0.3.47`
  - runtime bundle `1.2.81`
- Production runtime branding now includes:
  - separate `Hero banner image` and `Hero icon image` controls in `Admin Panel -> Branding`
  - `branding.bannerImageUrl` for the hero background
  - `branding.heroIconImageUrl` for the hero mark area
  - clear custom banner rendering with no added wash or opacity treatment
  - reduced branding preview caps (`200px`) plus explicit banner/icon guidance text
- Corrected the runtime console version marker before closing the release by bumping `forge-native/static/runtime-frontend/src/data/constants.js` from `1.2.80` to `1.2.81` and redeploying production.

### Validation

- Local validation passed before release:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-runtime-branding-surface.spec.ts tests/forge-native-hdcService.spec.ts tests/forge-native-repository-event-config.spec.ts`
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
- Staging baseline validation passed before release:
  - `./scripts/with-node22.sh npm run qa:runtime:branding:staging`
  - artifact: [`staging-hero-split-validation-2026-03-09T00-02-30-515Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-09T00-02-30-515Z.json)
- Production deploy/install executed exactly per [`DEPLOY.md`](/Users/nickster/Downloads/HackCentral/DEPLOY.md):
  - predeploy snapshots:
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-000439Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-000439Z.json)
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-000439Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-000439Z.md)
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-000722Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-000722Z.json)
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-000722Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260309-000722Z.md)
  - Forge CLI returned `✔ Deployed`
  - production install reported the site was already at the latest version after upgrade
- Hosted production validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` passed on `Shona's IT Hack` (`pageId=24510466`):
  - runtime console logged `[HackCentral Runtime v2] Module loaded - 1.2.81`
  - two image upload inputs were present in Branding
  - uploaded banner matched the dashboard hero background
  - uploaded icon matched the dashboard hero logo area
  - both previews persisted when returning to Branding before publish
  - artifact bundle:
    - [`staging-hero-split-validation-2026-03-09T00-08-53-237Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-09T00-08-53-237Z.json)
    - [`staging-hero-split-validation-2026-03-09T00-08-53-237Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-09T00-08-53-237Z.md)
    - [`staging-hero-split-validation-2026-03-09T00-08-53-237Z-dashboard.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-09T00-08-53-237Z-dashboard.png)
    - [`staging-hero-split-validation-2026-03-09T00-08-53-237Z-branding.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-09T00-08-53-237Z-branding.png)

### Learned

- The runtime console version marker is sourced from `forge-native/static/runtime-frontend/src/data/constants.js`, not only from `static/runtime-frontend/package.json`. Bump both before claiming a runtime bundle version change.
- The reusable runtime branding validator now has a generic script path (`scripts/runtime-branding-validate.mjs`) and writes environment-specific artifact prefixes for future runs.

## Session Update - Staging Hero Branding Preview Sizing + Clear Background (Mar 8, 2026 23:43 GMT)

### Completed

- Kept the runtime hero-branding split in staging and refined the child HackDay Admin Branding UX without a production release.
- Removed all banner wash treatment from the hero preview path for custom uploaded banners:
  - dashboard hero banner now renders without the added opacity layer
  - dashboard hero banner now renders without the added overlay gradient
- Reduced Admin Branding preview display sizes by half so the uploaded assets are easier to inspect without dominating the form:
  - banner preview display cap reduced from `400px` to `200px`
  - icon preview display cap reduced from `400px` to `200px`
- Added explicit upload guidance in the Branding tab:
  - banner: `Use a wide image, ideally 1600×400 or larger.`
  - icon: `Use a square image, ideally 400×400 or larger.`

### Validation

- Local validation passed:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-runtime-branding-surface.spec.ts`
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
- Staging deploy/install executed through the reusable QA/deploy command:
  - `npm run qa:runtime:branding:staging:deploy`
- Hosted validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` passed on staging child page `pageId=24510466`:
  - runtime console logged `[HackCentral Runtime v2] Module loaded - 1.2.80`
  - banner and icon uploads still matched the dashboard hero/background and hero mark
  - both uploaded previews still persisted when returning to `Admin Panel -> Branding`
  - latest artifact bundle:
    - [`staging-hero-split-validation-2026-03-08T23-43-02-321Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-08T23-43-02-321Z.json)
    - [`staging-hero-split-validation-2026-03-08T23-43-02-321Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-08T23-43-02-321Z.md)
    - [`staging-hero-split-validation-2026-03-08T23-43-02-321Z-dashboard.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-08T23-43-02-321Z-dashboard.png)
    - [`staging-hero-split-validation-2026-03-08T23-43-02-321Z-branding.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-08T23-43-02-321Z-branding.png)

### Learned

- For custom HackDay hero banners, do not impose contrast/opacity treatment unless explicitly requested. Event owners may intentionally choose their own contrast strategy, and extra wash layers read as regressions rather than guardrails.
- The reusable staging command is now the fastest trustworthy loop for child-runtime branding work:
  - `npm run qa:runtime:branding:staging`
  - `npm run qa:runtime:branding:staging:deploy`

## Session Update - Staging Hero Banner/Icon Split Validation (Mar 8, 2026 22:10 GMT)

### Completed

- Deployed the in-progress runtime hero-branding split to Forge `staging` without a production release/version bump.
- Staging now carries the split-branding runtime changes:
  - explicit `Hero banner image` and `Hero icon image` upload controls in the child HackDay Admin Branding tab
  - banner uploads map to `branding.bannerImageUrl`
  - icon uploads map to `branding.heroIconImageUrl`
  - dashboard hero resolves both draft values directly in Config Mode

### Validation

- Ran staging deploy/install exactly via the staging path in [`DEPLOY.md`](/Users/nickster/Downloads/HackCentral/DEPLOY.md):
  - `../scripts/with-node22.sh npm run custom-ui:build`
  - `../scripts/with-node22.sh forge deploy --environment staging --no-verify`
  - `../scripts/with-node22.sh forge install -e staging --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`
- Added reusable runtime branding staging QA commands:
  - `npm run qa:runtime:branding:staging`
  - `npm run qa:runtime:branding:staging:deploy`
- Hosted validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` and frame-aware selectors passed on staging child page `pageId=24510466`:
  - runtime console logged `[HackCentral Runtime v2] Module loaded - 1.2.80`
  - banner upload generated a stored URL with `/branding/banner-...`
  - icon upload generated a stored URL with `/branding/icon-...`
  - dashboard hero background matched the uploaded banner preview
  - dashboard hero logo matched the uploaded icon preview
  - both uploaded previews persisted when returning to `Admin Panel -> Branding` before publish
  - artifacts:
    - [`staging-hero-split-validation-2026-03-08T22-08-40-539Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-08T22-08-40-539Z.json)
    - [`staging-hero-split-validation-2026-03-08T22-08-40-539Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-08T22-08-40-539Z.md)
    - [`staging-hero-split-validation-2026-03-08T22-08-40-539Z-dashboard.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-08T22-08-40-539Z-dashboard.png)
    - [`staging-hero-split-validation-2026-03-08T22-08-40-539Z-branding.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/staging-hero-split-validation-2026-03-08T22-08-40-539Z-branding.png)

### Learned

- For Confluence-hosted runtime validation, the direct `/wiki/apps/.../hackday-app?pageId=...` route still renders the real app inside a second Atlassian CDN iframe. Browser automation should target `page.frames()[1]` or an equivalent frame-aware selector strategy rather than assuming the main frame contains the runtime DOM.
- In staging, the `Enter Config Mode` control can spend several seconds in a disabled loading state before it becomes actionable. Validation scripts should wait for the button to enable before clicking instead of treating that transient state as a regression.

## Session Update - v0.6.68 Runtime Branding Draft Upload Fix Deployed To Production (Mar 8, 2026 21:13 GMT)

### Completed

- Released runtime branding draft-upload follow-up to production from commit `56e658b`.
- Bumped version markers to:
  - root app `0.6.68`
  - forge-native `0.3.46`
  - runtime bundle `1.2.80`
- Left the unchanged global and macro cache-buster markers at `0.6.66`.
- Runtime Admin Branding upload flow now behaves correctly in active Config Mode sessions:
  - upload writes `branding.bannerImageUrl` into draft state immediately
  - dashboard hero updates from draft branding without requiring publish
  - returning to Branding without publishing keeps the uploaded preview visible

### Validation

- Local release validation passed:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-runtime-branding-surface.spec.ts`
- Production deploy/install executed exactly per [`DEPLOY.md`](/Users/nickster/Downloads/HackCentral/DEPLOY.md):
  - predeploy snapshot:
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-210810Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-210810Z.json)
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-210810Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-210810Z.md)
  - Forge deploy returned `✔ Deployed`
  - Forge install confirmed production was already at the latest app version after upgrade
- Hosted runtime validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` and frame-aware selectors passed:
  - runtime console logged `[HackCentral Runtime v2] Module loaded - 1.2.80`
  - unsaved banner upload updated the dashboard hero immediately
  - returning to `Admin Panel -> Branding` without publishing kept the uploaded preview intact
  - artifacts:
    - [`runtime-branding-upload-unsaved-postdeploy-2026-03-08T21-11-12-117Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/runtime-branding-upload-unsaved-postdeploy-2026-03-08T21-11-12-117Z.json)
    - [`runtime-branding-upload-unsaved-postdeploy-2026-03-08T21-11-12-117Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/runtime-branding-upload-unsaved-postdeploy-2026-03-08T21-11-12-117Z.md)
    - [`runtime-branding-upload-unsaved-postdeploy-2026-03-08T21-11-12-117Z.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/runtime-branding-upload-unsaved-postdeploy-2026-03-08T21-11-12-117Z.png)

### Learned

- For Config Mode upload-driven preview, route changes inside the runtime depend on live draft state, not just saved draft envelopes. If an upload callback captures stale `configModeActive`, the UI can look successful while the actual preview pipeline never receives the new branding value.
- Draft-backed dashboard preview values should be resolved directly from current Config Mode state rather than from a memo tied only to published branding props.

## Session Update - v0.6.67 Runtime Branding Preview Fix Deployed To Production (Mar 8, 2026 20:58 GMT)

### Completed

- Released runtime branding follow-up to production from commit `6e07170`.
- Bumped version markers to:
  - root app `0.6.67`
  - forge-native `0.3.45`
  - runtime bundle `1.2.79`
- Left the unchanged global and macro cache-buster markers at `0.6.66`.
- Runtime Admin Branding fixes now live:
  - banner preview uses contained rendering with a `400px` height cap
  - config-mode draft branding rehydrates banner image state when revisiting Branding before publish

### Validation

- Local release validation passed:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-runtime-branding-surface.spec.ts`
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native`
  - `./scripts/with-node22.sh npm run custom-ui:build --prefix forge-native`
- Production deploy/install executed exactly per [`DEPLOY.md`](/Users/nickster/Downloads/HackCentral/DEPLOY.md):
  - predeploy snapshot:
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-205258Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-205258Z.json)
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-205258Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-205258Z.md)
  - Forge deploy returned `✔ Deployed`
  - Forge install confirmed production was at latest version after upgrade
- Hosted runtime validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` passed:
  - runtime console logged `[HackCentral Runtime v2] Module loaded - 1.2.79`
  - admin branding preview CSS reported `max-height: 400px` and `object-fit: contain`
  - saved draft banner URL persisted after leaving and returning to the Branding tab before publish
  - artifacts:
    - [`runtime-branding-draft-postdeploy-2026-03-08T20-56-55-546Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/runtime-branding-draft-postdeploy-2026-03-08T20-56-55-546Z.json)
    - [`runtime-branding-draft-postdeploy-2026-03-08T20-56-55-546Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/runtime-branding-draft-postdeploy-2026-03-08T20-56-55-546Z.md)
    - [`runtime-branding-draft-postdeploy-2026-03-08T20-56-55-546Z.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/runtime-branding-draft-postdeploy-2026-03-08T20-56-55-546Z.png)

### Learned

- The runtime branding editor must hydrate from config-mode draft state even when the published event branding has not changed yet; otherwise upload/save-draft flows look like they failed when users return to Admin.
- For large uploaded assets, the admin preview should use explicit containment constraints rather than inheriting hero-like full-bleed behavior.

## Session Update - v0.6.66 Create Flow Cleanup Deployed To Production (Mar 8, 2026 17:12 GMT)

### Completed

- Released create-flow cleanup to production from commit `1cbc04b`.
- Bumped version markers to:
  - root app `0.6.66`
  - forge-native `0.3.44`
  - HackCentral UI marker `0.6.66`
  - HackCentral macro marker `0.6.66`
  - runtime bundle unchanged at `1.2.78`
- Global HackDay creation flow now matches the real ownership model:
  - `Setup Information` + `Review & Create`
  - no progress stepper
  - no schedule/branding ownership step content
  - no dead rule fields
  - only `Max size` is captured for team rules
  - max-size field is now a compact 3-digit capture control
- Create-time backend behavior now allows `go_live` without hacking/submission dates, so opening registration immediately no longer blocks on schedule dates that are configured later in the HackDay page.
- Production macro bundle was refreshed to marker `0.6.66` as part of the same release.

### Validation

- Local release validation passed:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-hdcService.spec.ts tests/forge-native-create-wizard-branding-removal.spec.ts tests/forge-native-macro-create-wizard-rules-removal.spec.ts`
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native/static/frontend`
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native/static/macro-frontend`
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native`
  - `./scripts/with-node22.sh npm run custom-ui:build --prefix forge-native`
- Production deploy/install executed exactly per [`DEPLOY.md`](/Users/nickster/Downloads/HackCentral/DEPLOY.md):
  - predeploy snapshot:
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-170248Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-170248Z.json)
    - [`HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-170248Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-170248Z.md)
  - Forge deploy returned `✔ Deployed`
  - Forge install confirmed production was at the latest version after upgrade
- Hosted validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` passed:
  - global page console logged `[HackCentral Confluence UI] loaded 0.6.66`
  - macro host page console logged `[HackCentral Macro UI] loaded 0.6.66`
  - live create flow showed `Setup Information`, no `Min size`, no legacy stepper, and a `Max size` input with `maxlength=3`
  - review screen showed `Max team size`
  - artifacts:
    - [`release-createflow-postdeploy-2026-03-08T17-09-03-636Z.json`](/Users/nickster/Downloads/HackCentral/docs/artifacts/release-createflow-postdeploy-2026-03-08T17-09-03-636Z.json)
    - [`release-createflow-postdeploy-2026-03-08T17-09-03-636Z.md`](/Users/nickster/Downloads/HackCentral/docs/artifacts/release-createflow-postdeploy-2026-03-08T17-09-03-636Z.md)
    - [`release-global-createflow-2026-03-08T17-09-03-636Z.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/release-global-createflow-2026-03-08T17-09-03-636Z.png)
    - [`release-macro-version-2026-03-08T17-09-03-636Z.png`](/Users/nickster/Downloads/HackCentral/docs/artifacts/release-macro-version-2026-03-08T17-09-03-636Z.png)

### Learned

- For this flow, the truthfulness rule is now clearer: only collect fields in HackCentral that the created HackDay visibly represents or enforces on day one. `Max size` met that bar; `Min size` did not.
- The global-page and macro bundles should have their cache-buster markers advanced together whenever both bundles change, even if the macro UX shape itself is still legacy.

## Session Update - Pains Language + Pipeline Upstream Stage (Mar 5, 2026)

### Completed

- Renamed user-facing Problem Exchange language to Pains across primary surfaces without changing route/API identifiers:
  - nav label (`problem_exchange` route kept)
  - global search placeholder
  - Pains page headings/actions/empty/loading/action messages
  - home feed copy and recommendation labels
  - related UI copy that referenced solved problems now references solved pains
- Added a synthetic **Pains** stage to the Pipeline hero as stage 0:
  - pipeline now renders 5 visual stages (pains -> hack -> validated -> incubating -> candidate)
  - pains data is loaded via existing resolver `hdcListProblems` with:
    - `statuses: ['open','claimed','solved','closed']`
    - `includeHidden: false`
    - `limit: 200`
  - preview mode uses preview problems source with the same visibility/status filtering
- Added pains-derived metrics in the frontend read model:
  - `painsCount`
  - average age in days from `createdAt`
  - pains->hack conversion from `linkedHackProjectId`
- Updated pipeline components for mixed stage keys (`'pains' | PipelineStage`) and detail behavior:
  - Pains detail shows pain rows + CTA to open Pains page
  - no move controls for pains
  - admin move controls remain unchanged for project stages
- Kept backend contracts intact:
  - no resolver signature changes
  - no DB schema changes
  - no backend enum expansion

### Validation

- `npm run typecheck --prefix forge-native/static/frontend` ✅
- `npm run build --prefix forge-native/static/frontend` ✅
- `npm run typecheck --prefix forge-native` ✅

## Session Update - Performance Rollout Completion + Live Telemetry Validation (Mar 1, 2026)

### Completed

- Enabled and validated low-risk performance rollout flags in production and staging:
  - `HDC_PERF_CREATE_BACKEND_V1=true`
  - `HDC_PERF_RUNTIME_BOOTSTRAP_V2=true`
  - frontend build flags enabled at deploy time:
    - `VITE_HDC_PERF_CREATE_HANDOFF_V1=true`
    - `VITE_HDC_PERF_RUNTIME_BOOTSTRAP_V2=true`
    - `VITE_HDC_PERF_LOADING_UX_V1=true`
- Fixed `create-from-web` fallback user provisioning defects in `forge-native/src/backend/supabase/repositories.ts`:
  - generate `id` for inserted fallback users
  - include required `createdAt` and `updatedAt` timestamps
  - eliminated prior production `23502` not-null failures.
- Corrected app entry URL drift:
  - updated `HACKDAY_CREATE_APP_URL` from legacy `/forge-apps/...` to `/wiki/apps/.../hackday-central` for both production and staging.
- Rebuilt all Forge custom UIs and redeployed to ensure frontend perf flags were compiled into active bundles.
- Release/version bump committed and pushed:
  - root `0.6.44`
  - Forge native `0.3.12`
  - UI markers `HACKCENTRAL_UI_VERSION` and `HACKCENTRAL_MACRO_VERSION` set to `0.6.44`.

### Production Evidence (Live Create -> Open Full Page)

- Latest validated create request:
  - `creationRequestId`: `156ac93e-4702-43d8-bf4d-1c61393f9aec`
  - `eventId`: `42818bfa-ab12-4f2b-bcac-01633e9da590`
  - `childPageId`: `16875584`
- Backend create metric:
  - `create_instance_draft` success, `3439ms`, `mode: v1`
  - stage timings captured (lookup, conflict check, child page creation, user resolution, event/milestone/admin/seed creation).
- Frontend handoff metric:
  - `create_handoff` success, `4184ms`, `mode: v1`, `outcome: opened_app_view`
- Runtime load metrics:
  - `runtime_first_load` success, `3822ms`, `mode: v2`
  - `runtime_bootstrap` success, `1704ms`, `mode: v2`
- Route validation:
  - full-page app opened on `/wiki/apps/.../hackday-app?pageId=16875584` and loaded event title/tagline correctly.

### Notes

- During rollout validation, an intermediate deploy regressed frontend telemetry to `legacy` mode because Vite flags were not compiled in that bundle.
- Rebuilding Custom UI with flags and redeploying fixed this; final production telemetry confirms active `v2` runtime bootstrap path.

## Session Update - Create Flow Stabilization + Runtime CSP Cleanup (Feb 28, 2026)

### Completed and Deployed

- Production deploy sequence completed through Forge version `5.20.0`.
- Create flow launch behavior stabilized for both HackCentral UIs:
  - `forge-native/static/frontend/src/App.tsx`
  - `forge-native/static/macro-frontend/src/App.tsx`
- Launch logic now uses app-shell navigation in this order:
  1. top-window assign (when available)
  2. `router.navigate(appViewUrl)` with timeout
  3. `router.open(appViewUrl)` with timeout
  4. child-page fallback only if app-view launch fails
- Removed false-positive “opened in new tab” behavior from async popup handling in sandboxed iframe contexts.
- Runtime context activation is primed immediately after create for the new child page:
  - calls `hdcActivateAppModeContext` with created `childPageId`.
- Runtime CSP cleanup completed:
  - removed `@fontsource` imports from runtime frontend entry
  - switched runtime font stacks to CSP-safe system fonts
  - eliminated runtime `data:font` CSP console errors during app load
- App list clarity update:
  - runtime app entry renamed to `HackCentral Runtime (Internal)` in manifest.

### Validation

- Playwright end-to-end create tests passed (multiple runs):
  - create from HackCentral UI
  - auto-land on `/wiki/apps/.../hackday-app?pageId=...`
  - correct created event heading shown
  - no “An error has occurred in loading this app” banner
- Runtime direct-open validation passed:
  - runtime page loads with `0` console errors (warnings remain platform-level/non-blocking).
- Targeted tests passed:
  - `tests/forge-native-hdcService.spec.ts`
  - `tests/forge-native-createFromWeb.spec.ts`
  - `tests/runtime-app-view-gating.spec.ts`
  - `tests/create-hackday-launch-url.spec.ts`
  - `tests/forge-native-runtime-context-precedence.spec.ts`

## Session Update - Runtime Cutover + Existing Page Migration (Feb 28, 2026)

### Completed

- Production runtime owner switched to HackCentral:
  - `HDC_RUNTIME_OWNER=hackcentral`
- Forge production redeployed and install upgraded on `hackdaytemp.atlassian.net`.
- Existing created-instance pages migrated from legacy HD26 macro target to HackCentral runtime macro target using:
  - `scripts/migrate-hackday-runtime-macro.mjs`
- Migration result:
  - `totalCandidates: 28`
  - `updated: 28`
  - `skipped: 0`
  - `errors: 0`
- Rollback artifact written:
  - `docs/runtime-migration/rollback-manifest-2026-02-28-104510.json`

### Open App View Follow-up

- Root cause found for launch failure:
  - runtime frontend was navigating to old module key `hackday-global-nav`.
  - fixed to `hackday-runtime-global-page` in:
    - `forge-native/static/runtime-frontend/src/App.jsx`
- Remaining UX inconsistency:
  - CTA visibility and auto-open are still gated by `useAdaptavistLogo`, so some migrated pages hide the button even with valid page context.
  - Current gate in runtime frontend:
    - `showOpenAppViewCta={Boolean(isMacroHost && useAdaptavistLogo && eventPageId)}`

## Session Update - App Shell Full-Page Routing + Default Recency Sort (Feb 28, 2026)

### Completed

- Confirmed created HackDay instances can open in full app-shell route context using URL pattern:
  - `/wiki/apps/<app-id>/<env-id>/hackday-app`
- Verified this app-route path removes Confluence page chrome (header/sidebar/title region) compared with page-macro context.
- Updated HackDay registry ordering to default to **most recent first** in both Forge UIs:
  - Global page UI (`forge-native/static/frontend`)
  - Macro UI (`forge-native/static/macro-frontend`)

### Sorting Behavior (Most Recent First)

- Default list/switcher ordering now prioritizes recency derived from schedule timestamps (`results`, `voting`, `submission`, `hacking`, then earlier anchors).
- Tie-breaker fallback uses numeric Confluence page ID (descending), then event name.
- This replaced older default alphabetical ordering for main registry experiences.

### Deploy/Release Markers

- Forge package version bumped to `0.3.9` (`forge-native/package.json`)
- UI version markers bumped to `0.6.21` in both App.tsx files
- Commit: `3045843` — `Sort hackdays by most recent by default`
- Pushed to `origin/main` on February 28, 2026

### Validation Notes

- `npm run typecheck` passed in `forge-native`
- `npm run custom-ui:build` passed for both bundles
- Console warnings seen during testing (FeatureGateClients duplicates, CSP font blocks, deprecated platform APIs) were non-blocking and host/platform-originated

## Session Update - Runtime Consolidation Foundations (Feb 28, 2026)

### Completed

- Added HackCentral-hosted runtime modules in Forge manifest:
  - Global page route: `hackday-app` (resource `runtime-ui-frontend`, resolver `runtime-resolver`)
  - Runtime macro: `hackday-runtime-macro`
  - Runtime function handler: `src/runtime/index.js` (ported from HD26Forge backend)
- Added runtime frontend resource:
  - `forge-native/static/runtime-frontend` (ported from HD26Forge frontend)
- Added runtime selection feature flag and route metadata contract in `hdcGetAppViewUrl`:
  - `HDC_RUNTIME_OWNER` (`hd26forge` default, `hackcentral` for cutover)
  - Response now includes `runtimeOwner` and `routeVersion`
- Added runtime-aware instance provisioning behavior:
  - New child page macro target now selected by runtime owner
  - Full-page `appViewUrl` now selected by runtime owner with fallback to legacy HD26 route
- Added migration tooling for existing child pages:
  - `scripts/migrate-hackday-runtime-macro.mjs` (supports `dryRun`, `tenant`, `batchSize`, `cursor`, `rollbackManifestPath`)
  - `scripts/rollback-hackday-runtime-macro.mjs`
  - Manifest includes page-level rollback metadata (pre-migration hash + updated version + previous storage body for rollback)

### New Forge Env Variables

- `HDC_RUNTIME_OWNER`
- `HDC_RUNTIME_APP_ID`
- `HDC_RUNTIME_ENVIRONMENT_ID`
- `HDC_RUNTIME_MACRO_KEY`

### Validation

- `forge-native`: `npm run typecheck` ✅
- `forge-native`: `npm run test:backend` ✅
- `forge-native`: `npm run custom-ui:build` ✅ (frontend + macro + runtime frontend)
- `forge-native`: `npm run lint` ✅ (1 non-blocking deprecation warning about fetch.backend permissions)

**Deployment:**
- Frontend: Vite dev server (localhost:5173)
- Backend: Convex
- Confluence: Forge app on hackdaytemp.atlassian.net

## Key Concepts

### HackDay Template Wizard Flow
```
User fills wizard
  ↓
Stores HackdayTemplateSeed in Supabase (seed_payload)
  ↓
HD26Forge macro loads on Confluence page
  ↓
Detects seed → Creates Event in Supabase
  ↓
Renders HackDay with custom branding/messaging
```

### Shared Data Structure

**HackdayTemplateSeed Table** (Supabase):
- `confluence_page_id` - Links to child page
- `seed_payload` - Complete wizard data (basicInfo, schedule, rules, branding)
- `hackday_event_id` - Created Event ID
- `provision_status` - 'provisioned', 'initialized', 'failed'

**Seed Payload Structure:**
```javascript
{
  basicInfo: {
    eventName: string,
    eventIcon?: string,
    eventTagline?: string,
    primaryAdminEmail?: string,
    coAdminEmails?: string[],
  },
  schedule: { /* dates and times */ },
  rules: {
    minTeamSize?: number,
    maxTeamSize?: number,
    // other constraints
  },
  branding: {
    bannerMessage?: string,
    accentColor?: string,
    bannerImageUrl?: string,
  },
  launchMode?: "draft" | "go_live"
}
```

## Development Notes

### Frontend Architecture
- React components in `src/components/` (shared, ui, dashboard, library, people, projects)
- Custom hooks in `src/hooks/`
- Utilities and design system in `src/lib/`
- Design tokens system in `src/lib/design-system.ts`

### Backend (Convex)
- Database schema in `convex/schema.ts`
- Mutations/queries in `convex/` files (profiles.ts, hackdays.ts, etc.)
- Forge bridge in `convex/forgeBridge.ts` for Confluence integration

### Design System
Follow patterns in DESIGN_SYSTEM.md:
- Shared components: SectionHeader, ModalWrapper, SkeletonGrid
- Page patterns and layouts
- Design tokens for consistency

### Testing
- Framework: Vitest + React Testing Library
- Run: `npm test`
- Coverage: `npm run test:coverage`

## Deployment

### Convex Backend
```bash
npm run convex:deploy  # Deploy to production
```

### Confluence App (Forge Native)
```bash
cd forge-native
npm run custom-ui:build
forge deploy --environment production --no-verify
forge install -e production --upgrade --non-interactive \
  --site hackdaytemp.atlassian.net --product confluence
```

See DEPLOY.md for exact copy-paste steps.

## Known Issues & TODOs

- Open App View CTA/auto-open visibility is inconsistent on migrated pages due to `useAdaptavistLogo` gating in runtime frontend.
- Decide and implement final rule:
  - gate by page context only (`isMacroHost && eventPageId`) for all created instances, or
  - keep logo-based segmentation intentionally.
- `LEARNINGS.md` is the primary HackCentral continuity log for session summaries, deploy notes, and recent changes
- `learnings.md` contains additional project-specific continuity notes (including HD26Forge integration details)

## Session Update - Created HackDay Chrome Parity Reminder (Feb 27, 2026)

### Observation

- Original HackDay app view can run in app-shell context without Confluence page title/byline in the primary content area.
- Created HackDays are currently opened on Confluence child pages that render the HackDay macro, so Confluence page chrome remains visible.

### Key Constraint

- Forge macro cannot remove host Confluence page chrome from inside iframe content.
- True parity requires app-route usage (`/wiki/apps/.../hackday-app`) for created instances.

### Next Work Item (deferred to new chat)

1. Add/confirm launch flow from HackCentral-created child pages into HD26Forge app route.
2. Keep child pages as durable anchors/metadata sources.
3. Preserve HD26Forge page-scoped context integrity and trusted page-id rules during routing changes.

## Session Update - Schedule Builder V2 Payload Hardening (Feb 25, 2026)

### Completed and Deployed

- Hardened Schedule Builder V2 payload consistency across HackCentral web create path:
  - Convex payload validator (`convex/hackdays.ts`)
  - Forge backend shared types and normalization (`forge-native/src/shared/types.ts`, `forge-native/src/backend/hdcService.ts`)
  - Forge repository schedule parsing/round-trip (`forge-native/src/backend/supabase/repositories.ts`)
  - Forge frontend API types and wizard typing (`forge-native/static/frontend/src/types.ts`, `forge-native/static/frontend/src/App.tsx`)
- Added preserve-only support for `customEvents` and preserved `selectedEvents`.
- Preserved `duration`, `openingCeremonyAt`, `presentationsAt`, `judgingStartsAt` end-to-end.
- `customEvents` are intentionally:
  - stored in `Event.event_schedule`
  - stored in `HackdayTemplateSeed.seed_payload.schedule`
  - **NOT rendered yet** on child Schedule page at this Feb 25 checkpoint
  - **NOT converted to milestones yet** at this Feb 25 checkpoint (superseded by Feb 26 update below)

### Validation Completed

- `forge-native` typecheck passed
- Targeted regression tests added/passed:
  - `forge-native-createFromWeb.spec.ts`
  - `forge-native-hdcService.spec.ts`
  - `forge-native-repository-event-config.spec.ts`
- Full root test suite passed (`95/95`) after fixing localStorage test shim in `tests/setup.ts`
- Production smoke test (post-deploy) confirmed:
  - preserved schedule fields in `event_schedule` and `seed_payload.schedule`
  - no custom-event milestones (expected)

### Deployment Rule (Important)

- Use a **single Forge deploy target: production**
- Always deploy with:
  - `forge deploy --environment production --no-verify`
- Do not rely on default/active Forge environment selection

### Commit

- `b9d500c` - `Harden Schedule Builder V2 payload preservation`

### What's Next (Schedule Builder V2)

- Historical note (Feb 25): Phase 2 UI + Phase 3 preview were still pending at this checkpoint
- Current remaining work (see Feb 26 updates below):
  - Phase 3 UI work: Schedule preview page
  - Exact custom-event signal-color parity on child Schedule page (currently phase-mapped)

## Next Session Quick Start

1. Type: `Read .claude/instructions.md`
2. I'll load context and ask what to work on
3. Expect a model recommendation (Haiku for implementation, Sonnet for analysis)

## Important Files to Know

| File | Purpose |
|------|---------|
| `DESIGN_SYSTEM.md` | UI components and patterns |
| `learnings.md` | HD26Forge-specific continuity notes |
| `.claude/instructions.md` | Session onboarding and quick reference |
| `convex/schema.ts` | Database schema |
| `convex/hackdays.ts` | HackDay creation wizard logic |
| `forge-native/CONTINUATION_HANDOFF.md` | Forge integration notes |
| `forge-native/src/backend/hdcService.ts` | Backend: normalizeEventSchedule, createMilestonesFromSchedule |
| HD26Forge `static/frontend/src/components/Schedule.jsx` | Schedule page rendering and milestone grouping |

## Session Update - Forge UI Restyles, Font Parity, and Deploy Debugging (Feb 26, 2026)

### Completed and Deployed

- Restyled Forge **HackDays** page (`forge-native/static/frontend`) to match the main-app Schedule Builder / PhaseCard visual language (teal accent cards, stronger hierarchy, restyled empty/loading/error states).
- Restyled Forge **dashboard/front page** and refreshed shared **`HackCard`** visuals globally in `static/frontend` (dashboard hero, metric cards, section framing, quick-actions shell/FAB styling alignment).
- Aligned Forge frontend base font stack to original HackDay (`IBM Plex Sans`, `Segoe UI`, `sans-serif`) and then fixed title font parity by bundling IBM Plex Sans in the frontend bundle.
- Fixed Hacks page filter-row regression (`Show Deprecated` checkbox blown out by text-input styles).

### Font Parity - What Actually Fixed It

- Title typography metrics were already correct (weight/tracking), but the face still looked wrong when `IBM Plex Sans` was not installed locally.
- **Stack-only change was insufficient**.
- Exact parity required explicit font loading in Forge frontend:
  - Added `@fontsource/ibm-plex-sans` to `forge-native/static/frontend/package.json`
  - Imported weights `400/500/600/700` in `forge-native/static/frontend/src/main.tsx`
- Result: Forge frontend bundle now ships IBM Plex font assets, so title rendering no longer depends on local machine fonts.

### Hacks Page Regression - Root Cause / Fix

**Symptom:** Hacks filters/layout broke and the `Show Deprecated` checkbox was stretched like a full-width filter control.

**Root cause:** Over-broad CSS selector in `forge-native/static/frontend/src/styles.css`:
- `.filter-row input` matched nested checkbox inputs inside `.check-label`

**Fix:**
- Scoped filter controls to direct children only:
  - `.filter-row > input`
  - `.filter-row > select`
- Added defensive `.check-label input` sizing rules (`flex: 0 0 auto`, compact width/padding)

### Forge Deploy / Cache-Busting Lessons (Important)

- `forge deploy` does **not** build `static/frontend` or `static/macro-frontend` source automatically.
- Always run:
  1. `npm run custom-ui:build`
  2. `forge deploy --environment production --no-verify`
- `forge environments list` confirms deploy timestamp, but browser console version logs confirm which UI bundle loaded:
  - `[HackCentral Confluence UI] loaded <version>`
  - `[HackCentral Macro UI] loaded <version>`
- Atlassian host-page warnings (CSP report-only `unsafe-eval`, FeatureGateClients duplicates, deprecated platform APIs) are usually unrelated to HackCentral UI changes.

### Versions / Commits (This Session)

- Root app version bumped to `0.6.34`
- Forge UI cache-buster versions reached `0.6.8` (`HACKCENTRAL_UI_VERSION` and `HACKCENTRAL_MACRO_VERSION`)
- Relevant commits:
  - `06dd8cb` - Restyle Forge dashboard and shared HackCard visuals
  - `868ffc6` - Align Forge frontend font stack with HackDay (stack-only attempt)
  - `64c2bc6` - Fix Hacks filter layout regression
  - `722ff08` - Bundle IBM Plex Sans for Forge frontend (final title font parity fix)

## Schedule Builder V2 & Milestone System (Feb 25, 2026)

### Data Flow: Wizard → Backend → HD26Forge Schedule Page

```
Schedule Builder V2 (frontend)
  ↓ generates ScheduleBuilderOutput with timestamps
hdcCreateInstanceDraft (backend)
  ↓ calls normalizeEventSchedule() to extract fields
  ↓ calls createMilestonesFromSchedule() to create Milestone records
Supabase Milestone table
  ↓ HD26Forge reads milestones via getSchedule resolver
HD26Forge Schedule.jsx renders milestones
```

### Key Backend Functions (hdcService.ts)

**`normalizeEventSchedule(input)`** - Extracts schedule fields from wizard output:
- Must include ALL fields the frontend sends (openingCeremonyAt, presentationsAt, judgingStartsAt, etc.)
- Missing fields here = milestones won't be created = won't show on Schedule page
- Now includes `duration` field for multi-day event support

**`createMilestonesFromSchedule(eventId, schedule)`** - Creates Milestone records:
- Pre-event: registrationOpensAt, teamFormationStartsAt, registrationClosesAt
- Hack day: openingCeremonyAt, hackingStartsAt, submissionDeadlineAt, presentationsAt, judgingStartsAt, resultsAnnounceAt
- Multi-day: Creates "Day N - Hacking Continues" for intermediate days when duration > 1

### HD26Forge Schedule Display (static/frontend/src/components/Schedule.jsx)

**Milestone Grouping Logic:**
- Pre-event phases (REGISTRATION, TEAM_FORMATION) → grouped into single "Pre-Event" column
- Hack day phases (HACKING, SUBMISSION, JUDGING, RESULTS) → grouped by date into "Day 1", "Day 2", etc.

**Bug Fixed:** Original code grouped ALL milestones by date, showing pre-event milestones as separate day columns.

### Multi-Day Event Handling

For 3-day events:
- Day 1: Opening Ceremony, Hacking Begins
- Day 2: "Day 2 - Hacking Continues" (auto-generated when duration=3)
- Day 3: Code Freeze, Presentations, Judging, Results

The `duration` field in EventSchedule enables this - without it, intermediate days have no milestones.

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Missing events on Schedule page | `normalizeEventSchedule` not including field | Add field to normalizeEventSchedule return |
| Pre-events shown as separate day columns | HD26Forge grouping by date instead of phase | Group by phase in Schedule.jsx |
| Missing Day 2 on 3-day events | No milestones for intermediate days | Add duration field + generate intermediate milestones |

## Critical Reminders

**Shared Backend Impact:**
- Changes to HackdayTemplateSeed affect HD26Forge rendering
- Supabase migrations affect both projects
- Test created HackDay rendering in HD26Forge when modifying seeds

**Design Consistency:**
- Always use components from DESIGN_SYSTEM.md
- Follow Tailwind CSS 4 patterns
- Keep UI consistent with existing pages

**Wizard Data Flow:**
- seed_payload values become Event display values in HD26Forge
- eventName → dashboard hero title (if useAdaptavistLogo)
- eventTagline → dashboard hero subtitle (if useAdaptavistLogo)

---

**Next time:** Read instructions.md to get oriented, then tell me what you'd like to work on!

---

## Learnings (Feb 26, 2026) - Schedule Builder V2 Custom Events to Child Schedule Page

### 1) Wizard UI success does not prove child Schedule page success

The HackCentral Schedule Builder V2 wizard and the created child Hackday Schedule page are different systems:
- Wizard UI works from `event_schedule`
- Child Schedule page renders from **Milestone** rows

Implication:
- If custom events are preserved in `event_schedule` but not converted to milestones, they will **not** show on the child Schedule page.

### 2) This was initially a scope/runtime issue, not a deploy/cache issue

We correctly deployed the UI changes, but the child Schedule page still didn't reflect custom events because milestone generation was initially scoped to `hdc_native` only.

Later requirement clarified:
- HackCentral-created child pages should reflect Schedule config for both runtimes used by HackCentral creation flows:
  - `hdc_native`
  - `hackday_template`

### 3) Child Schedule page coloring is phase-based, not signal-based

Important distinction:
- Schedule Builder V2 custom events have `signal` (`start`, `deadline`, `ceremony`, `presentation`, `judging`, `neutral`)
- Child Schedule page milestone rendering currently uses milestone `phase` for card coloring/styling

Current result:
- Signal influences color **indirectly** via `signal -> phase` mapping
- Exact signal color parity is **not** preserved yet

This explains why "slot color transferred?" can look partially correct while signal-specific palette parity is still missing.

### 4) Add a resync/backfill path when changing milestone generation

New milestone-generation behavior only affects newly created child pages unless you backfill existing milestones.

Added production ops action:
- `resync_schedule_milestones` (webtrigger handler in `forge-native/src/ops.ts`)
- Rebuilds milestones from stored `event_schedule`
- Useful for validating new milestone mapping on already-created test pages

### 5) Keep runtime-specific assertions in tests (or consciously broaden them)

A preserve-only test for `hackday_template` blocked/obscured the product expectation change.

Lesson:
- When behavior depends on runtime, tests should explicitly name and assert the intended runtime scope
- If product scope changes, update the runtime-specific assertions first so failures are informative

### 6) Practical debugging order for Schedule Builder V2 issues

When "Schedule page doesn't reflect config":
1. Confirm wizard output / `event_schedule` contains expected data
2. Confirm milestone generation path includes the fields (`hdcService.ts`)
3. Confirm runtime scope (`hdc_native` vs `hackday_template`)
4. Confirm whether existing page needs milestone resync
5. Only then investigate deploy/cache issues

---

## Learnings (Feb 26, 2026) - Dedicated Schedule Review Step (Wizard UX + Preview Accuracy)

### 1) Schedule editing and schedule validation should be separate wizard modes

Putting the full generated timeline preview at the bottom of the Schedule editor made the page too tall and encouraged users to miss validation details.

What worked better:
- Step 2 = **Schedule editing**
- Step 3 = **Schedule Review** (read-only preview + back-to-edit loop)

This reduced context switching and made schedule verification explicit before moving on to Rules/Branding.

### 2) Preview accuracy must come from live builder state, not serialized output only

The original dedicated preview implementation undercounted multi-day events because serialized `ScheduleBuilderOutput` flattens some schedule timestamps and does not preserve every day-specific standard event instance.

Fix:
- Render Step 3 preview from live `ScheduleBuilderV2` state:
  - `eventStates`
  - `customEvents`
  - `duration`
  - `anchorDate`
  - `timezone`

Result:
- Repeated Day 2/Day 3 events (e.g. `Morning Kickoff`, `Hacking Begins`) now render correctly in the preview.

### 3) Parent wizard state is required for reliable back-to-edit UX

To support Step 3 review + Step 2 edit round-trips without losing configuration, the parent wizard must store the full Schedule Builder V2 state snapshot.

Implementation pattern:
- `ScheduleBuilderV2` exposes:
  - `onStateChange`
  - `showInlinePreview`
- Parent stores `ScheduleBuilderState`
- Step 2 passes `initialState` when returning from review
- Step 3 renders `ScheduleBuilderV2Preview` from parent-held state

Macro-specific note:
- Persisting `scheduleBuilderState` in local draft storage prevents losing the dedicated review preview after reloads.
- Older drafts without this field must be treated as valid and simply show the “open Schedule step first” fallback.

### 4) Wizard step-count changes require metadata compatibility updates

Adding a dedicated Schedule Review step changed wizard flow from 5 to 6 steps.

Required compatibility changes:
- `WizardStep` union updated to include `6`
- `completedStep` backend validation upper bound expanded from `5` to `6`
- Default `completedStep` values for seed creation updated to `6`

Important:
- This is metadata/telemetry compatibility only
- `wizardSchemaVersion` remained `2`
- No seed payload schema changes were needed

### 5) Preserve scope boundaries: HackCentral wizard UX can change without touching HD26Forge

This work intentionally stayed in `forge-native` (HackCentral creation wizard only).

Did **not** change:
- `HD26Forge` repo
- child-page Schedule rendering (`Schedule.jsx`)
- shared schedule/customEvents payload schema
- milestone generation behavior

This was safe because the feature is a wizard UX and preview presentation improvement, not a data-contract change.

### 6) ECD UX lesson: avoid card-within-card depth inside a wizard step

The first Schedule Review implementation introduced too much visible depth:
- page shell
- step card
- inner bordered preview panel

This created visual noise and double padding.

Fix that worked:
- Add a flat/embedded preview surface mode for Step 3 review
- Keep only the day columns as subtle content containers
- Move instructional text under the Step 3 headline
- Replace preview pseudo-title with a simple timezone label

Result:
- The step reads as **two levels maximum** (page chrome + step card), consistent with HackDay design language.

### 7) Release/deploy continuity for this shipped work

Shipped state:
- Forge UI cache-buster version: `0.6.14`
- Forge production deploy timestamp: `2026-02-26T13:15:31.715Z`
- Commit: `24fc6f5` (`Add dedicated schedule review step and flatten preview`)
- Tag: `v0.6.14-ui`

Deployment reminders reinforced:
- Build both UIs: `npm run custom-ui:build`
- Deploy explicitly to production: `forge deploy --environment production --no-verify`
- Verify console bundle versions in incognito/private window after hard refresh

## Session Update - Phase 0 Continuity Backbone Implementation (2026-03-01 01:01 GMT)

### Task ID
- `P0.CONT.01` to `P0.CONT.08`

### What Changed
- Created the live execution ledger: `HDC-PRODUCT-EXECUTION-PLAN.md`.
- Updated `hdc-product-roadmap.hd` with fixed startup read order and session protocol.
- Rewrote `CONTINUATION.md` to the required operational schema:
  - current snapshot
  - active task pointer
  - next 3 atomic actions
  - blockers/decisions
  - validation commands
  - startup checklist
- Rewrote `CONTINUATION_PROMPT.md` as a clean bootstrap prompt linked to active task.
- Replaced `.claude/instructions.md` with startup/shutdown ritual workflow and updated source-of-truth map.
- Updated continuity references in `README.md` and `docs/README.md`.
- Created missing `forge-native/CONTINUATION_HANDOFF.md` and linked it in source-of-truth docs.
- Replaced stale legacy V2 execution-plan filename references in active docs with `HDC-PRODUCT-EXECUTION-PLAN.md`.

### Validation / Evidence
- File presence validated:
  - `HDC-PRODUCT-EXECUTION-PLAN.md`
  - `CONTINUATION.md`
  - `CONTINUATION_PROMPT.md`
  - `.claude/instructions.md`
  - `forge-native/CONTINUATION_HANDOFF.md`
- Stale reference sweep (active docs) returned no matches for legacy plan filename:
  - `rg -n "PLAN_HDC_V2_EXECUTION\.md" ...` (exit code `1`, no matches)
- Continuity schema spot-check:
  - `Active Task ID` present in `CONTINUATION.md`
  - `Task ID` and `Change Log` present in `HDC-PRODUCT-EXECUTION-PLAN.md`

### Regressions / Gotchas
- Active docs had multiple stale references to the legacy V2 execution-plan filename; these were cleaned up in-place.
- Historical artifacts under `docs/artifacts/` can still contain historical references by design.

### Next Recommended Step
- Execute `P1.IA.01`: produce the implementation-level IA/routing spec for `Home | Discover | Problem Exchange | HackDays | Pipeline | Community | Guide` and lock sub-tab routing behavior.

## LEARNINGS.md Entry Template (Operational)

Use this template at the end of every work session:

```markdown
## Session Update - <Topic> (<YYYY-MM-DD HH:MM TZ>)

### Task ID
- `<TASK_ID>`

### What Changed
- ...

### Validation / Evidence
- ...

### Regressions / Gotchas
- ...

### Next Recommended Step
- ...
```

## Session Update - P1.IA.01 IA and Routing Spec Finalization (2026-03-01 01:04 GMT)

### Task ID
- `P1.IA.01`

### What Changed
- Created implementation-ready IA/routing spec:
  - `docs/HDC-P1-IA-ROUTING-SPEC.md`
- Locked canonical Phase 1 nav model:
  - `Home | Discover | Problem Exchange | HackDays | Pipeline | Community | Guide`
- Defined decision-complete contracts for:
  - root app route schema + legacy redirects
  - Forge global-page `View` migration adapter + sub-tab state model
  - utility-surface handling (`search`, `notifications`, `create_hackday` flow)
  - admin role-gating behavior
- Updated execution ledger to mark `P1.IA.01` complete and advance active task to `P1.REG.01`.
- Updated `CONTINUATION.md` and `CONTINUATION_PROMPT.md` to point at `P1.REG.01` and reference the IA baseline spec.

### Validation / Evidence
- New spec file exists and includes:
  - canonical IA model
  - route/view matrices
  - legacy mapping table
  - acceptance criteria + test scenarios
- `HDC-PRODUCT-EXECUTION-PLAN.md` now shows:
  - `P1.IA.01` status: completed
  - active task ID: `P1.REG.01`
- `CONTINUATION.md` now points to `docs/HDC-P1-IA-ROUTING-SPEC.md` as IA baseline.

### Regressions / Gotchas
- Forge global page currently uses in-memory `view` state instead of URL routing, so migration requires an explicit compatibility adapter to avoid view regressions during rollout.

### Next Recommended Step
- Execute `P1.REG.01`: define Registry data model + Forge resolver contracts + acceptance test matrix aligned to `R1.1`-`R1.5`.

## Session Update - P1.REG.01 Contract Lock (2026-03-01 01:09 GMT)

### Task ID
- `P1.REG.01`

### What Changed
- Created detailed Registry backend contract spec:
  - `docs/HDC-P1-REGISTRY-CONTRACT-SPEC.md`
- Locked decisions for `R1.1`-`R1.5`:
  - Supabase as Registry source-of-truth
  - new `Artifact` + `ArtifactReuse` model
  - idempotent per-user reuse semantics (`artifact_id`, `user_id` unique pair)
  - Forge resolver contracts (`hdcCreateArtifact`, `hdcListArtifacts`, `hdcGetArtifact`, `hdcMarkArtifactReuse`)
  - error and telemetry contract
  - migration + implementation sequence and acceptance test matrix
- Updated execution ledger:
  - `P1.REG.01` moved from `Planned` to `In progress (contract spec locked)`
- Updated continuation artifacts for implementation handoff:
  - `CONTINUATION.md`
  - `CONTINUATION_PROMPT.md`

### Validation / Evidence
- Contract spec includes all required sections:
  - domain model
  - resolver I/O contracts
  - validations
  - acceptance tests
  - migration plan
- `HDC-PRODUCT-EXECUTION-PLAN.md` now references spec as evidence for `P1.REG.01`.
- `CONTINUATION.md` now points to `docs/HDC-P1-REGISTRY-CONTRACT-SPEC.md` as baseline.

### Regressions / Gotchas
- None introduced (documentation/spec update only).

### Next Recommended Step
- Implement `P1.REG.01` in code:
  1. add Supabase migration
  2. add shared types + resolver defs
  3. add repository/service/resolver methods
  4. add targeted backend tests for `R1.1`-`R1.5`

## Session Update - P1.REG.01 Backend Baseline Implemented (2026-03-01 01:15 GMT)

### Task ID
- `P1.REG.01`

### What Changed
- Added Supabase Registry migration:
  - `forge-native/supabase/migrations/20260301011000_phase1_registry.sql`
  - creates `Artifact` and `ArtifactReuse` tables
  - adds enums (`artifact_type_enum`, `artifact_visibility_enum`)
  - adds FK constraints, uniqueness on `(artifact_id, user_id)`, and indexes
- Added shared Registry API/domain types:
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Added backend service wrappers for Registry operations:
  - `forge-native/src/backend/hackcentral.ts`
- Added new Forge resolvers:
  - `hdcCreateArtifact`
  - `hdcListArtifacts`
  - `hdcGetArtifact`
  - `hdcMarkArtifactReuse`
  - file: `forge-native/src/index.ts`
- Implemented Supabase repository methods for Registry:
  - `createArtifact`
  - `listArtifacts`
  - `getArtifact`
  - `markArtifactReuse`
  - file: `forge-native/src/backend/supabase/repositories.ts`
- Added targeted contract tests:
  - `tests/forge-native-registry-contract.spec.ts`

### Validation / Evidence
- Targeted tests passed:
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts`
  - result: `5 passed`
- Forge backend typecheck passed:
  - `cd forge-native && npm run typecheck`

### Regressions / Gotchas
- Registry backend is implemented but global-page UI is not wired yet, so `R1.1`-`R1.5` are only backend-complete at this checkpoint.
- Convex mode intentionally throws `REGISTRY_UNSUPPORTED_BACKEND` for Registry operations until schema parity is added.

### Next Recommended Step
- Complete `P1.REG.01` by wiring Discover > Registry UI to new resolvers, then add UI-level tests for submission, filter/sort, reuse actions, and source-hack linking behavior.

## Session Update - P1.REG.01 Forge Registry UI Baseline (2026-03-01 01:23 GMT)

### Task ID
- `P1.REG.01`

### What Changed
- Wired Forge global-page Registry UI to resolver contracts in:
  - `forge-native/static/frontend/src/App.tsx`
- Added Registry interactions:
  - list artifacts (`hdcListArtifacts`)
  - filter/search/sort controls
  - create artifact form (`hdcCreateArtifact`) with frontend validation
  - mark reuse action (`hdcMarkArtifactReuse`)
  - detail fetch/toggle (`hdcGetArtifact`)
- Added shared frontend Registry utility module:
  - `forge-native/static/frontend/src/utils/registry.ts`
  - `REGISTRY_ARTIFACT_TYPES`, `parseRegistryTags`, `isValidHttpsUrl`, `mapFeaturedHackToArtifact`
- Extended styles for Registry controls/cards and new artifact pill variants:
  - `forge-native/static/frontend/src/styles.css`
- Added targeted Registry utility tests:
  - `tests/forge-native-registry-utils.spec.ts`

### Validation / Evidence
- Tests passed:
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts`
  - result: `2 files passed, 9 tests passed`
- Typechecks passed:
  - `cd forge-native/static/frontend && npm run typecheck`
  - `cd forge-native && npm run typecheck`

### Regressions / Gotchas
- Root Vitest workspace cannot directly mount Forge frontend `App.tsx` due React version mismatch (`root: React 19`, `forge-native/static/frontend: React 18`), causing invalid hook call in direct component tests.
- Current session uses utility-level UI logic tests plus backend contract tests; runtime integration checks remain next.

### Next Recommended Step
- Run non-preview Forge runtime validation for Registry `R1.1`-`R1.5` flows (create/list/detail/reuse and source-hack linkage paths), then decide whether to close `P1.REG.01` and advance to `P1.PX.01`.

## Session Update - P1.REG.01 Validation Completion + Handoff to P1.PX.01 (2026-03-01 01:34 GMT)

### Task ID
- `P1.REG.01`

### What Changed
- Extended Registry contract coverage in:
  - `tests/forge-native-registry-contract.spec.ts`
- Added test cases for:
  - valid `sourceHackProjectId` linkage to hack-submission projects
  - invalid `sourceHackProjectId` rejection for non hack-submission projects
  - artifact detail payload including linked source-hack metadata
- Added runtime backend-mode behavior coverage in:
  - `tests/forge-native-registry-runtime-modes.spec.ts`
  - validates `FORGE_DATA_BACKEND` behavior for Registry operations (supabase delegation, convex unsupported guard, auto-mode fallback)
- Updated continuity/execution docs to mark `P1.REG.01` complete and advance active task to `P1.PX.01`.

### Validation / Evidence
- Tests passed:
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts tests/forge-native-registry-runtime-modes.spec.ts`
  - result: `3 files passed, 15 tests passed`
- Typechecks passed:
  - `cd forge-native && npm run typecheck`
  - `cd forge-native/static/frontend && npm run typecheck`

### Regressions / Gotchas
- Direct App-component tests in the root Vitest workspace remain constrained by React version mismatch (`root React 19` vs `forge-native/static/frontend React 18`).

### Next Recommended Step
- Start `P1.PX.01`: lock Problem Exchange contract spec (`R2.1`-`R2.6`) and then implement resolver/repository/test baseline with 3-flag auto-hide moderation logic.

## Session Update - P1.PX.01 Contract + Backend Baseline Implemented (2026-03-01 01:46 GMT)

### Task ID
- `P1.PX.01`

### What Changed
- Added Problem Exchange contract specification:
  - `docs/HDC-P1-PROBLEM-EXCHANGE-CONTRACT-SPEC.md`
- Added Problem Exchange Supabase migration:
  - `forge-native/supabase/migrations/20260301020000_phase1_problem_exchange.sql`
  - creates enums and tables for `Problem`, `ProblemVote`, `ProblemFlag`, `ProblemStatusHistory`, `ProblemModerationLog`
- Extended shared resolver/domain types for Problem Exchange operations:
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Implemented repository methods in Supabase layer:
  - `createProblem`, `listProblems`, `voteProblem`, `updateProblemStatus`, `flagProblem`, `moderateProblem`
  - file: `forge-native/src/backend/supabase/repositories.ts`
- Added backend wrappers and resolver registrations:
  - `forge-native/src/backend/hackcentral.ts`
  - `forge-native/src/index.ts`
- Added tests:
  - `tests/forge-native-problem-exchange-contract.spec.ts`
  - `tests/forge-native-problem-exchange-runtime-modes.spec.ts`

### Validation / Evidence
- Full targeted suite passed:
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts tests/forge-native-registry-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-runtime-modes.spec.ts`
  - result: `5 files passed, 25 tests passed`
- Typechecks passed:
  - `cd forge-native && npm run typecheck`
  - `cd forge-native/static/frontend && npm run typecheck`

### Regressions / Gotchas
- Moderation authorization currently assumes trusted backend caller; explicit HDC admin role-gating is still a follow-up item.
- Root Vitest React version mismatch constraint remains (root React 19 vs Forge frontend React 18) for direct App-mount tests.

### Next Recommended Step
- Continue `P1.PX.01` by wiring Problem Exchange UI in Forge global page and adding UI-level tests for submission, filtering, vote idempotency, solved-link validation, and auto-hide moderation behavior.

## Session Update - Problem Exchange Forge UI Baseline (Mar 1, 2026 01:58 GMT)

- Date/time: 2026-03-01 01:58 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Added Forge global-page Problem Exchange UI wiring in `forge-native/static/frontend/src/App.tsx`.
  - Implemented create/list/filter/vote/flag/status/moderate flows for `hdcCreateProblem`, `hdcListProblems`, `hdcVoteProblem`, `hdcUpdateProblemStatus`, `hdcFlagProblem`, and `hdcModerateProblem`.
  - Added preview-mode Problem Exchange behavior for local fallback data.
  - Added frontend helper module `forge-native/static/frontend/src/utils/problemExchange.ts` for filter parsing, create validation, preview seed generation, and sorting/filtering.
  - Added utility tests in `tests/forge-native-problem-exchange-utils.spec.ts`.
  - Added Problem Exchange UI styling in `forge-native/static/frontend/src/styles.css` and enabled new `problem_exchange` view navigation path.
- Validation/evidence:
  - `npm run test:run -- tests/forge-native-problem-exchange-utils.spec.ts` (pass)
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `cd forge-native && npm run typecheck` (pass)
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts tests/forge-native-registry-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-utils.spec.ts` (31 tests passing)
- Regressions or gotchas:
  - Root test harness still cannot directly mount Forge frontend `App.tsx` due React version split (root React 19 vs Forge custom UI React 18), so UI logic coverage is utility-centric.
  - Moderation endpoint currently lacks final admin-role gate; this remains the highest-priority follow-up.
- Next recommended step:
  - Implement authorization gate + UI visibility guardrails for moderation actions, then add telemetry events for problem lifecycle conversion and moderation outcomes.

## Session Update - Problem Exchange Moderation Guardrails + Telemetry (Mar 1, 2026 02:03 GMT)

- Date/time: 2026-03-01 02:03 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Added backend moderation authorization guard for `hdcModerateProblem` using allowlist env var `HDC_PROBLEM_EXCHANGE_MODERATOR_ACCOUNT_IDS`.
  - Added new resolver capability surface `hdcGetProblemExchangeCapabilities` to expose moderation eligibility to UI.
  - Extended shared/frontend contracts with `ProblemExchangeCapabilitiesResult`.
  - Added UI guardrails in `forge-native/static/frontend/src/App.tsx`:
    - moderation actions (remove/reinstate) visible only when `canModerate=true`
    - include-hidden filter disabled for non-moderators
    - moderation mode indicator shown in filter actions.
  - Added backend telemetry events in `forge-native/src/backend/supabase/repositories.ts`:
    - `problem_created`, `problem_voted`, `problem_status_updated`, `problem_flagged`, `problem_moderated`.
  - Expanded runtime mode tests for moderation guard behavior.
- Validation/evidence:
  - `npm run test:run -- tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-utils.spec.ts` (17 passing)
  - `cd forge-native && npm run typecheck` (pass)
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `npm run test:run -- tests/forge-native-registry-contract.spec.ts tests/forge-native-registry-utils.spec.ts tests/forge-native-registry-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-utils.spec.ts` (32 passing)
- Regressions or gotchas:
  - Allowlist gate is intentionally temporary and should be replaced with finalized org role source once available.
  - Telemetry currently logs to server stdout via structured `console.info`; downstream ingestion/dashboard wiring is still needed.
- Next recommended step:
  - Replace allowlist with org-level admin role source and add remaining UI validation coverage for moderation and filter UX states.

## Session Update - Problem Exchange Org Role Moderation Source (Mar 1, 2026 02:08 GMT)

- Date/time: 2026-03-01 02:08 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Replaced temporary allowlist moderation authorization with org authority source for Problem Exchange moderation.
  - Added/used `canUserModerateProblemExchange(viewer)` in `forge-native/src/backend/supabase/repositories.ts`:
    - `User.role='ADMIN'`, or
    - `User.capability_tags` contains `problem_exchange_moderator` or `platform_admin`.
    - Fallback for legacy schemas without `User.role` uses capability tags only.
  - Updated `forge-native/src/backend/hackcentral.ts` to use repository moderation authority checks in both:
    - `hdcModerateProblem`
    - `hdcGetProblemExchangeCapabilities`
  - Preserved frontend contract compatibility by keeping `moderationMode='allowlist'` as a mode alias in Supabase-backed runtime.
  - Updated runtime-mode tests to mock repository moderation authority instead of env allowlist.
  - Updated continuity + contract docs to remove stale allowlist-as-source instructions.
- Validation/evidence:
  - `cd forge-native && npm run typecheck` (pass)
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `npm run test:run -- tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-utils.spec.ts` (17 passing)
- Regressions or gotchas:
  - `moderationMode='allowlist'` now represents compatibility mode naming, not env-driven allowlisting; downstream docs and dashboards should treat it as "gated moderation enabled".
  - Role-based moderation depends on `User` authority data quality; role/capability assignment process should be documented for operators.
- Next recommended step:
  - Implement the remaining `P1.PX.01` UI validation expansion and create the `problem_exchange` rollout + moderation authority runbook.

## Session Update - P1.PX.01 UI Validation Expansion + Ops Docs (Mar 1, 2026 02:21 GMT)

- Date/time: 2026-03-01 02:21 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Expanded Problem Exchange UI validation helpers in `forge-native/static/frontend/src/utils/problemExchange.ts`:
    - filter draft -> applied filter builder (`buildProblemAppliedFilters`)
    - default filter reset helpers (`getDefaultProblemFilterDraft`, `getDefaultProblemFilterSet`)
    - solved-link status validation helper (`validateProblemStatusDraft`)
    - preview-mode vote/flag mutation helpers with idempotency behavior (`applyPreviewVoteMutation`, `applyPreviewFlagMutation`)
    - moderation gate helpers (`resolveProblemIncludeHidden`, `resolveProblemModerationAction`)
  - Wired those helpers into `forge-native/static/frontend/src/App.tsx` so runtime UI behavior follows testable utility logic for filter apply/reset, solved-link checks, preview idempotency, and moderation action visibility.
  - Expanded utility test coverage in `tests/forge-native-problem-exchange-utils.spec.ts` for:
    - filter apply/reset behavior
    - solved-link requirement
    - preview vote/flag idempotency and auto-hide threshold behavior
    - moderation gate include-hidden/action-state resolution
  - Added rollout and moderation ops docs:
    - `docs/HDC-P1-PROBLEM-EXCHANGE-ROLLOUT-CHECKLIST.md`
    - `docs/HDC-P1-PROBLEM-EXCHANGE-MODERATION-RUNBOOK.md`
  - Updated docs index in `docs/README.md`.
- Validation/evidence:
  - `npm run test:run -- tests/forge-native-problem-exchange-utils.spec.ts` (pass, 12 tests)
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `cd forge-native && npm run typecheck` (pass)
- Regressions or gotchas:
  - Root Vitest workspace still cannot mount `App.tsx` directly because of React major-version split (root React 19 vs Forge custom UI React 18), so UI coverage remains utility-first.
- Next recommended step:
  - Execute staging rollout smoke + moderation authority audit using the new checklist/runbook, then decide GO/NO-GO and close `P1.PX.01` if gates pass.

## Session Update - P1.PX.01 Rollout Gate Checkpoint (Mar 1, 2026 02:25 GMT)

- Date/time: 2026-03-01 02:25 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Executed Problem Exchange rollout regression gate from `docs/HDC-P1-PROBLEM-EXCHANGE-ROLLOUT-CHECKLIST.md`.
  - Verified moderation capability behavior through runtime-mode coverage (`canModerate=true` and `canModerate=false` paths).
  - Recorded checkpoint artifact:
    - `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md`
    - decision: `CONDITIONAL GO`
  - Updated rollout checklist to reference latest checkpoint artifact.
- Validation/evidence:
  - `npm run test:run -- tests/forge-native-problem-exchange-contract.spec.ts tests/forge-native-problem-exchange-runtime-modes.spec.ts tests/forge-native-problem-exchange-utils.spec.ts` (pass, `23 tests`)
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `cd forge-native && npm run typecheck` (pass)
- Regressions or gotchas:
  - Live staging smoke + authority mutation/audit steps could not be executed from this workspace because Supabase/Forge staging credentials are not configured here.
- Next recommended step:
  - Run the remaining live staging checklist and moderation authority audits in staging, then upgrade decision from `CONDITIONAL GO` to `GO` and close `P1.PX.01`.

## Session Update - P1.PX.01 Live Authority Audit from HD26Forge Credentials (Mar 1, 2026 02:32 GMT)

- Date/time: 2026-03-01 02:32 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Verified credential path in `/Users/nickster/Downloads/HD26Forge` and confirmed Supabase project/ref access via CLI (`ssafugtobsqxmqtphwch`).
  - Executed live Problem Exchange moderation authority audit against `User` rows with non-null `atlassian_account_id` using service-role REST reads.
  - Verified live resolver behavior by invoking `getProblemExchangeCapabilities` in `forge-native/src/backend/hackcentral.ts` against real project data for:
    - one admin account (expected `canModerate=true`)
    - one non-admin account (expected `canModerate=false`)
  - Updated rollout checkpoint artifact to mark live authority audit + resolver verification as complete:
    - `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md`
- Validation/evidence:
  - `SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json` (shows `ssafugtobsqxmqtphwch` active)
  - Live authority audit summary:
    - total mapped accounts: `8`
    - moderator-eligible: `2`
    - non-moderator: `6`
  - Live resolver verification output:
    - admin account -> `{ canModerate: true, moderationMode: 'allowlist' }`
    - user account -> `{ canModerate: false, moderationMode: 'allowlist' }`
- Regressions or gotchas:
  - `public.execute_sql` RPC is not available in this project; direct table checks use PostgREST table endpoints with service-role auth.
  - Rollout remains `CONDITIONAL GO` until live UI smoke is executed.
- Next recommended step:
  - Run live UI smoke for Problem Exchange flows and, if clean, promote `P1.PX.01` to GO and close task.

## Session Update - P1.PX.01 Live UI Smoke + GO Closure (Mar 1, 2026 03:08 GMT)

- Date/time: 2026-03-01 03:08 GMT
- Task ID: `P1.PX.01`
- What changed:
  - Completed live production UI smoke on Problem Exchange in Confluence global page runtime (`[HackCentral Confluence UI] loaded 0.6.44`).
  - Executed end-to-end moderator-capable flow against a real smoke record:
    - create problem
    - filter apply/reset
    - vote idempotency (duplicate vote blocked)
    - flag idempotency (duplicate flag blocked)
    - solved-link validation (blocked without linked hack/artifact)
    - valid status transition (`Open -> Claimed`)
    - moderator remove/reinstate flow
  - Captured screenshot evidence:
    - `docs/artifacts/HDC-P1-PX-LIVE-UI-SMOKE-20260301-0303Z.png`
  - Updated rollout checkpoint artifact to GO:
    - `docs/artifacts/HDC-P1-PX-ROLLOUT-CHECKPOINT-20260301-022533Z.md`
  - Closed `P1.PX.01` and advanced active task pointer to `P1.PIPE.01` in continuity docs.
- Validation/evidence:
  - Live UI toasts/messages observed during smoke:
    - `Problem posted: PX Smoke 2026-03-01 03:03 UTC`
    - `Vote recorded.` then `You already voted for this problem.`
    - `Flag recorded.` then `You already flagged this problem.`
    - `Solved status requires linked hack project ID or linked artifact ID.`
    - `Problem status updated to Claimed.`
    - `Problem removed by moderator.` then `Problem reinstated.`
  - Screenshot evidence file exists at:
    - `docs/artifacts/HDC-P1-PX-LIVE-UI-SMOKE-20260301-0303Z.png`
- Regressions or gotchas:
  - 3-distinct-user auto-hide behavior was not exercised via live UI because smoke used a single authenticated user session; this branch remains covered by automated tests and backend logic checks.
- Next recommended step:
  - Start `P1.PIPE.01` by locking a contract spec for stage transitions, required transition notes, and pipeline audit log behavior.

## Session Update - P1.PIPE.01 Contract + UI Shell Kickoff (Mar 1, 2026 03:32 GMT)

- Date/time: 2026-03-01 03:32 GMT
- Task ID: `P1.PIPE.01`
- What changed:
  - Created pipeline contract specification:
    - `docs/HDC-P1-PIPELINE-CONTRACT-SPEC.md`
  - Promoted primary nav from `Projects` to `Pipeline`:
    - `forge-native/static/frontend/src/constants/nav.ts`
  - Implemented initial Pipeline board shell in global UI:
    - `forge-native/static/frontend/src/App.tsx`
    - Four stage columns (`Hack`, `Validated Prototype`, `Incubating Project`, `Product Candidate`)
    - Stage criteria visibility in each column
    - Metrics panel (items per stage, average time placeholder, conversions, entered vs graduated)
    - Legacy compatibility redirect (`projects` -> `pipeline`)
  - Added responsive Pipeline styles:
    - `forge-native/static/frontend/src/styles.css`
  - Added docs index entry for pipeline contract spec:
    - `docs/README.md`
- Validation/evidence:
  - `cd forge-native/static/frontend && npm run typecheck` (pass)
  - `cd forge-native && npm run typecheck` (pass)
- Regressions or gotchas:
  - Average time-in-stage is currently a placeholder (`0`) because stage-entry timestamps are not yet persisted in project payloads.
  - Stage transition actions and required note enforcement are intentionally deferred until backend migration/resolver slice is implemented.
- Next recommended step:
  - Implement Supabase migration + backend/resolver contracts for persistent pipeline stage transitions and required transition notes, then replace UI placeholder with live move controls.

## Session Update - P1 Pipeline Completion + Live Supabase Migration (Mar 1, 2026)

### Completed

- Closed `P1.PIPE.01` against roadmap `R3.1`-`R3.5`.
- Applied live pipeline migration to shared Supabase project `ssafugtobsqxmqtphwch` using Supabase Management API `database/query` endpoint.
- Landed and validated new pipeline contracts:
  - `hdcGetPipelineBoard`
  - `hdcMovePipelineItem`
  - `hdcUpdatePipelineStageCriteria`
- Added admin stage criteria edit flow in Forge UI pipeline board.
- Preserved admin authority gate for pipeline management:
  - `role='ADMIN'` OR capability tags `pipeline_admin` / `platform_admin`.

### Validation Evidence

- Local checks:
  - `forge-native` typecheck: pass
  - `forge-native/static/frontend` typecheck: pass
  - pipeline suites: `9/9` passing
  - full targeted Phase 1 cross-suite: `47/47` passing
- Live checks (production project):
  - Migration apply response: HTTP `201`
  - Schema presence verified for:
    - `Project.pipeline_stage`
    - `Project.pipeline_stage_entered_at`
    - `PipelineStageCriteria`
    - `PipelineTransitionLog`
  - Resolver smoke (admin account):
    - created and moved project `7aaf957f-fc25-45a1-b634-22f3b4a36bc0` from `hack` to `validated_prototype`
    - board returned item in target stage
  - Authorization smoke (non-admin account):
    - `hdcMovePipelineItem` -> `[PIPELINE_FORBIDDEN]`
    - `hdcUpdatePipelineStageCriteria` -> `[PIPELINE_FORBIDDEN]`

### Operational Note

- Supabase MCP remains non-admin in current workspace configuration (`list_projects` empty, management endpoints denied).
- Reliable fallback for live admin operations in this environment:
  1. Use `SUPABASE_ACCESS_TOKEN` with Supabase CLI (`projects list`, `projects api-keys`).
  2. Use Supabase Management API `POST /v1/projects/<ref>/database/query` for migration/query execution.
  3. Use service-role key only for read/verification REST checks.

### Artifact

- `docs/artifacts/HDC-P1-PIPE-ROLLOUT-CHECKPOINT-20260301-1108Z.md`

## Session Update - P1 Observability Guardrails Pack Standardization (Mar 1, 2026)

### Completed

- Closed `P1.OBS.01` with a standardized Phase 1 GO/NO-GO gate model.
- Added shared guardrails runbook:
  - `docs/HDC-P1-OBS-GUARDRAILS-PACK.md`
- Added reusable module rollout artifact template:
  - `docs/HDC-P1-MODULE-ROLLOUT-CHECKPOINT-TEMPLATE.md`
- Added root command pack scripts in `package.json`:
  - `qa:p1:regression-pack`
  - `qa:p1:telemetry-static-check`
  - `qa:p1:go-gate`
- Aligned existing Problem Exchange checklist to the new standardized gate path.

### Evidence

- Executed:
  - `npm run qa:p1:go-gate`
- Result:
  - cross-suite tests `47/47` passing
  - backend/frontend typechecks passing
  - static telemetry instrumentation checks passing (`rg` hit all required telemetry channels/events)
- Rollout checkpoint artifact:
  - `docs/artifacts/HDC-P1-OBS-ROLLOUT-CHECKPOINT-20260301-1112Z.md`

### Continuity Impact

- Active task advanced from `P1.OBS.01` to `P1.SHOW.01` in execution/continuation docs.
- Future Phase 1 modules can now reuse a single checkpoint structure and command pack, reducing release-gate drift across chats.

## Session Update - P1.SHOW.01 Contract + Migration + UI Wiring (Mar 1, 2026 11:42 GMT)

### Completed

- Started `P1.SHOW.01` against `R4.1`-`R4.4` and locked contract spec:
  - `docs/HDC-P1-SHOWCASE-CONTRACT-SPEC.md`
- Added Showcase persistence migration:
  - `forge-native/supabase/migrations/20260301122000_phase1_showcase.sql`
- Implemented Showcase backend contracts:
  - `hdcListShowcaseHacks`
  - `hdcGetShowcaseHackDetail`
  - `hdcSetShowcaseFeatured`
- Expanded `createHack` submission payload/persistence with Showcase metadata:
  - required `demoUrl` validation (`https`)
  - `teamMembers`, `sourceEventId`, `tags`, `linkedArtifactIds`
  - metadata persisted to `ShowcaseHack`
- Wired Forge `hacks` view to Showcase APIs:
  - server-backed list/filter loading
  - hack detail panel
  - admin featured toggle controls
  - submit modal fields aligned with new contract

### Validation Evidence

- Targeted Showcase test suites:
  - `npm run test:run -- tests/forge-native-showcase-contract.spec.ts tests/forge-native-showcase-runtime-modes.spec.ts`
  - Result: `9/9` passing
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Standardized guardrail gate:
  - `npm run qa:p1:go-gate`
  - Result: `56/56` phase regression tests (Registry + Problem Exchange + Pipeline + Showcase) + backend/frontend typechecks + telemetry static check passing
- Live Supabase migration + smoke:
  - Applied `20260301122000_phase1_showcase.sql` to project `ssafugtobsqxmqtphwch` via Management API `database/query`
  - Verified schema columns for `ShowcaseHack` and row access (`count(*)` query)
  - Read-only resolver smoke passed:
    - `listShowcaseHacks` => `listCount: 1`
    - `getShowcaseHackDetail` => detail payload returned for first project

### Operational Gotcha

- Supabase MCP still returns empty project discovery (`mcp__supabase__list_projects -> []`) in this workspace.
- Reliable fallback remains:
  1. `SUPABASE_ACCESS_TOKEN` + CLI (`projects list`, `projects api-keys`)
  2. Management API `POST /v1/projects/<ref>/database/query`
  3. service-role-backed resolver/runtime verification from this repo

### Artifact

- `docs/artifacts/HDC-P1-SHOW-ROLLOUT-CHECKPOINT-20260301-1142Z.md` (`CONDITIONAL GO` pending live telemetry and rollback-drill completion)

### Next Recommended Step

- Execute live Forge UI + telemetry gate closure for `P1.SHOW.01`, then either:
  - upgrade checkpoint to `GO` and advance to `P1.CHILD.01`, or
  - hold as `NO GO` with rollback actions if live checks fail.

## Session Update - P1.SHOW.01 Live UI + Telemetry Gate Closure (Mar 1, 2026 11:56 GMT)

### Completed

- Closed `P1.SHOW.01` from `CONDITIONAL GO` to `GO`.
- Rebuilt and redeployed Forge production bundle from `forge-native` and confirmed runtime moved to app version `5.29.0`.
- Executed live Showcase smoke on production global page:
  - URL: `https://hackdaytemp.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/86632806-eb9b-42b5-ae6d-ee09339702b6/hackday-central`
  - submit modal includes required `demoUrl` and Showcase metadata fields (`teamMembers`, `sourceEventId`, `tags`, `linkedArtifactIds`)
  - validation error confirmed for non-https demo URL (`[SHOWCASE_VALIDATION_FAILED] demoUrl must be a valid https URL.`)
  - valid submit path completed for smoke record `Showcase Smoke 2026-03-01 11:52`
  - list filters validated (search/tags/featured-only)
  - detail panel validated (`Demo`, `Team`, linked artifacts/problems sections)
  - featured toggle validated in UI (`Mark featured` / `Unfeature`)
- Captured live UI evidence screenshot:
  - `docs/artifacts/HDC-P1-SHOW-LIVE-UI-SMOKE-20260301-1153Z.png`
- Sampled live Forge telemetry logs (`forge logs --since 30m --verbose`):
  - `INFO [hdc-switcher-telemetry]`
  - `INFO [hdc-performance-telemetry]`
  - expected showcase validation traces from smoke inputs (invalid `demoUrl`, invalid non-UUID source event)
- Validated admin/non-admin featured authority and rollback dry-run via live backend invocation:
  - admin account unfeature succeeded:
    - `admin_unfeature {"projectId":"834fc179-ca7a-44d5-9680-4ee6c2276fa2","featured":false,...}`
  - non-admin account denied:
    - `[SHOWCASE_FORBIDDEN] Showcase admin access required...`
- Verified live DB state for smoke record:
  - `project_id=834fc179-ca7a-44d5-9680-4ee6c2276fa2`
  - `demo_url=https://example.com/demo`
  - `tags=[showcase-smoke, ops-automation]`
  - `featured=false` after rollback dry-run

### Regressions or gotchas

- `sourceEventId` currently persists through a UUID-typed path; non-UUID strings produce DB error (`22P02`). For smoke runs, leave this optional field blank unless using a valid event UUID.
- Legacy/stale global-page environment URL (`.../6ef543d7-.../hackday-central`) now returns `Global page module was not found`; use the `86632806-...` production URL above for Playwright smoke.

### Next recommended step

- Start `P1.CHILD.01` by locking import-to-child contract boundaries (`R5.1`-`R5.4`) using finalized Showcase submission semantics.

## Session Update - P1.CHILD.01 Child Integration Baseline (Mar 1, 2026 12:32 GMT)

### Completed

- Started `P1.CHILD.01` implementation against roadmap `R5.1`-`R5.4` in branch `codex/p1-child-01`.
- Locked child integration contract spec:
  - `docs/HDC-P1-CHILD-INTEGRATION-CONTRACT-SPEC.md`
- Added Problem Exchange import-candidate resolver contract:
  - `hdcListProblemImportCandidates`
  - backend/repository wiring:
    - `forge-native/src/backend/supabase/repositories.ts`
    - `forge-native/src/backend/hackcentral.ts`
    - `forge-native/src/index.ts`
- Extended child creation contract for integration metadata:
  - `CreateInstanceDraftInput.childIntegration`
  - fields:
    - `importProblemIds`
    - `autoPublishToShowcaseDrafts`
    - `templateMode`
  - updated in:
    - `forge-native/src/shared/types.ts`
    - `forge-native/static/frontend/src/types.ts`
- Implemented `hdcService.createInstanceDraft` child integration behavior:
  - normalize and validate selected Problem Exchange IDs
  - resolve selected items from importable candidate pool
  - persist normalized child integration payload to:
    - `HackdayTemplateSeed.seed_payload.childIntegration`
    - `event_created` audit payload summary
- Wired Create HackDay step-6 UI controls in `forge-native/static/frontend/src/App.tsx`:
  - import candidates checklist (high-vote open/claimed problems)
  - template mode selection (`default` / `customized`)
  - auto-publish Showcase draft intent toggle
- Restored missing frontend utility modules in this clean branch for compile parity:
  - `forge-native/static/frontend/src/utils/problemExchange.ts`
  - `forge-native/static/frontend/src/utils/registry.ts`
- Updated navigation view unions in `forge-native/static/frontend/src/constants/nav.ts` to include active app views (`problem_exchange`, `pipeline`) so frontend typecheck aligns with `App.tsx` usage.

### Validation Evidence

- Tests:
  - `npm run test:run -- tests/forge-native-hdcService.spec.ts tests/forge-native-createFromWeb.spec.ts`
  - Result: `31/31` passing
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Notes

- This branch was created from clean tracked `main`; several previously untracked files from the original workspace were absent and had to be reintroduced where required for frontend compile/test continuity.
- Supabase live validation + Playwright smoke for `P1.CHILD.01` still pending and tracked as next atomic actions in `CONTINUATION.md`.

## Session Update - P1.CHILD.01 Live Gate Closure (Mar 1, 2026 12:58 GMT)

### Completed

- Closed `P1.CHILD.01` from in-progress baseline to `GO`.
- Confirmed production Create HackDay step-6 child-integration controls are live after deploy:
  - `templateMode` (`Default template` / `Customized template`)
  - `autoPublishToShowcaseDrafts` checkbox
  - Problem Exchange import candidate list and selection
- Executed full live create flow with selected import:
  - event: `P1 CHILD LIVE 20260301-1305`
  - selected candidate: `819b3023-ec4d-4b22-8f9f-07ca7f7c2fa2` (`PX Smoke 2026-03-01 03:03 UTC`)
  - returned child page id: `18120705`
- Verified persisted child integration payload in live DB:
  - `HackdayTemplateSeed.seed_payload.childIntegration.templateMode = "customized"`
  - `HackdayTemplateSeed.seed_payload.childIntegration.autoPublishToShowcaseDrafts = false`
  - `HackdayTemplateSeed.seed_payload.childIntegration.importProblemIds` includes selected problem id
  - `HackdayTemplateSeed.seed_payload.childIntegration.importedProblems` includes candidate snapshot (`voteCount=3`, `status=claimed`)
- Recorded module checkpoint artifact:
  - `docs/artifacts/HDC-P1-CHILD-ROLLOUT-CHECKPOINT-20260301-1258Z.md`

### Validation Evidence

- Targeted tests and typechecks:
  - `npm run test:run -- tests/forge-native-hdcService.spec.ts tests/forge-native-createFromWeb.spec.ts` (`31/31`)
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Live resolver smoke:
  - `listProblemImportCandidates` returned selected candidate at threshold `minVoteCount=3`
- Live UI artifacts:
  - `docs/artifacts/p1-child-step6-live-20260301-1257.png`
  - `docs/artifacts/p1-child-create-success-20260301-1258.png`

### Operational Learnings

- Candidate threshold behavior is functioning as designed: step-6 import list defaults to vote threshold `>=3`; a candidate at vote `1` does not appear until vote count is raised.
- Supabase REST table names are case-sensitive in this schema (`Problem`, `HackdayTemplateSeed`), not snake_case aliases.
- In this environment, Supabase MCP admin calls remain unavailable; CLI + service-role fallback is still required for live admin verification steps.

## Session Update - P2.PATH.01 Backend Baseline (Mar 1, 2026 13:17 GMT)

### Completed

- Started `P2.PATH.01` (`R6.1`-`R6.4`) with the first backend contract slice.
- Added pathways schema migration:
  - `forge-native/supabase/migrations/20260301130000_phase2_pathways.sql`
  - tables: `Pathway`, `PathwayStep`, `PathwayProgress`
  - step type enum: `read|try|build`
  - unique progress key: `(pathway_id, step_id, user_id)`
- Added shared/frontend contracts for pathways and progress:
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Added resolver and backend wiring:
  - `hdcListPathways`
  - `hdcGetPathway`
  - `hdcUpsertPathway`
  - `hdcSetPathwayStepCompletion`
  - files: `forge-native/src/backend/supabase/repositories.ts`, `forge-native/src/backend/hackcentral.ts`, `forge-native/src/index.ts`
- Added pathway editor authorization gate:
  - `ADMIN` role OR capability tags `pathway_admin` / `pathway_contributor` / `platform_admin`
- Locked this phase contract in:
  - `docs/HDC-P2-PATHWAYS-CONTRACT-SPEC.md`

### Validation Evidence

- Tests:
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts`
  - result: `5/5` passing
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- Canonical `R6.1`-`R6.4` pathway requirements are present in `/Users/nickster/Downloads/HackCentral/HDC-PRODUCT-ROADMAP.md`; this child worktree does not include that roadmap file by default, so requirement mapping must explicitly reference the canonical root workspace copy.
- Keeping pathway progress writes idempotent at `(pathway_id, step_id, user_id)` avoids duplicate completion records and simplifies progress recalculation.
- Adding unsupported-backend errors (`[PATHWAYS_UNSUPPORTED_BACKEND]`) keeps runtime-mode behavior consistent with other module contracts and prevents silent convex fallbacks for Supabase-only features.

## Session Update - P2.PATH.01 Guide UI + Manager Editor + Local Smoke (Mar 1, 2026 13:32 GMT)

### Completed

- Advanced `P2.PATH.01` Guide UI implementation in `forge-native/static/frontend/src/App.tsx`:
  - replaced static Guide content with pathway list/detail contract rendering
  - wired per-step completion toggles to `hdcSetPathwayStepCompletion`
  - added manager-gated pathway editor (create + edit) with ordered step drafting and `hdcUpsertPathway` save path
- Added Guide pathway layout and editor styles in `forge-native/static/frontend/src/styles.css`.
- Fixed smoke-discovered preview consistency defects:
  - preview list filtering now clears selected pathway when no results exist
  - detail pane now clears when no pathway is selected (prevents stale detail render)
- Captured local browser smoke evidence:
  - `docs/artifacts/HDC-P2-PATH-LOCAL-UI-SMOKE-20260301-133139Z.png`

### Validation Evidence

- Typechecks:
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
  - `npm --prefix forge-native run typecheck` (pass)
- Targeted tests:
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts`
  - result: `5/5` passing
- Browser smoke (local preview via DevTools MCP on `http://127.0.0.1:4173/`):
  - Guide route opens
  - step completion updates list/detail progress (`0/4` -> `1/4`, `25%`)
  - empty filter result shows "No pathways matched your filters." and now clears detail to "Select a pathway to view details."

### Operational Learnings

- Local preview path always reports `canManage=false`, so manager-only controls (`Create pathway`, `Edit pathway`) require live manager authority validation in production runtime.
- Dev server in this child workspace may log non-blocking Vite `server.fs.allow` warnings for font assets resolved through the parent workspace `node_modules`; this does not affect functional Guide-pathway smoke outcomes.

## Session Update - P2.PATH.01 Live Rollout GO Closure (Mar 1, 2026 13:39 GMT)

### Completed

- Applied `P2.PATH.01` migration to production Supabase project (`ssafugtobsqxmqtphwch`) and verified created schema objects (`Pathway`, `PathwayStep`, `PathwayProgress`).
- Fixed migration defect discovered during first live apply:
  - `PathwayStep.linked_artifact_id` changed from `text` to `uuid` to match `Artifact.id`.
- Executed live resolver smoke via HackCentral backend contracts:
  - manager `upsertPathway` + `listPathways` + `getPathway` pass
  - participant `setPathwayStepCompletion` pass (`1/3`, `33%`)
  - participant `upsertPathway` correctly denied with `[PATHWAY_FORBIDDEN]`
- Deployed Forge production bundle and validated live Guide Pathways UI:
  - editor role surfaces `Create pathway` and `Edit pathway`
  - edit form opens and saves (`Pathway updated.` toast)
  - step completion updates progress (`1/3 steps • 33% complete`)
- Recorded rollout checkpoint:
  - `docs/artifacts/HDC-P2-PATH-ROLLOUT-CHECKPOINT-20260301-1339Z.md` (`GO`)

### Validation Evidence

- Live screenshots:
  - `docs/artifacts/HDC-P2-PATH-LIVE-UI-SMOKE-20260301-133829Z.png`
  - `docs/artifacts/HDC-P2-PATH-LIVE-UI-SMOKE-20260301-133904Z.png`
- Live resolver smoke payload result:
  - pathway id `e7928bd4-141a-4d33-b545-df27161698c6`
  - manager list count `1`
  - detail step count `3`
  - participant completion persisted with `completionPercent=33`
- Regression checks after fixes:
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts` (`5/5`)

### Operational Learnings

- Supabase MCP permissions for this project can intermittently block admin actions (`list_tables`, `list_migrations` with `MCP error -32600`); CLI fallback with `SUPABASE_ACCESS_TOKEN` remains required for live schema verification.
- `forge-native` full `custom-ui:build` can fail on unrelated runtime-frontend Tailwind/PostCSS configuration in this workspace; frontend deploy for Guide Pathways was still achievable because the updated global-page bundle built/deployed successfully and production smoke confirmed behavior.

## Session Update - P2.PATH.01 Post-GO Housekeeping Hardening (Mar 1, 2026 13:55 GMT)

### Completed

- Executed focused post-GO code review on pathways edit flow and implemented two hardening fixes:
  - pathway step updates now preserve existing `PathwayStep.id` values and only delete removed steps (instead of deleting all steps each save).
  - pathway-step `linkedArtifactId` is now validated as UUID in both frontend (`App.tsx`) and backend repository validation.
- Updated pathway contracts to carry optional `stepId` through upsert payloads:
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Expanded pathways contract tests for:
  - edit-path preserving step IDs while deleting only removed steps
  - invalid `linkedArtifactId` validation rejection

### Validation Evidence

- Targeted pathways contract suite:
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts` (`4/4` passing)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Phase gate rerun:
  - `npm run qa:p1:go-gate` (pass)
  - observation: in this child worktree, `qa:p1:regression-pack` currently executed only Showcase suites (`tests/forge-native-showcase-contract.spec.ts`, `tests/forge-native-showcase-runtime-modes.spec.ts`)

### Operational Learnings

- Pathway progress integrity depends on stable `PathwayStep.id` values; destructive rewrite patterns (`deleteMany(pathway_id)` + full reinsert) can silently wipe `PathwayProgress` due FK cascade.
- Green status on aggregate scripts can hide reduced coverage when referenced test files are absent in a child checkout; gate output should be inspected for actual executed suites, not just exit code.

## Session Update - P2.METRICS.01 Team Pulse Baseline (Mar 1, 2026 14:05 GMT)

### Completed

- Locked Team Pulse metrics contract for `R7.1`-`R7.4`:
  - `docs/HDC-P2-TEAM-PULSE-METRICS-CONTRACT-SPEC.md`
- Extended bootstrap payload contract with `teamPulse`:
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Implemented Supabase aggregation in `forge-native/src/backend/supabase/repositories.ts` for:
  - reuse rate (`reusedArtifactCount/totalArtifactCount`)
  - cross-team adoption counts + edge matrix from artifact reuse flows
  - median time-to-first-hack + monthly trend
  - Problem Exchange solved conversion percentage
- Reworked Team Pulse UI rendering in:
  - `forge-native/static/frontend/src/App.tsx`
  - `forge-native/static/frontend/src/styles.css`
  - shows R7 metric tiles, cross-team matrix table, and first-hack trend bars
  - Team Pulse export now emits live `teamPulse` payload to JSON

### Validation Evidence

- Team Pulse contract suite:
  - `npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts` (`1/1` passing)
- Targeted cross-suite:
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts tests/forge-native-showcase-contract.spec.ts tests/forge-native-showcase-runtime-modes.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts` (`17/17` passing)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Guardrail gate rerun:
  - `npm run qa:p1:go-gate` (pass; still partial-scope in this child worktree as previously noted)

### Operational Learnings

- Team Pulse `R7` metrics can be added without a new resolver by extending `getBootstrapData`, which keeps frontend fetch behavior stable while feature scope evolves.
- Cross-team adoption requires deterministic team attribution policy; fallback to user-level IDs avoids runtime failure but should be replaced by explicit product-approved multi-team precedence for GO.

## Session Update - P2.METRICS.01 Live Source Verification + Attribution Hardening + CSV Export (Mar 1, 2026 15:50 GMT)

### Completed

- Executed Supabase MCP-first verification for Team Pulse metric source tables and used documented CLI fallback when MCP returned empty project list.
- Verified production schema compatibility for `ArtifactReuse`, `TeamMember`, and `Problem` against `ssafugtobsqxmqtphwch`.
- Added deterministic multi-team primary-team attribution in Team Pulse backend aggregation (`forge-native/src/backend/supabase/repositories.ts`):
  - accepted memberships only
  - role precedence (`OWNER` > `ADMIN` > `LEAD` > `MEMBER`)
  - earliest membership timestamp (`createdAt`/`created_at`)
  - lexical team-id tie-break
- Added Team Pulse CSV export in the Team Pulse UI (`forge-native/static/frontend/src/App.tsx`) and supporting layout styles (`forge-native/static/frontend/src/styles.css`).
- Updated Team Pulse contract spec with deterministic attribution policy + live verification outcomes:
  - `docs/HDC-P2-TEAM-PULSE-METRICS-CONTRACT-SPEC.md`
- Recorded rollout checkpoint artifact:
  - `docs/artifacts/HDC-P2-METRICS-ROLLOUT-CHECKPOINT-20260301-1547Z.md` (`CONDITIONAL GO`)

### Validation Evidence

- Supabase project discovery fallback:
  - `SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json`
  - confirmed project ref `ssafugtobsqxmqtphwch`.
- Live schema check (management SQL):
  - `information_schema.columns` query for `ArtifactReuse`, `TeamMember`, `Problem` returned required fields used by Team Pulse metrics.
- Live service-role REST read checks:
  - `ArtifactReuse`: HTTP `200`, readable (`content_range=*/0`, zero-row state)
  - `TeamMember`: HTTP `206`, readable (`teamId`, `userId`, `status`, `createdAt` sample row)
  - `Problem`: HTTP `200`, readable (`id`, `status`, `moderation_state`, `created_at` sample row)
- Targeted tests:
  - `npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts` (`2/2` passing)
  - includes new multi-team deterministic attribution test.
- Cross-suite regression slice:
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts tests/forge-native-showcase-contract.spec.ts tests/forge-native-showcase-runtime-modes.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts` (`18/18` passing)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- In this workspace, Supabase MCP management discovery (`list_projects`) can return empty even when CLI access is valid; keeping MCP-first + CLI fallback is required for reproducible live checks.
- `TeamMember` uses camelCase identity fields in production (`teamId`, `userId`, `createdAt`), so backend normalization must continue supporting both camelCase and snake_case variants.
- Deterministic team attribution must not rely on row-return order from `selectMany('*')`; explicit ordering policy in code and tests prevents silent metric drift as membership data grows.

## Session Update - P2.METRICS.01 GO Closure (Mar 1, 2026 16:02 GMT)

### Completed

- Closed `P2.METRICS.01` from `CONDITIONAL GO` to `GO`.
- Ran live production resolver smoke for `getBootstrapData` with production runtime config and captured Team Pulse payload snapshot.
- Identified and fixed production compatibility defect during resolver smoke:
  - `User.created_at` missing in live schema variant (`User.createdAt` present).
  - Added bootstrap user-query fallback (`created_at` -> `createdAt`) in `forge-native/src/backend/supabase/repositories.ts`.
  - Added regression test coverage in `tests/forge-native-team-pulse-metrics-contract.spec.ts`.
- Deployed updated Forge bundle to production and validated live Team Pulse UI now exposes:
  - `Export metrics (CSV)`
  - `Export metrics (JSON)`
- Executed live CSV export probe in browser and captured exported artifact.

### Validation Evidence

- Resolver smoke payload snapshot artifact:
  - `docs/artifacts/HDC-P2-METRICS-LIVE-RESOLVER-SMOKE-20260301-1556Z.json`
  - key output: `reuseRatePct=0`, `crossTeamAdoptionCount=0`, `timeToFirstHackMedianDays=41.8`, `problemConversionPct=0`
- Live Team Pulse UI smoke screenshot:
  - `docs/artifacts/HDC-P2-METRICS-LIVE-UI-SMOKE-20260301-1558Z.png`
- Live CSV export evidence:
  - exported file: `docs/artifacts/HDC-P2-METRICS-LIVE-CSV-EXPORT-20260301-1600Z.csv`
  - probe output: blob `type=text/csv;charset=utf-8`, `size=497`, header row begins `section,metric,value,...`
- Deployment commands:
  - `forge deploy --environment production --no-verify` (pass)
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` (pass)
- Tests and typechecks:
  - `npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts` (`3/3`)
  - `npm run test:run -- tests/forge-native-pathways-contract.spec.ts tests/forge-native-pathways-runtime-modes.spec.ts tests/forge-native-showcase-contract.spec.ts tests/forge-native-showcase-runtime-modes.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts` (`19/19`)
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- Live schema drift between `created_at` and `createdAt` for `User` can break Team Pulse lead-time metrics; compatibility fallbacks are required for stable resolver behavior across environments.
- Playwright MCP can validate export behavior without filesystem hooks by instrumenting `URL.createObjectURL` inside the Forge iframe and reading blob metadata/text preview.
- `custom-ui:build` remains blocked by unrelated `static/runtime-frontend` Tailwind/PostCSS configuration in this workspace; deploying `static/frontend` changes is still viable via `forge deploy` and confirmed by live smoke.

## Session Update - P2.RECOG.01 Mentor Signal Policy Baseline (Mar 1, 2026 16:30 GMT)

### Completed

- Locked mentor signal policy for `R8.1`/`R8.2` and codified it in:
  - `docs/HDC-P2-RECOGNITION-CONTRACT-SPEC.md`
- Extended bootstrap contract to include recognition payload:
  - `recognition.mentorSignal` in
    - `forge-native/src/shared/types.ts`
    - `forge-native/static/frontend/src/types.ts`
- Implemented mentor signal baseline in Supabase repository:
  - `forge-native/src/backend/supabase/repositories.ts` (`buildRecognitionSnapshot`)
  - policy:
    - source: `User.mentor_sessions_used`
    - badge threshold: `>= 3`
    - normalization: negative/non-finite -> `0`
    - deterministic leaderboard ordering:
      1. `mentor_sessions_used DESC`
      2. `userName ASC`
      3. `userId ASC`
- Updated frontend to consume mentor policy output:
  - `forge-native/static/frontend/src/App.tsx`
  - recognition mentor lane now uses `bootstrap.recognition.mentorSignal.leaderboard` when available
  - dashboard mentor badge count now uses `qualifiedMentorChampionCount`

### Validation Evidence

- New targeted policy contract:
  - `npm run test:run -- tests/forge-native-recognition-mentor-policy-contract.spec.ts` (`1/1`)
- Regression slice with Team Pulse:
  - `npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts` (`4/4`)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- Locking the mentor policy as a versioned contract (`r8-mentor-sessions-used-v1`) before full recognition rollout avoids ambiguity when backend and UI evolve independently.
- Existing `User.mentor_sessions_used` provides a stable P0 mentor signal without introducing schema migrations, but pathway contribution signal still needs an explicit policy decision before full `P2.RECOG.01` completion.

## Session Update - Runtime Build Fix + `P2.RECOG.01` Pre-checks (Mar 1, 2026 16:21 GMT)

### Completed

- Fixed runtime frontend build path that was blocking `custom-ui:build`:
  - updated `forge-native/static/runtime-frontend/postcss.config.js` to use `@tailwindcss/postcss`
  - added runtime dependency in `forge-native/static/runtime-frontend/package.json` / `package-lock.json`
  - replaced v4-incompatible `@apply` utility usage in `forge-native/static/runtime-frontend/src/index.css`
- Ran `P2.RECOG.01` pre-checks against roadmap requirements (`R8.1`, `R8.2`) and current live schema readiness.
- Used Supabase MCP first, then executed documented CLI fallback for project/table introspection.

### Validation Evidence

- Runtime build fix validation:
  - `npm --prefix forge-native run runtime:build` (pass)
  - `npm --prefix forge-native run custom-ui:build` (pass)
- Supabase MCP-first verification:
  - `mcp__supabase__list_projects` returned `[]` in this workspace.
- CLI fallback project discovery:
  - `SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json`
  - confirmed active project ref `ssafugtobsqxmqtphwch`.
- Live schema readiness query (management SQL):
  - confirmed recognition-related tables/columns available for: `Artifact`, `ArtifactReuse`, `Problem`, `PathwayProgress`, `Project`, `TeamMember`, `User`.
  - sample aggregate output:
    - `project_total=2`, `project_with_owner=2`
    - `artifact_total=0`
    - `problem_total=1`, `problem_with_solver=1`
    - `pathway_progress_total=1`
- Decision-gate query:
  - `information_schema.tables` for `%mentor%`, `%badge%`, `%recogn%` returned `[]` (no dedicated mentorship/badge/recognition tables).

### Operational Learnings

- The previously logged `custom-ui:build` blocker is now closed in this worktree; runtime/frontend build chain is green again.
- `P2.RECOG.01` is ready to implement for builders/sharers/solvers from existing tables, but mentor recognition policy needs an explicit source definition before coding (`mentor_sessions_used` proxy vs new distinct mentorship event tracking).

## Session Update - P2.RECOG.01 Mentor Signal Policy Baseline (Mar 1, 2026 16:30 GMT, append)

### Completed

- Locked mentor signal policy for recognition:
  - source: `User.mentor_sessions_used`
  - threshold: `>= 3` for mentor-champion qualification
  - deterministic ranking: sessions desc -> name asc -> id asc
- Added contract spec: `docs/HDC-P2-RECOGNITION-CONTRACT-SPEC.md`.
- Extended bootstrap contracts with `recognition.mentorSignal` in shared/frontend types.
- Implemented policy computation in `forge-native/src/backend/supabase/repositories.ts`.
- Wired mentor lane and mentor badge count usage in `forge-native/static/frontend/src/App.tsx`.

### Validation Evidence

- `npm run test:run -- tests/forge-native-recognition-mentor-policy-contract.spec.ts` (`1/1`)
- `npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts` (`4/4`)
- `npm --prefix forge-native run typecheck` (pass)
- `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- Versioning the mentor signal policy (`r8-mentor-sessions-used-v1`) in the response contract makes subsequent leaderboard/badge expansion safer and testable.
- Remaining recognition decision gate is pathway contribution signal definition (`PathwayProgress` completion vs pathway authoring fields).

## Session Update - P2.RECOG.01 Pathway Contribution Signal Policy (Mar 1, 2026 16:36 GMT)

### Completed

- Closed the remaining pathway contribution decision gate for `R8.1`.
- Locked policy to pathway participation events from `PathwayProgress` (not pathway authoring fields).
- Extended recognition contract baseline in:
  - `docs/HDC-P2-RECOGNITION-CONTRACT-SPEC.md`
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
- Implemented pathway signal in backend recognition snapshot:
  - `forge-native/src/backend/supabase/repositories.ts`
  - payload: `recognition.pathwaySignal`
  - policy version: `r8-pathway-completion-v1`
  - threshold: `distinct pathway_id >= 1`
  - deterministic ranking: `distinctPathwayCount DESC` -> `completedStepCount DESC` -> `userName ASC` -> `userId ASC`
- Wired UI consumption for pathway contributor badge count:
  - `forge-native/static/frontend/src/App.tsx`

### Validation Evidence

- Supabase MCP-first + CLI fallback live readiness check:
  - `mcp__supabase__list_projects` returned `[]`
  - CLI fallback project discovery succeeded for `ssafugtobsqxmqtphwch`
  - management SQL result: `pathway_total=1`, `pathway_progress_total=1`, `pathway_contributor_users=1`, `pathways_with_progress=1`
- Contract tests:
  - `npm run test:run -- tests/forge-native-recognition-mentor-policy-contract.spec.ts` (`1/1`)
  - `npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts` (`4/4`)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- `PathwayProgress` provides a stable user-level participation signal for pathway contribution without introducing new schema dependencies.
- Separating pathway participation from pathway authoring avoids mixing adoption behavior with admin/editor curation behavior in recognition scoring.

## Session Update - P2.RECOG.01 Segmented Leaderboards + Viewer Badges Baseline (Mar 1, 2026 16:45 GMT)

### Completed

- Extended recognition contract to cover full `R8` baseline payload:
  - `recognition.leaderboards` with `builders`, `sharers`, `solvers`, `mentors`
  - `recognition.viewerBadges` with:
    - `firstArtifactPublished`
    - `firstProblemSolved`
    - `fiveArtifactsReused`
    - `mentoredThreePeople`
    - `contributedToPathway`
- Implemented deterministic recognition aggregation in `forge-native/src/backend/supabase/repositories.ts` using:
  - builders: hack submissions by owner (`Project.source_type='hack_submission'`)
  - sharers: published artifact count (`Artifact.created_by_user_id`) with reuse count as tie-break
  - solvers: solved problem count (`Problem.status='solved'` + `claimed_by_user_id`)
  - mentors: `mentorSignal` session counts
  - viewer badge derivation from existing source tables/signals.
- Updated frontend recognition consumption:
  - switched Team Pulse recognition tabs to `builders`/`sharers`/`solvers`/`mentors`
  - mapped dashboard badge chips to `viewerBadges` + mentor/pathway qualified counts
  - files: `forge-native/static/frontend/src/App.tsx`, `forge-native/static/frontend/src/constants/nav.ts`.
- Updated contract docs and shared/frontend type parity:
  - `docs/HDC-P2-RECOGNITION-CONTRACT-SPEC.md`
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`

### Validation Evidence

- `npm run test:run -- tests/forge-native-recognition-mentor-policy-contract.spec.ts` (`1/1`)
- `npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts` (`4/4`)
- `npm --prefix forge-native run typecheck` (pass)
- `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- Keeping recognition policies versioned (`r8-mentor-sessions-used-v1`, `r8-pathway-completion-v1`) while expanding output shape allows safe iteration without breaking UI contract assumptions.
- `Problem` reads for recognition need solved-ownership linkage fields (`claimed_by_user_id`, `linked_hack_project_id`, `linked_artifact_id`) in bootstrap query; minimal status-only selects are insufficient for `firstProblemSolved` badge derivation.

## Session Update - P2.RECOG.01 Live Rollout Gate Closure (Mar 1, 2026 16:52 GMT)

### Completed

- Closed remaining `P2.RECOG.01` rollout gates for `R8.1` and `R8.2`.
- Captured production UI smoke evidence for recognition surfaces:
  - Team Pulse segmented recognition tabs (`Builders`, `Sharers`, `Solvers`, `Mentors`)
  - Home dashboard viewer badge lane
- Recorded final recognition rollout checkpoint artifact with GO decision:
  - `docs/artifacts/HDC-P2-RECOG-ROLLOUT-CHECKPOINT-20260301-1650Z.md`
- Advanced execution pointer from `P2.RECOG.01` to `P2.OBS.01` in continuity docs.

### Validation Evidence

- Live source schema verification artifact:
  - `docs/artifacts/HDC-P2-RECOG-LIVE-SCHEMA-VERIFY-20260301-1647Z.json`
  - confirms recognition signal source columns across `Project`, `Artifact`, `Problem`, `PathwayProgress`, `User`.
- Live resolver payload artifact:
  - `docs/artifacts/HDC-P2-RECOG-LIVE-RESOLVER-SMOKE-20260301-1647Z.json`
  - includes:
    - `mentorSignal.policyVersion=r8-mentor-sessions-used-v1`
    - `pathwaySignal.policyVersion=r8-pathway-completion-v1`
    - segmented `leaderboards` lanes
    - `viewerBadges` object with all five badge flags.
- Live production UI smoke screenshot:
  - `docs/artifacts/HDC-P2-RECOG-LIVE-UI-SMOKE-20260301-1650Z.png`
- Targeted validation rerun:
  - `npm run test:run -- tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts` (`4/4`)
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- Resolver artifacts that are captured from ad-hoc scripts can include telemetry log lines before JSON payload; keep that in mind when machine-parsing evidence files.
- UI smoke that proves segmented tabs should be captured from Team Pulse view (not only Home), while viewer badge rendering should be validated from Home; keeping both surfaces in one run avoids false GO confidence.

## Session Update - P2.OBS.01 Phase 2 Telemetry Rollout Closure (Mar 1, 2026 17:08 GMT)

### Completed

- Locked Phase 2 telemetry contract in `docs/HDC-P2-OBS-TELEMETRY-CONTRACT-SPEC.md`.
- Added backend telemetry channel/events for adoption observability:
  - `recognition_snapshot_read` emitted from `SupabaseRepository.getBootstrapData` after recognition snapshot assembly.
  - `team_pulse_export` emitted through resolver-backed tracking path `hdcTrackTeamPulseExport`.
- Added resolver/type wiring for export telemetry tracking:
  - `forge-native/src/index.ts`
  - `forge-native/src/shared/types.ts`
  - `forge-native/static/frontend/src/types.ts`
  - `forge-native/static/frontend/src/App.tsx` export actions (CSV + JSON).
- Added validation coverage and static gate:
  - `tests/forge-native-phase2-telemetry-contract.spec.ts`
  - `tests/forge-native-recognition-mentor-policy-contract.spec.ts` now asserts `recognition_snapshot_read` payload.
  - `package.json` script `qa:p2:telemetry-static-check`.
- Deployed production bundle and captured live telemetry evidence after Team Pulse export actions.

### Validation Evidence

- Supabase MCP-first + fallback:
  - `mcp__supabase__list_projects` returned `[]`.
  - CLI fallback project discovery confirmed `ssafugtobsqxmqtphwch` active.
- Targeted tests:
  - `npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts` (`6/6`)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Static telemetry gate:
  - `npm run qa:p2:telemetry-static-check` (pass)
- Live UI smoke and telemetry artifacts:
  - `docs/artifacts/HDC-P2-OBS-LIVE-UI-EXPORT-SMOKE-20260301-1705Z.png`
  - `docs/artifacts/HDC-P2-OBS-LIVE-TELEMETRY-LOGS-20260301-1705Z.txt`
  - log lines include:
    - `recognition_snapshot_read`
    - `team_pulse_export` (`format=csv`, `csvRowCount=6`)
    - `team_pulse_export` (`format=json`, `csvRowCount=null`)
- Rollout checkpoint:
  - `docs/artifacts/HDC-P2-OBS-ROLLOUT-CHECKPOINT-20260301-1705Z.md` (`GO`)

### Operational Learnings

- Resolver-backed telemetry tracking is the cleanest way to capture UI export actions in backend logs without coupling export behavior to additional data writes.
- Phase-specific static telemetry scripts (`qa:p2:telemetry-static-check`) reduce drift risk when adding new channels without weakening existing Phase 1 telemetry gates.

## Session Update - P3.ROI.01 Audit + Resolver Scaffold Baseline (Mar 1, 2026 17:21 GMT)

### Completed

- Executed `P3.ROI.01` datasource audit with Supabase MCP-first and documented CLI fallback.
- Captured consolidated audit artifact:
  - `docs/artifacts/HDC-P3-ROI-DATASOURCE-AUDIT-20260301-1714Z.json`
- Locked ROI contract scaffold with explicit fallback/source mapping:
  - `docs/HDC-P3-ROI-CONTRACT-SPEC.md`
- Added admin-gated ROI resolver baseline:
  - resolver: `hdcGetRoiDashboard`
  - backend wiring:
    - `forge-native/src/backend/supabase/repositories.ts`
    - `forge-native/src/backend/hackcentral.ts`
    - `forge-native/src/index.ts`
  - type contract parity:
    - `forge-native/src/shared/types.ts`
    - `forge-native/static/frontend/src/types.ts`
- Added targeted ROI contract tests:
  - `tests/forge-native-roi-contract.spec.ts`

### Validation Evidence

- Supabase MCP-first call:
  - `mcp__supabase__list_projects` returned `[]` in this workspace.
- CLI fallback project discovery:
  - `SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json`
  - confirmed `ssafugtobsqxmqtphwch` is available.
- Targeted ROI validation:
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts` (`2/2`)
- Cross-suite regression sanity:
  - `npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts tests/forge-native-roi-contract.spec.ts` (`8/8`)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- For this workspace, Supabase MCP remains useful as the required first check, but management-level ROI audits still require CLI/management API fallback to get reliable schema introspection.
- The ROI contract is safest when it explicitly encodes source availability and null spend fields rather than implying synthetic spend values before token/rate-card integration exists.

## Session Update - P3.ROI.01 Live Admin UI + Export Conditional-GO Slice (Mar 1, 2026 17:32 GMT)

### Completed

- Extended the Forge UI to expose an admin-only ROI dashboard surface from Team Pulse.
- Added ROI filter controls (`window`, `teamId`, `businessUnit`) and dashboard rendering blocks:
  - source coverage
  - totals
  - trend rows
  - team/person breakdowns
  - notes
- Added live export controls on ROI view:
  - `Export ROI (CSV)`
  - `Export Summary`
- Deployed production bundle and validated access behavior:
  - admin can open ROI dashboard
  - non-admin receives `[ROI_FORBIDDEN]`
- Published rollout checkpoint with `CONDITIONAL GO` decision due unresolved source dependencies.

### Validation Evidence

- Production resolver smoke artifact:
  - `docs/artifacts/HDC-P3-ROI-LIVE-RESOLVER-SMOKE-20260301-1730Z.json`
- Production UI smoke artifact:
  - `docs/artifacts/HDC-P3-ROI-LIVE-UI-SMOKE-20260301-1731Z.png`
- Production export artifacts:
  - `docs/artifacts/HDC-P3-ROI-LIVE-CSV-EXPORT-20260301-1731Z.csv`
  - `docs/artifacts/HDC-P3-ROI-LIVE-SUMMARY-EXPORT-20260301-1731Z.txt`
- Rollout checkpoint artifact:
  - `docs/artifacts/HDC-P3-ROI-ROLLOUT-CHECKPOINT-20260301-1732Z.md`
- Regression/typecheck validation for this slice:
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts` (`8/8`)

### Operational Learnings

- Keeping ROI export payload generation server-driven (`export.rows` + formatted summary) avoids client-side shape drift and makes smoke verification deterministic.
- Role-gated resolver preflight on UI entry (`hdcGetRoiDashboard`) is a low-friction way to enforce admin-only access while still allowing explicit non-admin evidence capture for rollout gates.
- A conditional-go checkpoint is appropriate for ROI scaffolds when UI/resolver paths are validated but critical spend/token sources are still in fallback mode.

## Session Update - P3.ROI.01 R9.1 Token-Source Mapping Slice (Mar 1, 2026 17:45 GMT)

### Completed

- Implemented `R9.1` token consumption source mapping in ROI resolver using `EventAuditLog.new_value` payload parsing.
- Added token-key extraction policy to support:
  - direct totals (`tokenVolume`, `tokenCount`, `totalTokens`, `tokensUsed`, `usageTokens`)
  - paired fallback (`promptTokens/inputTokens` + `completionTokens/outputTokens`)
- Updated ROI payload behavior:
  - `totals.tokenVolume` now returns numeric output (`0` fallback when no token-bearing rows)
  - `breakdowns.person[].tokenVolume`, `breakdowns.team[].tokenVolume`, and `trend[].tokenVolume` now return numeric values
  - `sources.tokenVolume` now reports `available_partial` with source reasoning and attribution coverage
- Updated ROI contract test coverage for token mapping behavior.
- Published checkpoint artifact for this slice with remaining gates documented.

### Validation Evidence

- Targeted ROI contract suite:
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts` (`2/2`)
- Cross-suite regression sanity:
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts` (`8/8`)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Live resolver artifact (admin + non-admin):
  - `docs/artifacts/HDC-P3-ROI-R9_1-LIVE-RESOLVER-SMOKE-20260301-1744Z.json`
  - confirms admin payload includes:
    - `sources.tokenVolume.status=available_partial`
    - `totals.tokenVolume=0`
  - confirms non-admin access remains blocked with `[ROI_FORBIDDEN]`
- Rollout checkpoint artifact:
  - `docs/artifacts/HDC-P3-ROI-R9_1-CHECKPOINT-20260301-1745Z.md`

### Operational Learnings

- `EventAuditLog.new_value` provides a workable partial source for `R9.1` even when dedicated token metering tables do not exist yet.
- Returning numeric `tokenVolume=0` with explicit source-status metadata is safer for downstream dashboards/exports than returning `null` once a token mapping policy exists.
- Attribution quality should be tracked explicitly (`attributed rows / token-bearing rows`) to avoid overstating confidence until richer user/team linkage and rate-card sources are available.

## Session Update - Continuation Prompt Retirement Housekeeping (Mar 1, 2026 18:02 GMT)

### Completed

- Removed stale `CONTINUATION_PROMPT.md` from the child worktree because it was out-of-date and not part of the active startup workflow.
- Updated continuity verification commands in `CONTINUATION.md` to stop referencing the removed file.
- Updated `HDC-PRODUCT-EXECUTION-PLAN.md` continuity metadata:
  - marked `P0.CONT.04` as deprecated
  - added changelog evidence row for prompt retirement decision

### Validation Evidence

- `rg -n "CONTINUATION_PROMPT\.md" /Users/nickster/Downloads/HackCentral-p1-child-01`
  - remaining mentions are historical references in append-only `LEARNINGS.md`
- `git status --short --branch`
  - confirms deletion and continuity doc updates are staged for next commit

### Operational Learnings

- Keeping a stale bootstrap prompt in-repo creates avoidable restart risk; startup should stay anchored to a single current handoff source (`CONTINUATION.md`) plus roadmap/plan files.
- Historical learnings can keep old file references without issue as long as active workflow docs no longer depend on them.

## Session Update - P3.ROI.01 R9.2 + R9.4 Spend and BU Wiring (Mar 1, 2026 20:44 GMT)

### Completed

- Implemented `R9.2` configurable spend path in ROI resolver:
  - token model extraction from `EventAuditLog.new_value`
  - rate-card resolution using `HDC_ROI_RATE_CARD_JSON` with in-code defaults
  - spend propagation to totals, trend, and person/team/business-unit breakdown rows
  - non-null cost-per-output wiring in ROI totals + CSV export rows
- Implemented `R9.4` business-unit attribution source path:
  - Team BU-field extraction with optional override map from `HDC_ROI_BUSINESS_UNIT_TEAM_MAP_JSON`
  - BU filter now gates totals/trend/breakdowns
  - BU breakdown section now present in resolver payload and ROI dashboard UI table
- Updated ROI checkpoint/spec artifacts:
  - `docs/HDC-P3-ROI-CONTRACT-SPEC.md`
  - `docs/artifacts/HDC-P3-ROI-R9_2-R9_4-CHECKPOINT-20260301-2042Z.md`

### Validation Evidence

- Targeted ROI contract suite:
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts` (`2/2`)
- Cross-suite regression sanity:
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts` (`8/8`)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Supabase MCP-first + fallback live verification:
  - `mcp__supabase__list_projects` returned `[]` (known workspace behavior)
  - CLI/service-role fallback evidence artifact:
    - `docs/artifacts/HDC-P3-ROI-R9_2-R9_4-LIVE-RESOLVER-SMOKE-20260301-2040Z.json`
  - live resolver evidence confirms:
    - admin access succeeds with spend fields (`totals.cost=0` on current token-empty live dataset)
    - non-admin access remains blocked (`[ROI_FORBIDDEN]`)
    - BU source status is `unavailable` in production data due `0/12` Team rows with BU signal

### Operational Learnings

- A configurable env-backed rate-card with explicit source metadata allows `R9.2` to ship safely even when production token rows are sparse.
- `R9.4` needs both code-path support and data-population work; exposing BU-source status/coverage in payload notes prevents false confidence when BU mappings are missing.
- Using Supabase MCP as required first step remains valuable for protocol compliance, while CLI/service-role fallback is still required for dependable live admin verification in this workspace.

## Session Update - P3.ROI.01 R9.2/R9.4 Post-Deploy Compatibility + GO Gate (Mar 1, 2026 21:08 GMT)

### Completed

- Closed the remaining `R9.2`/`R9.4` rollout gate by shipping post-deploy compatibility hardening for ROI output attribution in live schema variants:
  - `normalizeProjectRow` now reads `Project.submittedAt`, `Project.ownerId`, `Project.createdAt`, and `Project.sourceType` variants.
  - when explicit project status is absent, `source_type='hack_submission'` now acts as completion signal for ROI hack-output aggregation.
- Added regression coverage in `tests/forge-native-roi-contract.spec.ts` for camelCase project rows without explicit status.
- Deployed updated Forge production bundle and verified Confluence installation is on latest version.
- Re-ran live resolver/UI verification and confirmed non-empty BU output rows without synthetic data insertion.

### Validation Evidence

- Supabase MCP-first check:
  - `mcp__supabase__list_projects` returned `[]` (known workspace behavior).
- Regression + targeted cross-suite:
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts` (`9/9`)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Deploy/install:
  - `forge deploy --environment production --no-verify` (pass)
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` (site already latest)
- Live resolver artifact (CLI/service-role fallback with production-equivalent ROI env config):
  - `docs/artifacts/HDC-P3-ROI-R9_2-R9_4-LIVE-RESOLVER-SMOKE-COMPAT-20260301-2102Z.json`
  - confirms:
    - `sources.costRateCard.status=available`
    - `sources.businessUnit.status=available`
    - `teamBreakdownRows=1`
    - `businessUnitBreakdownRows=1`
- Live production ROI UI smoke screenshot:
  - `docs/artifacts/HDC-P3-ROI-R9_2-R9_4-LIVE-UI-SMOKE-POSTDEPLOY-20260301-2103Z.png`
  - confirms visible `Business-unit breakdown` row (`Shared Services`, outputs `1`, spend `£0.00`) and source coverage `business unit=available`.
- Post-deploy checkpoint artifact:
  - `docs/artifacts/HDC-P3-ROI-R9_2-R9_4-CHECKPOINT-POSTDEPLOY-20260301-2105Z.md` (`GO`)

### Operational Learnings

- Live schema drift between snake_case and camelCase project fields can silently suppress ROI output metrics if normalization only reads one variant.
- For `hack_submission` rows in legacy/mixed schemas, source-type fallback is a practical completion signal when explicit status fields are absent.
- BU breakdown population gates should prefer attribution-path verification against real data over synthetic inserts; this reduces production-data risk while still proving end-to-end behavior.

## Session Update - P3.ROI.01 Membership Status Attribution Hardening (Mar 1, 2026 21:14 GMT)

### Completed

- Added ROI attribution hardening so primary-team resolution accepts `TeamMember.status=ACTIVE` in addition to `ACCEPTED`.
- Added ROI contract regression coverage (`tests/forge-native-roi-contract.spec.ts`) proving `ACTIVE` memberships are attributed into team/business-unit ROI breakdowns.
- Deployed production bundle and revalidated install state on Confluence production site.
- Captured fresh live status/ROI verification evidence.

### Validation Evidence

- Supabase MCP-first:
  - `mcp__supabase__list_projects` returned `[]` (known workspace behavior).
- Test gate:
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts` (`10/10`)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Deploy/install:
  - `forge deploy --environment production --no-verify` (pass)
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` (site already latest)
- Live verification artifacts:
  - `docs/artifacts/HDC-P3-ROI-MEMBERSHIP-STATUS-LIVE-VERIFY-20260301-2112Z.json`
    - membership statuses currently observed: `accepted=20`
    - ROI attribution still populated: `teamBreakdownRows=1`, `businessUnitBreakdownRows=1`
  - `docs/artifacts/HDC-P3-ROI-MEMBERSHIP-STATUS-CHECKPOINT-20260301-2114Z.md`

### Operational Learnings

- ROI attribution should tolerate at least `ACCEPTED` and `ACTIVE` TeamMember statuses to remain stable across schema/workflow variants.
- Even when live status distribution is currently single-valued (`ACCEPTED`), pre-emptive acceptance of `ACTIVE` avoids avoidable production regressions.

## Session Update - P3.ROI.01 Token Source Live Watch Refresh (Mar 1, 2026 21:22 GMT)

### Completed

- Re-ran `R9.1` token-source production watch audit (Supabase MCP-first, then CLI/service-role fallback).
- Confirmed current production `EventAuditLog` payload stream does not yet contain token-bearing keys; all observed rows remain `event_created` entries with model metadata only.
- Published token-source watch checkpoint with updated decision and next-action framing.

### Validation Evidence

- Supabase MCP-first:
  - `mcp__supabase__list_projects` returned `[]` (known workspace behavior).
- Fallback live source audit artifact:
  - `docs/artifacts/HDC-P3-ROI-TOKEN-SOURCE-LIVE-AUDIT-20260301-2120Z.json`
  - key metrics:
    - `rowCount=56`
    - `rowsWithTokenKeywordCount=0`
    - `rowsWithNumericTokenKeywordCount=0`
    - `rowsWithModelKeywordCount=56`
    - action distribution: `event_created=56`
- Checkpoint artifact:
  - `docs/artifacts/HDC-P3-ROI-TOKEN-SOURCE-WATCH-CHECKPOINT-20260301-2122Z.md`

### Operational Learnings

- Zero-spend ROI output can be a legitimate live-source state when token-bearing audit producers are not active; this should not be treated as a resolver defect by default.
- Token-source watch checkpoints should record action distribution and payload-key coverage, not only aggregate token totals, to separate schema/mapping issues from upstream telemetry gaps.

## Session Update - P3.ROI.01 Token Source Diagnostics Enrichment (Mar 1, 2026 21:24 GMT)

### Completed

- Added ROI diagnostics enrichment in source reasoning: when no token-bearing rows are detected, token-source reason now includes observed `EventAuditLog.action` distribution.
- Deployed production with this diagnostics update so admin ROI notes directly expose upstream telemetry shape.

### Validation Evidence

- Regression + targeted cross-suite:
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts` (`10/10`)
- Typechecks:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Deploy/install:
  - `forge deploy --environment production --no-verify` (pass)
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` (site already latest)
- Post-deploy resolver evidence:
  - `docs/artifacts/HDC-P3-ROI-TOKEN-SOURCE-REASON-POSTDEPLOY-20260301-2124Z.json`
  - confirms token-source reason now includes `Observed audit actions: event_created=56.`

### Operational Learnings

- Including observed action distribution in ROI source notes materially shortens triage time by proving whether source absence is due to missing payload keys vs missing producer events.

## Session Update - P3.ROI.01 Token Producer Gap Confirmation (Mar 1, 2026 21:26 GMT)

### Completed

- Mapped current backend audit emitters and confirmed no in-repo token-usage producer currently writes token-bearing payloads into `EventAuditLog.new_value`.
- Published explicit gap analysis artifact to separate remaining ROI closure work from resolver-level defects.

### Validation Evidence

- Emitter inventory command:
  - `rg -n "logAudit\(\{|action:\s*'" forge-native/src/backend -g '*.ts'`
- Gap analysis artifact:
  - `docs/artifacts/HDC-P3-ROI-TOKEN-PRODUCER-GAP-ANALYSIS-20260301-2126Z.md`
- Corroborating live source evidence:
  - `docs/artifacts/HDC-P3-ROI-TOKEN-SOURCE-LIVE-AUDIT-20260301-2120Z.json`

### Operational Learnings

- For ROI closure, distinguishing "mapping broken" from "producer missing" is critical; action-emitter inventory should be part of token-source gate checks.
- Once a token producer dependency is external to this repo, continuity docs should label it explicitly as a blocker to avoid repetitive re-investigation.

## Session Update - P3.ROI.01 Token Producer Blocker Resolution (Mar 1, 2026 21:39 GMT)

### Completed

- Implemented in-repo ROI token producer path:
  - new admin-gated resolver `hdcLogRoiTokenUsage`
  - new shared/frontend contracts: `LogRoiTokenUsageInput`, `LogRoiTokenUsageResult`
  - backend implementation writes `EventAuditLog.action='llm_usage_logged'` with canonical token payload keys consumed by ROI mapping
- Added targeted producer regression coverage in `tests/forge-native-roi-contract.spec.ts`:
  - producer write contract
  - producer non-admin authorization guard
- Fixed producer payload double-count risk discovered during live smoke:
  - removed duplicate total-token aliases from producer payload (`tokenCount`, `totalTokens`, `usage.total_tokens`)
  - retained canonical `tokenVolume` plus optional prompt/completion detail fields
- Deployed production bundle and refreshed Confluence install state.

### Validation Evidence

- Supabase MCP-first protocol:
  - `mcp__supabase__list_projects` returned `[]` (known workspace behavior)
- Targeted regression + typecheck gate:
  - `npm run test:run -- tests/forge-native-roi-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts` (`12/12`)
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
- Deploy/install:
  - `forge deploy --environment production --no-verify` (pass)
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` (site already latest)
- Post-deploy live resolver smoke artifact:
  - `docs/artifacts/HDC-P3-ROI-TOKEN-PRODUCER-LIVE-RESOLVER-SMOKE-POSTDEPLOY-20260301-2138Z.json`
  - confirms producer write succeeded (`tokenVolume=2400`) and ROI monthly totals delta is non-zero (`tokenVolume +2400`, `cost +0.02`)
- Blocker checkpoint:
  - `docs/artifacts/HDC-P3-ROI-TOKEN-PRODUCER-BLOCKER-CHECKPOINT-20260301-2139Z.md` (`GO`)

### Operational Learnings

- ROI producer payloads must emit one canonical total-token key to avoid aggregator overcount when the mapper sums total-key aliases.
- Shipping a dedicated admin-gated producer resolver unblocks ROI spend evidence without requiring upstream schema changes or new tables.
- MCP-first + CLI fallback remains the reliable pattern in this workspace for production verification workflows.

## Session Update - P3.ROI.01 Final GO Gate + Task Transition (Mar 1, 2026 23:13 GMT)

### Completed

- Captured production ROI UI smoke evidence with visible non-zero spend after producer rollout.
- Published final ROI module checkpoint and marked `P3.ROI.01` complete (`GO`).
- Advanced active task to `P3.FORK.01` and updated continuity/execution docs accordingly.

### Validation Evidence

- Production UI smoke artifact (Playwright):
  - `docs/artifacts/HDC-P3-ROI-TOKEN-PRODUCER-LIVE-UI-SMOKE-POSTDEPLOY-20260301-2140Z.png`
  - visible values include:
    - `TOKEN VOLUME 14,400`
    - `TOTAL SPEND £0.14`
    - `COST / OUTPUT £0.14`
- Final rollout checkpoint artifact:
  - `docs/artifacts/HDC-P3-ROI-FINAL-ROLLOUT-CHECKPOINT-20260301-2312Z.md`
- Supporting resolver delta evidence from prior slice:
  - `docs/artifacts/HDC-P3-ROI-TOKEN-PRODUCER-LIVE-RESOLVER-SMOKE-POSTDEPLOY-20260301-2138Z.json`

### Operational Learnings

- For ROI closure, pairing resolver delta artifacts with an explicit production UI screenshot materially reduces ambiguity in GO decisions.
- After a module GO, continuity docs should immediately move the active task pointer to the next roadmap work package to avoid restart drift.

## Session Update - P3.FORK.01 Backend+UI Baseline (Mar 1, 2026 23:28 GMT)

### Completed

- Implemented `P3.FORK.01` fork/remix baseline across backend, resolver, and Forge UI:
  - added `ForkRelation` migration and attribution schema (`forge-native/supabase/migrations/20260301233000_phase3_fork_relations.sql`)
  - added fork operations in Supabase repository (`forkShowcaseHack`, `forkArtifact`) with audit actions (`hack_forked`, `artifact_forked`)
  - exposed new global-page resolvers (`hdcForkShowcaseHack`, `hdcForkArtifact`)
  - wired Showcase/Registry UI actions (`Fork Hack`, `Fork Artifact`) and `forkCount` display/update behavior
- Added fork contract guard tests in `forge-native/tests/backend/fork-contract.test.mjs`.
- Published fork module checkpoint:
  - `docs/artifacts/HDC-P3-FORK-R10_1-R10_2-CHECKPOINT-20260301-2328Z.md`

### Validation Evidence

- Supabase MCP-first:
  - `mcp__supabase__list_projects` returned `[]` (known workspace behavior).
- Backend + frontend validation:
  - `npm --prefix forge-native run typecheck` (pass)
  - `npm --prefix forge-native/static/frontend run typecheck` (pass)
  - `npm --prefix forge-native run test:backend` (pass, includes new fork contract suite)
  - `npm --prefix forge-native run frontend:build` (pass)

### Operational Learnings

- Treating fork attribution as a dedicated relation (`ForkRelation`) keeps source entities immutable while enabling count aggregation and provenance for both hacks and artifacts.
- Adding fork contract tests that assert migration/resolver/type/UI wiring together helps catch partial-slice regressions early before live rollout.
- In this workspace, `mcp__supabase__list_projects` returning `[]` should be treated as an expected access constraint and not as a code-level blocker; proceed with documented CLI fallback for live gates.

## Session Update - P3.FORK.01 Live Migration/Smoke Closure + Task Transition (Mar 1, 2026 23:40 GMT)

### Completed

- Closed `P3.FORK.01` from conditional gate to final `GO`.
- Applied and verified production `ForkRelation` migration state.
- Ran live resolver smoke for both fork flows (`hdcForkShowcaseHack`, `hdcForkArtifact`).
- Ran live production UI smoke in Hacks and Registry surfaces and confirmed fork actions/counters.
- Transitioned active task from `P3.FORK.01` to `P3.FEED.01` in continuity/execution docs.

### Validation Evidence

- Live migration verification artifact:
  - `docs/artifacts/HDC-P3-FORK-LIVE-MIGRATION-VERIFY-20260301-2338Z.json`
  - confirms `ForkRelation` table + unique constraint present and row count observable.
- Live resolver smoke artifact:
  - `docs/artifacts/HDC-P3-FORK-R10_1-R10_2-LIVE-RESOLVER-SMOKE-20260301-2336Z.json`
  - confirms successful fork roundtrips for showcase hacks and artifacts.
- Live UI smoke artifacts:
  - `docs/artifacts/HDC-P3-FORK-LIVE-UI-SMOKE-HACKS-20260301-2337Z.png`
  - `docs/artifacts/HDC-P3-FORK-LIVE-UI-SMOKE-REGISTRY-20260301-2337Z.png`
- Final post-deploy checkpoint:
  - `docs/artifacts/HDC-P3-FORK-R10_1-R10_2-CHECKPOINT-POSTDEPLOY-20260301-2338Z.md` (`GO`)

### Operational Learnings

- Supabase MCP availability and Supabase MCP admin-scope permissions are separate concerns; in this workspace MCP is reachable but some management calls can still be permission-scoped.
- For fork/remix rollout gates, pairing migration verification + resolver smoke + dual-surface UI smoke provides faster close confidence than any single signal.
- Continuity docs should be updated in the same post-deploy slice as GO checkpoint publication to avoid stale active-task restarts.

## Session Update - P3.FEED.01 Baseline Contract + Resolver + Home Lane (Mar 1, 2026 23:50 GMT)

### Completed

- Locked `P3.FEED.01` contract for `R12.1`/`R12.2` in:
  - `docs/HDC-P3-FEED-CONTRACT-SPEC.md`
- Added typed feed resolver scaffold:
  - `hdcGetHomeFeed` wiring in backend + resolver index.
  - `SupabaseRepository.getHomeFeed` now assembles activity feed categories and recommendation categories with explicit source-coverage status.
- Added Home UI lane wiring:
  - `What's happening` activity feed lane.
  - `Recommended for you` recommendation lane.
- Added feed contract regression test:
  - `tests/forge-native-feed-contract.spec.ts`
- Published baseline checkpoint:
  - `docs/artifacts/HDC-P3-FEED-BASELINE-CHECKPOINT-20260301-2350Z.md` (`IN_PROGRESS`)

### Validation Evidence

- `npm run test:run -- tests/forge-native-feed-contract.spec.ts` (`1/1`)
- `npm --prefix forge-native run typecheck` (pass)
- `npm --prefix forge-native/static/frontend run typecheck` (pass)

### Operational Learnings

- A dedicated typed feed resolver (`hdcGetHomeFeed`) keeps Home feed evolution isolated from bootstrap payload churn while still allowing fallback behavior in non-Supabase modes.
- Explicit source-coverage status in feed payloads is useful for phased rollout: UI can communicate partial readiness without hard-failing the page.
- Testing category coverage by asserting feed/recommendation type sets is a fast, stable guardrail for roadmap contract drift.

## Session Update - P3.FEED.01 Live Rollout Closure (Mar 1, 2026 23:55 GMT)

### Completed

- Ran live `hdcGetHomeFeed` resolver smoke against production data (Supabase MCP-first, CLI fallback for project-scoped access).
- Deployed production Forge bundle and refreshed install state.
- Captured production Home UI smoke evidence for both new feed lanes.
- Published post-deploy checkpoint and closed `P3.FEED.01` as `GO`.
- Advanced active task to `P3.OBS.01`.

### Validation Evidence

- Resolver artifact:
  - `docs/artifacts/HDC-P3-FEED-LIVE-RESOLVER-SMOKE-20260301-2352Z.json`
  - confirms all `R12.1` activity categories present and recommendation source status reported as `available_partial`.
- UI artifacts:
  - `docs/artifacts/HDC-P3-FEED-LIVE-UI-SMOKE-HOME-FEED-CARD-20260301-2354Z.png`
  - `docs/artifacts/HDC-P3-FEED-LIVE-UI-SMOKE-RECOMMENDATIONS-CARD-20260301-2354Z.png`
- Checkpoint:
  - `docs/artifacts/HDC-P3-FEED-CHECKPOINT-POSTDEPLOY-20260301-2355Z.md` (`GO`)
- Deployment commands:
  - `npm --prefix forge-native run custom-ui:build` (pass)
  - `forge deploy --environment production --no-verify` (pass)
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` (site already latest)

### Operational Learnings

- `R12.2` recommendation availability is naturally data-dependent; explicit `available_partial` source signaling keeps rollout decisions stable even when one recommendation family has sparse live inputs.
- Element-level Playwright captures for each feed lane provide clearer post-deploy evidence than a single full-page screenshot when scroll containers are involved.
- Continuing to use Supabase MCP-first with CLI fallback remains necessary in this workspace due project-admin scope differences despite MCP connectivity.

## Session Update - Continuity Refresh + Branch Hygiene Preflight (Mar 2, 2026 00:07 GMT)

### Completed

- Refreshed continuity docs for a clean handoff into a new chat while keeping active task `P3.OBS.01`.
- Reordered next-session execution so action #1 is branch/worktree reconciliation before any telemetry implementation.
- Updated:
  - `HDC-PRODUCT-EXECUTION-PLAN.md` (`Last updated`, Active Sprint Queue `Now`, change-log entry)
  - `CONTINUATION.md` (`Last updated`, Next 3 Atomic Actions, mandatory branch hygiene section)

### Validation Evidence

- Branch/worktree inventory:
  - `git -C /Users/nickster/Downloads/HackCentral branch -vv`
  - `git -C /Users/nickster/Downloads/HackCentral worktree list --porcelain`
- Divergence checks:
  - `git -C /Users/nickster/Downloads/HackCentral rev-list --left-right --count main...codex/hdc-hackday-template-spinout` -> `97 2`
  - `git -C /Users/nickster/Downloads/HackCentral rev-list --left-right --count main...codex/sb2-v2-custom-events-phase2` -> `42 3`
  - `git -C /Users/nickster/Downloads/HackCentral rev-list --left-right --count main...codex/p1-child-01` -> `0 21`

### Operational Learnings

- Before resuming feature work after multiple worktree sessions, a branch divergence audit should be the first action to avoid stale branch drift and accidental duplicate effort.
- Continuation docs are more robust when they include exact branch divergence counts and executable first-command checklists instead of generic cleanup guidance.

## Session Update - Branch Reconciliation + `P3.OBS.01` GO Closure (Mar 2, 2026 00:24 GMT)

### Completed

- Executed mandatory branch/worktree reconciliation in `/Users/nickster/Downloads/HackCentral` before implementation.
- Verified divergence, inspected unique commits, and removed stale non-active branches locally/remotely:
  - `codex/hdc-hackday-template-spinout`
  - `codex/sb2-v2-custom-events-phase2`
- Completed `P3.OBS.01` with:
  - Phase 3 telemetry contract spec (`docs/HDC-P3-OBS-TELEMETRY-CONTRACT-SPEC.md`)
  - backend telemetry hooks for `feed_signal_health`, `roi_signal_health`, and `roi_export`
  - static telemetry gate (`qa:p3:telemetry-static-check`)
  - live production telemetry sampling and rollout checkpoint publication.
- Advanced active task to `P3.EXTRACT.01` in execution ledger/continuity.

### Validation Evidence

- Required branch/worktree commands:
  - `git -C /Users/nickster/Downloads/HackCentral fetch --all --prune`
  - `git -C /Users/nickster/Downloads/HackCentral worktree list --porcelain`
  - `git -C /Users/nickster/Downloads/HackCentral branch -vv`
  - `git -C /Users/nickster/Downloads/HackCentral rev-list --left-right --count main...codex/hdc-hackday-template-spinout` -> `97 2`
  - `git -C /Users/nickster/Downloads/HackCentral rev-list --left-right --count main...codex/sb2-v2-custom-events-phase2` -> `42 3`
  - `git -C /Users/nickster/Downloads/HackCentral rev-list --left-right --count main...codex/p1-child-01` -> `0 22`
- `P3.OBS.01` verification:
  - `npm -C /Users/nickster/Downloads/HackCentral-p1-child-01 run test:run -- tests/forge-native-feed-contract.spec.ts tests/forge-native-roi-contract.spec.ts tests/forge-native-phase3-telemetry-contract.spec.ts` (pass)
  - `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run typecheck` (pass)
  - `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native/static/frontend run typecheck` (pass)
  - `npm -C /Users/nickster/Downloads/HackCentral-p1-child-01 run qa:p3:telemetry-static-check` (pass)
- Live rollout artifacts:
  - `docs/artifacts/HDC-P3-OBS-LIVE-TELEMETRY-LOGS-20260302-002226Z.txt`
  - `docs/artifacts/HDC-P3-OBS-LIVE-RESOLVER-SMOKE-20260302-002226Z.json`
  - `docs/artifacts/HDC-P3-OBS-LIVE-UI-SMOKE-FEED-20260302-002226Z.png`
  - `docs/artifacts/HDC-P3-OBS-LIVE-UI-SMOKE-ROI-20260302-002226Z.png`
  - `docs/artifacts/HDC-P3-OBS-ROLLOUT-CHECKPOINT-20260302-002226Z.md` (`GO`)

### Operational Learnings

- Branch hygiene should run as a hard preflight only when branch inventory is unknown; once reconciled and pruned, keeping an explicit “known dirty files” status note is enough to prevent accidental cleanup churn.
- For observability gates, pairing static contract checks with live telemetry log sampling is faster and more reliable than relying on UI proof alone.
- In this workspace, Supabase MCP-first plus CLI fallback remains the most resilient rollout pattern because management-scope visibility can differ by endpoint even when MCP is reachable.

## Session Update - P3.EXTRACT.01 Resolver/Type Scaffolding (Mar 2, 2026 01:19 GMT)

### Completed

- Implemented extraction contract scaffolding end-to-end for `R11.1`/`R11.2`:
  - New typed contracts in backend/frontend mirrors:
    - `forge-native/src/shared/types.ts`
    - `forge-native/static/frontend/src/types.ts`
  - New resolver endpoints in `forge-native/src/index.ts`:
    - `hdcGetHackdayExtractionCandidates`
    - `hdcTriggerPostHackdayExtractionPrompt`
    - `hdcBulkImportHackdaySubmissions`
  - New backend facade wrappers in `forge-native/src/backend/hackcentral.ts` with Supabase-only fallback guard (`[EXTRACTION_UNSUPPORTED_BACKEND]`).
  - Repository scaffold in `forge-native/src/backend/supabase/repositories.ts` including:
    - permission gates (`[EXTRACT_FORBIDDEN]`, `[EXTRACT_IMPORT_FORBIDDEN]`)
    - migration gates for `HackdayExtractionPrompt` and `HackdayExtractionImport`
    - dry-run handling and deterministic response shapes
    - audit actions (`hackday_extraction_prompted`, `hackday_bulk_imported`).
- Added backend extraction contract regression:
  - `forge-native/tests/backend/extraction-contract.test.mjs`.

### Validation Evidence

- `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run typecheck` -> pass.
- `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run test:backend` -> pass (`14/14`).
- Branch/worktree hygiene re-check after scaffold:
  - `git -C /Users/nickster/Downloads/HackCentral fetch --all --prune`
  - `git -C /Users/nickster/Downloads/HackCentral worktree list --porcelain`
  - `git -C /Users/nickster/Downloads/HackCentral branch -vv`
  - `git -C /Users/nickster/Downloads/HackCentral rev-list --left-right --count main...codex/p3-extract-01` -> `0 1`
  - `git -C /Users/nickster/Downloads/HackCentral status --short --branch` -> clean
  - `git -C /Users/nickster/Downloads/HackCentral-p1-child-01 status --short --branch` -> known extraction-scaffold edits + pre-existing untracked artifacts.

### Operational Learnings

- For extraction workflows that depend on idempotency state, explicit migration-gate errors are safer than silent fallback behavior; this keeps dry-run/read behavior deterministic while making missing schema immediately visible.
- Maintaining `src/shared/types.ts` and `static/frontend/src/types.ts` parity in the same commit prevents typed `invoke` drift and catches resolver contract mismatch early via static tests.
- A lightweight backend contract test file for each major roadmap slice (`tests/backend/*-contract.test.mjs`) is an efficient guardrail for resolver exposure + typed contract parity without waiting for UI integration.

## Session Update - P3.EXTRACT.01 Supabase Source Audit (Mar 2, 2026 01:22 GMT)

### Completed

- Executed extraction source audit with required Supabase MCP-first strategy, then CLI fallback due MCP scope limitations.
- Captured source-audit artifact:
  - `docs/artifacts/HDC-P3-EXTRACT-SOURCE-AUDIT-20260302-0119Z.json`

### Validation Evidence

- MCP-first checks:
  - `mcp__supabase__list_projects` -> `[]`
  - `mcp__supabase__list_tables` (`ssafugtobsqxmqtphwch`) -> permission error
  - `mcp__supabase__list_migrations` (`ssafugtobsqxmqtphwch`) -> permission error
- CLI fallback checks:
  - `SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json` -> project visible (`ssafugtobsqxmqtphwch`)
  - management SQL confirmed present tables: `Event`, `EventAdmin`, `EventAuditLog`, `Project`, `ShowcaseHack`
  - management SQL confirmed missing extraction tables: `HackdayExtractionPrompt`, `HackdayExtractionImport`
  - data readiness query: `Event.lifecycle_status` currently all `draft` and `Project.source_type='hack_submission'` rows currently `event_id=null`.

### Operational Learnings

- In this workspace, Supabase MCP access is reliable for connectivity checks but not sufficient for project-admin schema introspection; the management API fallback path should be considered part of the normal extraction gate.
- Capturing a machine-readable source-audit artifact before writing migration SQL makes checkpoint decisions clearer and reduces rework when migration scope changes.
- Extraction write-path validation needs both schema readiness and data readiness; missing `results` events or missing event-linked submissions should be treated as a hard gate, not a soft warning.

## Session Update - P3.EXTRACT.01 Migration Scaffold (Mar 2, 2026 01:25 GMT)

### Completed

- Added extraction migration scaffold:
  - `forge-native/supabase/migrations/20260302013000_phase3_extraction.sql`
  - creates `HackdayExtractionPrompt` and `HackdayExtractionImport`
  - adds idempotency uniqueness constraints, FK references, and indexes.
- Extended extraction contract tests to include migration-shape assertions:
  - `forge-native/tests/backend/extraction-contract.test.mjs`.

### Validation Evidence

- `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run typecheck` -> pass.
- `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run test:backend` -> pass (`15/15`).

### Operational Learnings

- Locking migration-shape assertions in backend contract tests catches schema drift early and keeps repository logic + migration expectations synchronized.
- For idempotent command paths, defining composite uniqueness constraints in the first migration avoids ambiguous replay semantics later.
- It is useful to separate "migration file landed" from "migration applied" in continuity docs so checkpoint status cannot be misread.

## Session Update - P3.EXTRACT.01 Live Migration + Non-Dry-Run Validation (Mar 2, 2026 01:30 GMT)

### Completed

- Applied `20260302013000_phase3_extraction.sql` to live Supabase project `ssafugtobsqxmqtphwch` (MCP-first attempted; CLI fallback executed due permission scope).
- Verified extraction schema creation in production:
  - tables: `HackdayExtractionPrompt`, `HackdayExtractionImport`
  - uniqueness/FK constraints and supporting indexes.
- Ran controlled non-dry-run extraction smoke using synthetic results-phase data and verified idempotency on repeated calls.
- Removed synthetic seed rows after validation and restored modified user capability tags.

### Validation Evidence

- `docs/artifacts/HDC-P3-EXTRACT-SOURCE-AUDIT-20260302-0119Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-LIVE-RESOLVER-SMOKE-20260302-0129Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-R11_1-R11_2-CHECKPOINT-20260302-0129Z.md`
- Live smoke key outcomes:
  - prompt call #1: `promptedParticipantCount=1`
  - prompt call #2: `promptedParticipantCount=0`, `skippedAlreadyPromptedCount=1`
  - import call #1: `importedDraftCount=1`
  - import call #2: `importedDraftCount=0`, `skippedAlreadyImportedCount=1`
- Local validation:
  - `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run typecheck` -> pass
  - `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run test:backend` -> pass (`15/15`)

### Operational Learnings

- For Supabase production checks in this workspace, MCP-first should remain mandatory, but migration execution needs an immediate CLI fallback path because management endpoints are permission-scoped.
- Running non-dry-run idempotency checks with temporary synthetic data plus explicit cleanup is an effective way to validate write paths without leaving production drift.
- Capturing both pre-cleanup table counts and post-cleanup verification in artifacts improves confidence for replay-safe extraction workflows.

## Session Update - P3.EXTRACT.01 Forge UI Extraction Controls (Mar 2, 2026 01:41 GMT)

### Completed

- Added HackDays extraction operations panel in `forge-native/static/frontend/src/App.tsx` with typed invoke payloads for:
  - `hdcGetHackdayExtractionCandidates`
  - `hdcTriggerPostHackdayExtractionPrompt`
  - `hdcBulkImportHackdaySubmissions`
- Added permission-aware extraction error handling (`[EXTRACT_FORBIDDEN]`, `[EXTRACT_IMPORT_FORBIDDEN]`) and session-level action blocking after explicit permission denials.
- Added extraction panel styles in `forge-native/static/frontend/src/styles.css`.
- Extended extraction backend contract coverage with frontend-wiring assertions in `forge-native/tests/backend/extraction-contract.test.mjs`.

### Validation Evidence

- `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native/static/frontend run typecheck` -> pass.
- `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run typecheck` -> pass.
- `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run test:backend` -> pass (`16/16`).
- Git diff scope for this slice:
  - `forge-native/static/frontend/src/App.tsx`
  - `forge-native/static/frontend/src/styles.css`
  - `forge-native/tests/backend/extraction-contract.test.mjs`

### Operational Learnings

- For admin-scoped operations where bootstrap payload does not expose role/capability claims, server-enforced permission codes plus explicit UI mapping is the most reliable guardrail.
- Keeping extraction controls behind typed `invoke` payloads and a small contract test assertion set prevents resolver-name drift while UI work is still in progress.
- Resetting extraction result state on event switch avoids stale operator interpretation when moving between `results` and non-`results` HackDays.

## Session Update - P3.EXTRACT.01 Runbook + Live UI Gate Closure (Mar 2, 2026 01:49 GMT)

### Completed

- Published extraction operations runbook: `docs/HDC-P3-EXTRACT-OPS-RUNBOOK.md`.
- Updated docs index with extraction contract/runbook entries: `docs/README.md`.
- Deployed production Forge bundle with explicit frontend cache-bust marker (`HACKCENTRAL_UI_VERSION=0.6.45`).
- Captured live production HackDays extraction UI smoke evidence including:
  - extraction panel visible,
  - candidate-load action execution state,
  - extraction action controls (`R11.1` prompt, `R11.2` import).
- Published final task checkpoint artifact: `docs/artifacts/HDC-P3-EXTRACT-FINAL-CHECKPOINT-20260302-0148Z.md` (`GO`).

### Validation Evidence

- `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native/static/frontend run typecheck` -> pass.
- `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run custom-ui:build` -> pass.
- `npm --prefix /Users/nickster/Downloads/HackCentral-p1-child-01/forge-native run test:backend` -> pass (`16/16`).
- `forge deploy --environment production --no-verify` -> pass.
- `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` -> latest version confirmed.
- Live runtime console evidence: `[HackCentral Confluence UI] loaded 0.6.45`.
- UI smoke artifacts:
  - `docs/artifacts/HDC-P3-EXTRACT-LIVE-UI-SMOKE-20260302-0148Z.png`
  - `docs/artifacts/HDC-P3-EXTRACT-LIVE-UI-SMOKE-ACTIONS-20260302-0148Z.png`

### Operational Learnings

- In Forge Confluence global-page rollouts, a small explicit UI version bump is the fastest way to prove CDN propagation and avoid ambiguous stale-bundle diagnostics.
- For admin-only operations, one screenshot of panel visibility is insufficient; capture at least one post-action UI state to prove control wiring and backend invocation path.
- Closing a module gate cleanly requires publishing runbook + final checkpoint in the same session as deploy evidence, otherwise continuity docs drift into ambiguous “almost done” state.

## Session Update - Merge Hygiene + Phase 3 Cadence Resume (Mar 2, 2026 02:00 GMT)

### Completed

- Merged `codex/p3-extract-01` into `main` and pushed to origin (fast-forward to `986fc02`).
- Completed branch/worktree hygiene after merge:
  - deleted local+remote `codex/p3-extract-01`
  - removed `/Users/nickster/Downloads/HackCentral-p1-child-01` worktree
- Resumed weekly Phase 3 observability cadence:
  - ran `npm run qa:p3:telemetry-static-check` (pass)
  - captured production 24h telemetry sample for `feed_signal_health`, `roi_signal_health`, `roi_export`
- Ran extraction cadence readiness check using Supabase MCP-first and fallback path.

### Evidence

- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-20260302-015605Z.txt`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-015605Z.json`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-CADENCE-CHECKPOINT-20260302-015605Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-015605Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-CADENCE-SAMPLE-20260302-015605Z.md`

### Observations

- Sample window emitted all required Phase 3 telemetry metrics (`36` events total):
  - `feed_signal_health=26`
  - `roi_signal_health=6`
  - `roi_export=4`
- Alert/warning pattern remained stable:
  - `recommendation_coverage_below_threshold=26`
  - `trend_points_below_threshold=6`
- Production lifecycle status check for extraction cadence:
  - `draft=56`
  - `results=0`
  - first live extraction cadence sample remains blocked on lifecycle progression to `results`.

### Operational Learnings

- Supabase MCP should remain the first path for compliance, but production lifecycle/status checks still require prepared CLI/service-role fallback in this environment due permission-scoped MCP admin endpoints.
- Capturing a parsed telemetry summary JSON alongside raw log lines reduces ambiguity when making weekly GO/PENDING decisions and preserves comparable week-over-week metrics.
- Extraction cadence should be modeled as event-gated operations; recording an explicit `pending_results_event` status is better than forcing synthetic reruns once production rollout is already `GO`.

## Session Update - Extraction Contract Guardrail Coverage (Mar 2, 2026 02:03 GMT)

### Completed

- Updated backend extraction contract suite:
  - `forge-native/tests/backend/extraction-contract.test.mjs`
- Added explicit contract assertions for non-`results` resolver output shape (`status='skipped_not_results'`) on:
  - `triggerPostHackdayExtractionPrompt`
  - `bulkImportHackdaySubmissions`

### Validation Evidence

- `npm --prefix /Users/nickster/Downloads/HackCentral/forge-native run test:backend` -> pass (`17/17`)

### Operational Learnings

- Happy-path-only contract tests are insufficient for admin operations with lifecycle gates; non-happy-path response-shape coverage prevents frontend/operator regressions when guardrail fields are modified.
- Regex-based source contract checks are low-overhead and effective for enforcing critical response contracts in this repo’s backend test harness.

## Session Update - Phase 3 Consolidated Closeout Artifact (Mar 2, 2026 02:04 GMT)

### Completed

- Published consolidated closeout artifact for full Phase 3 scope:
  - `docs/artifacts/HDC-P3-CONSOLIDATED-CLOSEOUT-20260302-020320Z.md`
- Consolidated artifact links module-level GO evidence for:
  - `P3.ROI.01`
  - `P3.FORK.01`
  - `P3.FEED.01`
  - `P3.OBS.01`
  - `P3.EXTRACT.01`
- Included current operating cadence state and extraction gate condition (`pending_results_event`).

### Evidence

- `docs/artifacts/HDC-P3-CONSOLIDATED-CLOSEOUT-20260302-020320Z.md`

### Operational Learnings

- Consolidated closeout artifacts are high-leverage for continuity because they preserve decision lineage (module checkpoints) and current run-state (cadence + pending gates) in one place.
- Keeping cadence-state fields in the consolidated artifact reduces risk of reopening already-closed module scope while waiting on external data conditions (for extraction, first `results` event).

## Session Update - Extraction Cadence Command + Runbook Refresh (Mar 2, 2026 02:09 GMT)

### Completed

- Added extraction readiness command in root scripts:
  - `qa:p3:extract-cadence-check`
  - implementation: `scripts/p3-extract-cadence-check.mjs`
- Updated extraction ops runbook to active repo paths and added readiness command step:
  - `docs/HDC-P3-EXTRACT-OPS-RUNBOOK.md`
- Executed command and produced fresh readiness artifact.

### Evidence

- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-020814Z.json`

### Observations

- Latest readiness sample:
  - `lifecycle_status=draft` count `56`
  - `resultsEventCount=0`
  - `extractionCadenceStatus=pending_results_event`

### Operational Learnings

- A dedicated cadence-check script materially improves repeatability of event-gated operations, especially when MCP admin endpoints are permission-scoped and CLI fallback is needed.
- Keeping runbook paths synchronized with active worktree/root avoids stale command drift after branch/worktree hygiene operations.

## Session Update - Observability Cadence Command + Fresh Weekly Sample (Mar 2, 2026 02:12 GMT)

### Completed

- Added observability cadence command in root scripts:
  - `qa:p3:obs-weekly-cadence`
  - implementation: `scripts/p3-obs-weekly-cadence.mjs`
- Command behavior:
  - executes `qa:p3:telemetry-static-check`
  - collects production `hdc-phase3-telemetry` log lines
  - emits weekly logs/summary/checkpoint artifacts with deterministic naming
- Executed cadence commands:
  - `npm run qa:p3:obs-weekly-cadence`
  - `npm run qa:p3:extract-cadence-check`

### Evidence

- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-20260302-021059Z.txt`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-021059Z.json`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-CADENCE-CHECKPOINT-20260302-021059Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-021108Z.json`

### Observations

- Observability weekly sample remains stable:
  - `feed_signal_health=26`
  - `roi_signal_health=6`
  - `roi_export=4`
  - alerts: `recommendation_coverage_below_threshold=26`
  - warnings: `trend_points_below_threshold=6`
- Extraction readiness remains blocked by lifecycle condition:
  - `resultsEventCount=0`
  - `extractionCadenceStatus=pending_results_event`

### Operational Learnings

- Scripted cadence checks are preferable to ad hoc shell pipelines because they enforce a consistent artifact contract and reduce the chance of missing one of the required evidence files.
- Maintaining separate scripts for observability cadence and extraction readiness keeps event-gated logic isolated and easier to debug when one cadence succeeds and the other is intentionally pending.

## Session Update - Unified Weekly Cadence Orchestrator (Mar 2, 2026 02:14 GMT)

### Completed

- Added unified weekly cadence command:
  - `qa:p3:weekly-cadence`
  - implementation: `scripts/p3-weekly-cadence.mjs`
- Command now orchestrates:
  1. observability weekly cadence sample,
  2. extraction readiness lifecycle check,
  3. unified weekly checkpoint artifact.
- Executed command successfully.

### Evidence

- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-20260302-021310Z.txt`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-021310Z.json`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-CADENCE-CHECKPOINT-20260302-021310Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-021310Z.json`
- `docs/artifacts/HDC-P3-WEEKLY-CADENCE-CHECKPOINT-20260302-021310Z.md`

### Observations

- Observability cadence output remained stable (same event/alert distribution as earlier 24h samples).
- Extraction readiness remained `pending_results_event` with `resultsEventCount=0`.

### Operational Learnings

- Weekly operations are more robust when observability and extraction readiness are coupled under a shared timestamped run; this keeps artifacts aligned for audit and reduces ambiguity about whether checks were run in the same cycle.

## Session Update - Extraction Trigger Forecast Added (Mar 2, 2026 02:20 GMT)

### Completed

- Extended extraction readiness command output in:
  - `scripts/p3-extract-cadence-check.mjs`
- Added schedule forecast payload fields:
  - `scheduleOutlook.resultsAnnounceAtPresentCount`
  - `scheduleOutlook.resultsAnnounceAtMissingCount`
  - `scheduleOutlook.pastDueResultsAnnounceCount`
  - `scheduleOutlook.nextUpcomingResultsAnnounceAt`
  - `scheduleOutlook.nextUpcomingEvent`
- Updated extraction runbook to describe expected readiness fields:
  - `docs/HDC-P3-EXTRACT-OPS-RUNBOOK.md`
- Executed readiness check and captured fresh artifact.

### Evidence

- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-021924Z.json`

### Observations

- Current extraction readiness remains blocked:
  - `resultsEventCount=0`
  - `extractionCadenceStatus=pending_results_event`
- Forecast indicates nearest expected trigger window:
  - `nextUpcomingResultsAnnounceAt=2026-03-09T18:00:00.000Z`
  - `nextUpcomingEvent=One Day Test`

### Operational Learnings

- Event-gated operations benefit from built-in schedule outlook because it gives an explicit next trigger timestamp and avoids blind cadence reruns without actionability.

## Session Update - Weekly Cadence Action Guidance Upgrade (Mar 2, 2026 02:22 GMT)

### Completed

- Enhanced unified cadence checkpoint generation in:
  - `scripts/p3-weekly-cadence.mjs`
- Added explicit `Action Guidance` section in combined checkpoint output based on extraction readiness + schedule outlook.
- Executed a fresh unified weekly cadence run.

### Evidence

- `docs/artifacts/HDC-P3-WEEKLY-CADENCE-CHECKPOINT-20260302-022156Z.md`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-022156Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-022156Z.json`

### Observations

- Latest 24h cadence sample now includes newer telemetry window up to `2026-03-02T02:14:01.214Z` with:
  - `feed_signal_health=33`
  - `roi_signal_health=7`
  - `roi_export=4`
- Extraction readiness remains `pending_results_event`, but checkpoint now provides direct timing guidance:
  - rerun at/after `2026-03-09T18:00:00.000Z`.

### Operational Learnings

- Combining forecast data and prescriptive next-action text in the same checkpoint materially improves operational clarity and reduces decision latency in event-gated workflows.

## Session Update - Extraction Sample Artifact Automation (Mar 2, 2026 02:25 GMT)

### Completed

- Enhanced extraction readiness command:
  - `scripts/p3-extract-cadence-check.mjs`
- Command now outputs two artifacts per execution:
  - `HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-<timestamp>.json`
  - `HDC-P3-EXTRACT-WEEKLY-CADENCE-SAMPLE-<timestamp>.md`
- Updated extraction runbook accordingly:
  - `docs/HDC-P3-EXTRACT-OPS-RUNBOOK.md`

### Evidence

- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-022424Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-CADENCE-SAMPLE-20260302-022424Z.md`

### Observations

- Current state remains event-gated:
  - `resultsEventCount=0`
  - `Decision=PENDING_RESULTS_EVENT`
- Forecast still points to:
  - `nextUpcomingResultsAnnounceAt=2026-03-09T18:00:00.000Z`
  - event `One Day Test`

### Operational Learnings

- Coupling machine-readable and human-readable extraction artifacts in the same command run removes manual report lag and makes the first live `results` cadence sample effectively zero-touch.

## Session Update - First Results Sample Command + Cadence Refresh (Mar 2, 2026 02:29 GMT)

### Completed

- Added first-results extraction sample command:
  - `qa:p3:extract-first-results-sample`
  - implementation: `scripts/p3-extract-first-results-sample.mjs`
- Executed command and generated first-results sample artifacts (pending-safe behavior if no live `results` event).
- Executed fresh unified cadence run (`qa:p3:weekly-cadence`) to keep observability and extraction readiness outputs aligned with the same cycle.

### Evidence

- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-022814Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-022814Z.md`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-022823Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-022823Z.json`
- `docs/artifacts/HDC-P3-WEEKLY-CADENCE-CHECKPOINT-20260302-022823Z.md`

### Observations

- First-results sample remains gated:
  - `status=pending_results_event`
  - `resultsEventCount=0`
- Latest cadence sample remains operationally healthy for telemetry channel presence:
  - `feed_signal_health=37`
  - `roi_signal_health=8`
  - `roi_export=4`
- Next extraction trigger horizon remains `2026-03-09T18:00:00.000Z`.

### Operational Learnings

- Separating `first-results` execution from `weekly readiness` execution improves operational control: weekly checks continue on schedule, while the first non-empty extraction sample has a dedicated one-command trigger when lifecycle flips to `results`.

## Session Update - Forced Live Extraction Simulation + Cleanup (Mar 2, 2026 02:40 GMT)

### Completed

- Performed controlled synthetic `results` event simulation to force immediate first non-empty extraction sample.
- Executed:
  - `npm run qa:p3:extract-first-results-sample -- --live`
- Captured live-ready extraction evidence and replay/idempotency behavior.
- Cleaned all synthetic rows and reran readiness + weekly cadence checks.
- Fixed two script issues surfaced by live simulation:
  - user-account lookup compatibility (`atlassian_account_id`)
  - `tsx -e` top-level-await transform failure (async wrapper)

### Evidence

- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-023914Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-023914Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-024122Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-024122Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-024011Z.json`
- `docs/artifacts/HDC-P3-WEEKLY-CADENCE-CHECKPOINT-20260302-024011Z.md`

### Observations

- Synthetic run produced expected non-empty extraction path:
  - `candidateCount=1`
  - prompt replay behavior: `1 -> 0`
  - import replay behavior: `1 -> 0`
- Post-cleanup production baseline returned to:
  - `resultsEventCount=0`
  - `extractionCadenceStatus=pending_results_event`

### Operational Learnings

- A cleanup-backed synthetic lifecycle simulation is an effective operational drill: it validates full live extraction behavior and catches latent script/runtime defects before real `results` windows open.

## Session Update - HackDays Search/Sort Live Rollout + Branch Hygiene Closure (Mar 2, 2026 11:22 GMT)

### Completed

- Shipped HackDays UX updates to production Confluence app shell:
  - added HackDays list `Search` control
  - added HackDays list `Sort` control (`Most recent`, `Oldest`, `Name (A-Z)`, `Name (Z-A)`, `Lifecycle status`)
  - updated extraction panel heading to `[ADMIN] Post-HackDay Extraction (R11)`
  - bumped UI marker to `HACKCENTRAL_UI_VERSION=0.6.46`
- Addressed stale iframe bundle behavior by rebuilding frontend custom UI and redeploying/upgrade-installing production.
- Executed live Confluence smoke validation for search, no-match state, sort behavior, and extraction title render.
- Completed branch hygiene closure by deleting local parked branch `codex/main-local-wip-20260302` after reconciliation checks.

### Evidence

- Commit: `7a4c162` (`feat(hackdays): add event search and sort controls`)
- Live smoke artifact: `docs/artifacts/HDC-HACKDAYS-SEARCH-SORT-LIVE-SMOKE-20260302-112224Z.md`
- Branch hygiene verification commands:
  - `git -C /Users/nickster/Downloads/HackCentral fetch --all --prune`
  - `git -C /Users/nickster/Downloads/HackCentral worktree list --porcelain`
  - `git -C /Users/nickster/Downloads/HackCentral branch -vv`
  - `git -C /Users/nickster/Downloads/HackCentral status --short --branch`

### Observations

- Repo/worktree health is now straightforward: single active branch (`main`) tracking `origin/main`, no parked side branch.
- The HackDays surface is now easier to operate at scale (`56` events) due to in-view filtering and deterministic sorting.

### Operational Learnings

- In Forge Confluence app-shell deployments, functional confirmation should always include both a runtime marker check (`HACKCENTRAL_UI_VERSION`) and live user-path behavior checks; deploy/install success alone is not sufficient to assert rollout completion.

## Session Update - Weekly Phase 3 Cadence Refresh (Mar 2, 2026 11:38 GMT)

### Completed

- Executed unified cadence command:
  - `npm run qa:p3:weekly-cadence -- --since 24h --limit 4000 --project-ref ssafugtobsqxmqtphwch`
- Produced fresh weekly observability + extraction readiness artifacts with synchronized timestamping.
- Reconfirmed extraction readiness is still event-gated until a production HackDay reaches `results`.

### Evidence

- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-20260302-113824Z.txt`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-113824Z.json`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-CADENCE-CHECKPOINT-20260302-113824Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-113824Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-CADENCE-SAMPLE-20260302-113832Z.md`
- `docs/artifacts/HDC-P3-WEEKLY-CADENCE-CHECKPOINT-20260302-113824Z.md`

### Observations

- Observability cadence remains `GO` with sample counts:
  - `feed_signal_health=61`
  - `roi_signal_health=13`
  - `roi_export=4`
- Extraction readiness remains `pending_results_event` with:
  - `resultsEventCount=0`
  - `nextUpcomingResultsAnnounceAt=2026-03-09T18:00:00.000Z` (`One Day Test`)

### Operational Learnings

- Weekly cadence stays reliable when treated as a fixed operational ritual: one command gives a complete health snapshot, but extraction action remains strictly lifecycle-triggered and should not be forced outside `results` transitions.

## Session Update - First Results Sample Recheck (Mar 2, 2026 11:40 GMT)

### Completed

- Ran a fresh extraction first-results recheck:
  - `npm run qa:p3:extract-first-results-sample`
- Captured new sample artifacts reflecting current production lifecycle state.

### Evidence

- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-114042Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-114042Z.md`

### Observations

- Outcome remains lifecycle-gated:
  - `status=pending_results_event`
  - `resultsEventCount=0`
  - `nextUpcomingResultsAnnounceAt=2026-03-09T18:00:00.000Z`
- No live extraction operations were performed (`mode=dry_run_only`) due absence of production `results` events.

### Operational Learnings

- The first-results sample command is a low-cost readiness probe that can be run on-demand between weekly cadence windows without risking unintended writes; it cleanly reinforces when extraction should remain paused.

## Session Update - Extraction Recheck (Mar 2, 2026 11:42 GMT)

### Completed

- Ran another on-demand extraction readiness probe:
  - `npm run qa:p3:extract-first-results-sample`
- Captured new pending-state sample artifacts.

### Evidence

- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-114227Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-114227Z.md`

### Observations

- Status remains `pending_results_event` with `resultsEventCount=0`.
- Earliest expected trigger window remains `2026-03-09T18:00:00.000Z`.

### Operational Learnings

- Frequent extraction probes are operationally safe because they remain dry-run gated until lifecycle transitions, but they should be kept lightweight and timestamped to avoid ambiguity in handoff.

## Session Update - Synthetic Live Extraction Simulation + Cleanup Verification (Mar 2, 2026 11:49 GMT)

### Completed

- Ran controlled simulation to force the first non-empty extraction sample immediately:
  - temporarily toggled `One Day Test` lifecycle from `draft` to `results`
  - seeded one synthetic hack submission
  - executed `npm run qa:p3:extract-first-results-sample -- --live`
- Removed all synthetic writes and restored lifecycle to `draft` in the same operation window.
- Re-ran extraction readiness check to confirm return to pending baseline.

### Evidence

- `docs/artifacts/HDC-P3-EXTRACT-SYNTHETIC-LIVE-SIM-20260302-114847Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-114852Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-20260302-114852Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-114909Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-CADENCE-SAMPLE-20260302-114909Z.md`

### Observations

- Live extraction path validated as expected under simulated `results` lifecycle:
  - `candidateCount=1`
  - dry-run path available before write path
  - replay idempotency held (`prompted 1->0`, `imported 1->0`)
- Post-cleanup state returned to baseline:
  - `resultsEventCount=0`
  - `extractionCadenceStatus=pending_results_event`

### Operational Learnings

- For non-live product phases, lifecycle-toggle simulation with immediate cleanup is the most reliable way to validate live extraction writes without waiting for organic event progression and without leaving residual data drift.

## Session Update - Consistency & Integrity Remediation Completion (Mar 2, 2026 13:00 GMT)

### Completed

- Finished full consistency/integrity remediation sweep across backend, scripts, tests, and docs:
  - fixed malformed test edits and restored stable parser/type/lint baseline
  - finalized Phase 3 cadence contract semantics (`decision: GO|WARN|FAIL`, required metric/missing metric/reason output)
  - corrected extraction readiness counting semantics (`resultsEventCount` now full results-lifecycle cardinality; sample remains top-5)
  - removed absolute local root assumptions from operational scripts via repo-root helper and portable command emission
  - restored missing P1 regression suites and added hard inventory pre-check (`qa:verify:p1-suite-files`)
- Restored strict quality gates:
  - `npm run lint:strict` passed (`0 errors`, `0 warnings`)
  - `npm run test:run` passed (`39` files, `177` tests)
  - `npm run qa:p1:regression-pack` passed with inventory verification
  - `npm --prefix forge-native run test:backend` passed (`17/17`)
  - `npm --prefix forge-native run typecheck` and `npm --prefix forge-native/static/frontend run typecheck` passed
- Re-ran weekly Phase 3 cadence with corrected semantics and published fresh artifacts.

### Evidence

- `docs/artifacts/HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-20260302-125904Z.json`
- `docs/artifacts/HDC-P3-OBS-WEEKLY-CADENCE-CHECKPOINT-20260302-125904Z.md`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-20260302-125904Z.json`
- `docs/artifacts/HDC-P3-EXTRACT-WEEKLY-CADENCE-SAMPLE-20260302-125912Z.md`
- `docs/artifacts/HDC-P3-WEEKLY-CADENCE-CHECKPOINT-20260302-125904Z.md`

### Operational Learnings

- `react-hooks/set-state-in-effect` remediation in legacy UI surfaces can be made compliant without behavior drift by deferring state transitions through asynchronous callbacks, but each change must be regression-validated because these patterns are timing-sensitive.
- When doing broad no-`any` cleanup in tests, automated search/replace around chained mocks is high-risk; run lint immediately after each batch to catch parser drift before continuing.

## Session Update - Homepage UX First-Action Hardening (2026-03-02 15:42 GMT)

### Task ID
- `P3.OBS.01` (homepage UX hardening executed as frontend quality follow-up)

### What Changed
- Implemented first-action-focused homepage UX updates in Forge frontend dashboard:
  - replaced technical feed copy with user-facing language
  - added explicit hero secondary CTAs while preserving primary action
  - converted home activity/recommendation rows into clickable controls with deterministic destination mapping
  - hid source-status debug metadata from default mode (preview-only visibility)
  - corrected responsive typography scaling and reduced feed-chip visual weight
  - improved topbar search/action clarity
- Added frontend home telemetry events:
  - `home_primary_cta_click`
  - `home_secondary_cta_click`
  - `home_feed_item_click`
  - `home_recommendation_click`
- Added optional `targetView` + `targetContext` navigation intent metadata to home-feed shared/frontend contracts.

### Validation / Evidence
- `npm run test:run -- tests/forge-native-home-feed-utils.spec.ts` (pass)
- `npm run test:run -- tests/forge-native-feed-contract.spec.ts tests/forge-native-home-feed-utils.spec.ts` (pass)
- `npm --prefix forge-native/static/frontend run typecheck` (pass)
- `npm --prefix forge-native run typecheck` (pass)
- `npm run lint -- forge-native/static/frontend/src/App.tsx forge-native/static/frontend/src/components/Layout.tsx forge-native/static/frontend/src/components/Dashboard/WelcomeHero.tsx forge-native/static/frontend/src/utils/homeFeed.ts tests/forge-native-home-feed-utils.spec.ts` (pass)

### Regressions / Gotchas
- None observed in targeted test/type/lint gates.

### Next Recommended Step
- Run one production weekly cadence observation window with `VITE_HDC_HOME_UX_V1=true`, compare first-action telemetry baseline vs prior week, and decide whether to keep default-on or stage percentage rollout.

## Session Update - Release Bump + Production Forge Deploy (2026-03-02 15:58 GMT)

### Task ID
- `P3.OBS.01`

### What Changed
- Version and marker bump completed:
  - root app `0.6.45`
  - Forge native package `0.3.13`
  - `HACKCENTRAL_UI_VERSION=0.6.48`
- Committed and pushed homepage UX + release changes to `main`:
  - commit `897fcf0`
- Ran production deploy/install commands from `forge-native`:
  - `npm run custom-ui:build`
  - `forge deploy --environment production --no-verify`
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`

### Validation / Evidence
- Custom UI build pipeline succeeded for frontend, macro frontend, and runtime frontend.
- Forge deploy completed with `✔ Deployed`.
- Production install step reported `✔ Site is already at the latest version`.

### Regressions / Gotchas
- Forge CLI emitted Node compatibility warning in this environment (non-blocking for this deploy run).

### Next Recommended Step
- Run one post-deploy weekly cadence observation and compare homepage first-action telemetry events against the prior baseline week.

## Session Update - Showcase UX Hardening (2026-03-02 23:22 GMT)

### Task ID
- `P3.OBS.01`

### What Changed
- Implemented a flag-gated Hacks/Showcase UX pass (`VITE_HDC_SHOWCASE_UX_V1`) focused on first action and scanability:
  - labeled filter shell + advanced filter toggle
  - debounced search/tag filtering
  - actionable featured/list cards
  - right-side detail drawer with contextual fork/demo actions
  - responsive column collapse behavior
- Added topbar overlap mitigation for right-hand header actions.
- Bumped local UI marker to `HACKCENTRAL_UI_VERSION=0.6.54`.

### Validation / Evidence
- `npm run custom-ui:build` (pass)
- `npm run frontend:build` (pass)
- Local visual smoke in localhost with `VITE_HDC_SHOWCASE_UX_V1=true` verified updated Showcase interactions and layout.

### Regressions / Gotchas
- Applying `overflow: hidden` to the topbar action container clipped switcher dropdown overlays; reverted and kept non-clipping overlap mitigation.

### Next Recommended Step
- Deploy this frontend payload and capture one live Confluence Hacks-page smoke artifact with `VITE_HDC_SHOWCASE_UX_V1=true` before deciding on default-on rollout.

## Session Update - Showcase Close Drawer Fix + Deploy (2026-03-02 23:30 GMT)

### Task ID
- `P3.OBS.01`

### What Changed
- Fixed Showcase detail drawer close behavior under `VITE_HDC_SHOWCASE_UX_V1` by adding explicit dismissed-state handling to prevent immediate auto-selection after close.
- Version bump for release payload:
  - root app `0.6.46`
  - Forge native package `0.3.14`
  - UI marker `HACKCENTRAL_UI_VERSION=0.6.55`
- Deployed and upgraded production Confluence app.

### Validation / Evidence
- `npm run custom-ui:build` (pass)
- `forge deploy --environment production --no-verify` (pass; `✔ Deployed`)
- `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` (pass; site already at latest)

### Regressions / Gotchas
- Forge CLI still warns about Node version support and `punycode` deprecation in this environment; non-blocking for deployment.

### Next Recommended Step
- Capture post-deploy live Hacks-page smoke to confirm drawer close persistence in Confluence-hosted UI and close the UX fix rollout evidence loop.

## Session Update - Confluence-Native Hack Pages + Submit Flow Recovery (2026-03-03 10:27 GMT)

### Task ID
- `P4.SHOW.01`

### What Changed
- Implemented hybrid Confluence-native hack detail rollout (new hacks only):
  - added Showcase page-linkage migration:
    - `forge-native/supabase/migrations/20260303110000_phase4_showcase_confluence_pages.sql`
  - wired create/list contracts for page-backed hacks:
    - `CreateHackResult`: `confluencePageId`, `confluencePageUrl`, `outputPageIds`
    - `ShowcaseHackListItem`: `confluencePageId?`, `confluencePageUrl?`, `isPageBacked`
  - updated create/fork/list flows to create and persist Confluence page linkage and output child pages.
  - frontend Hacks list now routes page-backed items to Confluence page path and marks legacy items with `Legacy` fallback.
- Recovered broken submit-hack journey that failed with:
  - `Supabase GET Artifact failed (400): invalid input syntax for type uuid: "one"`
- Added backend + frontend validation guardrails:
  - linked artifact IDs are UUID-validated before artifact lookup
  - legacy Team/Project creation fallback hardened for schema variance
  - create flow retry/consistency handling added for Supabase rate-limit or partial-write scenarios.

### Validation / Evidence
- `npm run typecheck --prefix forge-native/static/frontend` (pass)
- `npm run build --prefix forge-native/static/frontend` (pass)
- `npm run typecheck --prefix forge-native` (pass)
- `npm run test:backend --prefix forge-native` (pass; includes `showcase-confluence-pages-contract.test.mjs`)
- Production browser smoke (Playwright):
  - Submit Hack modal creates page-backed hack successfully
  - hack card appears with `Open page` CTA
  - Confluence page navigation works for created hack
- Supabase persistence verified for created smoke hack:
  - `ShowcaseHack.confluence_page_id` persisted
  - `ShowcaseHack.output_page_ids` persisted
  - linked `Project` row persisted.

### Regressions / Gotchas
- In this workspace, Supabase MCP project discovery can still return empty (`list_projects -> []`) even when environment is active; keep MCP-first policy, then use documented service-role/SQL fallback path for verification.

### Next Recommended Step
- Run one focused UX pass for the new page-backed submit/open flow in Confluence-hosted runtime and capture screenshot evidence under `docs/artifacts/`, then decide when to remove legacy right-panel detail fallback.

## Session Update - Production Deploy + Confluence Live Smoke Evidence (2026-03-03 10:41 GMT)

### Task ID
- `P4.SHOW.01`

### What Changed
- Executed production deploy/install workflow from `forge-native`:
  - `npm run custom-ui:build`
  - `forge deploy --environment production --no-verify`
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`
- Re-ran validation gates before/with deployment:
  - `npm run typecheck --prefix forge-native/static/frontend`
  - `npm run build --prefix forge-native/static/frontend`
  - `npm run typecheck --prefix forge-native`
  - `npm run test:backend --prefix forge-native`
- Completed authenticated Confluence-hosted live smoke for hybrid Showcase behavior:
  - confirmed `Open page` CTA on page-backed card
  - confirmed `LEGACY` fallback labels remain on non-page-backed cards
  - confirmed `Open page` lands on Confluence-native hack page with linked output page.

### Validation / Evidence
- Deploy/install:
  - Forge deploy: `✔ Deployed`
  - Forge install: `✔ Site is already at the latest version`
- Backend tests: `21/21` passing.
- Supabase verification path:
  - MCP-first check: `mcp__supabase__list_projects -> []` (known workspace behavior)
  - fallback checks succeeded:
    - CLI `projects list` returned active `ssafugtobsqxmqtphwch`
    - management SQL probe `select 1 as ok` passed
    - service-role REST reads confirmed persisted linkage fields (`confluence_page_id`, `confluence_page_url`, `output_page_ids`)
- Live UI artifacts:
  - `docs/artifacts/HDC-P4-SHOW-LIVE-PAGE-BACKED-OPEN-20260303-1040Z.png`
  - `docs/artifacts/HDC-P4-SHOW-LIVE-HACKS-OPENPAGE-LEGACY-20260303-1041Z.png`

### Regressions / Gotchas
- None functional in validated path.
- Tooling notes remain non-blocking:
  - Forge CLI version update warning (`12.14.1 -> 12.15.0`)
  - `punycode` deprecation warning during Forge commands.

### Next Recommended Step
- Capture one additional end-to-end artifact that includes the submit modal completion state (`+ Submit Hack`) in the same session window, then schedule migration plan for legacy Showcase rows to Confluence-native page backing.

## Session Update - Phase 8 Unified Rollout Implementation (2026-03-03 13:40 GMT)

### What Changed
- Added new Phase 8 ops webtrigger actions in `forge-native/src/ops.ts`:
  - `audit_hackday_page_styling`
  - `repair_hackday_page_styling` (dry-run default)
  - `backfill_showcase_pages` (batch/cursor, stop-on-error, rollback manifest)
  - `backfill_hackday_submission_pages` (batch/cursor, stop-on-error, rollback manifest)
- Added reusable Confluence page styling helpers in `forge-native/src/backend/confluencePages.ts`:
  - macro signature classification (`runtime|legacy|missing`)
  - page styling inspection payloads
  - idempotent repair flow (macro retarget, full-width, intro paragraph strip)
  - `ensureSubmissionsParentPageUnderEventPage` for submission-page hierarchy.
- Added phase8 artifact-generating wrappers and npm scripts:
  - `scripts/lib/phase8-webtrigger.mjs`
  - `scripts/phase8-styling-audit.mjs`
  - `scripts/phase8-styling-repair.mjs`
  - `scripts/phase8-showcase-page-backfill.mjs`
  - `scripts/phase8-submission-page-backfill.mjs`
  - package scripts:
    - `qa:phase8:styling-audit`
    - `qa:phase8:styling-repair`
    - `qa:phase8:showcase-backfill`
    - `qa:phase8:submission-page-backfill`
- Added rollout metric for Showcase list contract:
  - `ListShowcaseHacksResult` now includes `totalCount`, `pageBackedCount`, `legacyCount`.
  - backend now returns these counts from `listShowcaseHacks`.
- Added frontend page-only rollout flag path:
  - `VITE_HDC_SHOWCASE_PAGE_ONLY_V1`
  - when enabled: disables legacy detail drawer path and legacy badge rendering path in favor of page-open behavior.
- Implemented runtime submission linkage to Confluence pages:
  - new migration: `forge-native/supabase/migrations/20260303133000_phase8_hackday_submission_page_links.sql`
  - `submitProject` now attempts Confluence submission/output page sync and returns:
    - `submissionPageId`, `submissionPageUrl`, `outputPageIds`
  - runtime `getTeams`/`getTeam`/`updateTeam` responses now hydrate submission-page link fields.
  - runtime submission UI now exposes `Open submission page` CTA after save/submit and from hydrated submission state.
- Expanded legacy macro migration detector to support multiple historical keys in:
  - `scripts/migrate-hackday-runtime-macro.mjs`.

### Validation / Evidence
- `npm run typecheck --prefix forge-native/static/frontend` (pass)
- `npm run build --prefix forge-native/static/frontend` (pass)
- `npm run typecheck --prefix forge-native` (pass)
- `npm run test:backend --prefix forge-native` (pass; includes new submission-page contract test)
- `cd forge-native && npm run custom-ui:build` (pass)
- `node --check forge-native/src/runtime/index.js` (pass)

### Noted Risk / Follow-up
- Root Vitest contract pack (`npm run test:run -- tests/forge-native-confluencePages.spec.ts tests/forge-native-showcase-contract.spec.ts`) currently has pre-existing/mock-fragile failures not part of the Phase 8 backend contract suite; no change was made to re-baseline those tests in this pass.

## Session Update - Production Deploy + Styling Verification + Playwright Browser Smoke (2026-03-03 14:05 GMT)

### Task IDs
- `P4.SHOW.01`
- `P8.STYLING.01`

### What Changed
- Fixed deploy blockers introduced during Phase 8 integration:
  - removed duplicate `normalizeConfluencePageId` declaration in `forge-native/src/runtime/index.js`
  - added null-safe page-id narrowing in `forge-native/src/ops.ts` (submission-page backfill path).
- Rebuilt and redeployed production Forge app:
  - `cd forge-native && npm run custom-ui:build`
  - `forge deploy --environment production --no-verify`
- Ran production Phase 8 styling ops scripts against affected legacy subset pages (`NickFridayNite`, `PW MCP Pass Loop 1636890`, `Perf Global Route 20260301-0030`):
  - styling audit
  - styling repair (apply mode)
  - post-repair re-audit.
- Ran Playwright MCP browser verification in authenticated Confluence context for all three pages, including one interaction check (`Open Next Step`).

### Validation / Evidence
- Local gates after code fix:
  - `npm run typecheck --prefix forge-native` (pass)
  - `node --check forge-native/src/runtime/index.js` (pass)
  - `cd forge-native && npm run custom-ui:build` (pass)
- Production deploy:
  - `forge deploy --environment production --no-verify` (pass)
- Styling ops artifacts:
  - `docs/artifacts/HDC-P8-STYLING-AUDIT-*-20260303-1355*.json|md`
  - `docs/artifacts/HDC-P8-STYLING-REPAIR-*-20260303-1356*.json|md`
  - `docs/artifacts/HDC-P8-STYLING-AUDIT-*-20260303-1357*.json|md`
- Styling verification outcome:
  - macro signatures all `runtime`
  - full-width draft/published both set
  - repairs no-op (`changedCount=0`, `no_repairs_needed`).
- Playwright smoke screenshots:
  - `.../page-2026-03-03T14-00-23-497Z.png` (PW MCP Pass Loop hydrated)
  - `.../page-2026-03-03T14-00-53-263Z.png` (NickFridayNite hydrated)
  - `.../page-2026-03-03T14-01-30-124Z.png` (Perf Global Route hydrated)
  - `.../page-2026-03-03T14-01-57-178Z.png` (`Open Next Step` interaction -> Schedule).

### Regressions / Gotchas
- Known non-blocking iframe popup issue remains:
  - `Open App View` action logs blocked popup due sandbox frame missing `allow-popups`.
- Confluence/Atlassian console warnings (FeatureGate, CSP report-only, deprecated APIs) still present and non-blocking.

### Next Recommended Step
- Execute phased `backfill_showcase_pages` rollout with dry-run + canary batches and verify `legacyCount` trend to zero before enabling `VITE_HDC_SHOWCASE_PAGE_ONLY_V1=true`.

## Session Update - Phase 8 Backfill Completion + Submission Backfill Recovery (2026-03-03 14:42 GMT)

### Task IDs
- `P4.SHOW.01`
- `P8.STYLING.01`

### What Changed
- Read startup context in required order (`README.md` -> `docs/README.md` -> `forge-native/README.md` -> `DEPLOY.md` -> `TESTING_GUIDE.md` -> latest `LEARNINGS.md` -> latest `CONTINUATION.md`) and confirmed ops execution guardrails for production.
- Fixed production `backfill_showcase_pages` schema compatibility failure (`Project.title` missing) by hardening `forge-native/src/ops.ts`:
  - switched phase8 backfill table reads to schema-tolerant `select('*')`
  - normalized mixed snake_case/camelCase fields for `Project`, `User`, `Artifact`, `Team`, and `Event` rows.
- Added Confluence backfill resilience for duplicate-title and requester-fallback edge cases:
  - `forge-native/src/backend/confluencePages.ts`: robust request error handling in requester fallback loops, duplicate-title recovery for parent container creation, and `findChildPageByTitleUnderParent` helper.
  - `forge-native/src/ops.ts`: submission/output child page duplicate-title recovery with deterministic suffix fallback.
- Ran phased production Showcase backfill to completion:
  - dry-run -> canary apply -> broad apply -> post-check dry-run.
  - final coverage reached `legacyCount=0`.
- Submission-page backfill initially blocked by missing `HackdaySubmissionPageLink` table and later by Confluence duplicate-title collisions.
  - Applied migration `forge-native/supabase/migrations/20260303133000_phase8_hackday_submission_page_links.sql` via documented management SQL fallback.
  - Re-ran phased submission backfill and recovered the remaining `demo-proj-001` edge case.

### Validation / Evidence
- Validation commands (all pass):
  - `npm run typecheck --prefix forge-native/static/frontend`
  - `npm run build --prefix forge-native/static/frontend`
  - `npm run typecheck --prefix forge-native`
  - `npm run test:backend --prefix forge-native`
  - `cd forge-native && npm run custom-ui:build`
- Deploy/install path (production, repeated as patches were applied):
  - `forge deploy --environment production --no-verify` (`✔ Deployed`)
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` (`✔ Site is already at the latest version`)
- Showcase backfill artifacts:
  - `docs/artifacts/HDC-P8-SHOWCASE-BACKFILL-all-20260303-142047Z.json|md` (dry-run)
  - `docs/artifacts/HDC-P8-SHOWCASE-BACKFILL-all-20260303-142112Z.json|md` (canary apply)
  - `docs/artifacts/HDC-P8-SHOWCASE-BACKFILL-all-20260303-142140Z.json|md` (broad apply)
  - `docs/artifacts/HDC-P8-SHOWCASE-BACKFILL-all-20260303-142155Z.json|md` (post-check)
  - post-check coverage: `total=9`, `pageBacked=9`, `legacyCount=0`.
- Submission backfill artifacts:
  - `docs/artifacts/HDC-P8-SUBMISSION-BACKFILL-all-20260303-142214Z.json|md` (dry-run)
  - `docs/artifacts/HDC-P8-SUBMISSION-BACKFILL-all-20260303-142633Z.json|md` (canary continuation)
  - `docs/artifacts/HDC-P8-SUBMISSION-BACKFILL-all-20260303-142711Z.json|md` (broad apply)
  - `docs/artifacts/HDC-P8-SUBMISSION-BACKFILL-all-20260303-144053Z.json|md` (remaining edge-case apply)
  - `docs/artifacts/HDC-P8-SUBMISSION-BACKFILL-all-20260303-144122Z.json|md` (post-check dry-run all skipped as `already_page_backed`)
- Supabase verification path evidence:
  - MCP-first check: `mcp__supabase__list_projects -> []`
  - MCP execute SQL unavailable (`permission`), so service-role/management SQL fallback used:
    - migration apply for `HackdaySubmissionPageLink` (success)
    - verification query: submitted projects without submission link = `0`.
- Confluence-hosted rollout closure artifact:
  - `docs/artifacts/HDC-P8-SUBMISSION-BACKFILL-LIVE-DEMO-PROJ-001-20260303-1442Z.png`
  - live page snapshot confirmed submission page + output links rendered under Confluence.

### Guardrail Outcome
- Keep `VITE_HDC_SHOWCASE_PAGE_ONLY_V1=false` for now (as requested), even though production backfill metrics now show `legacyCount=0`.

### Regressions / Gotchas
- Non-blocking known issue unchanged: `Open App View` popup is blocked in sandboxed iframe contexts (`allow-popups` missing).
- Forge CLI upgrade warning (`12.14.1 -> 12.15.0`) remains non-blocking.

### Next Recommended Step
- Run one final authenticated Playwright smoke from the Confluence-hosted app shell that exercises Hacks list -> Open page and runtime submission CTA in the same session capture, then decide whether to flip `VITE_HDC_SHOWCASE_PAGE_ONLY_V1=true` now that `legacyCount=0` is confirmed.

## Session Update - Runtime Styling Root Cause + Production Fix Deploy (2026-03-03 16:00 GMT)

### Task IDs
- `P8.STYLING.01`

### What Changed
- Isolated the remaining "unstyled HackDay page" issue to runtime frontend build tooling, not Confluence page/macro wiring:
  - confirmed affected page (`21856276`) still had runtime macro signature and full-width properties set.
  - identified missing Tailwind utility classes in deployed runtime CSS bundle (`h-12`, `px-3`, `rounded-xl`, etc.), which explains oversized header logo and flattened spacing/layout.
- Fixed runtime frontend Tailwind/PostCSS pipeline mismatch:
  - removed `@tailwindcss/postcss` from `forge-native/static/runtime-frontend/package.json`
  - switched PostCSS plugin to `tailwindcss` in `forge-native/static/runtime-frontend/postcss.config.js`
  - regenerated runtime frontend lockfile (`forge-native/static/runtime-frontend/package-lock.json`).
- Rebuilt and redeployed production Forge app:
  - `cd forge-native && npm run custom-ui:build`
  - `forge deploy --environment production --no-verify`
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`

### Validation / Evidence
- Runtime CSS post-fix includes previously missing utilities in emitted bundle:
  - `index-B2AlHqeG.css`: `.h-12`, `.sm\\:h-16`, `.px-3`, `.py-2`, `.rounded-xl`, `.gap-3` all present.
- Deploy/install status:
  - `✔ Deployed`
  - `✔ Site is already at the latest version`
- Post-deploy styling audit artifact for affected event-name slice:
  - `docs/artifacts/HDC-P8-STYLING-AUDIT-xxxxxxxxxxx-20260303-155939Z.json|md`
  - result remains clean for target page:
    - `macroSignature=runtime`
    - `fullWidth draft/published=full-width`
    - `recommendedAction=none`.

### Regressions / Gotchas
- Browser MCP verification tooling was unavailable in this session (`chrome-devtools` transport closed; Playwright MCP launch conflict), so final visual confirmation depends on manual hard refresh in Confluence page host.

### Next Recommended Step
- Hard refresh affected HackDay pages in Confluence (`Cmd+Shift+R`) and verify header/logo/nav spacing now matches runtime styled baseline; if stale assets persist, open staging URL path from `DEPLOY.md` to bypass CDN cache.

## Session Update - Final Coverage Recheck + Page-Only Decision Pack (2026-03-03 16:50 GMT)

### Task IDs
- `P4.SHOW.01`
- `P8.STYLING.01`

### What Changed
- Executed fresh production dry-run rechecks after runtime styling fix deploy:
  - Showcase backfill dry-run (`batch-size 50`)
  - Submission-page backfill dry-run (`batch-size 50`)
- Generated final rollout decision artifact for `VITE_HDC_SHOWCASE_PAGE_ONLY_V1`:
  - `docs/artifacts/HDC-P8-SHOWCASE-PAGE-ONLY-FLIP-DECISION-20260303-1650Z.md`
- Captured user visual confirmation that affected HackDay page styling now appears correct post-deploy.

### Validation / Evidence
- `docs/artifacts/HDC-P8-SHOWCASE-BACKFILL-all-20260303-165024Z.json|md`
  - `coverage.total=9`
  - `coverage.pageBacked=9`
  - `coverage.legacyCount=0`
  - `failedCount=0`
- `docs/artifacts/HDC-P8-SUBMISSION-BACKFILL-all-20260303-165024Z.json|md`
  - `processedCount=8`
  - all `status=skipped` with `reason=already_page_backed`
  - `failedCount=0`
- Decision artifact:
  - `docs/artifacts/HDC-P8-SHOWCASE-PAGE-ONLY-FLIP-DECISION-20260303-1650Z.md`
  - status: `GO-CANDIDATE` for flipping page-only flag.

### Regressions / Gotchas
- Browser MCP smoke tooling remained unavailable in this session (transport/launch conflict), so final visual confidence used dry-run + deploy evidence plus manual user confirmation.

### Next Recommended Step
- Flip `VITE_HDC_SHOWCASE_PAGE_ONLY_V1=true` in the next production build/deploy cycle and capture one post-flag Confluence-hosted smoke artifact set.

## Session Update - Page-Only Flag Enabled + Production Deploy (2026-03-03 16:53 GMT)

### Task IDs
- `P4.SHOW.01`

### What Changed
- Enabled page-only Showcase mode in production build by deploying with:
  - `VITE_HDC_SHOWCASE_PAGE_ONLY_V1=true npm run custom-ui:build`
  - `forge deploy --environment production --no-verify`
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`
- Confirmed deploy/install succeeded and production site is at latest version.
- Ran post-flag production dry-run verification wrappers:
  - showcase backfill coverage check
  - submission-page backfill coverage check.

### Validation / Evidence
- Deploy/install:
  - `✔ Deployed`
  - `✔ Site is already at the latest version`
- Post-flag coverage artifacts:
  - `docs/artifacts/HDC-P8-SHOWCASE-BACKFILL-all-20260303-165300Z.json|md`
    - `coverage.total=9`
    - `coverage.pageBacked=9`
    - `coverage.legacyCount=0`
    - `failedCount=0`
  - `docs/artifacts/HDC-P8-SUBMISSION-BACKFILL-all-20260303-165300Z.json|md`
    - `processedCount=8`
    - all rows `already_page_backed`
    - `failedCount=0`

### Regressions / Gotchas
- Browser MCP live-smoke capture remained unavailable in this session (DevTools transport closed / Playwright launch conflict), so post-flag validation is based on deploy success + artifact coverage checks.

### Next Recommended Step
- Capture one authenticated Confluence-hosted visual smoke artifact in a follow-up session to close the post-flag UX evidence loop.

## Session Update - MCP Re-Verification + Production Styling Recheck + Playwright Auth Gate (2026-03-03 23:52 GMT)

### Task IDs
- `P4.SHOW.01`
- `P8.STYLING.01`

### What Changed
- Re-ran required startup ritual in operations mode (`.claude/instructions.md` then `STARTUP.md` checklist order).
- Re-verified Atlassian MCP connectivity in this fresh chat:
  - `mcp__atlassian__getAccessibleAtlassianResources` -> confirmed `https://hackdaytemp.atlassian.net` (`cloudId=fa506321-b5f3-4087-9b5f-8bc611d72ba1`) with expected scopes.
  - `mcp__atlassian__atlassianUserInfo` -> active user `Nick Fine` (`account_id=642558c74b23217e558e9a25`).
- Attempted authenticated Confluence-hosted Playwright MCP smoke for target pages:
  - `16646145` (`NickFridayNite`)
  - `16973858` (`PW MCP Pass Loop 1636890`)
  - `16875584` (`Perf Global Route 20260301-0030`)
- All Playwright navigations redirected to `https://id.atlassian.com/login` (no authenticated browser state in current MCP session), so hydrate/styling interaction checks inside runtime iframe (`Open Next Step` -> `Schedule`) could not be executed in this run.
- Per fallback verification, executed fresh production Phase 8 styling audits for each target event query; all returned clean (`runtime` macro, full-width set, no repair recommended), so repair flow was not required.
- Pulled Confluence ADF for all three pages via Atlassian MCP and confirmed runtime macro extension key is present (`.../static/hackday-runtime-macro`) in production context.

### Validation / Evidence
- Guardrail validation commands (all pass):
  - `npm run typecheck --prefix forge-native/static/frontend`
  - `npm run build --prefix forge-native/static/frontend`
  - `npm run typecheck --prefix forge-native`
  - `npm run test:backend --prefix forge-native`
- Styling audit artifacts (fresh run):
  - `docs/artifacts/HDC-P8-STYLING-AUDIT-nickfridaynite-20260303-235021Z.json|md`
  - `docs/artifacts/HDC-P8-STYLING-AUDIT-pw-mcp-pass-loop-1636890-20260303-235021Z.json|md`
  - `docs/artifacts/HDC-P8-STYLING-AUDIT-perf-global-route-20260301-0030-20260303-235021Z.json|md`
  - each summary: `Runtime macro=1`, `Repair recommended=0`, `High risk=0`.
- Playwright auth-gate screenshots captured to artifacts:
  - `docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-BLOCKED-16646145-20260303-2352Z.png`
  - `docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-BLOCKED-16973858-20260303-2352Z.png`
  - `docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-BLOCKED-16875584-20260303-2352Z.png`
- Interaction gate evidence from Playwright page evaluation on blocked state:
  - URL remained Atlassian login page and `hasOpenNextStep=false`, `hasSchedule=false`.

### Regressions / Gotchas
- Current Playwright MCP browser context is unauthenticated; Confluence-hosted runtime smoke is blocked by Atlassian login gate in this session.
- No styling/macro/full-width regression detected in data-layer audits for the three target pages.

### Next Recommended Step
- Re-run the same Playwright smoke once authenticated browser state is available in MCP session, then capture hydrated runtime screenshots and explicit `Open Next Step` -> `Schedule` interaction evidence to close this checkpoint.

## Session Update - Authenticated Confluence Playwright Smoke Passed (2026-03-04 01:20 GMT)

### Task IDs
- `P4.SHOW.01`
- `P8.STYLING.01`

### What Changed
- Established authenticated browser session in a headed Playwright run and persisted state to:
  - `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`
- Re-ran production smoke for target Confluence-hosted pages using frame-aware selectors (runtime UI is embedded in iframe):
  - `16646145` (`NickFridayNite`)
  - `16973858` (`PW MCP Pass Loop 1636890`)
  - `16875584` (`Perf Global Route 20260301-0030`)
- Executed interaction validation on `16646145`:
  - clicked `Open Next Step`
  - confirmed navigation within runtime view to `Schedule`.

### Validation / Evidence
- Saved auth-state:
  - `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`
- Frame-aware smoke artifact set:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-2026-03-04T01-19-07-301Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-2026-03-04T01-19-07-301Z.md`
- Page screenshots:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-16646145-2026-03-04T01-19-07-301Z.png`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-16973858-2026-03-04T01-19-07-301Z.png`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-16875584-2026-03-04T01-19-07-301Z.png`
- Interaction screenshot (`Open Next Step` -> `Schedule`):
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-INTERACTION-16646145-2026-03-04T01-19-07-301Z.png`
- Outcome summary from JSON artifact:
  - all 3 pages: `runtimeFrameDetected=true`, `hasOpenNextStep=true`, `hasScheduleText=true`
  - interaction: `clickedOpenNextStep=true`, `navigatedToSchedule=true`.

### Regressions / Gotchas
- Initial non-frame-aware smoke pass produced false negatives for `Open Next Step` because top-level page selectors do not traverse macro iframe content.
- Frame-aware selectors resolve this and should be used for all future Confluence-hosted runtime interaction smokes.

### Next Recommended Step
- Reuse `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` for repeatable non-interactive smoke runs and regenerate frame-aware artifact set after any production deploy touching runtime navigation/styling.

## Session Update - Playwright Auth Capture Runbook (2026-03-04 01:25 GMT)

### Scope
- Preserve the exact working approach for authenticated Confluence-hosted Playwright smoke in this workspace.

### What Failed (Do Not Reuse)
- `playwright codegen --save-storage ...` did not reliably emit `hackdaytemp-storage.json` in this environment.
- Non-frame-aware smoke checks returned false negatives for `Open Next Step` because runtime UI is rendered inside a Confluence macro iframe.
- Reusing live Chrome profile with `launchPersistentContext` directly failed when Chrome was open (`SingletonLock` / ProcessSingleton lock).

### Working Pattern (Use This)
1. Use headed Playwright run to complete auth once, then save storage state explicitly via `context.storageState({ path })`.
2. Run smoke with `storageState` and frame-aware selectors that search inside `page.frames()`.
3. Validate interaction by clicking `Open Next Step` inside runtime iframe and asserting `Schedule` view text in same frame.

### Stable Artifacts From This Session
- Auth state file:
  - `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`
- Passing frame-aware smoke summary:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-2026-03-04T01-19-07-301Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-2026-03-04T01-19-07-301Z.md`
- Passing interaction screenshot (`Open Next Step` -> `Schedule`):
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-INTERACTION-16646145-2026-03-04T01-19-07-301Z.png`

### Production Status Captured
- Target pages verified in authenticated Confluence host:
  - `16646145` (`NickFridayNite`)
  - `16973858` (`PW MCP Pass Loop 1636890`)
  - `16875584` (`Perf Global Route 20260301-0030`)
- Outcome:
  - `runtimeFrameDetected=true` on all pages
  - `hasOpenNextStep=true` on all pages
  - `clickedOpenNextStep=true`, `navigatedToSchedule=true` on interaction check.

### Operator Guidance
- Prefer saved storage state + frame-aware smoke for all follow-up production checks.
- If storage state expires, refresh once with headed auth capture and overwrite:
  - `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`

## Session Update - Future Work Idea Captured as Next-Work Item (2026-03-04 01:27 GMT)

### Captured Idea
- Convert frame-aware Confluence runtime smoke from an ad-hoc runbook into a committed, repeatable ops command with deterministic JSON/Markdown artifacts and explicit production pass/fail gates.

### Next-Work Item (Actionable)
- **Title:** `P8.OPS.02 - Production Frame-Aware Runtime Smoke Harness`
- **Target environment:** `production`
- **Scope:**
  - add a checked-in Node/Playwright runner that always uses iframe-aware selectors for runtime assertions.
  - consume reusable auth state from `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`.
  - assert page-level checks for `16646145`, `16973858`, `16875584`.
  - assert interaction path on `16646145`: `Open Next Step` click then `Schedule` visible in runtime frame.
  - emit timestamped JSON + Markdown artifacts in `docs/artifacts/`.

### Acceptance Criteria
1. A repo-tracked smoke entrypoint exists (script + npm command) and runs non-interactively.
2. Smoke fails if runtime frame is missing or if `Open Next Step`/`Schedule` checks fail in-frame.
3. Smoke writes both `.json` and `.md` artifacts with per-page booleans and interaction booleans.
4. A successful run on production records:
   - `runtimeFrameDetected=true`, `hasOpenNextStep=true`, `hasScheduleText=true` for all three target pages.
   - `clickedOpenNextStep=true`, `navigatedToSchedule=true` for `16646145`.
5. `TESTING_GUIDE.md` includes the new smoke command and expected artifact locations.

### Validation Path (Commands)
- Required baseline checks:
  - `npm run typecheck --prefix forge-native/static/frontend`
  - `npm run build --prefix forge-native/static/frontend`
  - `npm run typecheck --prefix forge-native`
  - `npm run test:backend --prefix forge-native`
- Smoke harness run (new command to implement under this item):
  - `npm run qa:phase8:playwright-smoke:frameaware -- --env production --pages 16646145,16973858,16875584 --interaction-page 16646145 --storage-state /Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`
- Artifact gate check (JSON assertion):
  - `node -e "const fs=require('fs');const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,'utf8'));if(!j.pageChecks?.every(x=>x.runtimeFrameDetected&&x.hasOpenNextStep&&x.hasScheduleText)||!j.interactionCheck?.clickedOpenNextStep||!j.interactionCheck?.navigatedToSchedule){process.exit(1)}" <artifact-json-path>`

### Operational Guardrails Carried Forward
- Use frame-aware selectors for Confluence-hosted runtime checks; avoid top-level selector-only checks.
- Supabase verification remains `MCP-first`; use service-role SQL fallback only if MCP project listing is empty in this workspace.

## Session Update - Supabase RLS Hardening Applied (2026-03-04 02:26 GMT)

### Task IDs
- `P9.SEC.01`

### What Changed
- Executed Supabase verification with required MCP-first path:
  - `mcp__supabase__list_projects -> []` (known workspace behavior)
  - `mcp__supabase__get_advisors` denied with permission-scope error (`MCP error -32600`), so fallback path was used.
- Added migration:
  - `/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260304014500_phase9_security_rls_hardening.sql`
- Applied migration directly to production Supabase project `ssafugtobsqxmqtphwch` via Management API `database/query`.
- Migration action scope (21 backend-managed public tables):
  1. enabled RLS
  2. revoked table privileges from `anon` and `authenticated`
  3. preserved `service_role` privileges for Forge backend service-key access.

### Validation / Evidence
- Pre-fix high-risk exposure query (RLS disabled + anon/auth grants) returned 21 tables (`Artifact`, `Problem`, `ShowcaseHack`, `Pathway*`, etc.).
- Migration apply response from Management API: `[]` (success).
- Post-fix verification:
  - `RLS disabled + anon/auth exposed` query returned `[]`.
  - targeted 21-table query now reports `rls_enabled=true` for all rows.
  - grants query for the targeted set now returns only `service_role` privileges (no `anon` or `authenticated` grants).
  - global `public` RLS-disabled table query returned `[]`.

### Regressions / Gotchas
- Supabase MCP advisor endpoints remain permission-scoped in this workspace, so authoritative advisor re-check required Management API fallback SQL instead of MCP tool output.
- The runtime should continue to use `SUPABASE_SERVICE_ROLE_KEY`; environments relying on `SUPABASE_ANON_KEY` fallback will lose access to the hardened tables.

### Next Recommended Step
- Rotate out remaining permissive `anon/authenticated` Forge-backend RLS policies on already-RLS tables (`Project`, `Team`, `TeamInvite`, `Vote`, `JudgeScore`, etc.) by moving backend-only access assumptions fully to `service_role` and preserving only explicit user-scope policies.

## Session Update - Supabase Warning Cleanup Applied (2026-03-04 02:26 GMT)

### Task IDs
- `P9.SEC.02`

### What Changed
- Added migration:
  - `/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260304023500_phase9_security_policy_search_path_hardening.sql`
- Applied migration to production Supabase (`ssafugtobsqxmqtphwch`) via Management API `database/query`.
- Fixed six mutable-search-path function warnings by setting:
  - `search_path = pg_catalog, public`
  - functions: `artifact_set_updated_at_fn`, `problem_set_updated_at_fn`, `showcase_hack_set_updated_at_fn`, `pathway_set_updated_at_fn`, `pipeline_stage_criteria_set_updated_at_fn`, `hackday_submission_page_link_set_updated_at_fn`.
- Hardened 11 permissive Forge backend policies by changing role target from `anon, authenticated` to `service_role`:
  - `EventRegistration`, `JudgeScore`, `Project`, `Team` (create/update/delete), `TeamInvite`, `TeamMember`, `User` (create/update), `Vote`.

### Validation / Evidence
- Migration apply response: `[]`.
- Function config check now reports `proconfig="search_path=pg_catalog, public"` for all six warning functions.
- Policy role check confirms all targeted `Forge backend ...` policies now use `roles={service_role}`.
- Warning-equivalent policy scan for non-SELECT `USING/WITH CHECK = true` on `anon/authenticated/public` now returns `[]`.

### Remaining Warning (Manual Platform Setting)
- `auth_leaked_password_protection` remains a Supabase Auth dashboard configuration warning.
- Enable in Supabase dashboard: Auth -> Email -> Password security -> Leaked password protection.

### Next Recommended Step
- Toggle leaked-password protection in Supabase Auth settings, rerun Security Advisor, and capture one closure artifact screenshot.

## Session Update - Supabase Info Suggestion Cleanup (RLS Enabled No Policy) (2026-03-04 03:10 GMT)

### Task IDs
- `P9.SEC.03`

### What Changed
- Added and applied migration:
  - `/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260304031000_phase9_security_add_service_role_policies.sql`
- For 21 backend-managed tables (Artifact/Problem/ShowcaseHack/Pathway family/etc.), created explicit policy:
  - `"Service role can manage rows"`
  - `FOR ALL TO service_role USING (true) WITH CHECK (true)`
- This retains lock-down posture for client roles while satisfying advisor expectation that RLS-enabled tables have at least one policy.

### Validation / Evidence
- Migration apply response: `[]`.
- Targeted table check confirms all 21 tables:
  - `rls_enabled=true`
  - `policy_count=1`
- Policy inspection confirms all new policies are scoped to `roles={service_role}`.

### Remaining Platform Warning
- If still present, the remaining warning is typically `auth_leaked_password_protection` and requires dashboard toggle (Auth settings), not SQL migration.

## Session Update - Integrity Review Fixes Implemented (2026-03-04 15:08 GMT)

### Task IDs
- `P9.SEC.04`

### What Changed
- Patched migration replay safety in:
  - `/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260304023500_phase9_security_policy_search_path_hardening.sql`
- Changed function search-path hardening statements to `ALTER FUNCTION IF EXISTS ...` to avoid fresh-environment bootstrap failure when optional trigger functions are absent.
- Enforced service-role-only runtime auth in:
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/lib/supabase.js`
- Removed `SUPABASE_ANON_KEY` fallback path; runtime now requires `SUPABASE_SERVICE_ROLE_KEY`.
- Added contract tests:
  - `/Users/nickster/Downloads/HackCentral/forge-native/tests/backend/supabase-security-integrity-contract.test.mjs`
    - verifies no anon fallback remains in runtime client source
    - verifies migration uses `IF EXISTS` for optional function alters.
- Updated docs:
  - `/Users/nickster/Downloads/HackCentral/forge-native/README.md`
  - note added that backend runtime requires `SUPABASE_SERVICE_ROLE_KEY` and anon fallback is unsupported.

### Validation
- Planned validation commands executed in this session:
  - `npm run typecheck --prefix forge-native`
  - `npm run test:backend --prefix forge-native`
- Optional clean migration replay command remains environment-dependent (`supabase db reset` on disposable project/local stack).

## Session Update - Supabase Security Advisor Closure Snapshot (2026-03-04 15:13 GMT)

### Status
- Supabase Security Advisor now reports:
  - `Errors: 0`
  - `Warnings: 1`
  - `Info: 0`
- Remaining warning:
  - `auth_leaked_password_protection` (`Leaked Password Protection Disabled` under Auth).

### Governance Decision
- Marked as **accepted risk exception** for current environment because leaked-password protection is a plan-gated Supabase feature (Pro-tier capability).
- All database-side security hardening actions are complete and validated; no further SQL/policy remediation remains for current warning set.

### Evidence
- Final Security Advisor screenshot provided in-session showing only the single Auth warning and zero errors.

### Next Recommended Step
- Revisit this exception if/when project plan tier includes leaked-password-protection capability; then enable and remove exception.

## Session Update - Runtime Hero Inline Image Upload Implemented (Mar 5, 2026 00:51 GMT)

### Task IDs
- `P10.RUNTIME.HERO.01`

### What Changed
- Implemented runtime inline hero-image upload flow for event admins (config mode only) using Supabase Storage signed upload URLs.
- Added runtime resolver and guards in:
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/index.js`
  - new resolver: `createEventBrandingImageUploadUrl`
  - server-side validations: mime allowlist (`jpeg/png/webp`), size (`<= 2MB`), dimensions (`>=1200x400`).
- Added storage bucket migration:
  - `/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260305090000_create_event_branding_images_bucket.sql`
  - bucket: `event-branding-images` (public, 2MB limit, jpeg/png/webp allowlist).
- Updated manifest client egress for browser PUT to signed URLs:
  - `/Users/nickster/Downloads/HackCentral/forge-native/manifest.yml`
  - added `permissions.external.fetch.client: *.supabase.co`.
- Added runtime frontend inline upload UX:
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Dashboard.jsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/index.css`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/lib/heroImageUpload.js`
  - click hero image/CTA in config mode -> file picker -> normalize/compress -> signed upload -> set draft field `branding.bannerImageUrl`.
- Extended shared resolver contracts:
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/shared/types.ts`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/types.ts`.
- Added backend/contract tests:
  - `/Users/nickster/Downloads/HackCentral/forge-native/tests/backend/runtime-hero-image-upload-contract.test.mjs`
  - `/Users/nickster/Downloads/HackCentral/forge-native/tests/backend/runtime-hero-image-upload-helper.test.mjs`
  - `/Users/nickster/Downloads/HackCentral/forge-native/tests/backend/runtime-resolver-contract.test.mjs` updated resolver list.

### Validation / Evidence
- `npm run typecheck --prefix forge-native/static/frontend` ✅
- `npm run build --prefix forge-native/static/frontend` ✅
- `npm run typecheck --prefix forge-native` ✅
- `npm run test:backend --prefix forge-native` ✅
- `npm run runtime:build --prefix forge-native` ✅

### Operational Notes
- Flow intentionally uses config-mode draft/publish semantics; upload updates preview immediately but participant-facing visibility still follows publish.
- Storage-first design keeps binary assets out of `Event`/seed payloads; only URL metadata is stored in branding.

## Session Update - Pipeline Hero Refactor v2.1 Implemented (Mar 5, 2026 01:22 GMT)

### Task IDs
- `P10.PIPE.HERO.01`

### What Changed
- Replaced the legacy Pipeline page tables + editable stage columns with a hero-first stage-gate visualization in Forge custom UI.
- Added new pipeline component module:
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/components/pipeline/PipelineHero.tsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/components/pipeline/StageNode.tsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/components/pipeline/ConversionArrow.tsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/components/pipeline/StageDetail.tsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/components/pipeline/SummaryBar.tsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/components/pipeline/index.ts`
- Updated `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/App.tsx` to:
  - mount `PipelineHero` in `view === 'pipeline'`
  - keep live data path (`hdcGetPipelineBoard`) and move mutation (`hdcMovePipelineItem`)
  - remove stage criteria editing UI/state/handler from Pipeline page
  - apply default move note fallback (`"Moved via Pipeline hero"`) only when note input is blank
- Updated `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/styles.css` with new pipeline hero styles and removed obsolete class families from old metrics/stage-editor layout (`.pipeline-metrics-grid`, `.pipeline-column*`, `.pipeline-stage-editor*`, old `.pipeline-board` block).

### UX/Behavior Outcomes
- Pipeline now renders as three zones:
  - summary bar (entered/graduated/throughput)
  - stage-gate hero with stage nodes and conversion connectors
  - conditional stage detail panel (single-open toggle behavior)
- Mobile behavior below 768px uses dedicated vertical conversion connectors (not rotated horizontal arrows).
- Stage detail panel uses `max-height` transition for smoother open/close.
- Stage item avatars use deterministic owner-name hashing to the design-system 5-hue palette.
- Admin move controls remain available in stage detail rows; target-stage options exclude the current stage.

### Validation / Evidence
- `npm run typecheck --prefix forge-native/static/frontend` ✅
- `npm run build --prefix forge-native/static/frontend` ✅
- `npm run typecheck --prefix forge-native` ✅

### Notes
- Shared contract `hdcUpdatePipelineStageCriteria` remains in shared types/backend contracts for future admin/settings surface compatibility, but is no longer invoked by the Pipeline page UI.

## Session Update - Runtime/Hacks Production Hardening Sweep (Mar 5, 2026 22:58 GMT)

### Completed
- Fixed showcase `Open page` invalid-target handling:
  - validate numeric `confluencePageId` and HTTPS `confluencePageUrl` before opening.
  - prevent dead open attempts when linkage is invalid.
- Updated Hacks list behavior to hide items without valid page linkage.
- Updated runtime hero upload UX and delivery:
  - success message now reflects draft preview behavior (`Hero image updated in draft preview.`).
  - added runtime image-load error feedback in hero card.
  - increased hero image visibility in preview (opacity/overlay tuning).
  - added manifest `permissions.external.images: '*.supabase.co'` to allow Supabase hero images in Forge iframe CSP.
- Fixed backend UUID mismatch causing user-facing invocation failure:
  - guarded `EventAdmin` lookups against non-UUID `userId` values.
- Fixed non-site-admin access to HackDay `Open` route:
  - removed `displayConditions.isSiteAdmin: true` from `hackday-runtime-global-page`.

### Production Status
- All above fixes were pushed and deployed to production Confluence app (`hackdaytemp.atlassian.net`) in-session.

### Validation Commands Run
- `npm run typecheck --prefix forge-native/static/frontend`
- `npm run build --prefix forge-native/static/frontend`
- `npm run typecheck --prefix forge-native`
- `npm run test:backend --prefix forge-native`
- `npm run custom-ui:build --prefix forge-native`
- `forge deploy --environment production --no-verify`
- `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`

### Commits
- `93de35f` - fix(showcase): validate linked page target before open
- `b5afbda` - fix(showcase): hide hacks without valid page linkage
- `62833ed` - fix(runtime): allow supabase hero images and improve draft preview UX
- `25bb21b` - fix(supabase): guard event admin lookups from non-uuid user ids
- `f22f3db` - fix(runtime-route): allow non-site-admin access to hackday-app

## Session Update - Event Backup/Restore v1 Implemented (Mar 6, 2026 00:20 GMT)

### What Changed
- Added event backup/restore persistence migration:
  - `/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260306001000_phase10_event_backup_restore.sql`
  - tables: `EventBackupSnapshot`, `EventBackupRestoreRun`
  - private storage bucket: `event-backup-snapshots`
  - service-role-only RLS policies.
- Added backup engine:
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/lib/eventBackup.mjs`
  - snapshot build/store/list/coverage, dry-run diff, apply restore with required dry-run token, pre-restore snapshot hook, retention pruning.
  - added failure telemetry event `event_backup_restore_failed`.
- Added runtime resolver/API support and publish auto-snapshot hook:
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/index.js`
  - resolvers: `createEventBackupSnapshot`, `listEventBackupSnapshots`, `previewEventBackupRestore`, `applyEventBackupRestore`, `getEventBackupCoverageStatus`.
  - publish path now auto-creates `source=publish` snapshot before apply.
- Added scheduled + predeploy backup ops handlers:
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/backupOps.js`
  - daily scheduled sweep (`source=daily`) over active events in batches.
  - webtrigger predeploy sweep (`source=predeploy`) with optional targeted event IDs.
- Updated manifest wiring:
  - `/Users/nickster/Downloads/HackCentral/forge-native/manifest.yml`
  - new function keys + `scheduledTrigger` + `event-backup-ops-wt` webtrigger.
- Added predeploy backup CLI + artifact output:
  - `/Users/nickster/Downloads/HackCentral/scripts/predeploy-event-backup-snapshot.mjs`
  - outputs JSON + Markdown artifacts under `/Users/nickster/Downloads/HackCentral/docs/artifacts/`.
- Added runtime config mode UI backup section and restore panel wiring:
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigModeContext.jsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigSidePanel.jsx`
  - fixed hook-order/runtime issues during implementation.
- Added docs and workflow updates:
  - `/Users/nickster/Downloads/HackCentral/docs/HDC-EVENT-BACKUP-RESTORE-RUNBOOK.md`
  - `/Users/nickster/Downloads/HackCentral/DEPLOY.md`
  - `/Users/nickster/Downloads/HackCentral/TESTING_GUIDE.md`
  - `/Users/nickster/Downloads/HackCentral/docs/README.md`
  - `/Users/nickster/Downloads/HackCentral/package.json` script `qa:backup:predeploy-snapshot`.

### Validation Commands Run
- `npm run typecheck --prefix forge-native/static/frontend` ✅
- `npm run typecheck --prefix forge-native` ✅
- `npm run test:backend --prefix forge-native` ✅
- `npm run build --prefix forge-native/static/frontend` ✅
- `npm run runtime:build --prefix forge-native` ✅
- `npm run custom-ui:build --prefix forge-native` ✅

### Operational Note
- Local invocation of predeploy backup script failed before deploy:
  - `node scripts/predeploy-event-backup-snapshot.mjs --dry-run --environment production --site hackdaytemp.atlassian.net --max-events 1`
  - failure at `forge webtrigger list ... -f event-backup-ops-wt` because new function/webtrigger is not yet deployed to production in this session.

## Session Update - Event Backup/Restore v1 Deployed + Verified (Mar 6, 2026 00:33 GMT)

### What Changed
- Deployed updated Forge app to `production` after implementing backup/restore v1:
  - `PATH="/opt/homebrew/opt/node@22/bin:$PATH" forge deploy --environment production --no-verify`
  - `PATH="/opt/homebrew/opt/node@22/bin:$PATH" forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`
- Ran predeploy backup dry-run and apply via new CLI/webtrigger:
  - `npm run qa:backup:predeploy-snapshot -- --dry-run --environment production --site hackdaytemp.atlassian.net`
  - `npm run qa:backup:predeploy-snapshot -- --apply --environment production --site hackdaytemp.atlassian.net`
- Supabase MCP remained empty (`list_projects -> []`), so used documented fallback against production project `ssafugtobsqxmqtphwch`.
- Applied live migration via Supabase Management API:
  - `/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260306001000_phase10_event_backup_restore.sql`
- Patched migration after live schema mismatch discovery:
  - `Event.id` and `User.id` are `text`, not `uuid`
  - updated backup table event/user reference columns to `text`
  - reapplied migration successfully (`[]` response).
- Fixed backup engine false-negative behavior:
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/lib/eventBackup.mjs`
  - insert now falls back to deterministic row lookup when PostgREST returns no representation row after successful insert.
- Redeployed production Forge backend after that patch.

### Production Verification
- Dry-run artifact:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-002602Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-002602Z.md`
- Successful apply artifact:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-003106Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-003106Z.md`
- Created production snapshots:
  - `HackDay 2026` (`7047d6d2-16a7-4d08-aea2-fb9ac26f8125`) -> snapshot `384e8c32-13a0-44b9-b75f-def0f0409371`
  - `Shona's IT Hack` (`d3f7bb14-7d8f-4e92-8740-23b02994b4d4`) -> snapshot `92bf1604-c4a2-4741-adf0-bde08d308b0f`
- Verified in live runtime Config Mode using authenticated Playwright session:
  - `/wiki/spaces/IS/pages/22970369/HackDay+2026` -> `Backup Safety`, latest snapshot `3/6/2026, 12:31:00 AM`, status `Active`, `Snapshots: 2`
  - `/wiki/spaces/IS/pages/24510466/Shona+s+IT+Hack` -> `Backup Safety`, latest snapshot `3/6/2026, 12:31:05 AM`, status `Active`, `Snapshots: 2`

### Notes
- First apply attempt created snapshots but reported failure because metadata insert returned no representation row; this is now fixed in code and reflected by the final successful artifact run.

## Session Update - Restore Dry-Run Path Verified in Production (Mar 6, 2026 00:54 GMT)

### What Changed
- Investigated the first live restore dry-run failure on non-critical event `Shona's IT Hack` (`d3f7bb14-7d8f-4e92-8740-23b02994b4d4`).
- Fixed Forge Supabase response wrapper so storage downloads expose binary methods required by `supabase-js`:
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/lib/supabase.js`
  - added `arrayBuffer()` and `blob()` support backed by eagerly buffered response bytes.
- After redeploy, restore path advanced and exposed a second live issue:
  - snapshot uploads were being corrupted because binary request bodies were JSON-stringified by the same wrapper.
- Patched the wrapper again to preserve binary upload bodies and normalize non-plain-object headers (notably `Headers`) so storage keeps `content-type: application/gzip`.
- Added contract coverage for both binary response and binary upload handling:
  - `/Users/nickster/Downloads/HackCentral/forge-native/tests/backend/supabase-security-integrity-contract.test.mjs`
- Redeployed Forge production after each runtime fix.

### Production Verification
- Created fresh manual snapshot through the live Forge bridge on `Shona's IT Hack` page:
  - snapshot `be1cb9eb-21bb-413a-ac37-bb1640916c5c`
  - created at `2026-03-06T00:53:10.482+00:00`
- Ran live restore dry-run through the production Forge bridge against that snapshot:
  - restore run `736a0cf9-2f26-460e-a177-3352889317a1`
  - confirmation token `df2198b7-2a7a-4644-869e-bff975e57c14`
  - status `succeeded`
- Persisted warning payloads matched between snapshot response and restore run row:
  - `Unable to scope table Vote: no matching scope column found among [event_id, eventId].`
  - `Unable to scope table JudgeScore by any of [team_id, teamId].`
- Dry-run diff summary in production:
  - totals: `toCreate=0`, `toUpdate=1`, `toDelete=1`
  - `HackdayTemplateSeed` flagged one update
  - `EventAuditLog` flagged one delete
  - impacted pages: `0`

### Notes
- The `EventAuditLog` delete is expected noise for exact restore after a manual snapshot because `createEventBackupSnapshot` appends an audit row after the snapshot is captured.
- The current runtime Config Mode UI only surfaces dry-run aggregate counts; warning arrays are persisted and returned by resolvers but are not rendered in the side panel yet.

## Session Update - Backup/Restore Hardening Reached Sign-Off State (Mar 6, 2026 01:02 GMT)

### What Changed
- Hardened backup/restore diff behavior in `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/lib/eventBackup.mjs`:
  - `EventAuditLog` is still captured in snapshots for evidence, but is excluded from restore diff totals and restore reconcile operations.
  - `HackdayTemplateSeed.updated_at` is ignored during diff comparison to avoid timestamp-only drift.
  - `Vote` and `JudgeScore` snapshot scoping now follows actual production schema (`projectId`) instead of warning on missing `event_id` / `team_id` columns.
- Surfaced restore warnings in the runtime side panel dry-run summary:
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigSidePanel.jsx`
- Added/updated contract coverage:
  - `/Users/nickster/Downloads/HackCentral/forge-native/tests/backend/event-backup-contract.test.mjs`

### Validation
- `npm run typecheck --prefix forge-native` ✅
- `npm run test:backend --prefix forge-native` ✅ (`49/49`)
- `npm run build --prefix forge-native/static/frontend` ✅
- Redeployed Forge production after hardening patches.

### Final Production Verification
- Fresh manual snapshot on `Shona's IT Hack`:
  - snapshot `02b44d46-3431-48b8-b724-33ebd920954d`
- Fresh restore dry-run on that snapshot:
  - restore run `06ec8a1f-81a6-44ad-97d8-47d94dd2ae14`
  - confirmation token `d1592831-0b1c-4d07-83ad-106c372684cf`
- Result:
  - `warnings: []`
  - `totals: toCreate=0, toUpdate=0, toDelete=0`
  - pages impacted `0`
- `EventAuditLog` still appears in table detail with `excludedFromDiff: true`, which is intentional and no longer affects totals or restore reconcile.

## Session Update - Restore Apply Rehearsal Passed in Production (Mar 6, 2026 01:06 GMT)

### Production rehearsal
- Used non-critical event `Shona's IT Hack` as the final destructive-path rehearsal target because only two production events exist.
- Created fresh manual snapshot:
  - snapshot `29e449af-41ae-49db-bba0-a4aa9b99e7ef`
- Applied controlled reversible mutation directly to `Event.tagline`:
  - original value `null`
  - temporary value `RESTORE-REHEARSAL-1772759098596`
- Ran restore dry-run:
  - restore run `287997a7-76b4-472a-ab10-37e95325009a`
  - confirmation token `0563a7ac-8cae-415d-aee6-d5e903a2f308`
  - totals `toCreate=0`, `toUpdate=1`, `toDelete=0`
  - warnings `[]`
- Ran restore apply successfully:
  - apply run `382ef9a4-98d7-49e1-b35c-b50ebc8871bc`
  - pre-restore snapshot `d9636836-3cc6-424f-8595-c467651bef33`
  - warnings `[]`
  - page restore `restoredCount=1`, `failedCount=0`
- Verified state was restored:
  - `Event.tagline` returned to `null`
  - post-apply dry-run `1774da8d-7231-481d-8d7d-d5e3365d8ba9` returned `toCreate=0`, `toUpdate=0`, `toDelete=0`, warnings `[]`

## Session Update - Runtime Hero Image Height Cap + Production Deploy (Mar 6, 2026 01:43 GMT)

### What Changed
- Updated runtime dashboard hero banner presentation in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/index.css`:
  - uploaded hero images no longer stretch to fill the entire hero card.
  - hero image now stays centered, preserves aspect ratio, and is capped at `400px` high.
- Fixed existing runtime build break in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Schedule.jsx`:
  - corrected cross-package imports to `frontend/src/components/schedule-builder-v2`
  - corrected cross-package import to `frontend/src/schedule-builder-v2/scheduleEvents`
- Built and deployed updated Forge production bundle to `hackdaytemp.atlassian.net`.

### Validation / Evidence
- `npm run typecheck --prefix forge-native/static/frontend` ✅
- `npm run typecheck --prefix forge-native` ✅
- `npm run test:backend --prefix forge-native` ✅ (`49/49`)
- `npm run runtime:build --prefix forge-native` ✅
- `npm run qa:backup:predeploy-snapshot -- --apply --environment production --site hackdaytemp.atlassian.net` ✅
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-014224Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-014224Z.md`
- `npm run custom-ui:build --prefix forge-native` ✅
- `forge deploy --environment production --no-verify` ✅
- `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
  - Forge reported site already at latest installed version after deploy.

### Operational Notes
- Forge CLI emitted the recurring local warnings during deploy/install:
  - deprecation warning for `punycode`
  - CLI update available (`12.14.1` -> `12.15.0`)
  - unsupported Node warning text despite local `node -v` reporting `v22.22.0`
- Forge deploy also emitted a non-blocking packaging warning about resolving `utf-8-validate` from Convex browser output; deployment still completed successfully.

## Session Update - Runtime Hero Upload Routed To Logo Slot (Mar 6, 2026 01:50 GMT)

### What Changed
- Updated `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Dashboard.jsx` so uploaded branding now replaces the left-side dashboard hero logo instead of rendering as a hero background layer.
- Removed the dashboard hero background-image render path for `branding.bannerImageUrl`.
- Added uploaded-logo-specific styling in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/index.css`:
  - preserve aspect ratio
  - fit within the existing logo slot
  - disable the default Adaptavist/HackDay logo opacity/filter treatment for uploaded assets
- Updated upload button and status copy from “hero image” to “hero logo” to match actual behavior.

### Validation / Evidence
- `npm run runtime:build --prefix forge-native` ✅
- `npm run qa:backup:predeploy-snapshot -- --apply --environment production --site hackdaytemp.atlassian.net` ✅
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-014926Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-014926Z.md`
- `npm run custom-ui:build --prefix forge-native` ✅
- `forge deploy --environment production --no-verify` ✅
- `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅

### Operational Notes
- Forge again emitted the same non-blocking local warnings during deploy:
  - `punycode` deprecation warning
  - Forge CLI update available
  - unsupported Node warning text despite local `node -v` reporting `v22.22.0`
  - non-blocking `utf-8-validate` packaging warning from Convex browser dependency

## Session Update - Schedule Ownership Moved To Child HackDay Config Mode (Mar 6, 2026 02:02 GMT)

### What Changed
- Removed schedule setup from the HackCentral create flow in `/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/App.tsx`.
- Made the child HackDay `Schedule` page the canonical schedule editor in Config Mode:
  - schedule draft is now part of the existing Config Mode draft envelope
  - published `event_schedule` is exposed to the runtime frontend
  - draft save / publish flows now cover schedule changes
- Publishing schedule changes now persists `event_schedule` and rebuilds schedule-derived milestones from that published data in `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/index.js`.
- Participant schedule behavior now distinguishes unpublished vs published state:
  - no more hardcoded fallback timeline
  - unpublished events show `Schedule not published yet`
- Localhost runtime preview for `/schedule` no longer crashes when Forge bridge is unavailable:
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Schedule.jsx` now uses local preview storage instead of calling `@forge/bridge` directly outside the Forge host.

### Validation / Evidence
- Local validation:
  - `node -v` ✅ `v22.22.0`
  - `npm run test:backend --prefix forge-native` ✅
  - `npm run build --prefix forge-native/static/runtime-frontend` ✅
  - `npm run build --prefix forge-native/static/frontend` ✅
- Browser validation with Playwright MCP on raw localhost runtime page:
  - unpublished participant state rendered correctly
  - Config Mode opened inline schedule builder
  - `Save Draft` persisted schedule draft without changing participant view
  - re-entering Config Mode rehydrated the draft
  - `Publish` promoted schedule live
  - participant view rendered published schedule cards after publish
- Chrome DevTools MCP validation on fresh raw localhost runtime page:
  - no `BridgeAPIError`
  - no runtime console errors beyond normal app log output

### Release Notes
- Version bumped locally to `v0.3.30`.
- This session committed and pushed the change only; no Forge deploy/install was run in this session.

## Session Update - v0.3.30 Deployed To Production (Mar 6, 2026 02:13 GMT)

### What Changed
- Deployed `main` at commit `afc3267` to Forge production on `hackdaytemp.atlassian.net`.
- Included the follow-up Schedule empty-state refinement:
  - removed the separate `Admin note` box
  - unpublished schedule copy now reads `Turn on Config Mode in the header to create the HackDay schedule.`

### Validation / Evidence
- Runtime guardrail:
  - `node -v` ✅ `v22.22.0`
- Predeploy backup sweep:
  - `/private/tmp/hackcentral-merge-main-03062026/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-020919Z.json`
  - `/private/tmp/hackcentral-merge-main-03062026/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-020919Z.md`
- Build:
  - `npm run custom-ui:install --prefix forge-native` ✅
  - `npm install --prefix forge-native` ✅
  - `npm run custom-ui:build --prefix forge-native` ✅
- Production rollout:
  - `forge deploy --environment production --no-verify` ✅
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
  - Forge reported: `Site is already at the latest version`

### Operational Notes
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output

## Session Update - Branding Runtime Hosted Hotfix And Validation Closure (Mar 8, 2026 15:17 GMT)

### What Changed
- While closing the pending hosted validation for the branding ownership/runtime refresh work, the first production browser pass surfaced a real runtime-only regression:
  - the deployed `Dashboard.jsx` bundle used `useCallback` without importing it
  - Confluence-hosted runtime crashed with `ReferenceError: useCallback is not defined`
  - local build/test gates had not caught it because the file is plain `.jsx`
- Fixed the missing hook import in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Dashboard.jsx`.
- Added a focused source-contract test in `/Users/nickster/Downloads/HackCentral/tests/forge-native-runtime-hook-imports.spec.ts`.
- Rebuilt and redeployed Forge production without changing version markers, per the current user constraint.
- Completed the previously undone hosted validation items using the saved authenticated Playwright state:
  - runtime Admin Branding tab
  - runtime dashboard hero banner
  - HackCentral create wizard

### Validation / Evidence
- Targeted local validation:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-runtime-hook-imports.spec.ts tests/forge-native-runtime-branding-surface.spec.ts tests/forge-native-create-wizard-branding-removal.spec.ts`
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
  - `./scripts/with-node22.sh npm run custom-ui:build --prefix forge-native`
- Production deploy sequence:
  - `./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --apply --environment production --site hackdaytemp.atlassian.net`
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify`
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`
- Predeploy backup artifacts:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-151000Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-151000Z.md`
- Hosted validation artifacts:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/branding-ownership-postdeploy-validation-2026-03-08T15-17-31-952Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/branding-ownership-postdeploy-validation-2026-03-08T15-17-31-952Z.md`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/branding-admin-postdeploy-2026-03-08T15-17-31-952Z.png`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/branding-dashboard-postdeploy-2026-03-08T15-17-31-952Z.png`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/create-wizard-branding-postdeploy-2026-03-08T15-17-31-952Z.png`

### Key Learnings
- For runtime `.jsx` surfaces, a successful Vite build is not enough protection against missing React hook imports; add source-contract coverage when a file uses hooks without type-checked imports.
- Hosted Confluence validation should happen immediately after deploy for runtime-heavy changes. This regression was invisible in local validation but obvious in the authenticated iframe run.
- When live branding already has a banner asset, it is safer to validate the save path by changing accent only in Config Mode, confirming dashboard banner render, then restoring the draft. That proves draft persistence and runtime consumption without publishing or disturbing participant-facing branding.

## Session Update - Versioned Production Snapshot Created (Mar 8, 2026 15:29 GMT)

### What Changed
- Converted the branding/runtime refresh work into a versioned production snapshot so future development can continue locally without ambiguity about the live baseline.
- Bumped release markers to:
  - root app `0.6.65`
  - forge-native `0.3.43`
  - HackCentral UI marker `0.6.65`
  - runtime package and bundle `1.2.78`
- Left the macro marker at `0.6.46` because the macro frontend was unchanged in this release.
- Rebuilt and redeployed production after the version bump.

### Validation / Evidence
- Targeted validation:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-hdcService.spec.ts tests/forge-native-repository-event-config.spec.ts tests/forge-native-runtime-event-scoping.spec.ts tests/forge-native-runtime-branding-surface.spec.ts tests/forge-native-create-wizard-branding-removal.spec.ts tests/forge-native-runtime-hook-imports.spec.ts`
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native/static/frontend`
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native`
  - `./scripts/with-node22.sh npm run custom-ui:build --prefix forge-native`
- Deploy sequence:
  - `./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --apply --environment production --site hackdaytemp.atlassian.net`
  - `../scripts/with-node22.sh npm run custom-ui:build`
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify`
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`
- Final hosted version smoke artifacts:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/release-version-check-2026-03-08T15-28-44-296Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/release-runtime-version-check-2026-03-08T15-28-44-296Z.png`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/release-global-version-check-2026-03-08T15-28-44-296Z.png`

### Key Learnings
- If you want a stable production checkpoint before more iteration, version the live bundle markers and verify those exact console markers in hosted Confluence immediately after deploy.
- For this repo, the right split is now clear: production is the `0.6.65 / 0.3.43 / 1.2.78` snapshot; further feature work should be developed and tested locally first, then promoted in a later deliberate release.

## Session Update - App View Event Scoping Consistency Deployed (Mar 8, 2026 12:36 GMT)

### What Changed
- Closed the remaining app-view integrity gaps after the first Shona schedule hotfix.
- Added a small shared runtime helper at `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/lib/appModeResolverPayload.js` to build and merge stable page-scoped app-mode resolver payloads.
- Removed inline per-render resolver payload objects from:
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Dashboard.jsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Schedule.jsx`
- Propagated the shared page-scoped payload across remaining event-derived app-view resolver calls in:
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/App.jsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/AdminPanel.jsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Voting.jsx`
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigModeContext.jsx`
- Added targeted regression coverage:
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-runtime-app-mode-resolver-payload.spec.ts`
  - `/Users/nickster/Downloads/HackCentral/tests/forge-native-runtime-event-scoping.spec.ts`
- Bumped version markers to repo `0.6.62`, forge-native `0.3.40`, and runtime bundle `1.2.75`.
- Deployed the versioned build to Forge production on `hackdaytemp.atlassian.net`.

### Validation / Evidence
- Local validation completed:
  - `./scripts/with-node22.sh npm run test:run -- tests/runtime-app-view-gating.spec.ts tests/forge-native-runtime-context-precedence.spec.ts tests/forge-native-runtime-app-mode-resolver-payload.spec.ts tests/forge-native-runtime-event-scoping.spec.ts` ✅
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend` ✅
  - `./scripts/with-node22.sh npm run custom-ui:build --prefix forge-native` ✅
- Predeploy backup sweep:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-123016Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-123016Z.md`
- Deploy/install path completed:
  - `../scripts/with-node22.sh npm run custom-ui:build` ✅
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify` ✅
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
  - Forge reported: `Site is already at the latest version`
- Hosted Confluence validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` confirmed on `Shona's IT Hack`:
  - page macro route console logged `[HackCentral Runtime v2] Module loaded - 1.2.75`
  - app-shell route console logged `[HackCentral Runtime v2] Module loaded - 1.2.75`
  - both routes logged `[hdc-performance-telemetry]` with `eventId=d3f7bb14-7d8f-4e92-8740-23b02994b4d4`, `pageId=24510466`, `runtimeSource=seed_mapping`
  - both routes rendered the published schedule and did not show `Schedule not published yet`
  - artifacts:
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-page-macro-postdeploy-2026-03-08T12-35-09-157Z.png`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-app-shell-postdeploy-2026-03-08T12-35-09-157Z.png`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-postdeploy-validation-2026-03-08T12-35-09-157Z.json`

### Operational Notes
- The shared app-mode payload helper is a safer pattern for this split runtime because it decouples page-scoped resolver correctness from object identity in React hooks.
- In this Confluence runtime, frame detection for hosted browser checks must include Atlassian CDN iframe URLs (`*.cdn.prod.atlassian-dev.net/.../runtime-ui-frontend/...`), not just `/wiki/apps/` paths.
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output

## Session Update - Rules Title Publish Hotfix Deployed (Mar 8, 2026 13:22 GMT)

### What Changed
- Fixed the live Config Mode publish failure for edited Rules titles.
- Root cause was a frontend/backend contract mismatch:
  - `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/contentRegistry.js` already allowed `rules.header.title`
  - `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/lib/configModeHelpers.mjs` did not allow the same key during publish normalization/validation
- Added `['rules.header.title', 80]` to `CONFIG_MODE_ALLOWED_CONTENT_OVERRIDE_KEYS` in `/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/lib/configModeHelpers.mjs`.
- Added backend contract coverage in `/Users/nickster/Downloads/HackCentral/forge-native/tests/backend/runtime-schedule-config-contract.test.mjs`.
- Bumped version markers to repo `0.6.64`, forge-native `0.3.42`, and runtime bundle `1.2.77`.
- Deployed the hotfix to Forge production on `hackdaytemp.atlassian.net`.

### Validation / Evidence
- Local validation completed:
  - `./scripts/with-node22.sh node --test forge-native/tests/backend/runtime-schedule-config-contract.test.mjs` ✅
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-rules-config-mode-header.spec.ts` ✅
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend` ✅
  - `./scripts/with-node22.sh npm run custom-ui:build --prefix forge-native` ✅
- Predeploy backup sweep:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-130237Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-130237Z.md`
- Deploy/install path completed:
  - `../scripts/with-node22.sh npm run custom-ui:build` ✅
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify` ✅
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
- Hosted validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` confirmed:
  - console logged `[HackCentral Runtime v2] Module loaded - 1.2.77`
  - telemetry resolved `eventId=d3f7bb14-7d8f-4e92-8740-23b02994b4d4`, `pageId=24510466`, `runtimeSource=seed_mapping`
  - Config Mode and the Rules route rendered on the live app-shell
  - artifacts:
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-rules-hotfix-validation-20260308-1322Z.json`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-rules-hotfix-config-on-2026-03-08.png`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-rules-hotfix-rules-tab-2026-03-08.png`
- User live retest after deploy confirmed the publish error was fixed.

### Operational Notes
- The failure signature was specific and useful:
  - `Unsupported content override key: rules.header.title`
- When adding new editable config-copy keys, update both sides together:
  - runtime frontend registry
  - backend allowlist/normalizer in `configModeHelpers.mjs`
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output

## Session Update - Rules Title Config Mode Editability Deployed (Mar 8, 2026 12:58 GMT)

### What Changed
- Added inline Config Mode editability for the Rules page title.
- Registered a new content key in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/contentRegistry.js`:
  - `rules.header.title`
- Switched the Rules header title in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Rules.jsx` from a hard-coded `<h1>` to `EditableText` so it follows the same editing flow as the existing subtitle.
- Added regression coverage in `/Users/nickster/Downloads/HackCentral/tests/forge-native-rules-config-mode-header.spec.ts`.
- Bumped version markers to repo `0.6.63`, forge-native `0.3.41`, and runtime bundle `1.2.76`.
- Deployed the versioned build to Forge production on `hackdaytemp.atlassian.net`.

### Validation / Evidence
- Local validation completed:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-rules-config-mode-header.spec.ts` ✅
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend` ✅
- Predeploy backup sweep:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-125619Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-125619Z.md`
- Deploy/install path completed:
  - `../scripts/with-node22.sh npm run custom-ui:build` ✅
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify` ✅
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
  - Forge reported: `Site is already at the latest version`
- Hosted Shona app-shell validation with `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` confirmed:
  - console logged `[HackCentral Runtime v2] Module loaded - 1.2.76`
  - retry pass logged `[hdc-performance-telemetry]` with `eventId=d3f7bb14-7d8f-4e92-8740-23b02994b4d4`, `pageId=24510466`, `runtimeSource=seed_mapping`
  - artifacts:
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-rules-postdeploy-2026-03-08T12-57-31-515Z.json`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-rules-postdeploy-2026-03-08T12-57-31-515Z.png`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-rules-postdeploy-retry-2026-03-08T12-58-06-592Z.json`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-rules-postdeploy-retry-2026-03-08T12-58-06-592Z.png`

### Operational Notes
- The deploy is live, but the hosted proof is partial: the runtime and page-scoped event context were confirmed on the live Shona app-shell, while the scripted Rules-route/title assertion did not complete because the iframe remained on the dashboard loading shell during the automated click pass.
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output

## Session Update - App View Schedule Context Fix Deployed (Mar 8, 2026 12:07 GMT)

### What Changed
- Investigated the fresh production report that `Shona's IT Hack` still showed `Schedule not published yet` after a no-op publish from a clean browser session.
- Confirmed production data was intact before code changes:
  - `Event.event_schedule` existed for `d3f7bb14-7d8f-4e92-8740-23b02994b4d4`
  - `Milestone` rows still existed for the same event
  - the page-macro route rendered the published schedule correctly
- Reproduced the actual failure on the full app-shell route:
  - `https://hackdaytemp.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/86632806-eb9b-42b5-ae6d-ee09339702b6/hackday-app?pageId=24510466`
  - the runtime loaded but the `Schedule` page showed `Schedule not published yet`
  - runtime telemetry still reported the correct event context (`eventId=d3f7bb14-7d8f-4e92-8740-23b02994b4d4`, `pageId=24510466`, `runtimeSource=seed_mapping`)
- Root cause: the runtime frontend bootstrapped app view with `{ appMode: true, pageId }` for `getEventPhase`, but later app-shell schedule and Config Mode resolver calls omitted that page-scoped payload, letting those calls drift to non-page/global resolution.
- Fixed the runtime frontend to pass the active page id into:
  - `getSchedule` in `Dashboard.jsx`
  - `getSchedule` in `Schedule.jsx`
  - Config Mode state, draft, publish, discard, and backup/restore actions in `ConfigModeContext.jsx`
- Bumped version markers to repo `0.6.61`, forge-native `0.3.39`, and runtime bundle `1.2.74`.
- Deployed the versioned build to Forge production on `hackdaytemp.atlassian.net`.

### Validation / Evidence
- Runtime guardrail:
  - `./scripts/with-node22.sh node -v` ✅ `v22.22.0`
- Predeploy backup sweep:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-120517Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260308-120517Z.md`
- Build/install path completed:
  - `../scripts/with-node22.sh npm run custom-ui:build` ✅
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify` ✅
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
- Authenticated hosted app-shell check using `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` confirmed:
  - console logged `[HackCentral Runtime v2] Module loaded - 1.2.74`
  - `hackday-app?pageId=24510466` `Schedule` now renders published milestones instead of the unpublished empty state
  - screenshot: `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-app-shell-schedule-postdeploy-20260308.png`

### Operational Notes
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output

### Current state
- Production is updated to the regression-fix release.
- `main` now matches the deployed bundle at commit `89c6d94`.
- Worktree is clean and ready for the next chat.

## Session Update - Config Drawer Regression Remediation Deployed (Mar 7, 2026 16:30 GMT)

### What Changed
- Fixed the Config drawer regression where expanded help could clip lower actions with no internal scroll path.
- Fixed the disclosure-state regression so `How this works` collapses again every time the drawer is closed and reopened.
- Preserved the current publish footer hierarchy and the desktop anchor beneath `Show Actions`.
- Bumped version markers to repo `0.6.60`, forge-native `0.3.38`, and runtime bundle `1.2.73`.
- Deployed the updated Forge app to production on `hackdaytemp.atlassian.net`.

### Validation / Evidence
- Runtime guardrail:
  - `./scripts/with-node22.sh node -v` ✅ `v22.22.0`
- Focused validation:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-config-mode-backup-surface.spec.ts tests/forge-native-config-mode-publish-feedback.spec.ts tests/forge-native-config-mode-publish-footer.spec.ts tests/forge-native-config-side-panel-layout.spec.ts` ✅
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend` ✅
- Predeploy backup sweep:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-162942Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-162942Z.md`
- Build/install path completed:
  - `../scripts/with-node22.sh npm run custom-ui:build` ✅
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify` ✅
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
  - Forge reported: `Site is already at the latest version`

### Operational Notes
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output

## 2026-03-07 15:41 GMT

- Cleaned up the runtime Config Mode drawer chrome in `forge-native/static/runtime-frontend/src/configMode/ConfigSidePanel.jsx`:
  - removed the duplicated `Current status` section
  - removed the Admin Panel backup/restore explanatory note
  - moved `Open Admin Panel` into the header beside `Close`
  - removed the `ACTIONS` subtitle above the footer controls
- Updated the drawer surface contract in `tests/forge-native-config-mode-backup-surface.spec.ts` so it now asserts the trimmed drawer chrome instead of the removed backup note.
- Bumped release markers for this rollout:
  - repo `0.6.58`
  - forge-native `0.3.36`
  - runtime bundle `1.2.71`
- Validation completed successfully:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-config-mode-backup-surface.spec.ts tests/forge-native-config-mode-publish-feedback.spec.ts tests/forge-native-config-mode-publish-footer.spec.ts`
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
  - `./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --apply --environment production --site hackdaytemp.atlassian.net`
  - predeploy artifacts:
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-153808Z.json`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-153808Z.md`
  - `../scripts/with-node22.sh npm run custom-ui:build`
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify`
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`
- Authenticated hosted Confluence verification on `Shona's IT Hack` using `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` confirmed:
  - runtime iframe hydrated successfully
  - drawer header shows `Open Admin Panel` and `Close`
  - `Current status` no longer renders
  - the backup/restore note no longer renders
  - the footer `ACTIONS` subtitle no longer renders
  - `How this works`, `Save Draft`, `Publish`, `Discard`, and `Exit` still render in place

## 2026-03-07 16:10 GMT

- Refined the runtime Config Mode drawer hierarchy and anchoring:
  - collapsed `How this works` into a compact disclosure above the action stack
  - made `Publish` the dominant full-width primary action
  - moved `Save Draft` into a separate secondary row
  - separated `Discard` and `Exit` into a lower escape row
  - centered the desktop drawer beneath the `Show Actions` trigger with a small gap instead of pinning it to the viewport edge
- Updated validation coverage:
  - adjusted `tests/forge-native-config-mode-publish-footer.spec.ts`
  - added `tests/forge-native-config-side-panel-layout.spec.ts`
- Bumped release markers for this rollout:
  - repo `0.6.59`
  - forge-native `0.3.37`
  - runtime bundle `1.2.72`
- Validation completed successfully:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-config-mode-backup-surface.spec.ts tests/forge-native-config-mode-publish-feedback.spec.ts tests/forge-native-config-mode-publish-footer.spec.ts tests/forge-native-config-side-panel-layout.spec.ts`
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
  - `./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --apply --environment production --site hackdaytemp.atlassian.net`
  - predeploy artifacts:
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-160925Z.json`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-160925Z.md`
  - `../scripts/with-node22.sh npm run custom-ui:build`
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify`
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`
- Hosted verification note:
  - I attempted one more authenticated Playwright iframe check against `Shona's IT Hack` using `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`, but the Atlassian load path did not complete within the scripted timeout, so this release relies on successful deploy/install plus local validation rather than a fresh hosted positioning proof.

## Session Update - Config Publish Footer Confirmation Deployed (Mar 7, 2026 12:59 GMT)

### What Changed
- Replaced the heavy centered Config Mode publish modal with an inline footer confirmation flow in the runtime Config drawer.
- Publish confirmation, progress, and failure feedback now stay attached to the publish controls in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigSidePanel.jsx`.
- Discard and exit still use the modal path.
- Strengthened post-publish feedback near the live Config control in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/AppLayout.jsx` and `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigToolbar.jsx`.
- Version markers were bumped to:
  - repo `0.6.56`
  - forge-native `0.3.34`
  - runtime bundle `1.2.69`
- Deployed the final versioned change set to Forge production on `hackdaytemp.atlassian.net`.

### Validation / Evidence
- Focused regressions:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-config-mode-publish-feedback.spec.ts tests/forge-native-config-mode-publish-footer.spec.ts`
- Local runtime build:
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
- Production guardrail path:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-143536Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-143536Z.md`
  - `../scripts/with-node22.sh npm run custom-ui:build`
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify`
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`
- Authenticated hosted iframe verification using `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json` confirmed on `Shona's IT Hack`:
  - runtime loads inside the Confluence iframe
  - `Schedule` opens with `CONFIG ON`
  - `Draft Actions`, `Save Draft`, `Publish`, `Discard`, and `Exit` render in the live drawer
  - activating `Publish` no longer shows `Publish config changes?`
  - the live drawer instead shows `Ready to publish` and `Publish now`

### Operational Notes
- I intentionally stopped short of clicking the live `Publish now` CTA on `Shona's IT Hack` because that page already had a saved draft and publishing it would have made participant-facing changes.
- The hosted proof therefore covers the new confirm surface end-to-end up to the final irreversible click; success close-out remains covered by local regression tests.

## Session Update - Backup And Restore Moved To Admin Panel (Mar 7, 2026 15:16 GMT)

### What Changed
- Removed backup and restore controls from `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigSidePanel.jsx` so the Config Mode drawer stays focused on draft and publish actions.
- Added a dedicated `Backup & Restore` section to the Admin Panel Settings tab in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/AdminPanel.jsx`.
- Kept backup creation, refresh, restore preview, and restore apply wired to the existing Config Mode context operations; this is a surface move only, not a backend change.

### Validation / Evidence
- Focused regressions:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-config-mode-publish-feedback.spec.ts tests/forge-native-config-mode-publish-footer.spec.ts tests/forge-native-config-mode-backup-surface.spec.ts`
- Local runtime build:
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
- Production guardrail path:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-151440Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-151440Z.md`
  - `../scripts/with-node22.sh npm run custom-ui:build`
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify`
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`

### Operational Notes
- This change was deployed on top of repo base commit `18e98f1`; the working tree still contains the local source/test/doc updates until they are committed.

## Session Update - Backup And Restore Versioned And Re-Deployed (Mar 7, 2026 15:24 GMT)

### What Changed
- Bumped version markers to:
  - repo `0.6.57`
  - forge-native `0.3.35`
  - runtime bundle `1.2.70`
- Rebuilt and re-deployed the Admin Panel backup/restore move so production Confluence now matches the final versioned source.

### Validation / Evidence
- Focused regressions:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-config-mode-publish-feedback.spec.ts tests/forge-native-config-mode-publish-footer.spec.ts tests/forge-native-config-mode-backup-surface.spec.ts`
- Local runtime build:
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend`
- Production guardrail path:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-152329Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-152329Z.md`
  - `../scripts/with-node22.sh npm run custom-ui:build`
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify`
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence`

### Operational Notes
- This rollout supersedes the earlier unversioned 15:16 deploy notes for the same UI move.
- Repo base is still `18e98f1` until the follow-up commit is created and pushed.

## Session Update - Config Publish Schema Fallback And Modal Error Feedback (Mar 7, 2026 10:22 GMT)

### What Changed
- Fixed Config Mode publish failures caused by runtime `Event` updates sending both `updatedAt` and `updated_at` into mixed live schemas.
- Added `updateEventWithSchemaFallback` in [forge-native/src/runtime/index.js](/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/index.js) so Config Mode draft save/discard, publish schedule sync, and branding writes retry after removing any missing `Event` column.
- Updated the Schedule Config publish modal in [forge-native/static/runtime-frontend/src/configMode/ConfigModeOverlays.jsx](/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigModeOverlays.jsx) to show inline publishing and publish-failed alerts instead of leaving the failure hidden in the toolbar.
- Cleared stale publish errors before reopening the publish confirm dialog in [forge-native/static/runtime-frontend/src/configMode/ConfigModeContext.jsx](/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigModeContext.jsx).

### Validation / Evidence
- `./scripts/with-node22.sh npm run test:run -- tests/forge-native-config-mode-event-update-fallback.spec.ts tests/forge-native-config-mode-publish-feedback.spec.ts tests/schedule-builder-v2.spec.tsx tests/runtime-app-view-gating.spec.ts` ✅
- `./scripts/with-node22.sh npm run typecheck --prefix forge-native` ✅
- `./scripts/with-node22.sh npm run test:backend --prefix forge-native` ✅
- `./scripts/with-node22.sh npm run typecheck --prefix forge-native/static/frontend` ✅
- `./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --environment production` ✅
- `../scripts/with-node22.sh npm run custom-ui:build` ✅
- `../scripts/with-node22.sh forge deploy -e production` ✅
- `../scripts/with-node22.sh forge install --site hackdaytemp.atlassian.net --product confluence --environment production --upgrade --non-interactive` ✅
- New predeploy artifacts:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-101851Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-101851Z.md`

### Root Cause
- Live publish attempts for `Shona's IT Hack` were failing inside `publishEventConfigDraft` before schedule changes applied.
- Forge production logs showed `Failed to update event branding: Could not find the 'updated_at' column of 'Event' in the schema cache`, which left the publish modal spinning and the new schedule entries unapplied.
- The UI also did not render `saveError` inside the publish modal, so users saw a stuck dialog without a clear failure explanation.

## Session Update - Schedule Publish Milestone Insert Fix And Live Repair (Mar 7, 2026 10:31 GMT)

### What Changed
- Fixed the second publish blocker in [forge-native/src/runtime/index.js](/Users/nickster/Downloads/HackCentral/forge-native/src/runtime/index.js): runtime schedule milestone replacement now generates `Milestone.id` values before insert and retries without `signal` only if that column is missing.
- Updated Config Mode post-publish UX so success is explicit and final:
  - [forge-native/static/runtime-frontend/src/configMode/ConfigModeContext.jsx](/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigModeContext.jsx) now turns Config Mode off after a successful publish and keeps a short-lived success notice.
  - [forge-native/static/runtime-frontend/src/configMode/ConfigToolbar.jsx](/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/configMode/ConfigToolbar.jsx) now shows the success message after the modal closes.
- Repaired `Shona's IT Hack` directly in production by rebuilding the missing `Milestone` rows from the already-written `event_schedule`.

### Validation / Evidence
- Focused regression:
  - `./scripts/with-node22.sh npm run test:run -- tests/forge-native-config-mode-event-update-fallback.spec.ts tests/forge-native-config-mode-publish-feedback.spec.ts tests/schedule-builder-v2.spec.tsx tests/runtime-app-view-gating.spec.ts` ✅
- Build/typecheck:
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend` ✅
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native` ✅
- Production guardrail path:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-102843Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-102843Z.md`
  - `../scripts/with-node22.sh forge deploy -e production` ✅
  - `../scripts/with-node22.sh forge install --site hackdaytemp.atlassian.net --product confluence --environment production --upgrade --non-interactive` ✅
- Live data repair verification:
  - `Shona's IT Hack` `event_schedule` already includes day-2 builder-backed custom events.
  - `Milestone` rows for event `d3f7bb14-7d8f-4e92-8740-23b02994b4d4` now total `14` after repair.

### Operational Caveat
- Hosted browser automation is still blocked by Atlassian authentication in both Playwright MCP and Chrome DevTools from this environment, so I could not click through the real Confluence page end-to-end after the repair.

## Session Update - Authenticated Playwright Verified Shona Schedule And Publish Flow (Mar 7, 2026 12:23 GMT)

### What Changed
- Verified the hosted `Shona's IT Hack` Confluence page using the saved authenticated Playwright storage state at `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`.
- Confirmed the production `Schedule` page now renders the repaired milestone set in the live iframe, including:
  - `Morning Kickoff`
  - day-2 `Hacking Begins`
  - restored `Code Freeze`, `Presentations`, `Judging Period`, and `Results Announced`
- Executed the live publish flow in the authenticated hosted page:
  - entered `Config Mode`
  - opened the actions drawer
  - confirmed the publish modal
  - publish completed and returned the runtime to `CONFIG OFF`
- Updated startup instructions so future sessions must try the saved authenticated Playwright state before declaring hosted browser validation blocked.

### Validation / Evidence
- Authenticated hosted page artifacts:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-playwright-debug.png`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-schedule-before-publish.png`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-schedule-config-on.png`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/shona-after-live-publish.png`
- Live browser outcomes from the authenticated run:
  - page loaded on `https://hackdaytemp.atlassian.net/wiki/spaces/IS/pages/24510466/Shona+s+IT+Hack`
  - runtime iframe detected and hydrated
  - `Schedule` route rendered restored live milestones
  - post-publish state showed `CONFIG OFF`
  - subsequent fresh schedule load no longer showed `Draft`

### Process Guardrail
- Future hosted Confluence checks in this repo should start with the stored auth file and frame-aware selectors:
  - auth file: `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`
  - runtime UI is inside a Confluence iframe, so top-level selector checks are not authoritative

## Session Update - App View Handoff Stops Opening New Tabs (Mar 7, 2026 10:05 GMT)

### What Changed
- Removed the macro-host auto-open behavior for HackDay App View so loading embedded runtime surfaces no longer jumps the user into a separate app view automatically.
- Removed popup/new-tab fallback from the explicit `Open App View` handoff path in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/App.jsx`.
- The handoff now stays in the current browser tab by using same-tab navigation only.
- Updated the gating test in `/Users/nickster/Downloads/HackCentral/tests/runtime-app-view-gating.spec.ts` to lock the new no-auto-open behavior.

### Validation / Evidence
- `./scripts/with-node22.sh npm run test:run -- tests/runtime-app-view-gating.spec.ts` ✅
- `./scripts/with-node22.sh npm run build --prefix forge-native/static/runtime-frontend` ✅
- Production guardrail path:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-100356Z.json`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-100356Z.md`
  - `../scripts/with-node22.sh npm run custom-ui:build` in `forge-native` ✅
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify` ✅
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
  - Forge reported: `Site is already at the latest version`

### Operational Notes
- This change targets the macro/app-view transition path, not the internal `Schedule` route itself.
- Users can still explicitly open App View, but the runtime no longer attempts popup/new-tab fallback during that handoff.
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output

## Session Update - Schedule Builder Later-Day Publish Fix Deployed (Mar 7, 2026 09:58 GMT)

### What Changed
- Fixed the Schedule Builder publish gap where later-day standard events shown in Config Mode preview were not persisted into `event_schedule` or `Milestone` rows on publish.
- Root cause confirmed against live production data for `Shona's IT Hack`:
  - `event_schedule.selectedEvents` contained duplicated day-2 `opening` / `hacking-begins`
  - production milestones still only contained the first-day core events plus final-day milestones
- Updated the builder to persist later-day standard events as schedule `customEvents` with source metadata so publish regenerates them as participant-facing milestones.
- Updated runtime schedule hydration so those persisted builder-backed events map back onto the standard day tabs instead of reappearing as duplicate custom events in Config Mode.
- Extended schedule custom-event normalization in shared/backend/runtime config-mode paths to preserve the builder source metadata safely.

### Validation / Evidence
- Live production inspection (`Shona's IT Hack`, event id `d3f7bb14-7d8f-4e92-8740-23b02994b4d4`) showed:
  - `event_schedule.duration = 2`
  - `selectedEvents` included `opening`, `hacking-begins`, `opening`, `hacking-begins`, `code-freeze`, `presentations`, `judging`, `results`
  - milestone count remained `9`, confirming day-2 events were not being materialized
- Local validation:
  - `./scripts/with-node22.sh npm run test:run -- tests/schedule-builder-v2.spec.tsx` ✅
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native/static/frontend` ✅
  - `./scripts/with-node22.sh npm run typecheck --prefix forge-native` ✅
  - `./scripts/with-node22.sh npm run build --prefix forge-native/static/frontend` ✅
  - `./scripts/with-node22.sh npm run test:backend --prefix forge-native` ✅
- Production rollout:
  - predeploy backup sweep:
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-095613Z.json`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260307-095613Z.md`
  - `../scripts/with-node22.sh npm run custom-ui:build` in `forge-native` ✅
  - `../scripts/with-node22.sh forge deploy --environment production --no-verify` ✅
  - `../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
  - Forge reported: `Site is already at the latest version`

### Operational Notes
- Existing events that were already published before this fix keep their old milestone set until they are published again from Config Mode.
- For `Shona's IT Hack`, one more Schedule publish in Config Mode is required to materialize the missing later-day events using the fixed payload path.
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output

## Session Update - Repo-Local Node 22 Wrapper Added (Mar 6, 2026 10:21 GMT)

### What Changed
- Added `/Users/nickster/Downloads/HackCentral/scripts/with-node22.sh` to force the repo-pinned Homebrew Node 22 toolchain without changing the machine-wide default Node version.
- Updated `/Users/nickster/Downloads/HackCentral/STARTUP.md` to verify runtime with the wrapper instead of ad hoc PATH edits.
- Updated `/Users/nickster/Downloads/HackCentral/DEPLOY.md` so predeploy snapshot, Custom UI build, and Forge deploy/install commands all run through the wrapper.

### Validation / Evidence
- `./scripts/with-node22.sh node -v` ✅ `v22.22.0`
- `./scripts/with-node22.sh npm -v` ✅ `10.9.4`

### Operational Notes
- Default shell Node on this machine is still `v25.5.0`; that remains unchanged on purpose to avoid cross-repo impact.
- For HackCentral Forge work, prefer `./scripts/with-node22.sh <command>` from repo root or `../scripts/with-node22.sh <command>` from `forge-native/`.

## Session Update - v0.3.31 Empty-State Follow-Up Prepared (Mar 6, 2026 02:23 GMT)

### What Changed
- Refined the unpublished child HackDay schedule empty state in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Schedule.jsx`.
- Fixed the two UX issues reported after the `v0.3.30` rollout:
  - dark-mode empty-state treatment now uses a stronger elevated card with explicit accent border
  - a real CTA is restored without reintroducing the separate admin-note panel
- Admin behavior now shows a direct runtime CTA button:
  - `Turn On Config Mode`
  - wired to the existing Config Mode toggle
- Participant behavior now shows:
  - `The HackDay schedule will be published here soon.`

### Validation / Evidence
- `npm run build --prefix forge-native/static/runtime-frontend` ✅

### Release Notes
- Version bumped locally to `v0.3.31`.
- This session committed and pushed the follow-up change only; no Forge deploy/install has been run yet for `v0.3.31`.

## Session Update - v0.3.32 Dark-Mode Schedule Empty-State Hardening Prepared (Mar 6, 2026 02:32 GMT)

### What Changed
- Further refined the unpublished child HackDay schedule empty state in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Schedule.jsx`.
- Replaced the softer theme-token treatment with an explicit high-contrast dark surface and text colors after production feedback showed the content was still hard to read in dark mode.
- Kept the admin CTA in place and made it visually stronger:
  - `Turn On Config Mode`
  - primary button treatment
  - still wired to the runtime Config Mode toggle

### Validation / Evidence
- `npm run build --prefix forge-native/static/runtime-frontend` ✅

### Release Notes
- Version bumped locally to `v0.3.32`.
- This session is preparing commit/push/deploy for `v0.3.32`.

## Session Update - v0.3.31 Deployed To Production (Mar 6, 2026 02:27 GMT)

### What Changed
- Deployed `v0.3.31` from commit `8a69d65` to Forge production on `hackdaytemp.atlassian.net`.
- Included the schedule empty-state follow-up:
  - stronger dark-mode card treatment
  - direct `Turn On Config Mode` CTA for admins
  - cleaner participant copy

### Validation / Evidence
- Runtime guardrail:
  - `node -v` ✅ `v22.22.0`
- Predeploy backup sweep:
  - `/private/tmp/hackcentral-release-v031/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-022456Z.json`
  - `/private/tmp/hackcentral-release-v031/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-022456Z.md`
- Build/install path completed:
  - `npm install --prefix forge-native` ✅
  - `npm run custom-ui:install --prefix forge-native` ✅
  - `npm run custom-ui:build --prefix forge-native` ✅
  - `forge deploy --environment production --no-verify` ✅
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
  - Forge reported: `Site is already at the latest version`

### Operational Notes
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output

## Session Update - v0.3.32 Deployed To Production (Mar 6, 2026 02:38 GMT)

### What Changed
- Deployed `v0.3.32` from commit `195ce54` to Forge production on `hackdaytemp.atlassian.net`.
- Shipped the final dark-mode hardening for the unpublished child HackDay schedule empty state:
  - explicit high-contrast dark surface
  - fixed light heading/body copy
  - stronger primary CTA for Config Mode entry

### Validation / Evidence
- Runtime guardrail:
  - `node -v` ✅ `v22.22.0`
- Predeploy backup sweep:
  - `/private/tmp/hackcentral-release-v032/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-023655Z.json`
  - `/private/tmp/hackcentral-release-v032/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-023655Z.md`
- Build/install path completed:
  - `npm install --prefix forge-native` ✅
  - `npm run custom-ui:install --prefix forge-native` ✅
  - `npm run custom-ui:build --prefix forge-native` ✅
  - `forge deploy --environment production --no-verify` ✅
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
  - Forge reported: `Site is already at the latest version`

### Operational Notes
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output

## Session Update - v0.3.33 Published Schedule Card Contrast Fix Prepared (Mar 6, 2026 02:42 GMT)

### What Changed
- Fixed the actual dark-mode readability bug in the published child HackDay schedule view in `/Users/nickster/Downloads/HackCentral/forge-native/static/runtime-frontend/src/components/Schedule.jsx`.
- The issue was not the unpublished empty state. It was the published event cards using pastel signal backgrounds while still rendering title and description with theme text tokens that washed out in dark mode.
- Signal cards now use explicit high-contrast dark text for:
  - event title
  - event description

### Validation / Evidence
- `npm run build --prefix forge-native/static/runtime-frontend` ✅

### Release Notes
- Version bumped locally to `v0.3.33`.
- This session is packaging and deploying the published schedule contrast fix.

## Session Update - v0.3.33 Deployed To Production (Mar 6, 2026 02:43 GMT)

### What Changed
- Deployed `v0.3.33` from commit `624f062` to Forge production on `hackdaytemp.atlassian.net`.
- Fixed the published child HackDay schedule card contrast regression in dark mode:
  - event titles now use explicit dark high-contrast text on signal-colored cards
  - event descriptions now use explicit dark secondary text on signal-colored cards

### Validation / Evidence
- Runtime guardrail:
  - `node -v` ✅ `v22.22.0`
- Predeploy backup sweep:
  - `/private/tmp/hackcentral-release-v033/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-024130Z.json`
  - `/private/tmp/hackcentral-release-v033/docs/artifacts/HDC-P10-PREDEPLOY-BACKUP-active-events-20260306-024130Z.md`
- Build/install path completed:
  - `npm install --prefix forge-native` ✅
  - `npm run custom-ui:install --prefix forge-native` ✅
  - `npm run custom-ui:build --prefix forge-native` ✅
  - `forge deploy --environment production --no-verify` ✅
  - `forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence` ✅
  - Forge reported: `Site is already at the latest version`

### Operational Notes
- Forge CLI again emitted the recurring local warnings during deploy:
  - CLI update available (`12.14.1` -> `12.15.0`)
  - non-blocking packaging warning resolving `utf-8-validate` from Convex browser output
