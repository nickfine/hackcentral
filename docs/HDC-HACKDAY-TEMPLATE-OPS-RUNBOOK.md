# HDC HackDay Template Ops Runbook

## Purpose

Runbook for the Spinout Phase 6 operational path. For the **basic “create child HackDay” user flow** (parent page → wizard → child page → HD26Forge), see **`HDC-CREATE-CHILD-HACKDAY-FLOW.md`**.

Runbook focus:
1. Provision template from HDC parent macro.
2. Verify seed/mapping contract integrity.
3. Verify HackDay bootstrap and page-scoped isolation.
4. Capture repeatable evidence artifact for release and rollback decisions.

## Required Inputs

- Parent page URL (`/wiki/pages/viewpage.action?pageId=...`) where HDC runs.
- Child page URL created by `Create HackDay instance`.
- Event name used in the create dialog.
- Primary admin email configured during creation.
- Environment target (`production` unless explicitly testing `development`).

## Command Catalog

1. Generate smoke artifact scaffold:
```bash
npm -C /Users/nickster/Downloads/HackCentral run qa:spinout:template-smoke-scaffold -- \
  --parent-url "https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=<parentId>" \
  --child-url "https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=<childId>" \
  --event-name "<eventName>" \
  --primary-admin-email "<adminEmail>"
```

2. HDC contract verification baseline:
```bash
npm -C /Users/nickster/Downloads/HackCentral run qa:phase5:migration-dry-run -- --environment production --event-query "<eventName>"
```

3. HDC telemetry check:
```bash
npm -C /Users/nickster/Downloads/HackCentral run qa:phase6:telemetry-check
```

4. HD26 production health path (cross-repo):
```bash
npm -C /Users/nickster/Downloads/HD26Forge run qa:health:prod
```

## Verification Procedure

1. Parent provisioning check
- Open parent page and run create wizard for `hackday_template`.
- Confirm child page opens and renders HackDay macro iframe.

2. Seed/mapping contract check
- Confirm `Event` row is present with:
  - `runtime_type = hackday_template`
  - `template_target = hackday`
- Confirm `HackdayTemplateSeed` row is present with:
  - `confluence_page_id = child pageId`
  - expected `hdc_event_id`, `template_name`, `primary_admin_email`
  - `provision_status` at least `provisioned` (or `initialized` after first HD26 load)

3. HackDay bootstrap check
- Load child page as primary admin.
- Confirm runtime resolves to page-scoped event context.
- Confirm no singleton fallback warnings in sampled logs.

4. Isolation check
- Open two distinct template child pages in parallel.
- Verify event names/data are isolated per page.

5. Evidence capture
- Complete the generated artifact in `docs/artifacts/`.
- Record command outputs, observed page IDs, and PASS/BLOCKED/FAIL decision.

## Incident and Rollback

1. Seed missing after successful page create
- Retry create flow once with a unique event name.
- If repeated, capture failure details and block release.

2. Child page renders but wrong event context appears
- Treat as P0 isolation risk.
- Stop rollout and capture impacted page IDs.

3. Rollback guidance
- Disable new template creation path in release channel (if feature-flagged).
- Revert to last known-good deploy line for affected app.
- Keep artifact and log links in incident notes.

