# HDC Event Backup & Restore Runbook (v1)

## Purpose

Protect HackDay content from in-flight development changes by taking event-scoped snapshots and enabling controlled restore.

## Scope

- Backup scope version: `v1`
- Data scope: one `Event` and its linked runtime rows (`EventAdmin`, `EventSyncState`, `Milestone`, `Project`, `Team`, `TeamMember`, `EventRegistration`, `Vote`, `JudgeScore`, `TeamInvite`, `HackdaySubmissionPageLink`, `ShowcaseHack`, `HackdayTemplateSeed`, extraction prompt/import tables, `EventAuditLog`).
- Confluence scope: event-owned page storage bodies (event page, showcase pages, submission pages, linked output pages).

## Storage + Metadata

- Metadata tables:
  - `EventBackupSnapshot` (immutable snapshot metadata)
  - `EventBackupRestoreRun` (dry-run/apply run records)
- Snapshot blobs:
  - Supabase Storage bucket: `event-backup-snapshots` (private)
  - Payload format: gzipped JSON + SHA-256 checksum validation.
- Retention:
  - Keep snapshots for `90` days
  - Keep latest `200` snapshots per event
  - Manual snapshots are retained within retention window.

## Snapshot Sources

- `manual`: Admin-triggered from runtime config panel.
- `publish`: Auto snapshot before `publishEventConfigDraft`.
- `predeploy`: Pre-production deploy guardrail command.
- `daily`: Scheduled Forge trigger sweep of active events.
- `pre_restore`: Auto snapshot immediately before restore apply.

## Restore Workflow

1. Platform admin runs dry-run preview for a selected snapshot.
2. System records `EventBackupRestoreRun` (`mode=dry_run`) with diff summary and confirmation token.
3. Platform admin confirms apply using the dry-run run id + confirmation token.
4. System creates `pre_restore` snapshot.
5. System applies deterministic restore order:
   - `Event` core
   - admin/sync/milestones
   - teams/members/projects
   - remaining event-scoped linked tables
   - Confluence page storage bodies
6. System records `EventBackupRestoreRun` (`mode=apply`) with applied change counts and warnings.

## Authority Rules

- Event admins:
  - can create manual snapshots
  - can view backup health/list.
- Platform admins only:
  - can run dry-run restore preview
  - can apply restore.

## Failure Handling

- Snapshot failures emit telemetry `event_backup_snapshot_failed` and fail fast.
- Restore failures emit telemetry `event_backup_restore_failed`.
- Confluence page restore failures do not abort DB restore; warnings are persisted on restore run.
- If a snapshot page no longer exists, restore records warning and continues.

## Rollback Behavior

- Every restore apply automatically creates a `pre_restore` snapshot.
- Rollback path is a follow-up restore apply to that `pre_restore` snapshot after dry-run confirmation.

## Operational Commands

Predeploy backup sweep (writes JSON + Markdown artifact under `docs/artifacts/`):

```bash
npm run qa:backup:predeploy-snapshot -- --apply --environment production --site hackdaytemp.atlassian.net
```

Dry-run predeploy sweep:

```bash
npm run qa:backup:predeploy-snapshot -- --dry-run --environment production --site hackdaytemp.atlassian.net
```

Target a single event:

```bash
npm run qa:backup:predeploy-snapshot -- --apply --event-id <event-id>
```

## Evidence Trail

- Keep generated backup/restore artifacts in `docs/artifacts/`.
- For incident recovery, attach:
  - predeploy backup artifact
  - dry-run diff summary
  - apply run summary (including warnings and `preRestoreSnapshotId`).
