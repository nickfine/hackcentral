-- HackDay Central Phase 3 extraction state (R11.1-R11.2)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "HackdayExtractionPrompt" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  participant_user_id text NOT NULL,
  lifecycle_status text NOT NULL,
  policy_version text NOT NULL DEFAULT 'r11-extraction-v1',
  prompted_at timestamptz NOT NULL DEFAULT now(),
  notify_participants boolean NOT NULL DEFAULT true,
  created_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "HackdayExtractionImport" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  source_project_id text NOT NULL,
  imported_project_id text NOT NULL,
  policy_version text NOT NULL DEFAULT 'r11-extraction-v1',
  imported_at timestamptz NOT NULL DEFAULT now(),
  notify_participants boolean NOT NULL DEFAULT true,
  imported_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hackday_extraction_prompt_unique_scope'
  ) THEN
    ALTER TABLE "HackdayExtractionPrompt"
      ADD CONSTRAINT hackday_extraction_prompt_unique_scope
      UNIQUE (event_id, participant_user_id, lifecycle_status, policy_version);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hackday_extraction_import_unique_scope'
  ) THEN
    ALTER TABLE "HackdayExtractionImport"
      ADD CONSTRAINT hackday_extraction_import_unique_scope
      UNIQUE (event_id, source_project_id, policy_version);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hackday_extraction_prompt_event_fk'
  ) THEN
    ALTER TABLE "HackdayExtractionPrompt"
      ADD CONSTRAINT hackday_extraction_prompt_event_fk
      FOREIGN KEY (event_id)
      REFERENCES "Event" (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hackday_extraction_import_event_fk'
  ) THEN
    ALTER TABLE "HackdayExtractionImport"
      ADD CONSTRAINT hackday_extraction_import_event_fk
      FOREIGN KEY (event_id)
      REFERENCES "Event" (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hackday_extraction_import_source_project_fk'
  ) THEN
    ALTER TABLE "HackdayExtractionImport"
      ADD CONSTRAINT hackday_extraction_import_source_project_fk
      FOREIGN KEY (source_project_id)
      REFERENCES "Project" (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hackday_extraction_import_imported_project_fk'
  ) THEN
    ALTER TABLE "HackdayExtractionImport"
      ADD CONSTRAINT hackday_extraction_import_imported_project_fk
      FOREIGN KEY (imported_project_id)
      REFERENCES "Project" (id)
      ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS hackday_extraction_prompt_event_idx
  ON "HackdayExtractionPrompt" (event_id);

CREATE INDEX IF NOT EXISTS hackday_extraction_prompt_participant_idx
  ON "HackdayExtractionPrompt" (participant_user_id);

CREATE INDEX IF NOT EXISTS hackday_extraction_import_event_idx
  ON "HackdayExtractionImport" (event_id);

CREATE INDEX IF NOT EXISTS hackday_extraction_import_source_idx
  ON "HackdayExtractionImport" (source_project_id);

CREATE INDEX IF NOT EXISTS hackday_extraction_import_imported_idx
  ON "HackdayExtractionImport" (imported_project_id);
