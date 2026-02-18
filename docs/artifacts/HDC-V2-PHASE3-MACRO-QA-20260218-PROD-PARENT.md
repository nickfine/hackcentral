# HDC v2 Phase 3 Macro QA Evidence - PROD Parent Host

Captured at (UTC): 2026-02-18T11:52:34Z
Parent URL: https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5668895
Target instance URL: https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5799956
Target switcher label: `HDC Auto 1771412434287`

## Matrix (Parent -> Instance switcher)
| Viewport | Host viewport | Macro iframe viewport | Switcher opens + sections | Target row present | Target row disabled | Tap target min height | Parent->instance transition |
|---|---:|---:|---|---|---|---:|---|
| Desktop | 1366x1200 | 760x670 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | YES | NO | 46px | PASS (`.../pages/5799956/...pageId=5799956`) |
| Tablet | 1024x1366 | 573x902 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | YES | NO | 46px | PASS (`.../pages/5799956/...pageId=5799956`) |
| Mobile | 430x932 | 572x902 | PASS (`HOME/LIVE/UPCOMING/RECENT`) | YES | NO | 46px | PASS (`.../pages/5799956/...pageId=5799956`) |

## Notes
- Verified after deploying switcher navigation patch (`router.navigate` now uses Confluence path with open/location fallback).
- `modeAfterClick` resolved as `instance` in matrix run for all prod breakpoints.

## Exit decision
- PASS
