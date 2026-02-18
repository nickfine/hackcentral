# HDC v2 Phase 3 Macro QA Runbook

Date: 2026-02-18

## Goal

Execute the pending Phase 3 macro-context QA matrix on real Confluence macro host pages and capture pass/fail evidence quickly.

## Required Inputs

- Parent macro host page URL:
  - `https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=<parentPageId>`
- Instance macro host page URL:
  - `https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=<instancePageId>`

Both pages must render the HackDay Central macro app.

## Preconditions

- Logged in to `hackdaytemp.atlassian.net`.
- Latest `main` is deployed/installed for environment under test.
- Switcher registry contains entries with `isNavigable=true` and non-null `confluencePageId`.

## Viewport Matrix

- Desktop: `1366x900` (macro iframe width target `>1024`)
- Tablet: `980x900` (macro iframe width target `768-1024`)
- Mobile: `390x844` (macro iframe width target `<768`)

Note: evaluate breakpoints using macro iframe width, not browser outer width.

## Test Steps (Run For Parent + Instance Pages)

1. Open page URL and wait for macro shell to render.
2. Open app switcher from header trigger (`HackDay Central ▾` or instance label).
3. Verify section model:
   - `Home`
   - `Live Events`
   - `Upcoming`
   - `Recent`
4. Verify current context behavior:
   - current row highlighted,
   - current row non-navigable.
5. Verify non-current navigable row behavior:
   - click row,
   - page navigates to target Confluence page,
   - switcher closes.
6. Verify keyboard interaction:
   - open with `Enter`,
   - move focus with `ArrowDown/ArrowUp`,
   - close with `Escape`.
7. Verify responsive behavior:
   - desktop: anchored dropdown, meta/status visible,
   - tablet: compact dropdown, meta/status hidden,
   - mobile: bottom sheet + overlay, row tap targets >=44px.
8. Verify unavailable-state behavior (if any non-provisioned rows exist):
   - row disabled,
   - row meta text: `Page not provisioned yet`,
   - warning note shown,
   - `Refresh switcher registry` control visible and functional.

## Evidence Capture Template

- Environment:
- Timestamp (UTC):
- Parent page URL:
- Instance page URL:
- Desktop result:
- Tablet result:
- Mobile result:
- Keyboard result:
- Navigation result:
- Unavailable-state result:
- Blockers:

## Exit Criteria

- Parent + instance pass desktop/tablet/mobile checks.
- Keyboard and close behavior pass.
- Cross-page navigation pass for non-current rows.
- Any blocker is captured with exact UI text and URL.
