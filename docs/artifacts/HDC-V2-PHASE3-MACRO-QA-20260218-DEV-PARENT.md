# HDC v2 Phase 3 Macro QA Evidence - DEV Parent Host

Captured at (UTC): 2026-02-18T11:25:02Z
Parent URL: https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5799944
Target instance URL: https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5799956
Target switcher label: `HDC Auto 1771412434287`

## Matrix (Parent -> Instance switcher)
| Viewport | Host viewport | Macro iframe viewport | Switcher opens + sections | Target row present | Tap target min height | Parent->instance transition |
|---|---:|---:|---|---|---:|---|
| Desktop | 1366x1200 | 760x58 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | NO | n/a | BLOCKED |
| Tablet | 1024x1366 | 573x58 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | NO | n/a | BLOCKED |
| Mobile | 430x932 | 572x772 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | NO | n/a | BLOCKED |

## Exact blocker evidence
- On DEV parent host, the target switcher entry is absent on all breakpoints:
  - blocker: `target switcher entry missing: HDC Auto 1771412434287`
- Since the row is absent, no parent->instance transition can be executed on this host.

## Exit decision
- BLOCKED
