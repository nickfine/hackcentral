# Creating a Child HackDay App from HackCentral

**Purpose:** End-to-end flow for creating a child HackDay instance from the master HackCentral (HDC) app. The child runs the HD26Forge macro and is page-scoped.

---

## Prerequisites

1. **Confluence site** with both apps installed:
   - **HackCentral** (HackDay Central macro)
   - **HD26Forge** (HackDay custom UI macro)

2. **HDC Forge environment variables** (production) set for the HackCentral app:
   - `HACKDAY_TEMPLATE_APP_ID` — HD26Forge app ARI
   - `HACKDAY_TEMPLATE_ENVIRONMENT_ID` — HD26Forge environment (e.g. production)
   - `HACKDAY_TEMPLATE_MACRO_KEY` — HD26Forge macro key (e.g. `hackday-2026-customui`)

   Without these, the child page is still created and the Event/seed rows are written, but the **child page will not contain the HD26Forge macro** (you’d have to add it manually).

3. **Supabase** (shared by HDC and HD26Forge):
   - `Event` table (with `runtime_type`, `template_target`, `confluence_page_id`, etc.)
   - `HackdayTemplateSeed` table (migration `20260218161000_phase7_hackday_template_seed.sql`)

4. **Parent page:** A Confluence page that has the **HackCentral** macro and is **not** already an event instance (i.e. no `Event` row has this page’s ID as `confluence_page_id`). That page is the “parent”; its ID is used as `parentPageId` when creating children.

---

## User flow (basic functionality)

1. **Open the parent page**  
   Navigate to the Confluence page that will act as “HackDay Central” for this space (e.g. “HackDay Central” or “Our HackDays”). Ensure the **HackDay Central** macro is on the page.

2. **Confirm parent mode**  
   The HDC macro should show “Parent page mode” and the section **“Create HackDay template instance”** with the 5-step wizard (Basic → Schedule → Rules → Branding → Review). If you see “Instance page mode” and an event name instead, this page is already an event instance; use a different page as parent or create a new Confluence page and add the HDC macro.

3. **Fill the wizard**
   - **Step 1 – Basic:** Event name (required), icon, primary admin email, co-admins, tagline.
   - **Step 2 – Schedule:** Timezone and date/time fields (registration, team formation, hacking, submission, voting, results).
   - **Step 3 – Rules:** Team size, mentoring, submission requirements, judging model, categories, prizes.
   - **Step 4 – Branding:** Banner message, accent color, theme preference, banner image URL.
   - **Step 5 – Review:** Confirm and click **Create Instance**.

4. **Create the instance**  
   Click **Create Instance**. The backend:
   - Creates a **Confluence child page** under the current (parent) page, with the HD26Forge macro if env vars are set.
   - Creates an **Event** row (HDC registry) with `confluence_page_id` = child page ID, `runtime_type = 'hackday_template'`, `template_target = 'hackday'`.
   - Creates a **HackdayTemplateSeed** row linking the child page to the event and seed payload.

5. **Open the child page**  
   You are redirected to the new child page (or you can open it from the Registry list). The **HD26Forge** macro loads and:
   - Resolves context by `pageId` → finds `HackdayTemplateSeed` → creates or reuses an **Event** row in the shared DB (HD26Forge bootstrap from seed) → returns phase/branding etc. for `getEventPhase`.
   - The child page shows the HackDay UI (registration, teams, submission, voting, etc.) for that event only (page-scoped).

---

## Backend flow (reference)

| Step | Component | Action |
|------|------------|--------|
| 1 | HDC macro | `hdcGetContext(pageId)` → no Event for this pageId → `pageType: 'parent'`, wizard shown. |
| 2 | User | Completes wizard, clicks Create Instance. |
| 3 | HDC macro | `hdcCreateInstanceDraft(payload)` with `instanceRuntime: 'hackday_template'`, `templateTarget: 'hackday'`, `parentPageId: context.pageId`. |
| 4 | HDC backend | `createChildPageUnderParent()` → Confluence API creates child page (optionally with HD macro from env). |
| 5 | HDC backend | `repository.createEvent(...)` → Event row with `confluence_page_id = childPageId`. |
| 6 | HDC backend | `repository.createHackdayTemplateSeed(...)` → seed row for child page. |
| 7 | HDC macro | Redirects to `childPageUrl`. |
| 8 | HD26Forge macro | On load, `getEventPhase` → `resolveInstanceContext(pageId)` → `getTemplateSeedByPageId` → `createEventFromTemplateSeed` if needed → returns event/phase. |

---

## Verification checklist (basic flow)

- [ ] **Parent page:** Confluence page with HDC macro shows “Create HackDay template instance” (parent mode).
- [ ] **Create:** Fill wizard, click Create Instance; no error; message shows child page id and “provisioned”.
- [ ] **Redirect:** Browser navigates to child page (or open child from Registry).
- [ ] **Child page:** HD26Forge macro loads (no “extension error” banner); event name/phase visible.
- [ ] **DB:** `Event` row with `confluence_page_id = child pageId`, `runtime_type = 'hackday_template'`; `HackdayTemplateSeed` row with same `confluence_page_id`, `provision_status` moves to `initialized` after first HD26 load.

---

## Troubleshooting

| Symptom | Check |
|--------|--------|
| No “Create HackDay template instance” section | This page may be an instance (Event exists with this pageId). Use a different page or create a new one and add the HDC macro. |
| “Could not determine Confluence page id” | Macro context: Forge bridge must provide `extension.content.id` or `extension.page.id` (ensure macro is on a Confluence page). |
| “Missing required Forge variables for HackDay templates” | Set `HACKDAY_TEMPLATE_APP_ID`, `HACKDAY_TEMPLATE_ENVIRONMENT_ID`, `HACKDAY_TEMPLATE_MACRO_KEY` for the HDC app in the target environment. |
| Child page has no HackDay UI | Env vars above not set, or HD26Forge app not installed on the site. Add macro manually or set vars and re-create. |
| Child page shows wrong event / no event | Check `HackdayTemplateSeed` and `Event` for that `confluence_page_id`; HD26Forge resolves by pageId only. |

---

## Related docs

- `HDC-HACKDAY-TEMPLATE-SPINOUT-PLAN.md` — Architecture and completion status
- `HDC-HACKDAY-TEMPLATE-OPS-RUNBOOK.md` — Ops and verification commands
- `HDC-HACKDAY-TEMPLATE-RELEASE-CHECKLIST.md` — Release gates
