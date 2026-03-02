# HackCentral Startup Ritual

Last updated: 2026-03-02

Use this as the single startup/shutdown checklist for work in this repo.
Current mode: operations and maintenance.

## Startup (required)

Read these files in order:

1. `README.md` (stack, architecture, setup)
2. `docs/README.md` (docs map)
3. `forge-native/README.md` (Forge app specifics)
4. `DEPLOY.md` (deploy/install path)
5. `TESTING_GUIDE.md` (verification commands)
6. Latest entry in `LEARNINGS.md` (recent operational context)

Then confirm:

- Target environment (`localhost`, `staging`, or `production`)
- Validation command(s) for the change
- Deployment path if shipping to Confluence

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
