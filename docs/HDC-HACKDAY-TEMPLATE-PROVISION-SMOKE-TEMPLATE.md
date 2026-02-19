# HDC HackDay Template Provision Smoke Template

Use this when validating template creation from HDC parent page into HackDay child runtime.

## Metadata

- Timestamp (UTC):
- Operator:
- Environment:
- Parent URL:
- Parent pageId:
- Child URL:
- Child pageId:
- Event name:
- Primary admin email:

## Step 1: HDC Provisioning

- [ ] Parent macro loaded.
- [ ] Create dialog submitted successfully.
- [ ] Child page opened automatically.
- [ ] Child page title/event name match expected input.

Notes:

## Step 2: Seed and Registry Contract

- [ ] `Event.runtime_type = hackday_template`
- [ ] `Event.template_target = hackday`
- [ ] `HackdayTemplateSeed` row exists for child `confluence_page_id`
- [ ] Seed payload includes expected template/admin fields
- [ ] `provision_status` is valid (`provisioned` or `initialized`)

Notes:

## Step 3: HD26 Bootstrap

- [ ] Child macro iframe renders.
- [ ] App loads page-scoped event context.
- [ ] No context-fallback warning signatures in sampled logs.

Notes:

## Step 4: Isolation

- [ ] Open second template child page in parallel.
- [ ] Data remains isolated by page (no cross-instance bleed).

Notes:

## Evidence

- Command output snippets:
- Screenshots/links:
- Log snippets:
- Artifact links:

## Decision

- [ ] PASS
- [ ] BLOCKED
- [ ] FAIL

## Follow-ups

- Owner:
- Actions:
- Due date:

