# Claude Code Session Instructions for HackCentral

## Quick Start

Type:

```text
Read .claude/instructions.md
```

Then follow `STARTUP.md` before implementation.

## Canonical Startup Ritual

- Use `STARTUP.md` as the single source of truth for session startup/shutdown.
- Do not use legacy ritual references to removed files.

## Source-of-Truth Files

| File | Purpose |
|---|---|
| `STARTUP.md` | Canonical startup/shutdown checklist |
| `README.md` | Stack, architecture, setup |
| `forge-native/README.md` | Forge-specific app context |
| `DEPLOY.md` | Confluence deployment workflow |
| `TESTING_GUIDE.md` | Validation workflow |
| `LEARNINGS.md` | Append-only evidence log and operational learnings |
| `CONTINUATION.md` | Latest long-form session checkpoint and handoff prompt |
| `docs/README.md` | Docs index and source-of-truth order |

Planning references are optional and only used if explicitly requested:
- `HDC-PRODUCT-EXECUTION-PLAN.md`
- `ROADMAP.md`

## Work Execution Rules

1. Default to operational maintenance mode unless user explicitly asks for planning.
2. Preserve production guardrails unless the task explicitly changes them.
3. Validate locally before deploy whenever feasible.
4. Keep docs synchronized in the same session as meaningful process changes.
5. Do not open `ROADMAP.md` or `HDC-PRODUCT-EXECUTION-PLAN.md` unless planning/rescoping is explicitly requested.

## Current Operational Notes (2026-04-03 11:35 BST)

- Active live tenant is `tag-hackday.atlassian.net`.
- This checkout is still wired to the older `hackdaytemp` Forge app:
  - site: `https://hackdaytemp.atlassian.net`
  - app id: `f828e0d4-e9d0-451d-b818-533bc3e95680`
  - production env id: `86632806-eb9b-42b5-ae6d-ee09339702b6`
  - staging env id: `17778174-f2aa-4f73-a34a-985afd5fa4e2`
- The dedicated `tag-hackday` HackCentral tenant is a separate Forge app and must be deployed from its isolated tenant copy:
  - site: `https://tag-hackday.atlassian.net`
  - app id: `22696465-0692-48af-9741-323e1cfc2631`
  - production env id: `1c797890-3b54-448e-85da-4ecbe9e9e777`
  - staging env id: `15ac566f-3a62-4ffd-9fd6-1e50e5a47c9b`
- Guardrail:
  - do not run `forge deploy` for `tag-hackday` from this checkout unless you have intentionally switched the repo to the isolated tenant app id
  - if the user says "deploy production", first confirm which tenant they mean
  - if the target is `tag-hackday`, use the isolated tenant runbook in `docs/HDC-TENANT-INSTALL-RUNBOOK.md`
- Canonical validation URLs use `wiki/apps`, not `forge-apps`:
  - `hackdaytemp` production global page:
    - `https://hackdaytemp.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/86632806-eb9b-42b5-ae6d-ee09339702b6/hackday-central`
  - `tag-hackday` production global page:
    - `https://tag-hackday.atlassian.net/wiki/apps/22696465-0692-48af-9741-323e1cfc2631/1c797890-3b54-448e-85da-4ecbe9e9e777/hackday-central`
- Runtime hero image upload is live in production:
  - draft preview updates immediately when uploaded
  - Supabase-hosted hero images are allowed via manifest `external.images` policy.
- Runtime hero branding split is now live in production:
  - `Hero banner image` maps to `branding.bannerImageUrl`
  - `Hero icon image` maps to `branding.heroIconImageUrl`
  - dashboard hero uses banner as background and icon in the hero mark area
  - Admin Branding preview cards are reduced and include explicit banner/icon guidance text
  - staging validation for this flow should use the reusable commands:
    - `npm run qa:runtime:branding:staging`
    - `npm run qa:runtime:branding:staging:deploy`
  - latest known production child page:
    - `https://hackdaytemp.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/86632806-eb9b-42b5-ae6d-ee09339702b6/hackday-app?pageId=24510466`
  - latest known staging child page:
    - `https://hackdaytemp.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/17778174-f2aa-4f73-a34a-985afd5fa4e2/hackday-app?pageId=24510466`
- For custom uploaded hero banners, do not add extra contrast overlays or opacity reduction unless explicitly asked. Current production/staging expectation is a clear banner render with no wash layer.
- Event backup/restore v1 is live in production:
  - backup/restore controls now live under Admin Panel -> Settings
  - Config Mode no longer carries backup/restore controls in the draft-actions drawer
  - predeploy backup sweep works in production
  - restore dry-run and restore apply have both been rehearsed successfully on a non-critical event
  - latest production rehearsal ended with zero warnings and zero post-restore drift
- Runtime Config Mode now includes:
  - inline publish confirmation in the drawer footer instead of the old centered publish modal
  - shortened drawer chrome focused on draft/publish work
  - help disclosure + action hierarchy with `Publish` dominant, `Save Draft` secondary, and `Discard` / `Exit` separated
  - drawer anchoring beneath the `Show Actions` trigger on desktop
  - internal drawer scrolling so expanded help never strands lower actions
  - help disclosure resets to collapsed whenever the drawer closes
- Hacks showcase list now renders only hacks with valid page linkage.
- `Open` for showcase hacks opens in a new tab and validates linkage before opening.
- HackDay app-route access (`/hackday-app`) is no longer restricted to site admins; non-site-admin users can open HackDays via `Open`.
- Supabase platform warning exception still applies:
  - `auth_leaked_password_protection` (plan-gated, non-code remediation).
- For Supabase access, keep MCP-first checks; if MCP project listing is empty in this workspace, use the documented service-role SQL fallback and record evidence in `LEARNINGS.md`.
- Child HackDay schedule ownership is now in the runtime `Schedule` page under Config Mode; HackCentral creation no longer owns schedule setup.
- The latest production follow-up fixed published schedule card contrast in dark mode.
- Do not trust the checkout alone to identify the live tenant. Confirm:
  - site
  - Forge app id
  - environment id
  - the browser console marker on the canonical `wiki/apps` page
- Hosted Confluence browser validation guardrail:
  - for `tag-hackday`, first try `/Users/nickster/Downloads/HackCentral/.auth/tag-hackday-storage.json`
  - for `hackdaytemp`, first try `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`
  - make sure the storage state matches the target tenant before claiming hosted validation is blocked
  - use frame-aware selectors because the HackDay runtime UI is rendered inside a Confluence iframe
  - authoritative prior auth/frame-aware smoke evidence lives in:
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-2026-03-04T01-19-07-301Z.json`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-2026-03-04T01-19-07-301Z.md`

## Deployment Guardrail

Follow `DEPLOY.md` exactly. Build custom UI before `forge deploy`.
