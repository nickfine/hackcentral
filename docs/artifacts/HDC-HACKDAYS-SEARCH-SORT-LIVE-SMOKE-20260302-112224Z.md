# HackDays Search/Sort Live Smoke

Timestamp (UTC): 2026-03-02T11:22:24Z
Environment: Confluence production (`hackdaytemp.atlassian.net`)
Surface: HackCentral global page -> HackDays view

## Scope

- Verify latest production UI is loaded after deploy/install refresh.
- Verify HackDays page includes search and sort controls.
- Verify no-match search behavior and sort behavior are functional.
- Verify extraction panel title prefix update (`[ADMIN]`).

## Deployment Context

- Code change commit: `7a4c162` (`feat(hackdays): add event search and sort controls`)
- UI marker expected: `HACKCENTRAL_UI_VERSION=0.6.46`
- Production deploy: completed
- Production install upgrade: completed (site already on latest install)

## Validation Results

1. Runtime version marker in browser console:
   - `[HackCentral Confluence UI] loaded 0.6.46`
2. HackDays controls present:
   - `Search` input (type `search`)
   - `Sort` select with options:
     - `Most recent`
     - `Oldest`
     - `Name (A-Z)`
     - `Name (Z-A)`
     - `Lifecycle status`
3. Search behavior:
   - Query `One Day Test` returned first matching card `One Day Test`.
   - Query `zzzz-no-match-zzzz` produced `Showing 0 of 56 HackDays` and empty-state message.
4. Sort behavior:
   - `name_asc` first card observed: `112233`
   - `name_desc` first card observed: `XXXXXXXXXXXXX`
   - `recent` first card observed: `UX Team Hack`
5. Extraction panel heading verified:
   - `[ADMIN] Post-HackDay Extraction (R11)`

## Decision

- `GO` for HackDays search/sort and extraction-title prefix changes in production.
- No rollback action required.
