# HDC HackDay Template Provision Smoke

## Metadata

- Timestamp (UTC): 2026-03-19T18:50:13.121Z
- Operator: Codex
- Environment: production
- Parent URL: https://tag-hackday.atlassian.net/wiki/pages/viewpage.action?pageId=131530754
- Parent pageId: 131530754
- Child URL: https://tag-hackday.atlassian.net/wiki/pages/viewpage.action?pageId=132087809
- Child pageId: 132087809
- Event name: TAG HackDay Tenant Smoke 2026-03-19 18:44
- Primary admin email: nfine@adaptavist.com

## Step 1: HDC Provisioning

- [x] Parent macro loaded.
- [x] Create dialog submitted successfully.
- [x] Child page opened automatically.
- [x] Child page title/event name match expected input.

Notes:
- Parent page rendered HackCentral parent mode in production iframe (`custom-ui-macro`) with wizard + empty registry state.
- Create flow redirected to HackCentral app view: `https://tag-hackday.atlassian.net/wiki/apps/22696465-0692-48af-9741-323e1cfc2631/1c797890-3b54-448e-85da-4ecbe9e9e777/hackday-app?pageId=132087809`.
- Child Confluence page was created as `TAG HackDay Tenant Smoke 2026-03-19 18:44` with pageId `132087809`.

## Step 2: Seed and Registry Contract

- [x] Event row has runtime_type = hackday_template.
- [x] Event row has template_target = hackday.
- [x] HackdayTemplateSeed row exists for child pageId.
- [x] Seed payload includes expected template/admin fields.
- [x] provision_status is valid (provisioned or initialized).

Notes:
- `Event.id = f000ed27-4149-4b56-8f3e-91dfa2f68f5b`
- `Event.confluence_page_id = 132087809`
- `Event.confluence_parent_page_id = 131530754`
- `HackdayTemplateSeed.id = d397788d-1a83-465b-8f4b-129bab3a02b2`
- `HackdayTemplateSeed.primary_admin_email = nfine@adaptavist.com`
- `HackdayTemplateSeed.provision_status = provisioned`

## Step 3: Runtime Bootstrap

- [x] Child runtime iframe renders.
- [x] App resolves page-scoped context.
- [x] No forbidden context warning signatures in sampled logs.

Notes:
- Current tenant runtime owner is `hackcentral`, so the child page renders HackCentral `hackday-runtime-macro` / `runtime-ui-frontend` rather than the legacy HD26Forge child macro path.
- Browser telemetry on child-page load:
  - `runtime_first_load`
  - `eventId = f000ed27-4149-4b56-8f3e-91dfa2f68f5b`
  - `pageId = 132087809`
  - `runtimeSource = seed_mapping`
  - `outcome = success`
- Forge production logs also recorded:
  - `hdc-runtime-routing-create-new` for `pageId = 132087809`
  - `create_instance_draft` success for the same child page/event
- Observed non-blocking follow-up:
  - `Only platform admins or event admins can use Config Mode`
  - This affected Config Mode preload only; base runtime bootstrap still succeeded.

## Step 4: Isolation

- [x] Second template child page opened in parallel.
- [x] No cross-instance data bleed between page contexts.

Notes:
- Second child page created: `131596290`
- Second event row: `ba8a46b0-67c1-4853-ba66-43e2473a5e06` / `TAG HackDay Tenant Smoke 2026-03-19 18:48 B`
- Parallel child-page loads emitted separate telemetry pairs:
  - page `132087809` -> event `f000ed27-4149-4b56-8f3e-91dfa2f68f5b`
  - page `131596290` -> event `ba8a46b0-67c1-4853-ba66-43e2473a5e06`
- Both runtime loads reported `runtimeSource = seed_mapping` and `outcome = success`.

## Evidence

- Commands run:
  - `forge deploy -e staging` / `forge deploy -e production` for HackCentral tenant clone
  - `forge deploy -e staging` / `forge deploy -e production` for HD26Forge tenant clone
  - `forge variables set` / `set-tenant-forge-vars.sh` for both apps
  - `supabase db query ... "Event"` for `confluence_page_id = 132087809`
  - `supabase db query ... "HackdayTemplateSeed"` for `confluence_page_id = 132087809`
  - `forge logs -e production --since 30m --limit 400 | rg ...`
- Log snippets:
  - `hdc-performance-telemetry` `create_instance_draft` success for child pages `132087809` and `131596290`
  - `hdc-runtime-routing-create-new` success for both child pages
  - `runtime_first_load` success for both child pages with distinct `eventId` / `pageId`
- Screenshots/links:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-TAG-HACKDAY-parent-page-20260319.png`
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-TAG-HACKDAY-child-page-20260319.png`
- Related artifacts:
  - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-TAG-HACKDAY-TENANT-BOOTSTRAP-20260319T110332Z.md`

## Decision

- [x] PASS
- [ ] BLOCKED
- [ ] FAIL

## Follow-ups

- Owner: HackCentral platform ops
- Actions:
  - Keep runbooks aligned with the current `HDC_RUNTIME_OWNER=hackcentral` child-runtime architecture.
  - Investigate Config Mode permission resolution for newly created primary admins on first child-page load.
- Due date:
