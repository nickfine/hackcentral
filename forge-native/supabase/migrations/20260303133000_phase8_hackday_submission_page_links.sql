-- HackDay Central Phase 8: runtime submission page linkage

CREATE TABLE IF NOT EXISTS "HackdaySubmissionPageLink" (
  project_id text PRIMARY KEY,
  event_id text,
  team_id text,
  submission_page_id text UNIQUE,
  submission_page_url text,
  output_page_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hackday_submission_page_link_project_fk'
  ) THEN
    ALTER TABLE "HackdaySubmissionPageLink"
      ADD CONSTRAINT hackday_submission_page_link_project_fk
      FOREIGN KEY (project_id)
      REFERENCES "Project" (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hackday_submission_page_link_event_fk'
  ) THEN
    ALTER TABLE "HackdaySubmissionPageLink"
      ADD CONSTRAINT hackday_submission_page_link_event_fk
      FOREIGN KEY (event_id)
      REFERENCES "Event" (id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hackday_submission_page_link_team_fk'
  ) THEN
    ALTER TABLE "HackdaySubmissionPageLink"
      ADD CONSTRAINT hackday_submission_page_link_team_fk
      FOREIGN KEY (team_id)
      REFERENCES "Team" (id)
      ON DELETE SET NULL;
  END IF;
END$$;

UPDATE "HackdaySubmissionPageLink"
SET output_page_ids = ARRAY[]::text[]
WHERE output_page_ids IS NULL;

CREATE INDEX IF NOT EXISTS hackday_submission_page_link_event_idx ON "HackdaySubmissionPageLink" (event_id);
CREATE INDEX IF NOT EXISTS hackday_submission_page_link_team_idx ON "HackdaySubmissionPageLink" (team_id);

DO $$
BEGIN
  CREATE OR REPLACE FUNCTION hackday_submission_page_link_set_updated_at_fn()
  RETURNS trigger AS $inner$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $inner$ LANGUAGE plpgsql;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'hackday_submission_page_link_set_updated_at'
  ) THEN
    CREATE TRIGGER hackday_submission_page_link_set_updated_at
    BEFORE UPDATE ON "HackdaySubmissionPageLink"
    FOR EACH ROW
    EXECUTE FUNCTION hackday_submission_page_link_set_updated_at_fn();
  END IF;
END$$;
