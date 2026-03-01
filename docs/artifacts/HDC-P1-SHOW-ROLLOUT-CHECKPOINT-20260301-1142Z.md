# HDC P1 Module Rollout Checkpoint

- Timestamp (UTC): `2026-03-01 11:42:07Z`
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
# Live migration + resolver smoke
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" curl -sS -X POST \
  "https://api.supabase.com/v1/projects/ssafugtobsqxmqtphwch/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg query "$(cat forge-native/supabase/migrations/20260301122000_phase1_showcase.sql)" '{query:$query}')"

# Verify table + columns
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" curl -sS -X POST \
  "https://api.supabase.com/v1/projects/ssafugtobsqxmqtphwch/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg query "select count(*)::int as showcase_rows from \"ShowcaseHack\";" '{query:$query}')"

# Read-only resolver smoke
SUPABASE_URL="https://ssafugtobsqxmqtphwch.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
SUPABASE_SCHEMA="public" \
FORGE_DATA_BACKEND="supabase" \
npx -y tsx -e "import { listShowcaseHacks, getShowcaseHackDetail } from './forge-native/src/backend/hackcentral.ts'; /* list/detail smoke */"
```

## Results

- Regression gate: `pass` (`56/56` Phase 1 suites (Registry + Problem Exchange + Pipeline + Showcase) + backend/frontend typechecks + telemetry static check)
- Resolver smoke: `pass` (`listShowcaseHacks` returned rows; `getShowcaseHackDetail` returned detail payload)
- Live telemetry evidence: `fail` (Forge runtime log sampling not yet executed in this checkpoint)
- Typechecks (backend/frontend): `pass`
- Additional module checks: `pass` (Showcase targeted suites `9/9`; live migration applied and schema verified)

## Checklist Status Snapshot

- [x] Regression gate commands passed.
- [x] Resolver contract behavior validated in target environment.
- [ ] Required telemetry lines observed in live logs.
- [ ] Rollback commands/path documented and tested (or dry-run validated).

## Rollback Plan

- Feature flag/module visibility rollback:
  - Keep Showcase UI exposure behind navigation-level rollout controls (do not promote broadly until telemetry/log checks pass).
- Schema rollback posture:
  - Non-destructive posture preferred: retain `ShowcaseHack` table and disable resolver/UI invocation if rollback needed.
- Data/permission rollback actions:
  - If needed, remove seeded/temporary showcase rows via `DELETE FROM "ShowcaseHack" WHERE ...` and revert featured bits via `hdcSetShowcaseFeatured(false)`.

## Decision

- `CONDITIONAL GO`

## Notes

- Supabase MCP still returns no projects in this workspace (`list_projects -> []`), so live DB operations used CLI + Management API fallback.
- `ShowcaseHack` table was absent prior to this slice; migration `20260301122000_phase1_showcase.sql` was applied to project `ssafugtobsqxmqtphwch`.
- Forge live telemetry sampling and explicit rollback drill remain open before final GO promotion.
