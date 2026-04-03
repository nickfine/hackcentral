# HackCentral Startup Ritual

Last updated: 2026-04-03

Use this as the single startup/shutdown checklist for work in this repo.
Current mode: operations and maintenance.

## Active Tenant Guardrail

- Active live tenant: `tag-hackday.atlassian.net`
- Safe deploy copy for the live tenant:
  - `/Users/nickster/Downloads/HackCentral-tag-hackday`
  - this is now a git-native clone on the local-only branch `tenant/tag-hackday`
  - do shared product work in the canonical repo first, then pull/rebase into this clone before deploy
- Legacy/canonical source checkout:
  - `/Users/nickster/Downloads/HackCentral`
  - this checkout is still wired to the `hackdaytemp` Forge app and should not be used for `tag-hackday` deploys

## Startup (required)

Runtime guardrail before any Forge command:

- Use Node `22.22.0` (repo-pinned in `.nvmrc` / `.node-version`)
- Verify with `./scripts/with-node22.sh node -v` if your shell default is unsupported

Read these files in order:

1. `README.md` (stack, architecture, setup)
2. `docs/README.md` (docs map)
3. `forge-native/README.md` (Forge app specifics)
4. `DEPLOY.md` (deploy/install path)
5. `TESTING_GUIDE.md` (verification commands)
6. Latest entry in `LEARNINGS.md` (recent operational context)
7. Latest entry in `CONTINUATION.md` (active checkpoint + handoff prompt)

Then confirm:

- Target environment (`localhost`, `staging`, or `production`)
- Target tenant (`tag-hackday` or `hackdaytemp`) before any Forge deploy/install command
- If targeting `tag-hackday`, verify the current working copy is `/Users/nickster/Downloads/HackCentral-tag-hackday` on branch `tenant/tag-hackday`
- Validation command(s) for the change
- Deployment path if shipping to Confluence
- Supabase verification path (`MCP-first`; service-role SQL fallback if MCP listing is empty in this workspace)
- Hosted Confluence validation path:
  - prefer authenticated local Playwright runs using `/Users/nickster/Downloads/HackCentral/.auth/hackdaytemp-storage.json`
  - use frame-aware selectors for HackDay runtime checks because the UI is inside a Confluence iframe
  - only treat hosted validation as blocked after the stored-auth Playwright path fails
  - for `tag-hackday`, use the canonical `wiki/apps` URL from `DEPLOY.md`

## Shutdown (required)

Before ending a session:

1. Record outcome and evidence in `LEARNINGS.md`.
2. If deploy occurred, confirm version markers and rollout notes in `README.md` and/or `CONTINUATION.md`.
3. Keep docs aligned with any process change.

## Deployment quick path

If shipping to Confluence, follow `DEPLOY.md`.

## Optional references (only when needed)

- `CONTINUATION.md` for recent long-form context
- `HDC-PRODUCT-EXECUTION-PLAN.md` and `ROADMAP.md` only when formal planning/rescoping is requested
