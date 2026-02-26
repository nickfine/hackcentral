# Config Mode (Inline Overtype for Modifiable HackDay Content) — Phased Implementation Plan

## Summary

This plan implements an **admin-only Config Mode** in HackDay that lets admins **edit modifiable content in place** ("overtype" UX), while preserving a **structured configuration model** and the current design-system-driven layout.

### Feature design first vs implementation plan
They are **not exactly the same**, but for this project they should be delivered together:
- **Feature design** = product/UX decisions, scope, editing model, governance rules
- **Implementation plan** = code/schema/API/testing/rollout details

This plan includes both, with **Feature Design as Phase 0** and implementation in subsequent phases.

### Decisions locked
- **Entry point first**: `HackDay Admin Panel` (not HackCentral first)
- **Publishing model**: `Draft + Publish`
- **Phase 1 scope**: `Branding + Messaging + Rules Summary` (focused pilot)

---

## Goals and Success Criteria

### Goal
Enable admins to turn on a `Config Mode` in HackDay and edit **allowed content directly on the participant-facing pages**, while keeping:
- layout and IA stable
- event logic safe
- draft/publish workflow explicit
- cross-event maintainability high

### Success Criteria (Phase 1)
1. Admin can enable `Config Mode` from HackDay Admin Panel.
2. Editable content shows hover/edit affordances only in Config Mode.
3. Admin can edit:
   - participant messaging (MOTD title/body/priority)
   - branding controls (accent/theme/banner fields)
   - a defined pilot set of Rules page text blocks
4. Edits save as **draft** and do not affect participants until **Publish**.
5. Publish applies changes atomically (or clearly reports partial failure and preserves draft).
6. Non-admins never see draft content or editing UI.
7. Existing event behavior remains unchanged when Config Mode is off.

---

## Scope

### In Scope (Phased)
- HackDay (`HD26Forge`) Admin-first Config Mode
- Inline editing for text content (pilot set)
- Side-panel controls for structured/non-text fields (branding, priority, enums)
- Draft/publish workflow
- Content registry + override resolution
- Backend APIs + persistence for config draft and published content overrides
- Telemetry + audit metadata (basic in Phase 1; fuller history later)

### Out of Scope (Phase 1)
- Full freeform page builder
- Reordering/removing page sections
- Arbitrary CSS/layout editing
- HackCentral editing UI for inline content (comes later)
- Localization/i18n support
- Rich text editing
- Multi-admin collaborative merging UI (phase 2+)
- Schedule inline content editing (phase 2+; schedule remains via builder/admin controls)

---

## Product / UX Design (Decision-Complete)

## Core UX Model

### Config Mode entry
- Add a `Config Mode` toggle/button in **HackDay Admin Panel** (new top-level admin action area).
- Only visible to:
  - `admin` role
  - event creator/co-admin (`isEventAdmin`) where applicable

### While Config Mode is ON
- Participant pages render normally, but editable fields show:
  - subtle hover outline
  - pencil icon / edit affordance
  - lock affordance for non-editable content (optional in later phase)
- Clicking editable content opens:
  - **inline text editor** for short/long text
  - **side panel editor** for enums/colors/structured controls
- A persistent floating config bar is shown (desktop + responsive fallback):
  - `Config Mode`
  - `Draft status`
  - `Save Draft`
  - `Publish`
  - `Discard Draft`
  - `Exit Config Mode`

### Draft/Publish behavior
- `Save Draft` stores changes server-side for the event (shared across admins)
- `Publish` applies the draft to participant-facing live content
- `Discard Draft` reverts draft to current published state
- Participants and non-admins always see **published** content only
- Admins in Config Mode preview **draft** content (if present)

### Editing behavior by content type
- **Inline overtype (text)**:
  - titles, subtitles, helper copy, rules descriptions
- **Side-panel controls (structured values)**:
  - color/theme/banner image URL
  - MOTD priority enum
  - future: judge criteria weights, award types, etc.
- **Logic-bearing settings** remain structured:
  - phase, team size, vote cap, schedule times (no freeform prose editing for these)

## What is editable in Phase 1 (exact)
Phase 1 = **Branding + Messaging + Rules Summary** pilot.

### Branding (structured controls, side panel)
Backed by existing branding model/API:
- `accentColor`
- `themePreference`
- `bannerImageUrl`
- `bannerMessage`

### Messaging (inline + structured)
Backed by existing MOTD/admin message model:
- MOTD title
- MOTD body
- MOTD priority (`info | warning | urgent`)

### Rules Summary (inline text pilot)
Backed by new content override keys (not replacing event logic):
- Rules page subtitle/header support copy
- General Rules section descriptions (pilot allowlist only):
  - time limit description
  - team size description (template-derived default; overrideable text)
  - submission requirements description
  - judging criteria summary description
  - code of conduct description

### Explicitly locked in Phase 1
- Nav labels / page names
- Phase order labels
- Allowed/Not Allowed lists and examples (Phase 2 candidate)
- New to HackDay page content (Phase 2)
- Judge criteria definitions (Phase 2)
- Results award labels (Phase 2)

---

## Architecture Overview

## Design principle
Implement “overtype” as a **UI overlay on top of structured content sources**, not DOM mutation.

## Content source precedence (runtime)
For participant-facing text resolution:
1. **Platform default copy** (hardcoded)
2. **Event config-derived defaults** (rules/settings/branding-derived templates)
3. **Published content overrides** (new, event-scoped)
4. **Draft content overrides** (admin preview only, Config Mode ON)

This preserves UX consistency while enabling per-event customization.

---

## Data Model and Persistence

## Existing data reused
Already present in HD26Forge/Event:
- `event_branding`
- `event_rules`
- `event_schedule`
- `motd` / `motdMessage` equivalent handling in resolver layer
- `maxTeamSize`
- `maxVotesPerUser`

## New persistence (Phase 1)
Add two JSON fields to the event storage model (Supabase Event row; exact migration location depends on schema owner repo/environment):

### 1. `event_content_overrides` (published)
Stores published copy overrides for participant-facing text.

Proposed envelope schema:
```json
{
  "schemaVersion": 1,
  "version": 1,
  "updatedAt": "2026-02-26T00:00:00.000Z",
  "updatedBy": {
    "accountId": "abc123",
    "displayName": "Admin Name"
  },
  "values": {
    "rules.header.subtitle": "Guidelines and expectations for all participants",
    "rules.general.teamSize.description": "Teams must have 2-6 members..."
  }
}
```

### 2. `event_config_draft` (draft workspace)
Stores a shared draft across admins for Config Mode edits (Phase 1 pilot + future expansion).

Proposed envelope schema:
```json
{
  "schemaVersion": 1,
  "draftVersion": 3,
  "basePublishedVersion": 1,
  "updatedAt": "2026-02-26T00:00:00.000Z",
  "updatedBy": {
    "accountId": "abc123",
    "displayName": "Admin Name"
  },
  "patch": {
    "branding": {
      "accentColor": "#0f766e",
      "themePreference": "system",
      "bannerImageUrl": "",
      "bannerMessage": "..."
    },
    "motdMessage": {
      "title": "Heads up",
      "message": "Check judging room at 4pm",
      "priority": "info"
    },
    "contentOverrides": {
      "rules.general.submissionRequirements.description": "Submit source code, a demo video..."
    }
  }
}
```

### Why this split
- Keeps **published generic copy** separate from operational/domain config
- Allows draft to stage changes across **multiple sources** (branding + messaging + copy overrides)
- Keeps rollout simple and backward compatible with existing branding/messaging resolvers

## Compatibility strategy
- Existing event rows without new fields default to `null`
- Runtime should safely ignore missing new fields
- No backfill required for Phase 1

---

## Public APIs / Interfaces / Types (Changes)

## Backend (HD26Forge `src/index.js`) — new resolvers
Add new resolvers (names fixed for plan):

1. `getEventConfigModeState`
- Returns permissions, published override metadata, draft metadata, and merged editable values for allowed keys
- Used only by admin UI / Config Mode

2. `saveEventConfigDraft`
- Input:
  - `expectedDraftVersion` (optional/null for first save)
  - `patch` (partial patch for branding/messaging/contentOverrides)
- Behavior:
  - validates allowed keys and field types
  - merges into `event_config_draft`
  - optimistic concurrency conflict on version mismatch

3. `publishEventConfigDraft`
- Input:
  - `expectedDraftVersion`
- Behavior:
  - validates full draft patch
  - applies:
    - branding -> existing branding persistence path (reuse current permission model)
    - MOTD/message -> existing settings/messaging persistence path
    - contentOverrides -> `event_content_overrides`
  - clears `event_config_draft`
  - returns published metadata and affected sections

4. `discardEventConfigDraft`
- Clears draft workspace for the event (permission-gated)

Optional (Phase 2+):
5. `getEventConfigHistory`
- Revision history / rollback support

## Backend (existing resolver updates)
### `getEventPhase`
Extend response to include (non-breaking additions):
- `contentOverrides` metadata (or merged resolved content summary; metadata preferred)
- `configModeCapabilities` (permissions and feature flags)
- `hasConfigDraft` (for admin indicators)

### `updateEventBranding` / `updateEventSettings`
No behavior change for normal admin usage in Phase 1.
Config Mode publish will call shared internal helpers (not necessarily these resolvers directly) to avoid duplicated logic.

## Frontend (HD26Forge types/interfaces)
Add types (new file recommended: `static/frontend/src/configMode/types.ts`):
- `EditableContentKey`
- `EventContentOverridesEnvelopeV1`
- `EventConfigDraftEnvelopeV1`
- `ConfigDraftPatch`
- `ConfigModeCapabilities`
- `ConfigModeStateResponse`

## Frontend content registry contract
New static registry definition (file recommended: `static/frontend/src/configMode/contentRegistry.ts`):
- key
- page
- section
- field type (`text`, `textarea`, `select`, `color`, `image_url`)
- source kind (`contentOverride`, `branding`, `motd`)
- validation
- character limits
- editable in phase flag (`phase1`, `phase2`, ...)
- admin label and help text
- optional default resolver (for template-derived defaults)

Example entry:
```ts
{
  key: "rules.general.submissionRequirements.description",
  page: "rules",
  section: "generalRules",
  type: "textarea",
  sourceKind: "contentOverride",
  maxLength: 220,
  editablePhase: 1
}
```

---

## Frontend Implementation Plan (HD26Forge)

## New frontend subsystems (Phase 1)

### 1. Config Mode state + context
Add `ConfigModeProvider` (or equivalent in `App.jsx`) with:
- `isEnabled`
- `draftState`
- `publishedStateMeta`
- `saveDraft()`
- `publishDraft()`
- `discardDraft()`
- `resolveEditableValue(key, fallback)`
- `isFieldEditable(key)`
- `beginEdit(key)`

### 2. Editable field components
Add reusable primitives:
- `EditableText`
- `EditableTextArea`
- `EditableFieldFrame` (hover outline + badge)
- `ConfigLockedBadge` (optional; Phase 1 minimal)

Behavior:
- No-op in normal mode
- Admin-only edit UI in Config Mode
- Draft preview reflects immediately after local edit (optimistic UI)
- Save persists to server draft

### 3. Config toolbar / floating action bar
Global component visible in Config Mode:
- status chip (`Draft saved`, `Unsaved changes`, `Conflict`)
- `Save Draft`
- `Publish`
- `Discard Draft`
- `Exit Config Mode`

### 4. Config side panel (Phase 1)
For structured fields:
- branding controls (accent/theme/banner)
- MOTD priority
- future extensibility for list editing, enums, criteria

## Integrations by page/component (Phase 1)

### `static/frontend/src/components/AdminPanel.jsx`
Add:
- `Config Mode` toggle / entry
- Draft status indicator (if draft exists)
- “Open page in config mode” shortcuts (Dashboard / Rules)
- Existing Branding/Messaging tabs remain available and functional
- In Config Mode, these tabs should edit the **draft workspace**, not live values

### `static/frontend/src/App.jsx`
Add:
- Config Mode provider initialization
- Fetch config mode state for admins
- Runtime content resolution injection into pages
- Pass Config Mode context / helpers through provider (not prop drilling)

### `static/frontend/src/components/Dashboard.jsx`
Phase 1 use:
- render MOTD/message pod content via Config Mode resolver in admin preview
- optional inline edit affordances on MOTD title/body when present
- branding preview should reflect draft branding (accent/theme/banner) when in config mode

### `static/frontend/src/components/Rules.jsx`
Replace direct hardcoded strings for pilot fields with:
- default constant values -> wrapped by `resolveEditableValue(key, default)`
- inline editable wrappers in Config Mode

Do **not** refactor entire page in Phase 1; only pilot allowlist keys.

---

## Backend Implementation Plan (HD26Forge)

## Permissions model (fixed)
Reuse the strictest current event admin checks:
- allow Config Mode actions for:
  - platform `admin`
  - event creator / co-admin (`isEventAdmin`)
- deny for participants/judges/ambassadors (unless also admin)

## Internal helpers (to avoid drift)
Refactor or reuse existing logic in `src/index.js`:
- branding normalization/permission checks
- MOTD normalization
- event lookup and seed-aware admin checks

Config Mode publish should call shared helpers rather than duplicating logic in multiple resolvers.

## Draft save semantics
- Validate patch by source kind:
  - branding fields: color/theme/url length/format
  - motdMessage: title/body length, priority enum
  - contentOverrides: key allowlist + string length constraints
- Merge patch into `event_config_draft.patch`
- Increment `draftVersion`
- Return normalized draft snapshot

## Publish semantics (atomicity)
Preferred behavior:
- Apply changes in a transaction (if available in current data access layer)
If not feasible:
- Ordered apply with clear error handling:
  1. branding
  2. messaging
  3. published content overrides
  4. clear draft
- If a step fails:
  - return error with `appliedSections`
  - preserve `event_config_draft`
  - do not clear draft
  - UI shows partial apply warning and retry guidance

## Concurrency strategy (Phase 1)
- Optimistic concurrency on `draftVersion`
- Client sends `expectedDraftVersion`
- Resolver returns conflict if current version differs
- UI behavior on conflict:
  - notify admin
  - refetch latest draft
  - show “reload draft and retry” (no merge UI in Phase 1)

---

## Content Registry (Phase 1) — Exact Keys

## `branding` (sourceKind = branding; side panel)
- `branding.accentColor`
- `branding.themePreference`
- `branding.bannerImageUrl`
- `branding.bannerMessage`

## `messaging` (sourceKind = motd; inline + side panel)
- `dashboard.motd.title`
- `dashboard.motd.message`
- `dashboard.motd.priority` (enum; side panel)

Mapping:
- these keys map to underlying `motdMessage` object (not generic override storage)

## `rules` summary pilot (sourceKind = contentOverride; inline)
- `rules.header.subtitle`
- `rules.general.timeLimit.description`
- `rules.general.teamSize.description`
- `rules.general.submissionRequirements.description`
- `rules.general.judgingCriteria.description`
- `rules.general.codeOfConduct.description`

Note:
- Default values remain hardcoded in `Rules.jsx`
- Team size/judging defaults should be generated from live `event_rules` when possible (fallback to current copy)

---

## Phased Rollout Plan

## Phase 0 — Feature Design + Technical Spike (1 sprint)
Purpose: lock UX, data model, and content registry approach before implementation.

### Deliverables
- Config Mode UX spec (annotated flows)
- Editable field taxonomy (text vs structured vs locked)
- Phase 1 content key allowlist
- Draft/publish lifecycle spec
- Backend schema design signoff (`event_config_draft`, `event_content_overrides`)
- Error/concurrency handling spec
- Telemetry events spec

### Validation
- Walkthrough with stakeholder using mocked screenshots/wireframes
- Confirm “no full page builder” boundary
- Confirm admin mental model (draft/publish)

## Phase 1 — Pilot: Branding + Messaging + Rules Summary (HackDay Admin First) (1–2 sprints)
Purpose: ship the core architecture and prove the in-place editing experience on a safe subset.

### Backend
- Add new JSON fields (or equivalent persistence)
- Implement resolvers:
  - `getEventConfigModeState`
  - `saveEventConfigDraft`
  - `publishEventConfigDraft`
  - `discardEventConfigDraft`
- Extend `getEventPhase` (non-breaking additions)

### Frontend
- Config Mode provider/state
- Floating config toolbar
- Inline editable components (text + textarea)
- Side panel for branding + priority
- Admin Panel entry point + draft indicators
- Rules page pilot field integration
- Dashboard MOTD integration with draft preview
- Branding draft preview path (theme/accent/banner where currently used)

### Acceptance criteria
- Admin can edit pilot fields in place
- Save draft / publish / discard all work
- Participants see only published content
- Existing non-config-mode behavior unchanged
- Permission enforcement passes

### Rollout strategy
- Feature flag: `CONFIG_MODE_PHASE1`
- Enable for internal admin users only
- Pilot on one or two events first

## Phase 2 — Expand Editable Content Coverage (2+ sprints)
Purpose: cover the highest-value participant-facing copy without compromising structure.

### Add editable surfaces
- `NewToHackDay` page (selected blocks only)
  - hero support text
  - hero stats labels/values (where event-specific)
  - FAQ answers (allowlisted)
- `JudgeScoring` criteria labels/descriptions (template + overrides)
- `Results` award labels (optional overrides)
- Rules page expanded modules (allowed/not allowed examples) if approved

### Data model
- Extend content registry only (no schema change unless list/object editing needs richer values)
- If list editing is added, support structured values in overrides (`string[]` / typed objects)

### UX
- Add lock badges for non-editable content
- Add “Reset section to defaults”
- Add page-level editable field index in side panel (optional)

### Rollout
- Feature flag per page:
  - `CONFIG_MODE_ONBOARDING`
  - `CONFIG_MODE_JUDGING_COPY`
  - `CONFIG_MODE_RESULTS_COPY`

## Phase 3 — Cross-App Integration (HackCentral) + Template-Level Content (multi-sprint)
Purpose: move from instance-only tuning to reusable event templates for recurring events.

### HackCentral integration
- Add Config Preview / Content tab in HackCentral (global and/or macro)
- Expose the same content registry keys in HackCentral UI (no duplicate semantics)
- Write template-level defaults into HackCentral seed payload (new `content` block, versioned)
- Sync precedence:
  - HackCentral template content -> instance defaults
  - HackDay instance overrides still win at runtime

### Schema/API additions
- Extend HackCentral types (`CreateInstanceDraftInput`) with optional `content` section (versioned)
- Backend normalization/validation in HackCentral `hdcService`
- Seed payload persistence + HD26Forge read path merge

### Governance and ops
- Add revision history table (`EventContentRevision`) and rollback UI
- Add “copy published -> template” workflow (optional, admin-gated)

## Phase 4 — Hardening / Scale / Admin Experience
Purpose: operational confidence and low-friction recurring usage.

### Additions
- Revision history + rollback
- Diff view before publish
- Conflict UX improvements (merge assist)
- Audit trail UI (who changed what)
- Metrics dashboard for config adoption
- QA checklists and admin help content

---

## Testing Plan (Decision-Complete)

## Backend tests
### Resolver unit/integration tests (HD26Forge)
1. `getEventConfigModeState`
- admin/event-admin can fetch
- non-admin denied
- null draft/published envelopes handled
- malformed JSON envelopes normalized safely

2. `saveEventConfigDraft`
- valid patch saves and increments `draftVersion`
- invalid key rejected
- invalid field type rejected
- length validation enforced
- enum validation enforced
- conflict on `expectedDraftVersion` mismatch

3. `publishEventConfigDraft`
- applies branding + MOTD + contentOverrides and clears draft
- preserves draft if publish fails mid-apply
- permission checks
- empty draft rejected gracefully

4. `discardEventConfigDraft`
- clears draft
- idempotent behavior

## Frontend tests
### Component/unit tests
- `resolveEditableValue` precedence
- content registry validation helpers
- editable field wrappers render normal vs config mode vs non-admin
- optimistic draft save state transitions

### UI/integration tests (Vitest + RTL)
1. Admin enters Config Mode and sees editable affordances
2. Participant user does not see Config Mode UI
3. Rules page pilot field edit -> Save Draft -> preview updates
4. Publish applies and persists
5. Discard restores published values
6. Draft conflict shows recoverable error state

### Manual QA scenarios
- Light/dark/system theme preview in config mode
- Mobile viewport editing (toolbar + side panel usability)
- Switching pages while config mode on retains draft preview
- Non-editable fields remain locked/no-op
- Existing admin tabs (Branding/Messaging/Settings) still behave correctly when not in Config Mode

---

## Observability, Telemetry, and Monitoring

## Telemetry events (Phase 1)
Add client/server telemetry for:
- `config_mode_enabled`
- `config_field_edit_started`
- `config_field_edit_saved_draft`
- `config_draft_publish_success`
- `config_draft_publish_failed`
- `config_draft_discarded`
- `config_draft_conflict`

Attributes:
- eventId
- page
- fieldKey / fieldGroup
- actor role
- duration to publish
- failure category

## Logging
- Resolver logs for validation failures, permission denials, publish partials, conflict errors
- Redact message bodies from logs where unnecessary

## Rollout monitoring
Track:
- number of events using Config Mode
- fields edited per event
- publish success rate
- draft conflict rate
- rollback requests (Phase 4)

---

## Migration / Compatibility Plan

## DB migration (schema owner environment)
Add nullable JSON columns to `Event`:
- `event_content_overrides`
- `event_config_draft`

If migration repo is not present in local checkout:
- create migration SQL in the schema-owning repo/environment
- include backward-compatible defaults (`NULL`)
- deploy before frontend enablement

## Runtime compatibility
- Frontend feature flag off by default until backend deploy is complete
- Backend resolvers return capability flags so UI can self-disable if schema unavailable
- Existing pages keep hardcoded defaults when overrides absent

---

## Risks and Mitigations

## Risk: Config Mode becomes a page builder
Mitigation:
- strict content registry allowlist
- no layout editing
- no arbitrary HTML/rich text
- field types and validations enforced server-side

## Risk: Drift between HackCentral config and HackDay runtime overrides
Mitigation:
- Phase 1 explicitly instance-scoped
- Phase 3 introduces template-level `content` schema and precedence rules
- show source labels in UI later (“Template default”, “Event override”)

## Risk: Publish partial failures across branding/MOTD/overrides
Mitigation:
- transaction if possible
- otherwise ordered apply + `appliedSections` response + preserve draft for retry
- explicit UI warnings

## Risk: Multi-admin conflicts
Mitigation:
- optimistic concurrency with `draftVersion`
- conflict detection in Phase 1
- merge UX deferred to Phase 4

## Risk: Hardcoded pages still show conflicting values
Mitigation:
- phase gates with clear page/key allowlist
- add regression QA checklist per page
- prioritize Rules page alignment early (Phase 1/2)

---

## Concrete File Touchpoints (Initial Implementation)

## HD26Forge frontend
- `static/frontend/src/App.jsx` (provider wiring, resolver fetch, state propagation)
- `static/frontend/src/components/AdminPanel.jsx` (Config Mode entry, toolbar hooks, draft controls)
- `static/frontend/src/components/Dashboard.jsx` (MOTD draft preview + editable wrappers)
- `static/frontend/src/components/Rules.jsx` (pilot content keys)
- New files:
  - `static/frontend/src/configMode/types.ts`
  - `static/frontend/src/configMode/contentRegistry.ts`
  - `static/frontend/src/configMode/ConfigModeContext.tsx`
  - `static/frontend/src/configMode/EditableText.tsx`
  - `static/frontend/src/configMode/EditableFieldFrame.tsx`
  - `static/frontend/src/configMode/ConfigToolbar.tsx`
  - `static/frontend/src/configMode/ConfigSidePanel.tsx`
  - `static/frontend/src/configMode/resolveContent.ts`

## HD26Forge backend
- `src/index.js` (new resolvers + shared helper integration)
- Event data access helpers in `src/index.js` (or extracted utility module if refactoring)
- Schema migration in schema-owning DB project/environment (not present in this checkout)

## HackCentral (Phase 3)
- `forge-native/static/frontend/src/App.tsx` (HackCentral create/edit UI extensions)
- `forge-native/static/macro-frontend/src/App.tsx` (optional content tab/preview)
- `forge-native/static/macro-frontend/src/types.ts` and `forge-native/src/shared/types.ts` (new `content` schema)
- `forge-native/src/backend/hdcService.ts` (validation/normalization)
- seed payload persistence paths in backend/repository layer

---

## Acceptance Checklist by Phase

## Phase 1 (must pass before wider rollout)
- [ ] Config Mode toggle visible only to admins/event admins
- [ ] Draft/publish/discard works end-to-end
- [ ] Pilot editable fields render and persist correctly
- [ ] No participant-visible draft leaks
- [ ] Rules page defaults still work when no overrides exist
- [ ] Existing branding/messaging admin flows still work
- [ ] Feature flag can disable Config Mode cleanly

## Phase 2
- [ ] Onboarding/judging/results copy registry added without breaking Phase 1
- [ ] Section reset-to-default works
- [ ] Page-level lock/edit affordances remain clear and not noisy

## Phase 3
- [ ] HackCentral template content schema introduced and validated
- [ ] Template -> instance content precedence works
- [ ] Recurring event workflow tested (new event seeded from template content)

---

## Assumptions and Defaults (Explicit)
1. **No full page builder** will be implemented; only structured content editing.
2. **Config Mode starts in HackDay Admin Panel first** (HackCentral integration later).
3. **Draft + Publish is mandatory** (no live-by-default editing in Phase 1).
4. **Phase 1 scope is limited** to Branding + Messaging + Rules Summary pilot.
5. English-only content editing for now (no localization support in Phase 1).
6. Plain text/textarea fields only in Phase 1 (no rich text).
7. Multi-admin conflicts use **optimistic concurrency + reload**, not merge UI.
8. Event schema migration must be applied in the environment/repo that owns the Supabase `Event` schema (not available in this local HD26Forge checkout).
9. Existing event branding/MOTD/settings remain the published source of truth in Phase 1; draft staging is added via new `event_config_draft` workspace.
10. Design system enforcement remains platform-owned (teal/action-first hierarchy/layout locked).
