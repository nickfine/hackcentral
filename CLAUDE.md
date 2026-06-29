# HackCentral — Claude Context

This is the **tag-hackday** tenant of HackCentral, a Confluence Forge app that runs hackday events.
Working directory: `/Users/nickster/Downloads/HackCentral-tag-hackday`

## Model and effort routing

At the start of every response, assess the current task and output a single line in this format before anything else:

`⚙ /model [alias] /effort [level]` — [one-line reason]

Use these rules:

**Model**
- `sonnet` — most tasks: writing, explaining, editing, straightforward code
- `opusplan` — anything involving architecture, planning a build, or multi-file refactoring
- `opus` — deep debugging, race conditions, complex system design mid-session

**Effort**
- `low` — quick lookups, simple edits, one-liners
- `medium` — standard coding, bug fixes, most writing tasks
- `high` — multi-file changes, tracing complex logic, research synthesis
- `xhigh` — architecture decisions, hard bugs, agentic tasks (Opus 4.7 only)
- `max` — current task only, genuinely hard problems where being wrong is costly

If the current model and effort already match what the task needs, output:
`⚙ no change needed`

Do not pad this line with explanation. The reason should be five words or fewer.

## Session start checklist

At the start of every session, before doing anything else:
1. Run `git log --oneline -5` to see what changed since last time
2. Check `git status` for any uncommitted work

---

## Deploy — CRITICAL RULES

**Never use bare `forge deploy`.** It packages stale `dist/` bundles without rebuilding.

### MANDATORY: Bump APP_VERSION before every deploy

**Every single deploy MUST bump `APP_VERSION` in `forge-native/static/runtime-frontend/src/data/constants.js` BEFORE building.** This is the Atlassian CDN cache-buster. Skipping it means production serves stale content even after a successful deploy. This has caused repeated lost time — do not skip it.

```bash
# 1. Bump APP_VERSION in forge-native/static/runtime-frontend/src/data/constants.js
# 2. Then build + deploy:
cd forge-native && npm run runtime:build && forge deploy --environment production
```

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
- The **PhasesPanel in AdminPanel makes real DB changes** — clicking a phase shows a confirmation modal ("This change will apply to all participants immediately") and calls `setEventPhase`
- Backend resolvers read the real phase from DB via `getCurrentEvent(supabase, req)`
- Phase-gated backend behaviour can be tested via PhasesPanel in AdminPanel or directly via Supabase
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

### External links in Forge Custom UI
- **`<a target="_blank">` is silently blocked** by the Forge iframe sandbox — links appear but do nothing
- Always use `router.open(url)` from `@forge/bridge` (runtime-frontend) or `./utils/forgeBridge` (frontend macro) for any external URL

### Forge ↔ Convex auth
- `ctx.auth.getUserIdentity()` returns null for Forge HTTP calls
- Remove auth checks from any Convex mutation/query called via the Forge resolver layer

### Awards (post-event)
- `Event.awards` JSONB column: `{ winner: teamId, runnerUp: teamId, thirdPlace: teamId[], peoplesChoice: teamId }`
- Admin sets awards via Admin Panel → Awards tab (no redeploy needed)
- Results view loads awards on mount via `getEventAwards` resolver; passes them as prop to `Results.jsx`
- Archive (`resolvers/archive.js`) resolves winner team names in one batched query for event list view

### Archive
- `resolvers/archive.js` — `getArchivedEvents` + `getArchivedEvent` (read-only, events where `phase = RESULTS`)
- `runtime-frontend/src/components/Archive.jsx` — event list → event detail (Winners, Submissions, Teams, Pain Points tabs)
- Event table has `name` column, **not** `title` — verified via `information_schema.columns`

### Pain points ↔ teams
- Convex table `teamPainPoints` — many-to-many (schema), but enforced as one-to-one in UI
- `getPainPoints` accepts `includeTeams: true` for team-enriched results
- `painPoints:listForTeams` — bulk Convex query (teamIds[] → `Record<teamId, {id, title}[]>`)
- `getTeams` resolver enriches each team with `painPoints` array via `listForTeams` (non-fatal fallback)
- **One pain point per team** — enforced in `PainPointsPanel` (TeamDetail) and create-team modal (Marketplace)
- Pain point add/remove locked after hacking phase starts (`EDITABLE_PHASES = ['signup', 'team_formation']`)
- `TeamCard` default variant: hides description when `team.painPoints.length > 0`, shows "Pain Point" section instead
- `TeamDetail`: hides "Problem to Solve" section when pain point is linked (via `linkedPainPointCount` state + `onPainPointsChange` callback from `PainPointsPanel`)

### Team membership & auto-assignment
- **Auto-assignment is opt-in only** via the `autoAssignOptIn` User column (DB default false). The legacy `isFreeAgent` flag is now just a "teamless" UI signal — it does **not** drive any automatic placement
- `optInToAutoAssign` resolver (`auth.js`) takes `{ optIn }`: ON immediately assigns to a free-agent team + sets `autoAssignOptIn=true`; OFF removes from the auto-created team (self-chosen teams untouched) + clears it. Frontend (`App.jsx handleAutoAssignOptIn`) routes to the new team page on opt-in
- `sweepFreeAgentsIntoTeams` + `checkAndSendFreeAgentReminders` (`helpers.js`) select on `autoAssignOptIn`, not `isFreeAgent`
- **One team per person** — `ensureUserTeamless` (`helpers.js`) is called before every add: `createTeam`, `handleJoinRequest` accept, `respondToInvite` accept
- **Captain handover + empty-team cleanup** — `detachUserFromTeam` (`helpers.js`) promotes the earliest-joined remaining member to OWNER when a captain leaves, and deletes a team that goes empty (except Observers, and only in editable phases). Used by `leaveTeam` and `ensureUserTeamless`
- `leaveTeam` clears **both** `isFreeAgent=true` and `autoAssignOptIn=false` (deliberate leave = stop being auto-placed)

### Tooling Library (Learnings) + Tooling-area IA
**Lives in `static/frontend` (the participant macro), NOT runtime-frontend.** This macro calls resolvers via `invokeTyped`/`invoke` (from `hooks/useForgeData` / `utils/forgeBridge`), **not** `invokeEventScopedResolver`.

- **Nav (`static/frontend/src/constants/nav.ts`)** — primary items include **Showcase** (`view=hacks`), **Library** (`view=library`), **HackDay Hacks** (`view=hacks_exchange`).
  - **Showcase** = curated showcase hacks only (Supabase `Project` where `source_type=hack_submission`, `assetType` prompt/skill/app). Tabs: All/Skills/Prompts/Apps.
  - **Library** = two tabs (`libraryTab` state): **Reusable artifacts** (Supabase `Artifact`, link-based, `source_url`, `ArtifactType`) | **AI working files** (Convex `learnings`, content-based).
  - **HackDay Hacks** = every submission ever (Convex `hacks`), the permanent record.
- **Learnings / Tooling Library** — Convex `learnings` table (`convex/learnings.ts`, `convex/schema.ts`). Stores full markdown `content` plus `kind` (operating_context/memory/learning/skill/other), `visibility` (private/org/public, default org; private = author-only via `list` filter), `byteSize`, `contentHash`, and unused analysis-stub fields (`analysisSummary`/`analysisTags`/`analysisModel`/`analyzedAt`). Resolvers: `hdcListLearnings`/`hdcUploadLearning`/`hdcUpdateLearning`/`hdcLikeLearning`/`hdcDeleteLearning` (`src/index.ts` → `src/backend/hackcentral.ts` → Convex). Capture = paste + drag-drop (`.md`/`.markdown`/`.txt`, 256KB cap, multi-drop → review modal); `detectKindFromFilename` in `App.tsx` auto-types CLAUDE.md/agents.md/memory.md/etc. Download = verbatim via `downloadText`.
- **Three type vocabularies are de-collided at the presentation layer only** (stored enums untouched): Showcase tabs (Skills/Prompts/Apps), `REGISTRY_ARTIFACT_TYPE_LABELS` (`utils/registry.ts`), `LEARNING_KIND_LABELS` (`App.tsx`). No data migration.
- **Phase 2 target (not built)** — collapse to two destinations: **AI Toolkit** (everything reusable, faceted by purpose + a content/link/hackday form chip) and **HackDay Gallery** (the event record). See `docs/TOOLING-LIBRARY-PLAN.md`.

---

## Phase-Gated Behaviour

| Feature | Phases shown |
|---------|-------------|
| Pain Points panel (Dashboard) | signup, team_formation |
| Delete Team (captain) | signup, team_formation |
| Delete Team (admin) | not available via UI — admins delete registrations via UsersPanel, not teams |
| Pain point add/remove (TeamDetail) | signup, team_formation |
| Auto-assign toggle (Profile) | signup, team_formation (teamless or already opted-in users) |

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
- `docs/TOOLING-LIBRARY-PLAN.md` — Tooling Library design, analysis roadmap, and the Tooling-area IA reshape (Showcase/Library now, AI Toolkit + HackDay Gallery target)
- `EIS_DESIGN_SYSTEM_PLAN.md` — EIS Design System migration plan for HDC (runtime-frontend), HD children excluded
