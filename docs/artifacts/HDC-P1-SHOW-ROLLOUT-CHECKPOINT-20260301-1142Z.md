# HDC P1 Module Rollout Checkpoint

- Timestamp (UTC): `2026-03-01 11:56:08Z`
- Task ID: `P1.SHOW.01`
- Module: `showcase`
- Scope: `Showcase contracts/migration wired (submission metadata, list/detail/featured APIs) with Forge UI list/detail wiring and admin featured toggles.`
- Checklist reference: `docs/HDC-P1-SHOWCASE-CONTRACT-SPEC.md`
- Guardrails pack: `docs/HDC-P1-OBS-GUARDRAILS-PACK.md`

## Executed Validation Commands

```bash
# Required baseline gate
cd /Users/nickster/Downloads/HackCentral
npm run qa:p1:go-gate
```

```bash
# Showcase targeted tests
cd /Users/nickster/Downloads/HackCentral
npm run test:run -- tests/forge-native-showcase-contract.spec.ts tests/forge-native-showcase-runtime-modes.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
```

```bash
# Production deploy + install confirmation
cd /Users/nickster/Downloads/HackCentral/forge-native
npm run custom-ui:build
forge deploy --environment production --no-verify
forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence
```

```bash
# Live migration + resolver smoke (completed earlier in task)
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" curl -sS -X POST \
  "https://api.supabase.com/v1/projects/ssafugtobsqxmqtphwch/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg query "select count(*)::int as showcase_rows from \"ShowcaseHack\";" '{query:$query}')"

SUPABASE_URL="https://ssafugtobsqxmqtphwch.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
SUPABASE_SCHEMA="public" \
FORGE_DATA_BACKEND="supabase" \
npx -y tsx -e "import { listShowcaseHacks, getShowcaseHackDetail } from './forge-native/src/backend/hackcentral.ts'; /* list/detail smoke */"
```

```bash
# Live telemetry sampling (Forge runtime logs)
cd /Users/nickster/Downloads/HackCentral/forge-native
forge logs -e production --since 30m --verbose
```

```bash
# Live authority + rollback dry-run verification
cd /Users/nickster/Downloads/HackCentral
SUPABASE_URL="https://ssafugtobsqxmqtphwch.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
SUPABASE_SCHEMA="public" \
FORGE_DATA_BACKEND="supabase" \
npx -y tsx -e "import { setShowcaseFeatured } from './forge-native/src/backend/hackcentral.ts'; /* admin unfeature + non-admin forbidden */"
```

## Results

- Regression gate: `pass` (`56/56` Phase 1 suites + backend/frontend typechecks + telemetry static check)
- Resolver smoke: `pass` (`listShowcaseHacks` + `getShowcaseHackDetail` on live project)
- Live UI smoke: `pass` (submit modal validation, valid submit, filters, detail panel, featured toggle)
- Live telemetry evidence: `pass` (`forge logs` sampled at app version `5.29.0` with `hdc-switcher-telemetry` + `hdc-performance-telemetry`, and expected Showcase validation traces)
- Typechecks (backend/frontend): `pass`
- Additional module checks: `pass` (Showcase targeted suites `9/9`; live migration/schema verified)

## Checklist Status Snapshot

- [x] Regression gate commands passed.
- [x] Resolver contract behavior validated in target environment.
- [x] Required telemetry lines observed in live logs.
- [x] Rollback commands/path documented and tested (or dry-run validated).

## Rollback Plan

- Feature/module rollback:
  - keep Showcase navigation exposure behind rollout controls; disable module visibility immediately if regressions appear.
- Schema rollback posture:
  - non-destructive: retain `ShowcaseHack` table and suspend resolver/UI invocation.
- Data/permission rollback actions:
  - clear smoke rows with targeted `DELETE` statements if required.
  - revert featured state via `hdcSetShowcaseFeatured(false)` (dry-run validated in this checkpoint).

## Decision

- `GO`

## Notes

- Correct live app URL for this production environment is:
  - `https://hackdaytemp.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/86632806-eb9b-42b5-ae6d-ee09339702b6/hackday-central`
- Previous stale environment URL (`.../6ef543d7-.../hackday-central`) returns `Global page module was not found` and is not valid for current smoke.
- Live UI evidence screenshot:
  - `docs/artifacts/HDC-P1-SHOW-LIVE-UI-SMOKE-20260301-1153Z.png`
- Smoke submission artifact row verified in live DB:
  - project `834fc179-ca7a-44d5-9680-4ee6c2276fa2`
  - `demo_url=https://example.com/demo`
  - `tags=[showcase-smoke, ops-automation]`
  - `featured=false` after rollback dry-run.
