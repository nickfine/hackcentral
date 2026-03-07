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

## Current Operational Notes (2026-03-06 02:45 GMT)

- Atlassian MCP target remains:
  - site: `https://hackdaytemp.atlassian.net`
  - cloudId: `fa506321-b5f3-4087-9b5f-8bc611d72ba1`
- Runtime hero image upload is live in production:
  - draft preview updates immediately when uploaded
  - Supabase-hosted hero images are allowed via manifest `external.images` policy.
- Event backup/restore v1 is live in production:
  - manual backup creation works from HackDay runtime Config Mode
  - predeploy backup sweep works in production
  - restore dry-run and restore apply have both been rehearsed successfully on a non-critical event
  - latest production rehearsal ended with zero warnings and zero post-restore drift
- Runtime Config Mode now includes:
  - `Backup Safety` status
  - `Create Backup Now`
  - platform-admin restore preview/apply controls
  - restore warning display in the side panel
- Hacks showcase list now renders only hacks with valid page linkage.
- `Open` for showcase hacks opens in a new tab and validates linkage before opening.
- HackDay app-route access (`/hackday-app`) is no longer restricted to site admins; non-site-admin users can open HackDays via `Open`.
- Supabase platform warning exception still applies:
  - `auth_leaked_password_protection` (plan-gated, non-code remediation).
- For Supabase access, keep MCP-first checks; if MCP project listing is empty in this workspace, use the documented service-role SQL fallback and record evidence in `LEARNINGS.md`.
- Child HackDay schedule ownership is now in the runtime `Schedule` page under Config Mode; HackCentral creation no longer owns schedule setup.
- The latest production follow-up fixed published schedule card contrast in dark mode.
- Forge production is currently deployed from git tag `v0.3.33` / commit `624f062`.
- Hosted Confluence browser validation guardrail:
  - before claiming Playwright/Chrome-hosted validation is blocked, first try the saved authenticated Playwright storage state at `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`
  - use frame-aware selectors because the HackDay runtime UI is rendered inside a Confluence iframe
  - authoritative prior auth/frame-aware smoke evidence lives in:
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-2026-03-04T01-19-07-301Z.json`
    - `/Users/nickster/Downloads/HackCentral/docs/artifacts/HDC-P8-PLAYWRIGHT-SMOKE-FRAMEAWARE-2026-03-04T01-19-07-301Z.md`

## Deployment Guardrail

Follow `DEPLOY.md` exactly. Build custom UI before `forge deploy`.
