# HDC v2 Phase 3 Macro QA Evidence Scaffold

Generated at (UTC): 2026-02-18T01:30:03.139Z

## Inputs
- Parent URL: https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=111111
- Parent pageId: 111111
- Instance URL: https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=222222
- Instance pageId: 222222

## Playwright MCP Run Matrix
- Desktop: 1366x900
- Tablet: 980x900
- Mobile: 390x844

## Preflight
- [ ] Confirm app load on parent URL
- [ ] Confirm app load on instance URL
- [ ] Confirm switcher trigger visible in macro header

## Parent Context Results
### Desktop (1366x900)
- [ ] Switcher opens/closes correctly
- [ ] Home/Live/Upcoming/Recent sections visible
- [ ] Current row highlighted and disabled
- [ ] Navigable non-current row changes page
- [ ] Keyboard flow (Enter, ArrowDown/ArrowUp, Escape)
- [ ] If unavailable row exists: disabled + "Page not provisioned yet"
- [ ] Refresh switcher registry button works
- Notes:

### Tablet (980x900)
- [ ] Compact dropdown behavior
- [ ] Meta/status hidden
- [ ] Navigation + close behavior
- Notes:

### Mobile (390x844)
- [ ] Bottom sheet + overlay behavior
- [ ] Tap target height >=44px
- [ ] Navigation + close behavior
- Notes:

## Instance Context Results
### Desktop (1366x900)
- [ ] Switcher opens/closes correctly
- [ ] Home/Live/Upcoming/Recent sections visible
- [ ] Current row highlighted and disabled
- [ ] Navigable non-current row changes page
- [ ] Keyboard flow (Enter, ArrowDown/ArrowUp, Escape)
- [ ] If unavailable row exists: disabled + "Page not provisioned yet"
- [ ] Refresh switcher registry button works
- Notes:

### Tablet (980x900)
- [ ] Compact dropdown behavior
- [ ] Meta/status hidden
- [ ] Navigation + close behavior
- Notes:

### Mobile (390x844)
- [ ] Bottom sheet + overlay behavior
- [ ] Tap target height >=44px
- [ ] Navigation + close behavior
- Notes:

## Evidence
- Console errors:
- Network anomalies:
- Screenshots/videos:
- Blockers (exact message + URL):

## Exit Decision
- [ ] PASS
- [ ] BLOCKED
- [ ] FAIL

