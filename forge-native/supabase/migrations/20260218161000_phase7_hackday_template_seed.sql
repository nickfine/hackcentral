ALTER TABLE IF EXISTS "Event"
  ADD COLUMN IF NOT EXISTS runtime_type text,
  ADD COLUMN IF NOT EXISTS template_target text;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Event') THEN
    UPDATE "Event"
    SET runtime_type = 'hdc_native'
    WHERE runtime_type IS NULL;

    ALTER TABLE "Event"
      ALTER COLUMN runtime_type SET DEFAULT 'hdc_native';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Event')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'event_runtime_type_check'
    ) THEN
    ALTER TABLE "Event"
      ADD CONSTRAINT event_runtime_type_check
      CHECK (runtime_type IN ('hdc_native', 'hackday_template'));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Event')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'event_template_target_check'
    ) THEN
    ALTER TABLE "Event"
      ADD CONSTRAINT event_template_target_check
      CHECK (template_target IS NULL OR template_target IN ('hackday'));
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "HackdayTemplateSeed" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confluence_page_id text NOT NULL,
  confluence_parent_page_id text NOT NULL,
  hdc_event_id text NOT NULL,
  template_name text NOT NULL,
  primary_admin_email text NOT NULL,
  co_admin_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  seed_payload jsonb NOT NULL,
  hackday_event_id text,
  provision_status text NOT NULL DEFAULT 'provisioned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  initialized_at timestamptz,
  CONSTRAINT hackday_template_seed_page_id_unique UNIQUE (confluence_page_id),
  CONSTRAINT hackday_template_seed_provision_status_check
    CHECK (provision_status IN ('provisioned', 'initialized', 'failed'))
);

CREATE INDEX IF NOT EXISTS hackday_template_seed_hdc_event_id_idx
  ON "HackdayTemplateSeed" (hdc_event_id);

CREATE INDEX IF NOT EXISTS hackday_template_seed_provision_status_idx
  ON "HackdayTemplateSeed" (provision_status);

CREATE INDEX IF NOT EXISTS event_runtime_type_idx
  ON "Event" (runtime_type);
