# HackCentral Startup Ritual

Last updated: 2026-03-03

Use this as the single startup/shutdown checklist for work in this repo.
Current mode: operations and maintenance.

## Startup (required)

Runtime guardrail before any Forge command:

- Use Node `22.22.0` (repo-pinned in `.nvmrc` / `.node-version`)
- Verify with `node -v` (or run with `PATH="/opt/homebrew/opt/node@22/bin:$PATH"` if your shell default is unsupported)

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
- Validation command(s) for the change
- Deployment path if shipping to Confluence
- Supabase verification path (`MCP-first`; service-role SQL fallback if MCP listing is empty in this workspace)

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
