# HackDay Runtime Macro Migration (Created Instances)

This runbook migrates existing `hackday_template` child pages from the legacy HD26Forge inline macro target to the HackCentral runtime macro target.

## Scripts

- `scripts/migrate-hackday-runtime-macro.mjs`
- `scripts/rollback-hackday-runtime-macro.mjs`

## Required Environment Variables

For migration discovery (Supabase):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

For Confluence page updates:

- `CONFLUENCE_API_EMAIL`
- `CONFLUENCE_API_TOKEN`

For macro rewrite targeting:

- Legacy source:
  - `HACKDAY_TEMPLATE_APP_ID`
  - `HACKDAY_TEMPLATE_ENVIRONMENT_ID`
  - `HACKDAY_TEMPLATE_MACRO_KEY`
- Runtime target:
  - `HDC_RUNTIME_APP_ID` (or `FORGE_APP_ID`)
  - `HDC_RUNTIME_ENVIRONMENT_ID` (or `FORGE_ENVIRONMENT_ID`)
  - `HDC_RUNTIME_MACRO_KEY` (default: `hackday-runtime-macro`)

## Dry Run

```bash
npm run qa:runtime:migrate-macros:dry-run -- \
  --tenant https://hackdaytemp.atlassian.net \
  --batch-size 50 \
  --cursor 0 \
  --rollback-manifest-path docs/runtime-migration/dry-run.json
```

## Execute Migration

```bash
npm run qa:runtime:migrate-macros -- \
  --tenant https://hackdaytemp.atlassian.net \
  --batch-size 50 \
  --cursor 0 \
  --rollback-manifest-path docs/runtime-migration/rollback-manifest.json
```

## Rollback (Dry Run)

```bash
npm run qa:runtime:rollback-macros:dry-run -- \
  --manifest docs/runtime-migration/rollback-manifest.json \
  --tenant https://hackdaytemp.atlassian.net
```

## Rollback (Execute)

```bash
npm run qa:runtime:rollback-macros -- \
  --manifest docs/runtime-migration/rollback-manifest.json \
  --tenant https://hackdaytemp.atlassian.net
```

## Notes

- Migration is batch-based and cursor-aware.
- Each updated page stores rollback metadata in the manifest:
  - page id
  - pre-migration hash
  - updated version
  - pre-migration storage body (for restoration)
- Keep `HDC_RUNTIME_OWNER=hd26forge` until parity checks are complete, then switch to `hackcentral` for full-page route cutover.
