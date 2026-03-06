-- Phase 10: Event-scoped backup + restore metadata and storage bucket.

CREATE TABLE IF NOT EXISTS "EventBackupSnapshot" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  source text NOT NULL,
  scope_version text NOT NULL DEFAULT 'v1',
  storage_path text NOT NULL,
  checksum_sha256 text NOT NULL,
  db_row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ready',
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "EventBackupRestoreRun" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  snapshot_id uuid NOT NULL,
  mode text NOT NULL,
  status text NOT NULL,
  confirmation_token text,
  diff_summary jsonb,
  changes_applied jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_by_user_id text,
  confirmed_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE "EventBackupSnapshot"
  ALTER COLUMN event_id TYPE text USING event_id::text;

ALTER TABLE "EventBackupSnapshot"
  ALTER COLUMN created_by_user_id TYPE text USING created_by_user_id::text;

ALTER TABLE "EventBackupRestoreRun"
  ALTER COLUMN event_id TYPE text USING event_id::text;

ALTER TABLE "EventBackupRestoreRun"
  ALTER COLUMN requested_by_user_id TYPE text USING requested_by_user_id::text;

ALTER TABLE "EventBackupRestoreRun"
  ALTER COLUMN confirmed_by_user_id TYPE text USING confirmed_by_user_id::text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_backup_snapshot_event_fk'
  ) THEN
    ALTER TABLE "EventBackupSnapshot"
      ADD CONSTRAINT event_backup_snapshot_event_fk
      FOREIGN KEY (event_id)
      REFERENCES "Event" (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_backup_restore_run_event_fk'
  ) THEN
    ALTER TABLE "EventBackupRestoreRun"
      ADD CONSTRAINT event_backup_restore_run_event_fk
      FOREIGN KEY (event_id)
      REFERENCES "Event" (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_backup_restore_run_snapshot_fk'
  ) THEN
    ALTER TABLE "EventBackupRestoreRun"
      ADD CONSTRAINT event_backup_restore_run_snapshot_fk
      FOREIGN KEY (snapshot_id)
      REFERENCES "EventBackupSnapshot" (id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS event_backup_snapshot_event_created_idx
  ON "EventBackupSnapshot" (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS event_backup_snapshot_status_idx
  ON "EventBackupSnapshot" (status);

CREATE INDEX IF NOT EXISTS event_backup_restore_run_event_created_idx
  ON "EventBackupRestoreRun" (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS event_backup_restore_run_snapshot_idx
  ON "EventBackupRestoreRun" (snapshot_id);

ALTER TABLE "EventBackupSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventBackupRestoreRun" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "EventBackupSnapshot" FROM anon, authenticated, public;
REVOKE ALL ON TABLE "EventBackupRestoreRun" FROM anon, authenticated, public;

GRANT ALL ON TABLE "EventBackupSnapshot" TO service_role;
GRANT ALL ON TABLE "EventBackupRestoreRun" TO service_role;

DROP POLICY IF EXISTS "Service role can manage rows" ON "EventBackupSnapshot";
CREATE POLICY "Service role can manage rows"
  ON "EventBackupSnapshot"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage rows" ON "EventBackupRestoreRun";
CREATE POLICY "Service role can manage rows"
  ON "EventBackupRestoreRun"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_backup_snapshot_source_check'
  ) THEN
    ALTER TABLE "EventBackupSnapshot"
      ADD CONSTRAINT event_backup_snapshot_source_check
      CHECK (source IN ('manual', 'publish', 'predeploy', 'daily', 'pre_restore'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_backup_snapshot_status_check'
  ) THEN
    ALTER TABLE "EventBackupSnapshot"
      ADD CONSTRAINT event_backup_snapshot_status_check
      CHECK (status IN ('ready', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_backup_restore_run_mode_check'
  ) THEN
    ALTER TABLE "EventBackupRestoreRun"
      ADD CONSTRAINT event_backup_restore_run_mode_check
      CHECK (mode IN ('dry_run', 'apply'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_backup_restore_run_status_check'
  ) THEN
    ALTER TABLE "EventBackupRestoreRun"
      ADD CONSTRAINT event_backup_restore_run_status_check
      CHECK (status IN ('pending', 'succeeded', 'failed'));
  END IF;
END $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-backup-snapshots',
  'event-backup-snapshots',
  false,
  52428800,
  array['application/json', 'application/gzip']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
