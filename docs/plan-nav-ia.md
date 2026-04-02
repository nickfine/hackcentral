# Nav + IA restructure plan for `HackCentral/docs/plan-nav-ia.md`

## Summary

- Target surface: the current Confluence-facing shell in [forge-native/static/frontend/src/components/Layout.tsx](/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/components/Layout.tsx), which owns the existing left sidebar and matches the `Home / Hacks / AI Tooling / Pains / HackDays / Pipeline / Team Up / Team Pulse / Guide / Get Started` IA.
- Current state:
  - [forge-native/static/frontend/src/components/Layout.tsx](/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/components/Layout.tsx) renders a two-column shell with `<aside className="sidebar">`, grouped `NAV_ITEMS`, and a bottom utility profile link.
  - [forge-native/static/frontend/src/constants/nav.ts](/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/constants/nav.ts) owns the sidebar order and group labels.
  - [forge-native/static/frontend/src/styles.css](/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/styles.css) defines the grid shell, sticky sidebar, active left-border state, and mobile fallback that collapses the sidebar into a grid.
  - [forge-native/static/frontend/src/App.tsx](/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/App.tsx) uses the existing `View` ids and `setView(...)` transitions to render page bodies; page content is not route-based and must stay intact.
  - [forge-native/manifest.yml](/Users/nickster/Downloads/HackCentral/forge-native/manifest.yml) shows the deployed Confluence surfaces are Forge Custom UI, not UI Kit; no manifest or resolver changes are needed for this shell-only restructure.
- Target state:
  - Replace the left sidebar with a horizontal tab strip directly beneath the app header, following section 7 of the design system.
  - Keep the app header aligned to section 9: brand, search, primary CTA, notification icon, context switcher, avatar.
  - Use visible tabs for `Home`, `Hacks`, `Pains`, `HackDays`, `Pipeline`.
  - Put `AI Tooling`, `Team Up`, `Team Pulse`, `Guide`, `Get Started` in the overflow menu.
  - Keep `Profile` off the tab strip and overflow; access it from the header avatar only.
  - Use a `2px solid var(--hdc-mint)` bottom border as the active tab indicator.
  - Remove the left panel entirely on all breakpoints; do not retain the current mobile sidebar/grid fallback.
- Problem to solve: HackDay Central currently duplicates Confluence's own left navigation, wastes horizontal space, and feels embedded instead of native to the page chrome.

## Public interfaces and non-goals

- Keep the existing `View` union and all existing `setView(...)` targets unchanged in [forge-native/static/frontend/src/constants/nav.ts](/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/constants/nav.ts).
- Keep all page names, page bodies, resolver calls, backend contracts, and manifest permissions unchanged.
- Internal nav metadata may be refactored from one flat `NAV_ITEMS` list into explicit primary-tab and overflow-tab collections, but the underlying `View` ids must not change.
- Do not modify [forge-native/static/macro-frontend/src/App.tsx](/Users/nickster/Downloads/HackCentral/forge-native/static/macro-frontend/src/App.tsx), [forge-native/src/index.ts](/Users/nickster/Downloads/HackCentral/forge-native/src/index.ts), [forge-native/src/backend/hackcentral.ts](/Users/nickster/Downloads/HackCentral/forge-native/src/backend/hackcentral.ts), or [forge-native/manifest.yml](/Users/nickster/Downloads/HackCentral/forge-native/manifest.yml).

## Component inventory

- [forge-native/static/frontend/src/components/Layout.tsx](/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/components/Layout.tsx)
  Change: remove the `<aside>` shell, render the section-9 header and section-7 tab strip, add overflow trigger/menu, move profile access to the avatar, and wire header notification/CTA actions through existing `setView`.
  Must not change: switcher grouping/navigation logic, global search behavior, child page content rendering.
- [forge-native/static/frontend/src/constants/nav.ts](/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/constants/nav.ts)
  Change: replace sidebar-oriented grouping metadata with explicit primary-tab and overflow-tab metadata while preserving current `View` ids.
  Must not change: the `View` type, existing page ids, or any page naming used by `App.tsx`.
- [forge-native/static/frontend/src/styles.css](/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/styles.css)
  Change: remove sidebar-specific layout rules, add header + tab-strip + overflow styles, add the mint bottom-border active state, and update responsive behavior so the shell never reverts to a left panel.
  Must not change: page-level component styles outside the shell except where spacing must adapt to the new shell.
- [forge-native/static/frontend/src/App.tsx](/Users/nickster/Downloads/HackCentral/forge-native/static/frontend/src/App.tsx)
  Change: only if needed to support shell-only actions such as `Create HackDay` or `Notifications` through existing `setView` flow, or to stop relying on sidebar-specific assumptions.
  Must not change: page content branches, data-fetch logic, resolver calls, or business state.
- [tests/forge-native-global-nav-shell.spec.tsx](/Users/nickster/Downloads/HackCentral/tests/forge-native-global-nav-shell.spec.tsx)
  Add: a focused shell contract test covering visible tabs, overflow contents, avatar/profile access, and absence of sidebar rendering.

## Task checklist

1. Confirm the shell target and freeze scope in the plan doc: `forge-native/static/frontend` only; macro wizard, backend, and manifest out of scope.
2. Refactor nav metadata in `nav.ts` into explicit primary-tab and overflow collections without changing any `View` ids.
3. Rebuild `Layout.tsx` so the header remains the shell anchor and the sidebar is replaced by a horizontal tab strip beneath it.
4. Add an overflow menu in `Layout.tsx` that contains exactly `AI Tooling`, `Team Up`, `Team Pulse`, `Guide`, and `Get Started`.
5. Move profile navigation to the header avatar only and remove the sidebar utility profile entry.
6. Wire the header notification icon to the existing `notifications` view and wire the header primary CTA to the existing `create_hackday` view.
7. Update `styles.css` to remove sidebar-specific layout rules and implement the section-7/section-9 shell, including the `2px` mint active indicator and responsive tab behavior.
8. Add a focused shell test file that verifies primary tabs, overflow contents, profile/avatar behavior, and that no sidebar markup/class path remains in the rendered shell.
9. Run focused regression on `Home`, `Hacks`, `Pains`, `HackDays`, `Pipeline`, each overflow destination, search, app switcher, notifications, and `Create HackDay`.
10. Stop after shell verification; defer broader design-token harmonization and page-level visual cleanup to the later design-system pass.

## Acceptance criteria

- The Confluence-facing app shell no longer renders a left sidebar on desktop, tablet, or mobile.
- The shell shows a header plus a horizontal tab strip directly underneath it.
- The visible tabs are `Home`, `Hacks`, `Pains`, `HackDays`, and `Pipeline`.
- The overflow menu contains `AI Tooling`, `Team Up`, `Team Pulse`, `Guide`, and `Get Started`.
- The active tab uses a `2px` mint bottom border, not the old left-border sidebar treatment.
- The avatar opens `Profile`; `Profile` is not duplicated in the main tab strip.
- The notification icon opens the existing notifications view.
- The primary CTA opens the existing `create_hackday` view.
- Switching tabs still uses the existing in-app `setView(...)` state transitions; no page-level component names or view ids change.
- Search suggestions, search submission, and the global app switcher still work as they do now.
- No resolver files, backend contracts, or Forge manifest permissions are changed.

## Risk flags and assumptions

- Routing/state risk: the shell is state-driven, not URL-driven; accidental renaming of `View` ids such as `problem_exchange`, `team_up`, or `create_hackday` would silently break navigation.
- Shell regression risk: current responsive CSS turns the sidebar into a two-column/one-column grid; those rules must be removed or they will reintroduce broken nav layouts at smaller widths.
- Header interaction risk: the new overflow menu will coexist with the existing app switcher and search suggestions, so focus, blur, z-index, and outside-click handling must be kept separate.
- Profile access risk: once the sidebar utility row is removed, the avatar becomes the only profile affordance; it must stay wired and visible at all supported widths.
- Manifest risk: none expected. If implementation drifts into router/open/external-link changes or manifest edits, that is outside scope and should be treated as a plan violation.
- Forge limitation note: on the current Custom UI surface, a true horizontal nav is feasible. If this shell is later ported to a true UI Kit macro, the closest compliant pattern is Atlassian `Tabs` with `Tabs` + `TabList` + `Tab` + `TabPanel`; do not assume arbitrary DOM/CSS control there.
- Prompt-specific override: although the design system example includes `Profile` in overflow, this plan follows the requested overflow set and keeps `Profile` on the avatar only.
