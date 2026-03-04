# HDC P8 Showcase Page-Only Flag Decision (Production)

Generated at (UTC): 2026-03-03T16:50:24Z
Environment: production
Flag: `VITE_HDC_SHOWCASE_PAGE_ONLY_V1`
Current value: `false`

## Scope
Decision readiness for switching Showcase from hybrid mode to page-only mode.

## Inputs and Validation

1. Showcase coverage dry-run
- Command: `npm run qa:phase8:showcase-backfill -- --batch-size 50 --dry-run`
- Artifact: `docs/artifacts/HDC-P8-SHOWCASE-BACKFILL-all-20260303-165024Z.json`
- Result:
  - `coverage.total=9`
  - `coverage.pageBacked=9`
  - `coverage.legacyCount=0`
  - `failedCount=0`

2. Submission page coverage dry-run
- Command: `npm run qa:phase8:submission-page-backfill -- --batch-size 50 --dry-run`
- Artifact: `docs/artifacts/HDC-P8-SUBMISSION-BACKFILL-all-20260303-165024Z.json`
- Result:
  - `processedCount=8`
  - all rows `status=skipped` with reason `already_page_backed`
  - `failedCount=0`

3. Runtime styling remediation (production)
- Root cause fixed: runtime frontend Tailwind/PostCSS pipeline mismatch.
- Deploy status:
  - `forge deploy --environment production --no-verify` -> `✔ Deployed`
  - `forge install -e production --upgrade ...` -> `✔ Site is already at the latest version`
- User visual verification: confirmed page now "looks good" after deploy.

## Decision
Status: **GO-CANDIDATE**

Rationale:
- Showcase legacy backlog is now zero (`legacyCount=0`).
- Submission pages are fully backfilled for submitted projects in sampled production set.
- Styling blocker that affected runtime visual quality has been fixed and validated.

## Residual Risk
- Browser MCP smoke tooling was unavailable in-session (transport issues), so evidence relies on ops dry-runs + successful deploy + manual visual confirmation.

## Recommended Next Action
If you want to complete rollout:
1. Set build-time flag `VITE_HDC_SHOWCASE_PAGE_ONLY_V1=true`.
2. Rebuild and deploy production (`custom-ui:build` -> `forge deploy` -> `forge install`).
3. Capture one final post-flag Confluence-hosted smoke artifact (Hacks list page-open path + runtime submission CTA path).
