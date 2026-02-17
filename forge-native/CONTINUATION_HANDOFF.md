# Forge Native Continuation Handoff

Date: 2026-02-17  
Workspace: `/Users/nickster/Downloads/HackCentral`

## Current state (important)

- The user-facing Confluence site (`hackdaytemp.atlassian.net`) has **two app installs**:
  - `HackCentral` (production env)
  - `HackCentral (Development)` (development env)
- Latest smoke/fix cycle was executed against **HackCentral (Development)**.
- Successful smoke outcome in that surface:
  - load app ✅
  - list hacks ✅
  - submit hack ✅ (`Hack submitted: gSSEfg`)
- In this macro surface there is no standalone "Projects area" UI; old checklist step for "create project UI flow" is not applicable.

## Latest fixes in this cycle

Files:
- `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/supabase/repositories.ts`
- `/Users/nickster/Downloads/HackCentral/tests/forge-native-repository-project-insert.spec.ts`

Fixes:
- parse escaped Supabase error payloads before matching retry conditions,
- handle `Project` insert failures across:
  - duplicate `teamId` (`23505`),
  - not-null `name`/`teamId` (`23502`),
  - FK `teamId` (`23503`),
- prefer existing `Team` ids before generating/creating fallback team rows,
- create legacy `Team` rows when required so retry `teamId` values are FK-valid.

Relevant commits:
- `0b66f8d` — escaped error handling in project insert retries
- `7e61684` — ensure legacy team rows exist for retry paths
- `5009da0` — prefer existing team ids before legacy team creation retries

## Validation status

- `npm run typecheck` (forge-native) ✅
- `npm run test:run` (repo root) ✅ (29 tests passing)

## Deployment status

- Development env deployed through `5.14.0` (fixes above).
- Development install on `hackdaytemp.atlassian.net` reported `Up-to-date`.
- Production env was deployed earlier in the session line, but the final smoke/fix verification was on development.

## Next recommended steps

1. Run a quick verification in **HackCentral (Development)**:
   - submit one additional hack,
   - confirm it appears after refresh.
2. If stable, promote the same commit line to production:
   - `forge deploy --non-interactive -e production`
   - `forge install --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence --environment production`
3. Re-run minimal production smoke (`load app`, `list hacks`, `submit hack`) in `HackCentral`.

## Commands

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
npm run frontend:build
npm run macro:build
npm run typecheck
```

```bash
cd /Users/nickster/Downloads/HackCentral
npm run test:run
```

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
forge deploy --non-interactive -e development
forge install --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence --environment development
```
