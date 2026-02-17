# HDC v2 Phase 3 Kickoff (Day 7)

Date: 2026-02-17  
Status: Ready for execution (GO)

## Purpose

Finalize the Phase 3 build contract for:
- persistent app switcher in parent + instance contexts,
- responsive behavior across desktop/tablet/mobile,
- cross-instance navigation reliability,
- implementation sequencing with effort and ownership.

## Scope References

- `/Users/nickster/Downloads/HackCentral/HackDayCentral_spec_v2.md` (section 4 App Switcher)
- `/Users/nickster/Downloads/HackCentral/PLAN_HDC_V2_EXECUTION.md` (Phase 3)
- `/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/App.tsx`
- `/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/styles.css`
- `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/hdcService.ts`
- `/Users/nickster/Downloads/HackCentral/forge-native/src/shared/types.ts`

## Current Baseline

- Parent/instance context already provides `registry` entries via `hdcGetContext`.
- Registry includes lifecycle status + Confluence page IDs.
- No dedicated app switcher UI exists yet in macro header.

## App Switcher UX Contract

### Placement

- Location: top-right of macro header in both parent and instance modes.
- Trigger control: compact button with current event icon (or `🏠` on parent) + chevron.

### Sections and Ordering

1. `Home`
2. `Live Events`
3. `Upcoming`
4. `Recent`

Status mapping:
- `Live Events`: `hacking`, `voting`
- `Upcoming`: `registration`, `team_formation`, `draft`, `results`
- `Recent`: `completed` in the last 90 days
- `archived`: excluded from switcher sections

### Item Behavior

- Current context row is highlighted and non-navigable.
- Selecting any non-current row navigates to the target Confluence page.
- Dropdown closes on selection, `Escape`, and click-outside.
- Keyboard behavior:
  - `Enter`/`Space` opens trigger.
  - arrow keys move focus between rows.
  - `Enter` activates focused row.

### Navigation URL Contract

- Route format for switcher targets:
  - `/wiki/pages/viewpage.action?pageId=<confluencePageId>`
- Home row target:
  - parent page ID from current context (`context.pageId` in parent mode, `event.confluenceParentPageId` in instance mode).

### Empty and Error States

- Empty section: render muted "No events" line.
- Registry fetch failure: preserve last successful cache and show non-blocking inline warning.

## Responsive Behavior Matrix

| Viewport | Mode | Behavior |
|---|---|---|
| `>1024px` | Desktop | Anchored dropdown card; section headers + icon + status chip + secondary text (tagline/date). |
| `768px-1024px` | Tablet | Anchored compact dropdown; section headers + icon + name only; reduced padding. |
| `<768px` | Mobile | Full-screen sheet/overlay; single-column list; back/close control; tap targets >=44px height. |

## Caching Contract

- Client-side cache key: `hdc-switcher-registry:<pageId>`.
- TTL: 5 minutes.
- Invalidation events:
  - successful `hdcCreateInstanceDraft`,
  - successful `hdcDeleteDraftInstance`,
  - successful `hdcLaunchInstance`,
  - successful sync action (`hdcCompleteAndSync`, `hdcRetrySync`).

## Implementation Breakdown (Phase 3)

| ID | Task | Owner | Estimate |
|---|---|---|---|
| P3-1 | Add shared switcher model helpers (status->section mapping, URL builders, recent-window filter) in shared layer. | HDC FE | 0.5 day |
| P3-2 | Extend context payload/types with minimal fields for sectioning (completion timestamp fallback source) if required by Recent filtering. | HDC BE | 0.5 day |
| P3-3 | Build reusable `AppSwitcher` component + outside-click + keyboard nav + a11y labels. | HDC FE | 1.0 day |
| P3-4 | Integrate switcher into macro parent + instance header (`static/macro-frontend`). | HDC FE | 0.5 day |
| P3-5 | Add responsive CSS behavior for desktop/tablet/mobile (dropdown->overlay transition). | HDC FE | 0.5 day |
| P3-6 | Add cache module + invalidation wiring on create/delete/launch/sync flows. | HDC FE | 0.5 day |
| P3-7 | Add tests: section classification, archived exclusion, current-item highlight, close-on-select, keyboard navigation, URL routing. | HDC FE + QA | 1.0 day |
| P3-8 | Manual Confluence QA matrix on hackdaytemp at three breakpoints and parent/instance contexts. | QA | 0.5 day |

Total estimate: 5.0 engineering days + 0.5 QA day.

## Acceptance Checklist

- Switcher visible in parent and instance macro contexts.
- Status-driven section grouping is correct.
- Archived instances are excluded from Recent.
- Current context highlight is correct.
- Cross-instance navigation loads target page reliably.
- Desktop/tablet/mobile behavior matches matrix.
- Keyboard and screen-reader interactions are functional.

## Go/No-Go Decision

Decision: **GO**

Rationale:
- Day 6 integration checkpoint completed with green validation and tests.
- Production smoke path is stable on the current line.
- No open Phase 2 blocker remains in the execution plan.

## Risks and Mitigations

- Risk: Recent section needs reliable completion timestamp.
  - Mitigation: use `submissionDeadlineAt` fallback initially; add explicit completion timestamp field in repository if needed.
- Risk: Confluence iframe viewport behavior differs from local browser widths.
  - Mitigation: run breakpoint QA on real Confluence pages (parent + instance).
- Risk: Dropdown layering conflicts with existing header/z-index.
  - Mitigation: ship with explicit z-index contract and overlay portal root.
