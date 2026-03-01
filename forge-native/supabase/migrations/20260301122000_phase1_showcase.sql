-- HackDay Central Phase 1 Showcase (R4.1-R4.4)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "ShowcaseHack" (
  project_id text PRIMARY KEY,
  featured boolean NOT NULL DEFAULT false,
  demo_url text,
  team_members text[] NOT NULL DEFAULT ARRAY[]::text[],
  source_event_id text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  linked_artifact_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  context text,
  limitations text,
  risk_notes text,
  source_repo_url text,
  created_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'showcase_hack_project_fk'
  ) THEN
    ALTER TABLE "ShowcaseHack"
      ADD CONSTRAINT showcase_hack_project_fk
      FOREIGN KEY (project_id)
      REFERENCES "Project" (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'showcase_hack_source_event_fk'
  ) THEN
    ALTER TABLE "ShowcaseHack"
      ADD CONSTRAINT showcase_hack_source_event_fk
      FOREIGN KEY (source_event_id)
      REFERENCES "Event" (id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'showcase_hack_created_by_user_fk'
  ) THEN
    ALTER TABLE "ShowcaseHack"
      ADD CONSTRAINT showcase_hack_created_by_user_fk
      FOREIGN KEY (created_by_user_id)
      REFERENCES "User" (id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS showcase_hack_featured_idx ON "ShowcaseHack" (featured);
CREATE INDEX IF NOT EXISTS showcase_hack_source_event_id_idx ON "ShowcaseHack" (source_event_id);
CREATE INDEX IF NOT EXISTS showcase_hack_created_at_idx ON "ShowcaseHack" (created_at DESC);
CREATE INDEX IF NOT EXISTS showcase_hack_tags_gin_idx ON "ShowcaseHack" USING gin (tags);

DO $$
BEGIN
  CREATE OR REPLACE FUNCTION showcase_hack_set_updated_at_fn()
  RETURNS trigger AS $inner$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $inner$ LANGUAGE plpgsql;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'showcase_hack_set_updated_at'
  ) THEN
    CREATE TRIGGER showcase_hack_set_updated_at
    BEFORE UPDATE ON "ShowcaseHack"
    FOR EACH ROW
    EXECUTE FUNCTION showcase_hack_set_updated_at_fn();
  END IF;
END$$;

INSERT INTO "ShowcaseHack" (
  project_id,
  featured,
  source_event_id,
  created_by_user_id
)
SELECT
  p.id,
  false,
  p.event_id,
  p.owner_id
FROM "Project" p
WHERE p.source_type = 'hack_submission'
ON CONFLICT (project_id) DO NOTHING;
