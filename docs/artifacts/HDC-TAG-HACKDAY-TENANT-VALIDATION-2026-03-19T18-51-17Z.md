# tag-hackday Tenant Validation

## Summary

- Site: `tag-hackday.atlassian.net`
- Runtime owner: `hackcentral`
- Parent page: `131530754`
- Supabase project: `easooezlgwbiiqqlpvpb`
- Status: PASS with one follow-up

## Provisioned Components

- HackCentral tenant app
  - appId `22696465-0692-48af-9741-323e1cfc2631`
  - staging env `15ac566f-3a62-4ffd-9fd6-1e50e5a47c9b`
  - production env `1c797890-3b54-448e-85da-4ecbe9e9e777`
- HD26Forge tenant app
  - appId `4aaba451-2b35-4b5e-b903-ccd0dc325574`
  - staging env `2384fc12-3537-49a6-8b81-fb776ed795cc`
  - production env `e0f6d935-5f35-4005-95cd-fe9baf95a621`

## Validated Flow

1. Parent page rendered HackCentral parent mode on `https://tag-hackday.atlassian.net/wiki/pages/viewpage.action?pageId=131530754`.
2. Create wizard successfully provisioned child page `132087809` for event `TAG HackDay Tenant Smoke 2026-03-19 18:44`.
3. Supabase rows confirmed:
   - `Event.runtime_type = hackday_template`
   - `Event.template_target = hackday`
   - `HackdayTemplateSeed.confluence_page_id = 132087809`
   - `HackdayTemplateSeed.provision_status = provisioned`
4. Child page runtime loaded successfully from seed mapping on page `132087809`.
5. Second child page `131596290` also provisioned successfully.
6. Parallel loads of `132087809` and `131596290` resolved different `eventId` / `pageId` pairs, confirming page-scoped isolation.

## Runtime Note

- The deployed child runtime is HackCentral `hackday-runtime-macro` / `runtime-ui-frontend`.
- This is expected for `HDC_RUNTIME_OWNER=hackcentral`.
- Older docs that refer to the HD26Forge child macro are legacy-owner guidance and were updated in this session.

## Residual Issue

- Child runtime preload emitted `Only platform admins or event admins can use Config Mode`.
- This did not block parent provisioning, child-page creation, or runtime bootstrap.
- Follow-up is needed on Config Mode admin recognition for newly created event admins.

## Related Evidence

- `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-HACKDAY-TEMPLATE-PROVISION-SMOKE-2026-03-19T18-50-13-121Z.md`
- `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-TAG-HACKDAY-parent-page-20260319.png`
- `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-TAG-HACKDAY-child-page-20260319.png`
- `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-TAG-HACKDAY-TENANT-BOOTSTRAP-20260319T110332Z.md`
