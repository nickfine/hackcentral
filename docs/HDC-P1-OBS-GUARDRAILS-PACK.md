# HDC Phase 1 Observability Guardrails Pack

Task ID: `P1.OBS.01`  
Last updated: 2026-03-01

## Purpose

Provide a single, repeatable GO/NO-GO gate for Phase 1 module rollouts and post-merge validation.

This pack covers completed Phase 1 loops today:

- `P1.REG.01` (Registry)
- `P1.PX.01` (Problem Exchange)
- `P1.PIPE.01` (Pipeline)

It also defines the same gate model to apply to upcoming loops:

- `P1.SHOW.01` (Showcase)
- `P1.CHILD.01` (Child integration)

## Standard Gate Commands

Run from `/Users/nickster/Downloads/HackCentral`:

```bash
npm run qa:p1:regression-pack
npm run qa:p1:telemetry-static-check
```

Combined gate:

```bash
npm run qa:p1:go-gate
```

### What These Commands Validate

`qa:p1:regression-pack`

- registry contract/utils/runtime suites
- problem exchange contract/runtime/utils suites
- pipeline contract/runtime suites
- Forge backend typecheck (`forge-native`)
- Forge frontend typecheck (`forge-native/static/frontend`)

`qa:p1:telemetry-static-check`

- verifies code presence of key telemetry channels and event names:
  - `hdc-problem-exchange-telemetry`
  - `problem_created`, `problem_voted`, `problem_status_updated`, `problem_flagged`, `problem_moderated`
  - `hdc-pipeline-telemetry`
  - `pipeline_stage_moved`
  - `hdc-performance-telemetry`
  - `hdc-switcher-telemetry`

## Live Telemetry Gate (Environment Check)

When validating staging/production rollout, add this runtime evidence check:

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
forge logs -e <production|staging> --since 60m --limit 2000 \
  | rg "hdc-problem-exchange-telemetry|hdc-pipeline-telemetry|hdc-performance-telemetry|hdc-switcher-telemetry|runtime_first_load|runtime_bootstrap|create_handoff" -n
```

Expected outcome: at least one relevant line for the module being released and no unexplained error bursts during the validation window.

## Supabase Access Path (MCP First, Fallback Defined)

1. Use Supabase MCP tools first.
2. If MCP is non-admin in this workspace (empty `list_projects` or permission denied):

```bash
# Discover project refs
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects list --output json

# Fetch project keys for controlled validation reads
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx -y supabase@latest projects api-keys --project-ref <ref> --output json
```

3. For migration/query verification when MCP admin calls are unavailable:

```bash
curl -sS -X POST "https://api.supabase.com/v1/projects/<ref>/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"query":"select 1 as ok"}'
```

4. For resolver smoke checks from HackCentral code path:

```bash
SUPABASE_URL="https://<ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
SUPABASE_SCHEMA="public" \
FORGE_DATA_BACKEND="supabase" \
npx -y tsx -e "/* import and invoke target resolver function(s) */"
```

## Rollout Artifact Standard

Use this template for every module checkpoint:

- `docs/HDC-P1-MODULE-ROLLOUT-CHECKPOINT-TEMPLATE.md`

Write resulting artifacts to:

- `docs/artifacts/HDC-P1-<MODULE>-ROLLOUT-CHECKPOINT-<YYYYMMDD-HHMMZ>.md`

## Module-Specific Checklists

- Problem Exchange: `docs/HDC-P1-PROBLEM-EXCHANGE-ROLLOUT-CHECKLIST.md`
- Pipeline: use the standardized checkpoint artifact shape and this guardrails pack until a dedicated checklist is needed for follow-on enhancements.

## GO / NO-GO Criteria

GO requires all:

1. `qa:p1:go-gate` passes.
2. Module-specific resolver smoke check passes in target environment.
3. Required telemetry lines are observed in live logs for the module under test.
4. Rollback path is documented in the checkpoint artifact.

NO-GO if any gate fails; record failure details and rollback action in:

- `HDC-PRODUCT-EXECUTION-PLAN.md`
- `CONTINUATION.md`
- `LEARNINGS.md`
