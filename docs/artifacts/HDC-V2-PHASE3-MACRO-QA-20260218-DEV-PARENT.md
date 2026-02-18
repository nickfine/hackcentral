# HDC v2 Phase 3 Macro QA Evidence - DEV Parent Host

Captured at (UTC): 2026-02-18T11:54:04Z
Parent URL: https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5799944
Target instance URL: https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5799975
Target switcher label: `HDC Auto DEV 1771415612395`

## Matrix (Parent -> Instance switcher)
| Viewport | Host viewport | Macro iframe viewport | Switcher opens + sections | Target row present | Target row disabled | Tap target min height | Parent->instance transition |
|---|---:|---:|---|---|---|---:|---|
| Desktop | 1366x1200 | 760x670 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | YES | NO | 46px | PASS (`.../pages/5799975/...pageId=5799975`) |
| Tablet | 1024x1366 | 573x786 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | YES | NO | 46px | PASS (`.../pages/5799975/...pageId=5799975`) |
| Mobile | 430x932 | 572x786 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | YES | NO | 46px | PASS (`.../pages/5799975/...pageId=5799975`) |

## Notes
- Previous target `HDC Auto 1771412434287` was absent on DEV parent because it belongs to PROD parent scope.
- Created DEV child via wizard to validate same parent-scoped switcher flow:
  - created instance page: `https://hackdaytemp.atlassian.net/wiki/spaces/IS/pages/5799975/HDC+Auto+DEV+1771415612395`

## Exit decision
- PASS
