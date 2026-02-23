# HackCentral — Continuation Handoff
**Last updated: 2026-02-23 by Cursor (claude-4.6-sonnet)**
**Current deployed version: v4.44.0 (Forge production)**

---

## 1. What This Project Is

**HackCentral** is a Confluence Forge Custom UI app — NOT a Vercel or web-hosted project. It runs entirely inside Atlassian Confluence at `hackdaytemp.atlassian.net`. There are two separate but related codebases:

| Codebase | Path | Purpose |
|---|---|---|
| **HackCentral** | `/Users/nickster/Downloads/HackCentral/` | Hub app: global page + macro (this repo) |
| **HD26Forge** | `/Users/nickster/Downloads/HD26Forge/` | Per-HackDay runtime: registration, teams, voting, results |

The deprecated `hd26.atlassian.net` site and any Vercel references should be completely ignored. Everything lives on `hackdaytemp.atlassian.net`.

---

## 2. Architecture

```
hackdaytemp.atlassian.net
│
├── HackCentral global page  ← forge-native/static/frontend/   (this session's focus)
│   Single-page React app embedded as a Confluence "global page"
│   Nav: Home · HackDays · Hacks · Projects | Team Up · Team Pulse | Library · Guide · Get Started
│   Deployed via: forge deploy -e production (from forge-native/)
│
├── HackCentral macro (parent page, pageId 5668895)  ← forge-native/static/macro-frontend/
│   Embedded on ONE specific Confluence page
│   Shows a 5-step "Create HackDay" wizard that creates child Confluence pages + Supabase records
│
└── HD26Forge macro  ← /Users/nickster/Downloads/HD26Forge/static/frontend/
    Embedded on EACH child HackDay page
    Shows event dashboard (registration, teams, voting, results, admin)
```

Both HackCentral and HD26Forge are deployed as **separate Forge apps** but share the same **Supabase database**.

### Forge App IDs
- **HackCentral:** `f828e0d4-e9d0-451d-b818-533bc3e95680`
- **HD26Forge:** (see `/Users/nickster/Downloads/HD26Forge/forge-native/manifest.yml`)

### Shared Supabase
Tables used by both apps: `Event`, `HackdayTemplateSeed`, `Hack`, `Project`, `Person`, `Registration`, `Team`, `Vote`, etc.

---

## 3. HackCentral Global Page — Current State (as of v4.44.0)

### What exists and works

**Navigation (3 zones):**
- **Discover:** Home (dashboard) · HackDays · Hacks · Projects
- **Collaborate:** Team Up · Team Pulse
- **Learn:** Library · Guide · Get Started
- **Utility bottom:** Profile
- Search and Notifications are in the topbar — NOT in the sidebar

**Dashboard view:**
- Compact `dash-intro` strip: "HackDay Central" title (tier-2, not h1) + "Submit a Hack" CTA on the right
- 6 metric tiles in a 3-column grid with icons (⚡⭐🔄✅👥🎓) and large bold numbers
- "Latest Hacks" section with 8 featured hacks from `featuredHacks`
- Quote pod + recognition pod with colour-coded badge pills (amber/teal/blue)
- FAB button (bottom-right, fixed) opens quick-actions

**HackDays view:**
- Shows event registry from `bootstrap.registry`
- "Create a new HackDay" button in the title row → navigates to `create_hackday` view
- Full 5-step wizard: Basic Info → Schedule → Rules → Branding → Review
- Schedule step uses `ScheduleBuilder` component with cascade date logic
- Review step has a "Publish immediately / Save as draft" toggle (`wLaunchMode`)
- Wizard scroll-to-top on Next/Back

**Header:**
- Adaptavist logo (`src/assets/adaptalogo.jpg`, imported as Vite module)
- App switcher dropdown with HackDay event registry
- Search bar, notification icon, profile chip

**Demo/fallback data:**
- `LOCAL_PREVIEW_DATA` in `App.tsx` — shown when Supabase is unavailable
- 16 hacks: mix of Atlassian ecosystem (Jira, Confluence, Bitbucket) + AI/productivity tools
- 14 people with `@adaptavist.com` emails and relevant capabilities
- 4 realistic projects

### Key files

| File | Purpose |
|---|---|
| `forge-native/static/frontend/src/App.tsx` | Main app: all views, state, data loading (~2500 lines) |
| `forge-native/static/frontend/src/constants/nav.ts` | Nav items with groupLabel for sections |
| `forge-native/static/frontend/src/components/Layout.tsx` | Shell: header, sidebar, main. Imports `adaptalogo.jpg` |
| `forge-native/static/frontend/src/components/Dashboard/WelcomeHero.tsx` | Compact dash-intro strip, accepts `onSubmitHack` prop |
| `forge-native/static/frontend/src/components/Dashboard/StatCards.tsx` | 6 metric tiles with icons and `metric-value` |
| `forge-native/static/frontend/src/components/create/ScheduleBuilder.tsx` | Visual schedule cascade for HackDay creation |
| `forge-native/static/frontend/src/utils/cascadeSchedule.ts` | Date cascade logic (anchor → all phase dates) |
| `forge-native/static/frontend/src/styles.css` | All CSS (vanilla, no Tailwind, ~2300 lines) |
| `forge-native/static/frontend/src/assets/adaptalogo.jpg` | Adaptavist logo (imported as Vite module) |
| `forge-native/static/frontend/src/types.ts` | TypeScript types (`BootstrapData`, `FeaturedHack`, etc.) |
| `forge-native/src/index.ts` | Forge resolvers (backend entry point) |
| `forge-native/src/backend/hackcentral.ts` | `getBootstrapData` and other global page resolvers |
| `forge-native/src/backend/hdcService.ts` | Macro business logic (createInstanceDraft, etc.) |
| `forge-native/manifest.yml` | Forge manifest (permissions, modules, env var declarations) |

### What views have real implementations vs. placeholders

| View | Status |
|---|---|
| `dashboard` | ✅ Real data from `getBootstrapData` |
| `hacks` | ✅ Real data (featured hacks + projects) |
| `hackdays` | ✅ Real registry + create wizard |
| `create_hackday` | ✅ Full 5-step wizard with schedule builder |
| `team_up` | ⚠️ Placeholder — people list renders but mentor matching is basic |
| `team_pulse` | ⚠️ Placeholder content — layout exists, no real metrics |
| `library` | ⚠️ Shows `featuredHacks` as library assets — no dedicated library resolver |
| `profile` | ⚠️ Shows viewer account info, mentor profile edit works |
| `search` | ✅ Client-side search across hacks/people/projects |
| `projects` | ⚠️ Shows `recentProjects` from bootstrap — no full project detail view |
| `onboarding` | ⚠️ Static cards |
| `guide` | ⚠️ Static content |
| `notifications` | ⚠️ Placeholder |

---

## 4. HackCentral Macro — Current State

The macro (`forge-native/static/macro-frontend/`) runs on the Confluence parent page (pageId `5668895`). It has the full create wizard and also handles per-event views.

**On parent page:** shows "Create a HackDay" button → opens 5-step wizard → calls `hdcCreateInstanceDraft` → creates child Confluence page + Supabase Event + HackdayTemplateSeed.

**On instance pages:** shows event dashboard, admin panel with lifecycle management.

**Admin panel includes:**
- Lifecycle advance button (contextual label e.g. "Launch → Open for Registration")
- The `runtimeType === 'hackday_template'` guard was **removed** — all instances can advance lifecycle
- Draft instances (created by global page wizard with `launchMode: 'draft'`) also appear and can be launched

---

## 5. HD26Forge — Current State

Separate app at `/Users/nickster/Downloads/HD26Forge/`. This handles the **per-event experience** after a HackDay has been created.

Key details for continuity:
- Logo on original HackDay 26 (VIBING) uses `hd-text.png`/`hd-text-dark.png`
- Logo on created child HackDays uses `adaptlogo.png` (Adaptavist)
- Detection via `instanceContext.runtimeSource` (`seed_mapping`, `seed_hdc_event`, `seed_bootstrap` → Adaptavist)
- `eventMeta.name` and `eventMeta.tagline` from seed payload → shown in Dashboard hero on child pages
- `LEARNINGS_CURSOR.md` in HD26Forge root is the authoritative reference — read it before touching HD26Forge

---

## 6. Deploy Commands

### HackCentral (both global page and macro)
```bash
cd /Users/nickster/Downloads/HackCentral/forge-native

# Build both frontends
npm run custom-ui:build

# OR build just global page
cd static/frontend && npm run build

# Deploy to production
forge deploy -e production

# Install/upgrade on site (only needed if not already installed)
forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence
```

### HD26Forge
```bash
cd /Users/nickster/Downloads/HD26Forge/forge-native
forge deploy --environment production
forge install --site hackdaytemp.atlassian.net --product confluence --environment production --upgrade --non-interactive
```

**Forge auth:** Logged in as Nick Fine (nfine@adaptavist.com). If session has expired, run `forge login`.

---

## 7. Critical Technical Gotchas

### Vite `base: './'` — never use absolute asset paths
```tsx
// WRONG — broken link in Forge
<img src="/adaptalogo.jpg" />

// CORRECT — import as ES module
import adaptaLogo from '../assets/adaptalogo.jpg';
<img src={adaptaLogo} />
```

### Forge Custom UI has no npm install during runtime
All dependencies must be in `package.json`. Currently only `react`, `react-dom`, `@forge/bridge`. No Tailwind, no Lucide, no Framer Motion. Use vanilla CSS and emoji icons.

### Atlassian CDN caches aggressively
After deploying, users may see the old bundle for 10–30 minutes. To bypass: hard reload (`Cmd+Shift+R`), incognito window, or add `?nocache=1` to the URL.

### `@forge/bridge` context in global pages vs. macros
- Global page: `invoke()` works but `context` only provides `accountId` and `siteUrl` (not `pageId`)
- Macro: `invoke()` provides `pageId` in context — this is how macro knows which HackDay page it's on
- `parentPageId` for HackDay creation is read from `CONFLUENCE_HDC_PARENT_PAGE_ID` Forge env var

### Forge env vars
Set with `forge variables set -e production KEY 'value'` from within `forge-native/`. These are:
- `CONFLUENCE_HDC_PARENT_PAGE_ID` — Confluence page ID of the parent page (currently `5668895`)
- Supabase URL and keys are set as Forge env vars (check `manifest.yml` for declared vars)

### TypeScript strict mode
The project uses `strict: true` in `tsconfig.json`. When casting, use `as unknown as TargetType` for intermediate casts (not direct double-cast).

---

## 8. What Remains / Suggested Next Steps

These are the known gaps as of v4.44.0. Tackle in order of impact:

### High priority
1. **Team Pulse view** — currently placeholder. Port real metrics from `src/pages/TeamPulse.tsx`. Needs `getTeamPulseMetrics` resolver in `hackcentral.ts`.
2. **Library view** — currently shows the same hacks as the Hacks view. Needs a dedicated `listLibraryAssets` resolver and a proper library UI (asset detail, submission form, category filters).
3. **Projects view** — shows `recentProjects` from bootstrap but no click-through to project detail. Port `src/pages/Projects.tsx` + `src/pages/ProjectDetail.tsx`.

### Medium priority
4. **Team Up mentor matching** — the view exists but mentor booking/matching is superficial. Port `src/components/mentor/` matching logic.
5. **Notifications view** — currently an empty placeholder. Needs `getNotifications` resolver.
6. **Profile editing** — mentor profile edit works; general profile editing (bio, skills, experience level) needs completing.

### Low priority / polish
7. **Onboarding flow** — static cards. Could be personalised based on `experienceLevel`.
8. **Guide page** — static. Fine as-is for now.
9. **Dashboard quote** — currently hardcoded. Could pull from most-reused hack or a `getImpactStory` resolver.
10. **Dashboard recognition tabs** — the recognition pod only shows badges. The full version has a tabbed view (Recent / Contributors / Mentors / Most Reused).

---

## 9. Session History Summary

| Session | Key changes | Deployed as |
|---|---|---|
| Earlier sessions | Initial build, Forge app structure, create wizard, schedule builder, ECD wizard redesign, draft/go-live toggle, scroll-to-top on wizard nav | v4.29–v4.40 |
| 2026-02-23 (this session) | Adaptavist logo in header, nav ECD redesign (3 zones + section labels), dashboard ECD polish (dash-intro, 3-col metric grid, badge colours, removed nudge card), rich Atlassian+AI demo content (16 hacks, 14 people, 4 projects) | v4.41–v4.44 |

---

## 10. Key Decisions Made (do not reverse without good reason)

- **No Vercel, no hd26.atlassian.net** — both deprecated. Everything is Confluence Forge on `hackdaytemp.atlassian.net`.
- **No Tailwind in Forge frontend** — vanilla CSS in `styles.css` only. Consistent teal design system.
- **No Lucide/Framer Motion** — emoji icons and CSS animations instead (bundle size constraint).
- **Single production environment only** — staging was removed. Only `production` is deployed.
- **Image imports as ES modules** — not from `public/` folder. Required by Vite `base: './'`.
- **`create_hackday` is a flow, not a nav item** — only accessible from the HackDays view. Not in sidebar.
- **Search and Notifications not in sidebar** — they're in the topbar; no duplication.
- **`runtimeType === 'hackday_template'` guard removed from macro** — all instances can advance lifecycle regardless of how they were created.
