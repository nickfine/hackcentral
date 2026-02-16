-- HackDay Central Phase 1 (Supabase-backed multi-tenant extensions)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lifecycle_status_enum') THEN
    CREATE TYPE lifecycle_status_enum AS ENUM (
      'draft',
      'registration',
      'team_formation',
      'hacking',
      'voting',
      'results',
      'completed',
      'archived'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_source_type_enum') THEN
    CREATE TYPE project_source_type_enum AS ENUM ('hack_submission', 'project');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_admin_role_enum') THEN
    CREATE TYPE event_admin_role_enum AS ENUM ('primary', 'co_admin');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status_enum') THEN
    CREATE TYPE sync_status_enum AS ENUM ('not_started', 'in_progress', 'partial', 'failed', 'complete');
  END IF;
END$$;

ALTER TABLE IF EXISTS "Event"
  ADD COLUMN IF NOT EXISTS confluence_page_id text,
  ADD COLUMN IF NOT EXISTS confluence_page_url text,
  ADD COLUMN IF NOT EXISTS confluence_parent_page_id text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/London',
  ADD COLUMN IF NOT EXISTS lifecycle_status lifecycle_status_enum DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS hacking_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS submission_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS creation_request_id text,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Event') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'event_confluence_page_id_idx'
    ) THEN
      CREATE UNIQUE INDEX event_confluence_page_id_idx ON "Event" (confluence_page_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'event_creation_request_id_idx'
    ) THEN
      CREATE UNIQUE INDEX event_creation_request_id_idx ON "Event" (creation_request_id);
    END IF;
  END IF;
END$$;

ALTER TABLE IF EXISTS "Project"
  ADD COLUMN IF NOT EXISTS event_id uuid,
  ADD COLUMN IF NOT EXISTS source_type project_source_type_enum DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS synced_to_library_at timestamptz,
  ADD COLUMN IF NOT EXISTS hack_type text,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'org',
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS workflow_transformed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_impact_hypothesis text,
  ADD COLUMN IF NOT EXISTS ai_tools_used text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS time_saved_estimate numeric,
  ADD COLUMN IF NOT EXISTS failures_and_lessons text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS "User"
  ADD COLUMN IF NOT EXISTS atlassian_account_id text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS mentor_capacity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mentor_sessions_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS happy_to_mentor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS seeking_mentor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS capability_tags text[] DEFAULT ARRAY[]::text[];

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'user_atlassian_account_id_idx'
    ) THEN
      CREATE UNIQUE INDEX user_atlassian_account_id_idx ON "User" (atlassian_account_id);
    END IF;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "EventAdmin" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role event_admin_role_enum NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, role)
);

CREATE TABLE IF NOT EXISTS "EventSyncState" (
  event_id uuid PRIMARY KEY,
  sync_status sync_status_enum NOT NULL DEFAULT 'not_started',
  last_error text,
  last_attempt_at timestamptz,
  pushed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "EventAuditLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_admin_event_id_idx ON "EventAdmin" (event_id);
CREATE INDEX IF NOT EXISTS event_admin_user_id_idx ON "EventAdmin" (user_id);
CREATE INDEX IF NOT EXISTS event_audit_log_event_id_idx ON "EventAuditLog" (event_id);
CREATE INDEX IF NOT EXISTS project_event_id_idx ON "Project" (event_id);
CREATE INDEX IF NOT EXISTS project_source_type_idx ON "Project" (source_type);
