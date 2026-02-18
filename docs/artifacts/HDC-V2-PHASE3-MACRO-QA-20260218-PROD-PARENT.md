# HDC v2 Phase 3 Macro QA Evidence - PROD Parent Host

Captured at (UTC): 2026-02-18T11:25:02Z
Parent URL: https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5668895
Target instance URL: https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5799956
Target switcher label: `HDC Auto 1771412434287`

## Matrix (Parent -> Instance switcher)
| Viewport | Host viewport | Macro iframe viewport | Switcher opens + sections | Target row present | Target row disabled | Tap target min height | Parent->instance transition |
|---|---:|---:|---|---|---|---:|---|
| Desktop | 1366x1200 | 760x670 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | YES | NO | 46px | BLOCKED |
| Tablet | 1024x1366 | 573x902 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | YES | NO | 46px | BLOCKED |
| Mobile | 430x932 | 572x902 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | YES | NO | 46px | BLOCKED |

## Exact blocker evidence
- On all breakpoints, clicking `HDC Auto 1771412434287` from the open switcher leaves URL unchanged:
  - before click: `https://hackdaytemp.atlassian.net/wiki/spaces/IS/pages/5668895/HackDay+Central+Parent+Host+-+2026-02-18`
  - after click: `https://hackdaytemp.atlassian.net/wiki/spaces/IS/pages/5668895/HackDay+Central+Parent+Host+-+2026-02-18`
- Macro mode also remains unchanged:
  - before click: `Parent page mode`
  - after click: `Parent page mode`
- Blocker statement captured from run:
  - `click produced no parent->instance transition (url remained .../pages/5668895..., mode parent)`

## Exit decision
- BLOCKED
