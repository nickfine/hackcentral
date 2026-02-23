# Learnings

Last compacted: 2026-02-21 14:00 UTC
Purpose: active cross-repo continuity notes only.

## Source-of-truth order (locked)
1. `/Users/nickster/Downloads/HackCentral/learnings.md`
2. `/Users/nickster/Downloads/HackCentral/forge-native/CONTINUATION_HANDOFF.md`
3. `/Users/nickster/Downloads/HackCentral/PLAN_HDC_V2_EXECUTION.md`
4. `/Users/nickster/Downloads/HackCentral/docs/HDC-HACKDAY-TEMPLATE-SPINOUT-PLAN.md`

## Current status snapshot (authoritative)
- Latest checkpoint time: 2026-02-23 UTC.
- Spinout migration/cutover workstream: complete.
- Runtime mode: page-scoped context resolution in production.
- Legacy dependency: singleton `isCurrent` fallback removed from HD26 resolver flow.
- Current HackCentral versions: root `0.6.29`, forge-native `0.1.8`.
- Current HackCentral Forge app: `4.25.0` (prod deploy 2026-02-23; custom-ui built then deploy; hackdaytemp up-to-date).
- Current HD26Forge versions: root `7.5.76`, frontend `1.2.50`.
- Current HD26Forge Forge app: `5.77.0`.
- Latest code anchor on HD26Forge: `6f364c7` on `main`.
- Latest code anchor on HackCentral: `139fa65` on `main`.

## Latest retained checkpoints (active window)
1. 2026-02-21 13:55 UTC: dark-mode rollover fix + production promotion.
2. 2026-02-21 13:59 UTC: validation-only closure, no code/deploy changes.
3. 2026-02-21 14:24 UTC: Team Detail pill contrast remediation + deploy.
4. 2026-02-22: HD26Forge code integrity audit – backend fixes (user.id bug, UUID IDs, magic numbers, error handling), frontend fixes (CSS tokenization, font mismatch, a11y, dead code), event-scoped theming. Deployed as `5.77.0`.
5. 2026-02-22: HackCentral code integrity audit – schema cleanup (dead indexes, dead table, draft status removal), shared constants (email domain, timezone), frontend consolidation (icon maps, filter buttons, preview limits). Deployed as `4.16.0`.
6. 2026-02-23: HackCentral Forge: built static UIs (`npm run custom-ui:build`), deployed to production `4.25.0`; `forge install --upgrade` on hackdaytemp.atlassian.net — site at latest. (Create wizard/Schedule step live in web app; deploy web app separately if needed.)

## Validation state (latest retained checkpoint)
- `npm --prefix /Users/nickster/Downloads/HD26Forge/static/frontend run build` passed.
- `npm -C /Users/nickster/Downloads/HD26Forge run test:e2e:local` passed (`10/10`).
- `npm -C /Users/nickster/Downloads/HD26Forge run qa:health:prod` passed.
- `E2E_CONFLUENCE_URL='https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=7241729' npm -C /Users/nickster/Downloads/HD26Forge run test:e2e:confluence` passed (`5/5`).
- Observed install state: production `Up-to-date` on `hackdaytemp.atlassian.net`.

## Active boundary
- No open architecture migration tasks remain for spinout.
- Code integrity audit complete across both codebases (HIGH, MEDIUM, LOW items all resolved).
- Current workstream is operational monitoring plus frontend UX iteration.

## Creating child HackDay apps from HDC
- **Basic flow:** Parent Confluence page (with HDC macro) → “Create HackDay template instance” wizard → child page with HD26Forge macro; Event + HackdayTemplateSeed written; HD26Forge resolves context by pageId from seed.
- **Doc:** `docs/HDC-CREATE-CHILD-HACKDAY-FLOW.md` — prerequisites (Forge vars, Supabase tables), user steps, backend reference, verification checklist, troubleshooting.
- **Forge vars (HDC app):** `HACKDAY_TEMPLATE_APP_ID`, `HACKDAY_TEMPLATE_ENVIRONMENT_ID`, `HACKDAY_TEMPLATE_MACRO_KEY` must be set so the child page is created with the HD26Forge macro.

## Archive
- Full pre-compaction history is preserved at:
- `/Users/nickster/Downloads/HackCentral/docs/archive/progress/2026-02-21/learnings.full.2026-02-21.md`
- `/Users/nickster/Downloads/HackCentral/docs/archive/progress/2026-02-21/README.md`

## Continuation update (2026-02-22)

### Scope
Full code integrity and consistency audit across both HD26Forge and HackCentral codebases. All HIGH, MEDIUM, and LOW severity items resolved.

### HD26Forge changes (v7.5.76 / frontend v1.2.50 / Forge `5.77.0`)
**Backend (`src/index.js`):**
- Fixed `user.id` runtime bug in `updateAutoAssignOptIn` (missing variable assignment).
- Replaced 22 `Date.now()+Math.random()` ID patterns with `crypto.randomUUID()` via `makeId()` helper.
- Extracted 6 magic numbers to named constants (`OBSERVERS_MAX_SIZE`, `SUPABASE_BATCH_SIZE`, etc.).
- Extracted `OBSERVERS_TEAM_ID = "team-observers"` constant.
- Standardized event registration error handling (returns `warning` field instead of silent swallow).
- Removed duplicate JSDoc block.

**Frontend:**
- Replaced ~50 hardcoded hex colors in `index.css` with CSS variable tokens; removed ~15 redundant dark-mode overrides.
- Fixed Tailwind font family mismatch (heading/sans/display now correctly reference Sora/Manrope).
- Added `aria-label` and `aria-pressed` to view toggle buttons in Voting and Marketplace.
- Extracted shared `MAX_SKILLS = 5` to `data/constants.js`.
- Deleted unused `useReducedMotion.js` and `useNotifications.js` hooks.
- Added vote error feedback toast in Voting component.
- Event-scoped theming: `ThemeContext` + `ThemeStateProvider` with per-page localStorage persistence.

**Commit:** `6f364c7` on `main`.

### HackCentral changes (v0.6.23 / forge-native v0.1.4 / Forge `4.16.0`)
**Schema (`convex/schema.ts`):**
- Removed unused `by_ai_related` index from `projectComments`.
- Removed unused `by_category` index from `capabilityTags`.
- Removed dead `recognitionBadges` table.
- Removed `"draft"` from `libraryAssets` status union.

**Backend:**
- Deleted spent `migrateHackTypes.ts` migration file.
- Updated `forgeBridge.ts`: new assets created as `"in_progress"` instead of `"draft"`.
- Cleaned up `libraryAssets.ts`: removed `migrateDraftToInProgress` mutation and `"draft"` from validators.
- Cleaned up `seedData.ts`: removed `"draft"` from `LIBRARY_STATUSES` and `recognitionBadges` cleanup.
- Added trust-model comment to `forgeBridge.ts` auth boundary.
- Documented Clerk domain constraint in `auth.config.ts`.

**Forge native:**
- Extracted `ALLOWED_EMAIL_DOMAIN` and `DEFAULT_TIMEZONE` constants in `hdcService.ts`, `repositories.ts`, and both frontend apps.

**Frontend:**
- Consolidated duplicate hack-type icon maps into shared `HACK_TYPE_ICON_COMPONENTS` in `constants/project.ts`.
- Removed non-functional "More Filters" button from Projects page.
- Extracted preview limit constants in Library, People, and Search pages.

**Commit:** `91f60c3` on `main`.

### Deploy/install outcomes
- HD26Forge: `forge deploy -e production` ✅ (`5.77.0`), hackdaytemp up-to-date.
- HackCentral: `forge deploy -e production` ✅ (`4.16.0`), hackdaytemp up-to-date.

### Rollback anchors
- HD26Forge: pre-change `755bb7f`, post-change `6f364c7`.
- HackCentral: pre-change `26b66d4` (docs commit), post-change `91f60c3`.
