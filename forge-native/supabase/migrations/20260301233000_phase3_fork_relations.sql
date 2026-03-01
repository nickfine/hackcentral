-- HackDay Central Phase 3 Fork/Remix attribution (R10.1-R10.2)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "ForkRelation" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  source_id text NOT NULL,
  fork_id text NOT NULL,
  source_owner_user_id text,
  forked_by_user_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fork_relation_entity_type_chk CHECK (entity_type IN ('project', 'artifact'))
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fork_relation_unique_source_fork'
  ) THEN
    ALTER TABLE "ForkRelation"
      ADD CONSTRAINT fork_relation_unique_source_fork
      UNIQUE (entity_type, source_id, fork_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fork_relation_source_owner_user_fk'
  ) THEN
    ALTER TABLE "ForkRelation"
      ADD CONSTRAINT fork_relation_source_owner_user_fk
      FOREIGN KEY (source_owner_user_id)
      REFERENCES "User" (id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fork_relation_forked_by_user_fk'
  ) THEN
    ALTER TABLE "ForkRelation"
      ADD CONSTRAINT fork_relation_forked_by_user_fk
      FOREIGN KEY (forked_by_user_id)
      REFERENCES "User" (id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS fork_relation_entity_source_idx ON "ForkRelation" (entity_type, source_id);
CREATE INDEX IF NOT EXISTS fork_relation_entity_created_idx ON "ForkRelation" (entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS fork_relation_fork_id_idx ON "ForkRelation" (fork_id);
