# HackDay Central — Creation & Admin Roadmap

## Vision

**HackDay Central (HDC)** is the single hub from which all HackDays are created and
discovered. Any user can create their own HackDay (e.g. for a team or business unit)
from HDC. Each HackDay runs as a child — a separate Confluence page powered by the
HD26Forge macro. HDC is the parent; HD children are the individual events.

---

## What exists today

| Component | What it does |
|---|---|
| **HackDay Central (HDC)** | Forge app on a single Confluence "parent" page. 5-step wizard creates HD child pages. Writes `Event` + `HackdayTemplateSeed` rows to Supabase. |
| **HD26Forge** | Forge app on each HD child Confluence page. Resolves context by `pageId` from the seed. Runs the full HackDay UX (registration, teams, voting, etc.). |
| **HackCentral web app** | Convex/Clerk web app. Currently focused on hacks, teams, recognition. No creation path or HackDay registry view exists yet. |
| **Supabase shared DB** | `Event` table (`runtime_type = 'hackday_template'`, `confluence_page_id`) and `HackdayTemplateSeed` table link HDC ↔ HD26Forge. |

**Current creation flow:** Admin goes to the Confluence parent page → opens the HDC
macro → runs the 5-step wizard → child page is created with the HD26Forge macro
auto-inserted → child page is the HackDay.

**Current theme flow:** Branding (accent color, banner, theme) is set in wizard Step 4
at creation time and written into the seed. There is no post-creation admin panel to
change themes.

---

## Decisions locked

1. **Single parent.** There is one HackDay Central (one Confluence parent page per
   site). All HD children are created from it. No "choose a parent" UX needed.
2. **Creator = admin.** The user who runs the creation wizard automatically becomes
   the admin of the HD child they created.
3. **Themes = post-creation, in the child.** Theming/branding is managed by the admin
   inside the HD child (HD26Forge), not locked in at creation time. The HDC wizard
   branding step can be simplified accordingly.
4. **HackCentral web app = the hub.** The web app is where users discover, manage, and
   initiate creation of HackDays. Confluence remains the runtime (where each HackDay
   actually runs).
5. **Creation handoff for v1.** The creation wizard stays in Confluence (HDC macro) for
   v1. HackCentral web app provides the entry point and registry but delegates the
   actual create step to Confluence. Full in-app creation is deferred (Phase 3).

---

## Phase 1 — HackCentral as hub

**Goal:** HackCentral web app becomes the place to see all HackDays and kick off
creation. No new Forge work required.

### Changes — HackCentral web app (Convex/Clerk)

- Add a **"HackDays"** section to the main navigation and/or dashboard.
- Query the `Event` table where `runtime_type = 'hackday_template'` to list all HD
  children.
- Each card shows: event name, status/phase, creation date, admin, and a link to the
  child Confluence page (via `confluence_page_id`).
- Add a **"Create HackDay"** button that deep-links to the HDC Confluence parent page.
  The parent page URL is stored as a Convex environment variable or simple app setting
  (one value per site — there is only one parent page).

### No Forge changes needed in this phase.

### Phase 1 implementation (done)

- **Convex** `convex/hackdays.ts`: actions `listHackDayEvents` (reads Supabase `Event` + `HackdayTemplateSeed`) and `getConfluenceParentPageUrl` (reads env).
- **Web app**: New page `/hackdays` (nav: "HackDays"), cards for each event (name, status, admin, date, link to child Confluence page), "Create HackDay" button that opens `CONFLUENCE_HDC_PARENT_PAGE_URL`.
- **Convex env vars** (dashboard or CLI): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CONFLUENCE_HDC_PARENT_PAGE_URL` (optional), optional `SUPABASE_SCHEMA`. See **`docs/CONVEX-ENV-HACKDAYS.md`** and `npm run convex:env:set` (script reads from env).

---

## Phase 2 — Theme and admin panel in the HD child

**Goal:** The admin of each HD child can configure branding and settings post-creation
inside the child, without re-running the creation wizard.

### Changes — HD26Forge

- Add an admin-gated **Settings / Branding panel** inside the HD26Forge macro UI.
- The creator (identified by `primary_admin_email` from the seed) is the admin. They
  see a settings icon/tab that other users do not.
- Editable fields:
  - Accent color
  - Banner image URL
  - Theme mode (light / dark / system)
  - Banner message
  - Optionally: event schedule and rules
- On save, write updated values back to `HackdayTemplateSeed`. Start with the seed;
  move to a separate `EventConfig` table only if version history is needed later.
- HD26Forge already reads the seed at bootstrap — re-read on each load so admin changes
  are reflected immediately on next page load. No cache invalidation needed for v1.

### Phase 2 implementation (done)

- **Backend (HD26Forge)** `src/index.js`: `getEventPhase` returns merged branding from
  seed over event and `isEventAdmin` (current user email matches `primary_admin_email` or
  `co_admin_emails` from HackdayTemplateSeed). New resolver `updateEventBranding` (event-admin
  only) updates `HackdayTemplateSeed.seed_payload.branding` and `Event.event_branding`.
- **Frontend**: App stores `eventBranding` and `isEventAdmin` from `getEventPhase`; passes
  `onRefreshEventPhase` to refresh after save. AppLayout shows Admin nav when `isEventAdmin`.
  AdminPanel: “Branding” tab (visible only when `isEventAdmin`) with accent color, banner
  image URL, theme (light/dark/system), banner message; save calls `updateEventBranding` then
  refresh. Event admin = creator or co-admin from seed (no Supabase role required).

### HDC wizard cleanup (done)

- Step 4 (Branding) simplified to accent color only + note that full branding is set
  in the child page Admin Panel → Branding tab. Review step shows: &quot;accent … · Set
  banner/theme in child Admin Panel after creation.&quot;

---

## Phase 3 — Full creation from HackCentral web app (implemented)

**Goal:** Admin never needs to go to Confluence to create a HackDay — the whole wizard
runs inside HackCentral.

### Implemented (February 2026)

- **Forge web trigger** (`hackday-create-from-web`): Accepts POST with wizard payload +
  `creatorEmail` and optional `parentPageId`. Secured by shared secret
  (`X-HackDay-Create-Secret` header or `body.secret`). Uses `CONFLUENCE_HDC_PARENT_PAGE_ID`
  and `HACKDAY_CREATE_WEB_SECRET` in Forge env. Handler: `createFromWeb.handler`.
- **Creator identity:** No Atlassian auth bridge; the web app sends the signed-in user’s
  email (from Clerk) as `creatorEmail`. The Forge handler calls `createInstanceDraft` with
  `overrideCreatorEmail`, so the creator is resolved by email in Supabase (same domain
  rules apply).
- **Convex action** `createHackDayFromWeb`: Gets current user email from Clerk, calls the
  Forge web trigger URL with `FORGE_HACKDAY_CREATE_WEB_TRIGGER_URL` and
  `HACKDAY_CREATE_WEB_SECRET`. Requires these and optionally `CONFLUENCE_HDC_PARENT_PAGE_ID`
  in Convex env.
- **Wizard UI:** `/hackdays/create` — 5 steps (Basic, Schedule, Rules, Branding, Review).
  Submit calls the Convex action and opens the new child page URL on success.
- **HackDays hub:** "Create in app" links to `/hackdays/create`; "Or create from Confluence"
  still opens the parent page for the macro flow.

---

## Technical constraints

- **Forge owns Confluence APIs.** The web app cannot call Confluence directly. Any page
  creation must go through a Forge web trigger or the existing macro flow.
- **Page-scoped isolation.** Each HD child is tied to its Confluence page ID. This is
  the key that links everything — never reuse or reassign page IDs across events.
- **Shared Supabase DB.** HDC and HD26Forge both read/write to the same Supabase
  instance. The `HackdayTemplateSeed` row is the handshake contract between them —
  treat it as the source of truth for event config.
- **HD26Forge reads seed at bootstrap.** Changes to seed fields (theme, branding) are
  picked up on next load. No extra event bus or cache invalidation needed for v1.

---

## File and path reference

| Path | Purpose |
|---|---|
| `/Users/nickster/Downloads/HackCentral` | HDC repo (Convex web app + Forge native) |
| `/Users/nickster/Downloads/HD26Forge` | HD child runtime (Forge app + React frontend) |
| `docs/HDC-CREATE-CHILD-HACKDAY-FLOW.md` | Existing creation flow end-to-end |
| `docs/HDC-HACKDAY-TEMPLATE-SPINOUT-PLAN.md` | Architecture decisions and completion status |
| `convex/schema.ts` | Convex DB schema (HackCentral) |
| `HD26Forge/static/frontend/src/components/` | HD26Forge React components |
| `HD26Forge/src/index.js` | HD26Forge Forge backend |
