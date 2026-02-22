# Code Review: Consistency & Integrity — Nav, Team Pulse, Header Search

**Date:** Feb 1, 2026  
**Scope:** Team pulse as sidebar page, Dashboard tabs removed, centralised header search, mobile search expand, mobile nav vs sidebar alignment.

---

## Summary

**Consistency:** Mobile nav now includes "Team pulse" so it matches the sidebar. Header search is centralised on desktop; on small viewports a search icon expands to show the input (with Escape to close). Menu button is `aria-hidden` when mobile search is open so focus stays in search.

**Integrity:** Routing, layout, and data flow are sound. No dead code or broken links found.

---

## 1. Consistency

### 1.1 Sidebar vs mobile nav

- **Sidebar** (desktop): Dashboard, People, Completed Hacks, Hacks In Progress, **Team pulse**, Profile; Quick Access → Featured Hacks; Get Started → Explore Completed Hacks, All get-started options.
- **MobileNav** (Header overlay): Had Dashboard, People, Completed Hacks, Hacks In Progress, Profile; **Team pulse was missing.** **Fix:** Added `MobileNavLink to="/team-pulse"` with label "Team pulse" in the same order as sidebar (before Profile).

### 1.2 Header search

- **Desktop (md+):** Search bar is in the centre of the header (flex-1, justify-center, max-w-md). Logo left, actions right. Placeholder and behaviour unchanged ("Search Completed Hacks and people...", submit → `/search` or `/search?q=...`).
- **Mobile (< md):** Search bar hidden; search icon in the right group. Click icon → logo and right actions hide, search form shown with input + close (X). Submit or X closes; **Escape key** also closes. Input auto-focused when expanded; menu button `aria-hidden` when expanded so focus/tab order stays in search.

### 1.3 Naming and copy

- Route: `/team-pulse`. Sidebar and mobile nav: "Team pulse" (lowercase 'p'). TeamPulse page h1: "Team pulse". Dashboard nudge: Link "Team pulse" to `/team-pulse`. Consistent.

---

## 2. Integrity

### 2.1 Routing

- **App.tsx:** `team-pulse` route registered; lazy TeamPulse; order before catch-all. Index redirects to `/dashboard`. No conflict with `search`, `notifications`, etc.

### 2.2 Layout and focus

- **Header:** When `mobileSearchOpen`, menu button is `invisible` + `aria-hidden={true}` so layout is preserved and assistive tech can skip it. Close button has `aria-label="Close search"`. Form has `role="search"`. Input has `aria-label`. Escape calls `closeMobileSearch()`.

### 2.3 TeamPulse page

- Uses same Convex queries and derived values as the former Dashboard pulse tab (metrics, gini, frontlineLeaderGap, recentActivity, topContributors, topMentors, mostReusedAssets). Export JSON shape unchanged. No duplicate or stale logic.

### 2.4 Dashboard

- Tabs and pulse block removed; only Hacks content. "Next step" nudge links to `/team-pulse` for "Team pulse". No references to `dashboardTab` or pulse tab.

---

## 3. Recommendations applied

| Item | Action |
|------|--------|
| Mobile nav missing Team pulse | Added `MobileNavLink to="/team-pulse"` with label "Team pulse" |
| Escape to close mobile search | `onKeyDown={(e) => e.key === 'Escape' && closeMobileSearch()}` on search input |
| Menu button when search open | `aria-hidden={mobileSearchOpen}` on menu button |

---

## 4. Files touched

- **Reviewed:** App.tsx, Layout.tsx, Header.tsx, Sidebar.tsx, Dashboard.tsx, TeamPulse.tsx, pages/index.ts.
- **Updated:** Header.tsx (Team pulse in MobileNav, Escape to close search, aria-hidden on menu when search open).
