-- HackDay Central Phase 2 Curated Pathways baseline (R6.1-R6.4)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'pathway_step_type'
  ) THEN
    CREATE TYPE pathway_step_type AS ENUM ('read', 'try', 'build');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "Pathway" (
  id text PRIMARY KEY,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  intro_text text NOT NULL DEFAULT '',
  domain text,
  role text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  published boolean NOT NULL DEFAULT false,
  recommended boolean NOT NULL DEFAULT false,
  created_by_user_id text,
  updated_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "PathwayStep" (
  id text PRIMARY KEY,
  pathway_id text NOT NULL,
  position integer NOT NULL,
  step_type pathway_step_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  linked_hack_project_id text,
  linked_artifact_id uuid,
  external_url text,
  challenge_prompt text,
  is_optional boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "PathwayProgress" (
  id text PRIMARY KEY,
  pathway_id text NOT NULL,
  step_id text NOT NULL,
  user_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathway_created_by_user_fk'
  ) THEN
    ALTER TABLE "Pathway"
      ADD CONSTRAINT pathway_created_by_user_fk
      FOREIGN KEY (created_by_user_id)
      REFERENCES "User" (id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathway_updated_by_user_fk'
  ) THEN
    ALTER TABLE "Pathway"
      ADD CONSTRAINT pathway_updated_by_user_fk
      FOREIGN KEY (updated_by_user_id)
      REFERENCES "User" (id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathway_step_pathway_fk'
  ) THEN
    ALTER TABLE "PathwayStep"
      ADD CONSTRAINT pathway_step_pathway_fk
      FOREIGN KEY (pathway_id)
      REFERENCES "Pathway" (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathway_step_hack_fk'
  ) THEN
    ALTER TABLE "PathwayStep"
      ADD CONSTRAINT pathway_step_hack_fk
      FOREIGN KEY (linked_hack_project_id)
      REFERENCES "Project" (id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathway_step_artifact_fk'
  ) THEN
    ALTER TABLE "PathwayStep"
      ADD CONSTRAINT pathway_step_artifact_fk
      FOREIGN KEY (linked_artifact_id)
      REFERENCES "Artifact" (id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathway_progress_pathway_fk'
  ) THEN
    ALTER TABLE "PathwayProgress"
      ADD CONSTRAINT pathway_progress_pathway_fk
      FOREIGN KEY (pathway_id)
      REFERENCES "Pathway" (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathway_progress_step_fk'
  ) THEN
    ALTER TABLE "PathwayProgress"
      ADD CONSTRAINT pathway_progress_step_fk
      FOREIGN KEY (step_id)
      REFERENCES "PathwayStep" (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathway_progress_user_fk'
  ) THEN
    ALTER TABLE "PathwayProgress"
      ADD CONSTRAINT pathway_progress_user_fk
      FOREIGN KEY (user_id)
      REFERENCES "User" (id)
      ON DELETE CASCADE;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS pathway_step_pathway_position_idx
  ON "PathwayStep" (pathway_id, position);

CREATE UNIQUE INDEX IF NOT EXISTS pathway_progress_unique_completion_idx
  ON "PathwayProgress" (pathway_id, step_id, user_id);

CREATE INDEX IF NOT EXISTS pathway_domain_role_idx
  ON "Pathway" (domain, role);

CREATE INDEX IF NOT EXISTS pathway_published_recommended_idx
  ON "Pathway" (published, recommended);

CREATE INDEX IF NOT EXISTS pathway_step_pathway_idx
  ON "PathwayStep" (pathway_id);

CREATE INDEX IF NOT EXISTS pathway_progress_user_idx
  ON "PathwayProgress" (user_id);

DO $$
BEGIN
  CREATE OR REPLACE FUNCTION pathway_set_updated_at_fn()
  RETURNS trigger AS $inner$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $inner$ LANGUAGE plpgsql;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'pathway_set_updated_at'
  ) THEN
    CREATE TRIGGER pathway_set_updated_at
    BEFORE UPDATE ON "Pathway"
    FOR EACH ROW
    EXECUTE FUNCTION pathway_set_updated_at_fn();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'pathway_step_set_updated_at'
  ) THEN
    CREATE TRIGGER pathway_step_set_updated_at
    BEFORE UPDATE ON "PathwayStep"
    FOR EACH ROW
    EXECUTE FUNCTION pathway_set_updated_at_fn();
  END IF;
END$$;
