# HackCentral — Claude Context

This is the **tag-hackday** tenant of HackCentral, a Confluence Forge app that runs hackday events.
Working directory: `/Users/nickster/Downloads/HackCentral-tag-hackday`

## Session start checklist

At the start of every session, before doing anything else:
1. Run `git log --oneline -5` to see what changed since last time
2. Check `git status` for any uncommitted work

---

## Deploy — CRITICAL RULES

**Never use bare `forge deploy`.** It packages stale `dist/` bundles without rebuilding.

```bash
# Production (tag-hackday.atlassian.net) — always use this
cd forge-native && npm run deploy:prod

# If only runtime frontend changed (faster)
cd forge-native && npm run runtime:build && forge deploy --environment production
```

- `deploy:prod` = `custom-ui:build` (all 3 frontends) + `forge deploy --environment production`
- `tag-hackday.atlassian.net` runs the **production** environment
- `forge deploy` without `--environment` deploys to **development** — not visible on the live site
- Full deploy reference: `DEPLOY.md`

---

## Codebase Structure

```
forge-native/
  src/
    runtime/
      index.js                  # resolver orchestrator (registers all domain modules)
      resolvers/                # domain resolvers: teams, events, auth, invites,
                                #   painPoints, voting, judging, submissions,
                                #   results, notifications, branding, config,
                                #   backup, telemetry, health, dev
      lib/
        helpers.js              # getCurrentEvent, resolveConfigModeAccess, etc.
        constants.js            # PHASE_MAP, ROLE_MAP, HDC_RUNTIME_OWNER, etc.
    backend/
      hdcService.ts             # HackDay instance creation (createInstanceDraft)
      confluencePages.ts        # Confluence page management, macro retargeting
    createFromWeb.ts            # Web trigger: create hackday from external web app
    ops.ts                      # Ops web trigger: migrations, audits, repairs
  static/
    frontend/                   # HackCentral macro frontend (participant-facing macro)
    macro-frontend/             # Legacy macro frontend
    runtime-frontend/           # HackCentral Runtime (Internal) — main app
      src/
        App.jsx                 # Root: bootstrap, state, view routing
        components/
          Dashboard.jsx         # Main dashboard view
          TeamDetail.jsx        # Team detail view
          AdminPanel.jsx        # Admin panel (phases, users, messaging, branding)
          Marketplace.jsx       # Teams + pain points marketplace
          PainPointsSection.jsx # Pain points panel (dashboard)
          adminPanel/           # PhasesPanel, UsersPanel, MessagingPanel
          teamDetail/           # DeleteTeamModal, PainPointsPanel
        lib/
          appModeResolverPayload.js  # invokeEventScopedResolver pattern
          registrationState.js       # deriveEffectiveEventPhase
```

---

## Key Architecture Rules

### Frontend → Resolver calls
Always use `invokeEventScopedResolver` — never plain `invoke`:
```js
invokeEventScopedResolver(invoke, 'resolverName', appModeResolverPayload, payload)
```
Plain `invoke('name', payload)` lacks `appMode: true` + `pageId`, so `getCurrentEvent` falls back to global resolution and may pick the wrong event.

### Phase simulation vs real phase
- The **PhasesPanel in AdminPanel is frontend-only** — clicking a phase updates React state only, never calls `setEventPhase` or changes the DB
- Backend resolvers read the real phase from DB via `getCurrentEvent(supabase, req)`
- Phase-gated backend behaviour must be tested by changing the real DB phase (Supabase directly or `setEventPhase` resolver)
- `effectiveEventPhase` in App.jsx = `deriveEffectiveEventPhase(eventPhase, user)` — only promotes `signup` → `team_formation` for eligible users; all other phases pass through unchanged

### Bootstrap context
- `req._bootstrapContext` is set by the bootstrap resolvers to avoid redundant DB lookups
- Resolvers called directly (not via bootstrap) don't have this — they resolve event context independently
- `getCurrentEventContext` checks `req._bootstrapContext` first, then falls through to page/global resolution

### Canonical shapes
- Team: `transformTeam()` in `resolvers/teams.js`
- Phase values (DB → app): `PHASE_MAP` in `lib/constants.js`
  - `SETUP` → `setup`, `REGISTRATION` → `signup`, `TEAM_FORMATION` → `team_formation`, `HACKING` → `hacking`, `SUBMISSION` → `submission`, `VOTING` → `voting`, `JUDGING` → `judging`, `RESULTS` → `results`

### Static assets in Forge
- Use `./asset.png` (relative), never `/asset.png` (absolute resolves against Confluence domain root)

### Fonts
- Bundled via `@fontsource` — Forge CSP blocks external CDNs
- `frontend/src/main.tsx` imports Fraunces + Manrope
- The `index.html` Google Fonts link is for standalone Vite dev only — ignore it for Forge

### Forge ↔ Convex auth
- `ctx.auth.getUserIdentity()` returns null for Forge HTTP calls
- Remove auth checks from any Convex mutation/query called via the Forge resolver layer

### Pain points ↔ teams
- Convex table `teamPainPoints` — many-to-many
- `getPainPoints` accepts `includeTeams: true` for team-enriched results

---

## Phase-Gated Behaviour

| Feature | Phases shown |
|---------|-------------|
| Pain Points panel (Dashboard) | signup, team_formation |
| Delete Team (captain) | signup, team_formation |
| Delete Team (admin) | any phase |

---

## Tenant & Apps

- **Site:** `tag-hackday.atlassian.net`
- **App ID:** `22696465-0692-48af-9741-323e1cfc2631`
- **Production env ID:** `1c797890-3b54-448e-85da-4ecbe9e9e777`
- **Installed apps:** HackCentral + HackCentral Runtime (Internal)
- **HD26Forge uninstalled Apr 16 2026** — was the legacy standalone HackDay app, replaced by HackCentral's own runtime (`HDC_RUNTIME_OWNER=hackcentral`)

---

## Ops & Tooling

```bash
# Audit child page macro health
node scripts/phase8-styling-audit.mjs --site tag-hackday.atlassian.net --environment production

# Repair legacy macros on child pages
node scripts/phase8-styling-repair.mjs --site tag-hackday.atlassian.net --environment production --apply

# Backup ops webtrigger (production)
forge webtrigger list -e production -s tag-hackday.atlassian.net -p Confluence -f event-backup-ops-wt
```

---

## Reference Docs

- `DEPLOY.md` — full deploy reference, tenant URLs, install runbook pointer
- `LEARNINGS.md` — session history, gotchas, architectural decisions with context
- `docs/HDC-TENANT-INSTALL-RUNBOOK.md` — new tenant setup
