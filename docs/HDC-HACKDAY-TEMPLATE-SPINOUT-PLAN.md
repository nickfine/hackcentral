# Plan: HackDay Template Spinout via HDC (Using HD26Forge as Canonical App)

Last compacted: 2026-02-21 14:00 UTC

## Summary
HDC provisions HackDay template child pages and writes minimal seed metadata. HD26Forge resolves runtime context by page ID and owns local lifecycle from first load onward.

## Source-of-truth order (locked)
1. `/Users/nickster/Downloads/HackCentral/learnings.md`
2. `/Users/nickster/Downloads/HackCentral/forge-native/CONTINUATION_HANDOFF.md`
3. `/Users/nickster/Downloads/HackCentral/PLAN_HDC_V2_EXECUTION.md`
4. `/Users/nickster/Downloads/HackCentral/docs/HDC-HACKDAY-TEMPLATE-SPINOUT-PLAN.md`

## Decision lock (unchanged)
1. Single HackDay Forge app with page-scoped instances.
2. HDC remains orchestration/registry owner.
3. HD26Forge owns runtime lifecycle and event-local behavior.
4. Seed/mapping handshake remains the boundary between apps.
5. Compatibility bridge approach remains valid, but cutover is now complete.

## Completion status
- HDC template provisioning path: active in production.
- HD26 runtime context resolution: fully page-scoped.
- Singleton `isCurrent` fallback: removed from runtime resolver path.
- Remaining scope: operational monitoring and docs hygiene, not architectural migration.

## Done criteria closure
1. HDC creates template instances end-to-end in production: met.
2. HD26 no longer depends on singleton context for template-created pages: met.
3. Template instances are page-scoped and genericized: met.
4. Documentation/ops artifacts exist and are linked from execution docs: met.

## Latest retained checkpoint set
1. 2026-02-21 12:25 UTC.
2. 2026-02-21 12:48 UTC.
3. 2026-02-21 13:13 UTC.
4. 2026-02-21 13:55 UTC.
5. 2026-02-21 13:59 UTC.

## Archive
- Full pre-compaction plan/checkpoint log is preserved at:
- `/Users/nickster/Downloads/HackCentral/docs/archive/progress/2026-02-21/HDC-HACKDAY-TEMPLATE-SPINOUT-PLAN.full.2026-02-21.md`
- `/Users/nickster/Downloads/HackCentral/docs/archive/progress/2026-02-21/README.md`

## Continuation update (2026-02-21 14:24 UTC)

### Scope
- Closed exactly one pending slice after the `2026-02-21 13:59 UTC` checkpoint: Team Detail dark-mode pill contrast remediation and production promotion to `hackdaytemp`.
- Scope was constrained to Team Detail pill contrast contracts (team/idea page), matching e2e selector contract updates, release bump/dist refresh, and deploy/install verification.
- No backend/schema/API/manifest/env/routing/data-flow changes in this slice.

### Exact changes
1. Team Detail pill surfaces migrated from light-only utility classes to semantic classes in:
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/src/components/TeamDetail.jsx`
   - Added semantic contracts for: membership badge, team vibe pill variants, vibe select control, quick reactions (idle/active), captain pending-empty state, "Looking For" pills, "looking for your skills" callout, and skill-coverage states.
2. Added explicit light/dark contrast contracts in:
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/src/index.css`
   - New class family: `team-detail-*` with mode-specific overrides under `[data-color-mode="dark"]`.
3. Updated local e2e test contract to target semantic classes instead of brittle light-utility selectors:
   - `/Users/nickster/Downloads/HD26Forge/tests/e2e/local/team-detail-ux.spec.ts`
4. Applied required release hygiene + bundle refresh:
   - `/Users/nickster/Downloads/HD26Forge/package.json` + lock (`7.5.71 -> 7.5.72`)
   - `/Users/nickster/Downloads/HD26Forge/static/frontend/package.json` + lock (`1.2.45 -> 1.2.46`)
   - refreshed `/Users/nickster/Downloads/HD26Forge/static/frontend/dist/*`
5. Commit/push:
   - HD26Forge commit `ea0db46` (`Fix team detail pill contrast in dark mode and bump versions`) pushed to `origin/main`.

### Exact versions
- `/Users/nickster/Downloads/HD26Forge/package.json`: `7.5.71 -> 7.5.72`
- `/Users/nickster/Downloads/HD26Forge/static/frontend/package.json`: `1.2.45 -> 1.2.46`
- Production deploy in this slice: Forge app version `5.73.0`.

### Validation results
- `npm --prefix /Users/nickster/Downloads/HD26Forge/static/frontend run build` ✅ (`hackday-custom-ui@1.2.46`)
- `npm -C /Users/nickster/Downloads/HD26Forge run test:e2e:local -- tests/e2e/local/team-detail-ux.spec.ts` ✅ (`3/3`)
- `npm -C /Users/nickster/Downloads/HD26Forge run test:e2e:local` ✅ (`10/10`)
- `npm -C /Users/nickster/Downloads/HD26Forge run qa:health:prod` ✅ pre-deploy (`PASS`)
- `npm -C /Users/nickster/Downloads/HD26Forge run qa:health:prod` ✅ post-deploy (`PASS`)
- `E2E_CONFLUENCE_URL='https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=7241729' npm -C /Users/nickster/Downloads/HD26Forge run test:e2e:confluence` ✅ (`5/5`)

### Deploy/install outcomes
- `forge deploy -e production --non-interactive` ✅ (deployed `5.73.0`; `forge deploy list -e production` latest row `2026-02-21T14:22:40.891Z`, `production`, major `5`, `Success`).
- `forge install --upgrade --site hackdaytemp.atlassian.net --product confluence -e production --non-interactive` ✅ (`Site is already at the latest version`).
- `forge install list --site hackdaytemp.atlassian.net --product confluence -e production` ✅ (`Up-to-date`, installation `5ba1ba16-d69f-4aaa-9dfc-038f9571d095`, app major `5`).

### Commit hash(es)
- HD26Forge: `ea0db46` (pushed `main`, range `e81162c..ea0db46`).
- HackCentral docs repo: `no new commit` (checkpoint appended in working tree only).

### Rollback safety evidence
- Pre-change anchors:
  - HD26Forge: branch `main`, HEAD `e81162c` (rollback anchor)
  - HackCentral: branch `main`, HEAD `b7b3882` (rollback anchor)
- Post-change anchors:
  - HD26Forge: branch `main`, HEAD `ea0db46`; rollback anchor remains `e81162c`.
  - HackCentral: branch `main`, HEAD `b7b3882`; rollback anchor unchanged.
