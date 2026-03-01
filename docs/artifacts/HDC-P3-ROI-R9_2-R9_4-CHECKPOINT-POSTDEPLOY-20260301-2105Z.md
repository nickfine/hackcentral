# HDC P3 ROI R9.2 + R9.4 Post-Deploy Checkpoint

- Timestamp (UTC): 2026-03-01T21:05:00Z
- Task ID: `P3.ROI.01`
- Slice: `R9.2` configurable rate-card spend + `R9.4` business-unit attribution wiring
- Decision: `GO`

## Scope Closed In This Checkpoint

1. Deployed ROI `R9.2`/`R9.4` production bundle with configured env sources:
   - `HDC_ROI_RATE_CARD_JSON`
   - `HDC_ROI_BUSINESS_UNIT_TEAM_MAP_JSON`
2. Landed compatibility hardening for live `Project` schema variants used by ROI outputs:
   - `submittedAt`/`source_type` fallback now normalizes `hack_submission` rows to completed output state when explicit status is absent.
   - `ownerId` and `createdAt` fallbacks are now supported in project normalization.
3. Confirmed live ROI dashboard now renders non-empty team and business-unit breakdown rows on production data.

## Validation

```bash
cd /Users/nickster/Downloads/HackCentral-p1-child-01
npm run test:run -- tests/forge-native-roi-contract.spec.ts tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts tests/forge-native-phase2-telemetry-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
```

All commands passed in this session.

## Live Evidence

- Supabase MCP-first check:
  - `mcp__supabase__list_projects` returned `[]` in this workspace (known behavior).
- CLI/service-role fallback resolver smoke using live dataset + production-equivalent ROI env values:
  - `docs/artifacts/HDC-P3-ROI-R9_2-R9_4-LIVE-RESOLVER-SMOKE-COMPAT-20260301-2102Z.json`
  - confirms:
    - `sources.costRateCard.status=available`
    - `sources.businessUnit.status=available`
    - `teamBreakdownRows=1`
    - `businessUnitBreakdownRows=1`
- Production UI smoke screenshot:
  - `docs/artifacts/HDC-P3-ROI-R9_2-R9_4-LIVE-UI-SMOKE-POSTDEPLOY-20260301-2103Z.png`
  - confirms Source coverage `business unit=available` and visible `Business-unit breakdown` row (`Shared Services`, outputs `1`, spend `£0.00`).

## Residual Watch Items (Non-blocking)

1. Current live audit payloads still have zero token-bearing rows in scope; spend remains `£0.00` until token-bearing events are ingested.
2. `R9.1` token source remains `available_partial` by policy (mapping path is active; volume depends on upstream audit payload population).
