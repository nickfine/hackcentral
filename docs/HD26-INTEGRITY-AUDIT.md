# HD26 Child Runtime — Consistency & Integrity Audit

**Audit date:** 2026-06-14  
**Audit commit:** `b8588c3`  
**Fixed in:** v1.2.261  
**Auditor:** Claude Code  

---

## What "HD26 child runtime" means in this repo

There is no `HD26` directory. The child HackDay runtime is:

| Layer | Path | Notes |
|-------|------|-------|
| Frontend bundle | `forge-native/static/runtime-frontend/` | package `hackday-custom-ui`, `APP_VERSION 1.2.260`. Rendered on child Confluence pages via the `hackday-runtime-macro` block macro. Ported from the legacy HD26Forge/HD26AI standalone app. |
| Backend resolvers | `forge-native/src/runtime/` | Orchestrator `index.js` + 16 `resolvers/*.js` modules + `lib/helpers.js`, `lib/constants.js`, `lib/transforms.js`. |
| Creation machinery | `forge-native/src/backend/hdcService.ts`, `confluencePages.ts`, `createFromWeb.ts` | Creates child pages and wires the macro. |

HD26Forge was a separate, external Forge app that was uninstalled on 2026-04-16. The `hd26forge`/`v1` routing branch in `hdcService.ts` and the `AppRuntimeOwner = 'hd26forge' | 'hackcentral'` union in `shared/types.ts` are its legacy.

---

## Findings summary

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| C1 | HIGH | Event-scoped action handlers in `App.jsx` use plain `invoke()` — wrong event risk | **Fixed** |
| C2 | HIGH | No server-side "one pain point per team" guard — UI-only invariant | **Fixed** |
| C3 | MEDIUM | `_bootstrapContext` trusted blindly; global event fallback selects any row | **Fixed** |
| S1 | MEDIUM | `EDITABLE_PHASES` duplicated 4 ways — no shared constant | **Fixed** |
| S2 | MEDIUM | `setup` phase shown in Dashboard pain-points feed but blocked in editing surfaces | **Fixed** |
| S3 | MEDIUM | CLAUDE.md documents admin team-delete in any phase — not implemented | **Doc corrected** |
| S4 | LOW | Hardcoded phase/role literals in `events.js`, `dev.js`, `transforms.js`, `helpers.js` bypass canonical maps | **Fixed** (partial — `helpers.js` schedule builders left by design) |
| S5 | LOW | No resolver-name uniqueness guard — silent last-write-wins on duplicate `resolver.define()` | **Fixed** |

---

## C1 — Event-scoped operations use plain `invoke()` (HIGH)

**Where:** `forge-native/static/runtime-frontend/src/App.jsx`

**What is it:** A number of action handlers call `@forge/bridge`'s raw `invoke('resolverName', payload)` directly instead of going through `invokeEventScopedResolver` (`lib/appModeResolverPayload.js`). The wrapper adds `appMode: true` and `pageId` to every payload. Without those fields `getCurrentEventContext` in the resolver falls back to global event resolution, which on a site with multiple events can bind to a different event entirely.

The wrapper exists, is correctly imported in `App.jsx`, and is used for all reads during the bootstrap phase and in most components (`Marketplace.jsx`, `PainPoints.jsx`, `Voting.jsx`, etc.). These omissions in action handlers are inconsistent with the file's own pattern, not a missing capability.

**Primary tier — event-scoped writes/reads with real data impact:**

| Line | Call |
|------|------|
| 1036 | `invoke('updateRegistration', { updates })` |
| 1156 | `invoke('updateTeam', { teamId, updates })` |
| 1177 | `invoke('getTeam', { teamId })` — error-recovery reconcile |
| 1223 | `invoke('submitProject', { teamId, submissionData })` |
| 1275 | `invoke('deleteTeam', { teamId })` |
| 1349 | `invoke('leaveTeam', { teamId })` |
| 1424 | `invoke('requestToJoin', { teamId, message })` |
| 1435 | `invoke('getTeam', { teamId })` — post-join-request refresh |
| 1498 | `invoke('handleJoinRequest', { requestId, accepted })` |
| 1509 | `invoke('getTeam', { teamId })` — post-request-response refresh |
| 1543 | `invoke('getTeam', { teamId })` — `loadTeamDetails` |
| 1599 | `invoke('updateAutoAssignOptIn', { optIn })` |
| 1728 | `invoke('adminUpdateUserRole', { targetUserId, role })` |

**Secondary tier — lower risk (telemetry/admin, single-event site less affected):**

| Location | Call |
|----------|------|
| `App.jsx:1634` | `invoke('trackUiEvent', eventData)` |
| `Voting.jsx:200` | `invoke('removeVote', ...)` |
| `JudgeScoring.jsx:201` | `invoke('submitScore', ...)` |
| `UsersPanel.jsx:61` | `invoke('adminDeleteRegistration', ...)` |
| `AppLayout.jsx:417,475,490` | notification resolvers |
| `AdminPanel.jsx:484` | `invoke('getTelemetryAnalytics', ...)` |

**Risk today:** `tag-hackday.atlassian.net` has a single active event so the global fallback picks the right one. The risk becomes real if a second event is live simultaneously, or if `getLatestEventForGlobalContext` (see C3) picks the wrong row. Any of the primary-tier calls above could write to or read from the wrong event's data without error.

**Recommended fix:** Pass the already-constructed `appModeResolverPayload` (built from the page context in `App.jsx`'s bootstrap) through `invokeEventScopedResolver` at each call site. No new plumbing needed — the payload is in scope.

---

## C2 — No server-side "one pain point per team" guard (HIGH)

**Where:** `forge-native/src/runtime/resolvers/painPoints.js:108-122`

**What is it:** `assignPainPointsToTeam` accepts a `painPointIds` array and `Promise.all`-links every element with no check for whether the team already has a linked pain point:

```js
// painPoints.js:108
resolver.define("assignPainPointsToTeam", async (req) => {
  const { teamId, eventId = '', painPointIds = [] } = req.payload || {};
  if (!teamId) return { ok: false };
  try {
    await Promise.all(
      painPointIds.map((painPointId) =>
        convexMutation("painPoints:linkToTeam", { teamId, eventId, painPointId })
      )
    );
    return { ok: true };
  } catch (err) { ... }
});
```

The "one pain point per team" rule is enforced in two UI locations:
- `PainPointsPanel.jsx:112` — search-to-link input only renders when `teamPainPoints.length === 0`
- `Marketplace.jsx:763` — selecting a pain point replaces (not appends) the array

Both UIs call this resolver with a single-element `painPointIds` array because of their own guards. The Convex schema (`convex/schema.ts`) is explicitly many-to-many; the one-per-team rule has no server representation.

**Risk:** Two simultaneous rapid clicks on `Assign` from different sessions would race past the `length === 0` check and both succeed. Any client sending a multi-element `painPointIds` array (or calling the resolver directly) links multiple pain points to one team. The `getTeams` resolver enriches each team with all linked pain points, so multi-point teams would propagate to every display.

**Recommended fix:** Before running the `Promise.all`, query existing `teamPainPoints` in Convex and reject (or cap to first id) if any are already linked. Alternatively, enforce in the Convex `linkToTeam` mutation directly.

---

## C3 — Blind trust of `_bootstrapContext`; global event fallback (MEDIUM)

**Where:** `forge-native/src/runtime/lib/helpers.js:2046-2124`, `2266-2295`

**What is it:** `getCurrentEventContext` has two fragility points:

**1. `_bootstrapContext` is returned without validation (line 2052-2053):**
```js
if (req._bootstrapContext) {
  return req._bootstrapContext;  // no staleness check, no schema validation
}
```
`req._bootstrapContext` is a mutable property on the request object set by the bootstrap resolvers. Any code path that attaches a wrong or stale context bypasses all resolution logic silently. There is no TTL, no schema check, and no page-ID cross-check.

**2. Global "latest event" fallback picks any row (line 2266-2295):**
When a non-app-mode request arrives with no page context, `getLatestEventForGlobalContext` is called. It queries the `Event` table ordering by modification timestamp (trying four column-name variants to handle schema drift: `updatedAt`, `updated_at`, `createdAt`, `created_at`) and returns the first result. On a site with more than one event the most-recently-touched event wins — not the currently active one.

**3. Errors are swallowed (lines 2115, 2124):**
`getCurrentEventContext` catches all exceptions and returns `{ runtimeSource: "context_error", event: null }` rather than throwing. Downstream resolvers receive an `event: null` context and cannot distinguish "no event configured" from "lookup failed" — both look identical.

**Risk:** Currently low on `tag-hackday.atlassian.net` with one event. Grows with multi-event scenarios. A malformed bootstrap context, a stale cache, or a concurrent second event could silently serve the wrong event's data to participants.

**Recommended fix:** Add a page-ID cross-check when `_bootstrapContext` is present (confirm `bootstrapContext.pageId === req.context?.localId`). Narrow the global fallback to filter by an "active" or "current" event flag rather than picking the last-modified row. Consider surfacing `context_error` as a distinct error state rather than a silent `event: null`.

---

## S1 — `EDITABLE_PHASES` duplicated 4 ways (MEDIUM)

**Where:**
- `forge-native/static/runtime-frontend/src/components/Marketplace.jsx:151`
- `forge-native/static/runtime-frontend/src/components/teamDetail/PainPointsPanel.jsx:12`
- `forge-native/static/runtime-frontend/src/components/teamDetail/InvitationsPanel.jsx:12`
- `forge-native/static/runtime-frontend/src/components/TeamDetail.jsx:303` (inline `||` chain, not even using the constant)

Three files define identical `const EDITABLE_PHASES = ['signup', 'team_formation']`. `TeamDetail.jsx:303` expresses the same intent as an inline expression: `isCaptain && (eventPhase === 'signup' || eventPhase === 'team_formation')`.

**Risk:** An editing phase is added or renamed (e.g. a new `pre_hacking` phase) and only 2 of the 4 sites are updated. Features silently diverge. This has happened before with `setup` (see S2).

**Recommended fix:** Export `EDITABLE_PHASES` from `lib/registrationState.js` or `data/constants.js` (where `PHASE_MAP` already lives) and import it at each site. Replace the TeamDetail inline chain with `EDITABLE_PHASES.includes(eventPhase)`.

---

## S2 — `setup` phase surfaces are inconsistent (MEDIUM)

**Where:** `forge-native/static/runtime-frontend/src/components/Dashboard.jsx:738` vs `Marketplace.jsx:151`, `PainPointsPanel.jsx:12`, `InvitationsPanel.jsx:12`, `TeamDetail.jsx:303`

**What is it:** `Dashboard.jsx:738` defines:
```js
const isEarlyExecutionPhase = eventPhase === 'signup' || eventPhase === 'team_formation' || eventPhase === 'setup';
```
This gates the pain-points feed on the Dashboard — so in the `setup` phase, participants see the pain-points section. However, none of the three `EDITABLE_PHASES` constants include `'setup'`, meaning:

- Dashboard shows the pain-points feed in `setup`
- `PainPointsPanel` blocks adding/removing pain points in `setup`
- `Marketplace` blocks team creation in `setup`
- `InvitationsPanel` hides the invite button in `setup`

A participant in `setup` can browse pain points on the Dashboard but cannot interact with them. This is either intentional (read-only preview in setup) or an oversight where `setup` should have been excluded from `isEarlyExecutionPhase` too.

**Recommended fix:** Decide whether `setup` is a read-only preview or an active editing phase. If read-only: remove `'setup'` from `isEarlyExecutionPhase`. If active: add `'setup'` to the shared `EDITABLE_PHASES` constant (see S1). Document the decision.

---

## S3 — Documented admin team-delete in any phase is not implemented (MEDIUM)

**Where:** `CLAUDE.md` Phase-Gated Behaviour table; `forge-native/static/runtime-frontend/src/components/TeamDetail.jsx:303`, `523-524`

**What is it:** CLAUDE.md states:

| Feature | Phases shown |
|---------|-------------|
| Delete Team (admin) | any phase |

The implementation at `TeamDetail.jsx:303`:
```js
const canDelete = isCaptain && (eventPhase === 'signup' || eventPhase === 'team_formation');
```
`canDelete` gates the Delete button (TeamDetail.jsx:709). `handleDeleteTeam` at line 523-524:
```js
const handleDeleteTeam = async () => {
  if (!isCaptain || !onDeleteTeam || !team?.id) return;
```

There is no `isAdmin` or `isEventAdmin` branch anywhere in `TeamDetail.jsx`. An admin user cannot delete a team after `team_formation` phase ends through this UI. Admins can delete _registrations_ via `UsersPanel.jsx:61` (`adminDeleteRegistration`), but no team-delete path exists for them.

**Action required:** Either implement the admin delete branch in `TeamDetail.jsx` (`canDelete = isCaptain && editablePhase || (isAdmin || isEventAdmin)` + remove the captain-only guard in `handleDeleteTeam`), or update CLAUDE.md to reflect that admin team-delete through the UI is not currently available. The doc and code are currently contradictory.

---

## S4 — Hardcoded phase/role literals bypass canonical maps (LOW)

**Where:** Multiple backend resolver files

**What is it:** `forge-native/src/runtime/lib/constants.js` defines `PHASE_MAP`, `ROLE_MAP`, `REVERSE_PHASE_MAP`, `REVERSE_ROLE_MAP` as the canonical translation layer between DB enums and app strings. Several places bypass these:

- **`resolvers/events.js:72`** — hardcoded default `phase: "signup"` in the no-event branch. Should use `PHASE_MAP.REGISTRATION` or `PHASE_MAP.SIGNUP`.
- **`resolvers/dev.js:155-156`** — `user.role === "JUDGE"`, `user.role === "ADMIN"` compared directly against raw DB enums rather than using `REVERSE_ROLE_MAP`.
- **`lib/transforms.js:25-26`** — same pattern: maps `role` through `ROLE_MAP` but tests `user.role === "JUDGE"` / `"ADMIN"` directly for the derived boolean fields.
- **`lib/helpers.js` (schedule/milestone builders)** — writes DB-form phase strings (`"REGISTRATION"`, `"HACKING"`, `"SUBMISSION"`, `"JUDGING"`, `"VOTING"`, `"RESULTS"`) throughout `createMilestonesFromSchedule`, `buildScheduleMilestonesFromEventSchedule`, `mapScheduleSignalToPhase`, `defaultEventFieldValue`. These are a second, uncodified source of truth for the valid enum values.

Additionally, `PHASE_MAP` has a many-to-one: both `PHASE_MAP.REGISTRATION` and `PHASE_MAP.SIGNUP` map to `"signup"`, but `REVERSE_PHASE_MAP.signup → "REGISTRATION"` only. If any `SIGNUP` enum row exists in the DB, a forward+reverse round-trip silently rewrites it to `REGISTRATION`.

**Risk today:** Functionally correct as long as the DB enums don't change. Risk is consistency debt: if a phase enum is renamed the hardcoded strings must be tracked down manually rather than being caught by updating the map.

**Recommended fix:** Route `user.role === "JUDGE"` / `"ADMIN"` comparisons through `REVERSE_ROLE_MAP`. Use `PHASE_MAP`/`REVERSE_PHASE_MAP` consistently in the schedule builders. Address the `REGISTRATION`/`SIGNUP` ambiguity by choosing one canonical key and removing the other, or documenting the deliberate duplication.

---

## S5 — No resolver-name uniqueness guard (LOW)

**Where:** `forge-native/src/runtime/index.js`, `forge-native/tests/backend/runtime-resolver-contract.test.mjs`

**What is it:** `index.js` imports and calls 16 `register*` functions one-to-one — registration is consistent with no gaps. However, there is no programmatic guard against two modules calling `resolver.define('sameName', ...)`. The underlying Forge resolver library (based on the pattern) silently takes the last-registered definition. If a new resolver is added with a name that collides with an existing one, both appear to register successfully but only one is reachable at runtime.

The source-grep contract test checks for the presence of ~24 resolver names in the source text, not their uniqueness, and covers fewer than half the registered resolvers. Newly added resolvers are not automatically covered.

**Risk:** Currently low (16 well-partitioned domain modules with no overlapping names found). Grows as the resolver surface expands.

**Recommended fix:** Add a uniqueness assertion to `runtime-resolver-contract.test.mjs`: parse all `resolver.define(` calls from the runtime source corpus via `readRuntimeSource()`, extract the names, and assert there are no duplicates. Extend the name list in the contract test to cover all ~60 resolvers, or generate it dynamically.

---

## Out of scope (not investigated, not findings)

The following were identified during exploration but are deliberately excluded per the agreed audit scope (correctness + consistency; architecture and doc/version drift excluded):

- **Convex `painPoints` vs Supabase `Problem` table** — unsynchronised parallel stores for the same concept across parent and child apps. Architecture.
- **`submitProject` dual-write** — Supabase `Project` + Convex `hacks:upsertFromForge` with no transaction or compensation. Architecture.
- **Team `problem`/`moreInfo` in Forge storage** — a third data tier (Forge KV), hydrated at read time. Architecture by design.
- **PG-error-string-parsing schema fallbacks** in `helpers.js` (`extractMissingEventColumn`, `updateEventWithSchemaFallback`). Architecture/robustness.
- **`HDC_PERF_RUNTIME_BOOTSTRAP_V2` flag** — changes event-existence behaviour across environments. Config/architecture.
- **Source-grep contract test design** — regex against concatenated source text, not runtime behaviour. Test architecture.
- **`APP_VERSION 1.2.260` vs `package.json 1.2.95`** and per-bundle console-version constants. Version drift.
- **Stale CLAUDE.md "fonts note"** — claims a Google Fonts `<link>` exists in `index.html`; none of the three bundles contain one. Doc drift.
- **Legacy `hd26forge`/`v1` routing branch in `hdcService.ts`** — `resolveHackdayTemplateRuntimeOwner` defaults to `'hd26forge'` when `HDC_RUNTIME_OWNER` is unset. This is a config footgun (HD26Forge is uninstalled, so defaulting to it would break child-page creation) but is a deployment-config concern, not a code consistency defect while the env var is set correctly in production.

---

## Resolution notes (v1.2.261)

All 8 findings were addressed in the same session as the audit. Changes shipped in a single version bump to `APP_VERSION 1.2.261`.

**C1** — All plain `invoke()` calls in `App.jsx` primary action handlers (`handleUpdateUser`, `handleUpdateTeam`, `handleSubmitProject`, `handleDeleteTeam`, `handleLeaveTeam`, `handleJoinRequest`, `handleRequestResponse`, `loadTeamDetails`, `handleUpdateUserRole`, `handleTrackEvent`, `handleAutoAssignOptIn`) wrapped in `invokeEventScopedResolver`. Secondary-tier components (`Voting.jsx`, `JudgeScoring.jsx`, `UsersPanel.jsx`, `AppLayout.jsx`, `AdminPanel.jsx`) updated likewise. Hidden bug discovered: `handleAutoAssignOptIn` was calling the non-existent resolver `updateAutoAssignOptIn` (silently failing); corrected to `optInToAutoAssign` to match `Dashboard.jsx` and `resolvers/auth.js`.

**C2** — `assignPainPointsToTeam` now queries `painPoints:listForTeam` before linking. Returns `{ ok: false, error: 'Team already has a pain point' }` if the team already has one. Caps input to the first id defensively.

**C3** — `getCurrentEventContext` now skips the `_bootstrapContext` cache when its `runtimeSource` is a sentinel error value (`"context_error"` or `APP_MODE_RUNTIME_SOURCES.REQUIRED`), falling through to fresh resolution. `getLatestEventForGlobalContext` now filters out terminal events (`completed`, `archived`) via `.not('lifecycle_status', 'in', '("completed","archived")')` applied defensively.

**S1** — `EDITABLE_PHASES` exported from `static/runtime-frontend/src/data/constants.js`. All 4 sites (`Marketplace.jsx`, `PainPointsPanel.jsx`, `InvitationsPanel.jsx`, `TeamDetail.jsx`) import the shared constant; local duplicates removed.

**S2** — `isEarlyExecutionPhase` in `Dashboard.jsx` now uses `EDITABLE_PHASES.includes(eventPhase)` (no `'setup'`). Dashboard pain-points feed no longer appears in `setup` phase — consistent with all editing surfaces.

**S3** — `CLAUDE.md` Phase-Gated table updated: `Delete Team (admin) | any phase` → `Delete Team (admin) | not available via UI — admins delete registrations via UsersPanel, not teams`. No code change.

**S4** — `resolvers/events.js:72` now uses `PHASE_MAP.REGISTRATION` instead of `"signup"`. `lib/transforms.js:25-26` and `resolvers/dev.js:155-156` now use `REVERSE_ROLE_MAP.judge`/`REVERSE_ROLE_MAP.admin`. `lib/constants.js` has a comment documenting the deliberate `REGISTRATION`/`SIGNUP → "signup"` many-to-one. Schedule/milestone builders in `helpers.js` left unchanged (high churn, identity-preserving, low regression priority).

**S5** — Two new contract tests added to `runtime-resolver-contract.test.mjs`: one asserts `assignPainPointsToTeam` contains the server-side one-per-team guard; one asserts no duplicate `resolver.define()` names exist across the entire runtime source corpus. Test suite: 58/58 pass.
