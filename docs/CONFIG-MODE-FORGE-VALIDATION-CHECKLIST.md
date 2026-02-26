# Config Mode Phase 1 — Forge-Hosted Validation Checklist

## Purpose

This checklist validates the **Phase 1 Config Mode pilot** in a real Forge-hosted HackDay page after applying the database migration.

Phase 1 scope covered:
- Branding draft/publish (accent/theme/banner fields)
- Dashboard MOTD draft/publish (title/body/priority)
- Rules subtitle + General Rules copy overrides (pilot allowlist)
- Admin-only access to Config Mode
- Draft/Publish/Discard behavior

---

## Preconditions

- HD26Forge source changes are available locally (Config Mode Phase 1 implementation)
- HackCentral migration file is present:
  - `/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260226231500_add_event_config_mode_content_columns.sql`
- You have access to the **schema-owning Supabase project/environment** for the shared HackDay database
- You have access to a Confluence page running the HD26Forge macro against a test event/instance
- You have at least:
  - one platform admin account
  - one non-admin participant account for validation

---

## 1. Apply DB Migration (Schema Owner Environment)

### Migration to apply
- `/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260226231500_add_event_config_mode_content_columns.sql`

### Expected schema change
Adds nullable JSONB columns to `Event`:
- `event_content_overrides`
- `event_config_draft`

### Apply options (choose your normal workflow)

#### Option A: Supabase CLI migration push (preferred if this repo is bound to the target project)
Run from `/Users/nickster/Downloads/HackCentral/forge-native`:

```bash
supabase db push
```

#### Option B: Execute SQL directly in the target Supabase SQL editor
Copy/run the SQL from:
- `/Users/nickster/Downloads/HackCentral/forge-native/supabase/migrations/20260226231500_add_event_config_mode_content_columns.sql`

### Verify migration applied
Run in SQL editor:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'Event'
  and column_name in ('event_content_overrides', 'event_config_draft');
```

Expected:
- both columns present
- `data_type = jsonb`

---

## 2. Build + Deploy HD26Forge (Production Environment)

Run from `/Users/nickster/Downloads/HD26Forge`:

### Build frontend bundle
```bash
npm run build:frontend
```

### Deploy Forge app (explicit production)
```bash
forge deploy --environment production --no-verify
```

Note:
- Repo continuity docs require explicit production deploy flags.

---

## 3. Open Forge-Hosted HackDay Page (Admin Account)

Use a Confluence page backed by a HackDay instance (preferably a safe test event).

### Confirm baseline
- Page loads successfully
- Admin Panel is accessible
- Rules page renders normally
- Dashboard renders normally

### Confirm Config Mode capability exposure
- Navigate to **Admin Panel**
- Verify **Config Mode (Phase 1 Pilot)** card is visible
- Verify buttons:
  - `Enter Config Mode`
  - `Open Dashboard`
  - `Open Rules`

If missing:
- Confirm account is platform admin OR event creator/co-admin
- Confirm app deploy succeeded
- Check Forge logs for resolver errors

---

## 4. Admin Access / Permission Checks

### Admin user (should pass)
- `Enter Config Mode` button visible
- Config toolbar visible after entering mode
- Can open side panel
- Inline edit affordances visible on Rules subtitle / pilot rule descriptions / dashboard message pod

### Non-admin participant (should fail)
- No Config Mode entry in Admin Panel (or Admin Panel blocked entirely)
- No Config toolbar
- No inline edit affordances
- Participant only sees published content

---

## 5. Rules Copy Flow (Draft + Publish)

### Draft flow
1. Enter Config Mode
2. Open Rules page
3. Edit `Rules Header Subtitle`
4. Edit at least one General Rules pilot description (e.g., `Time Limit`)
5. Verify toolbar status becomes `Unsaved changes`
6. Click `Save Draft`
7. Verify toolbar status becomes `Draft ready` (or saved state)

### Publish flow
1. Click `Publish`
2. Verify no error shown
3. Verify toolbar returns to saved state
4. Exit Config Mode
5. Confirm edited Rules copy is still visible (published)

### Draft isolation check
- Repeat edit but **do not publish**
- Open page as non-admin (or separate browser session)
- Confirm non-admin sees only last **published** copy, not draft copy

---

## 6. Dashboard MOTD Flow (Draft + Publish)

### Draft flow
1. Enter Config Mode
2. On Dashboard, verify `Admin Update` pod appears (even if empty)
3. Edit message title inline
4. Edit message body inline
5. Change priority via side panel (`Info` -> `Warning` or `Urgent`)
6. Click `Save Draft`

### Publish flow
1. Click `Publish`
2. Exit Config Mode
3. Confirm Dashboard shows published `Admin Update` pod content
4. Confirm priority styling/label matches selected priority

### Hide pod behavior
1. Re-enter Config Mode
2. Clear dashboard message body
3. Save Draft -> Publish
4. Exit Config Mode
5. Confirm message pod is hidden (or empty-state behavior matches expected UX)

---

## 7. Branding Draft/Publish Flow (Phase 1)

Use Admin Panel `Branding` tab and/or Config side panel fields.

### Draft flow
1. Enter Config Mode
2. Change one or more branding fields:
   - accent color
   - theme preference
   - banner message (if banner surface is visible on your event page)
3. Save Draft
4. Verify no participant-facing changes are live until Publish

### Publish flow
1. Publish draft
2. Confirm branding changes apply in expected UI surfaces
3. Refresh page and confirm persistence

Notes:
- Some branding fields may only affect specific surfaces or load boundaries.
- Theme preference may require page refresh depending on existing theme provider behavior.

---

## 8. Draft Management / Concurrency Checks

### Discard draft
1. Enter Config Mode
2. Make a visible Rules copy edit
3. Save Draft
4. Click `Discard`
5. Confirm draft changes revert to published values in preview

### Basic concurrency (manual)
1. Open same admin page in two browser windows as admin
2. In Window A: make edit, `Save Draft`
3. In Window B: make different edit, `Save Draft`
4. Confirm conflict/error is surfaced (Phase 1 expected behavior)
5. Reload Window B and retry

---

## 9. Database Verification (Post-Publish)

Run SQL checks after publishing changes.

### Confirm published content overrides persisted
```sql
select id, event_content_overrides
from "Event"
where id = '<event-id>';
```

Expected:
- `event_content_overrides` contains envelope with:
  - `schemaVersion`
  - `version`
  - `updatedAt`
  - `updatedBy`
  - `values` map including edited Rules keys

### Confirm draft cleared after publish
```sql
select id, event_config_draft
from "Event"
where id = '<event-id>';
```

Expected:
- `event_config_draft` is `null` after successful publish

### Confirm draft persists when saved but not published
- Save Draft without Publish, then rerun query above
- Expected: `event_config_draft` contains envelope with `draftVersion` and `patch`

---

## 10. Forge Logs / Diagnostics (If Something Fails)

From `/Users/nickster/Downloads/HD26Forge`:

```bash
forge logs --environment production
```

Look for resolver entries/errors related to:
- `getEventConfigModeState`
- `saveEventConfigDraft`
- `publishEventConfigDraft`
- `discardEventConfigDraft`

Common failure causes:
- missing DB columns (migration not applied)
- non-admin permissions
- seed/event context not resolvable for the Confluence page
- invalid draft payload (unexpected keys or lengths)

---

## 11. Acceptance Signoff (Phase 1 Production Validation)

Mark complete when all are true:
- [ ] Admin can enter Config Mode in Forge-hosted app
- [ ] Non-admin cannot access Config Mode editing
- [ ] Rules pilot fields support draft/save/publish/discard
- [ ] Dashboard MOTD supports draft/save/publish/discard
- [ ] Branding pilot fields support draft/save/publish
- [ ] Draft changes are hidden from participants until publish
- [ ] Published changes persist after refresh/reload
- [ ] `event_content_overrides` writes are visible in DB
- [ ] `event_config_draft` is cleared on publish and retained on saved draft
- [ ] No blocking resolver errors in Forge logs

---

## Follow-up (Next Recommended Engineering Step)

After this checklist passes in Forge-hosted production/staging:
1. Add backend resolver tests for:
   - draft version conflicts
   - invalid content override keys
   - publish with partial apply failures
   - permission checks (admin vs event admin vs participant)
2. Expand Phase 1 telemetry instrumentation (`config_mode_enabled`, draft/publish events)
