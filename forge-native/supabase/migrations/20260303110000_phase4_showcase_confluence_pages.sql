-- HackDay Central Phase 4 Showcase Confluence page linkage

ALTER TABLE "ShowcaseHack"
  ADD COLUMN IF NOT EXISTS confluence_page_id text;

ALTER TABLE "ShowcaseHack"
  ADD COLUMN IF NOT EXISTS confluence_page_url text;

ALTER TABLE "ShowcaseHack"
  ADD COLUMN IF NOT EXISTS output_page_ids text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE "ShowcaseHack"
SET output_page_ids = ARRAY[]::text[]
WHERE output_page_ids IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS showcase_hack_confluence_page_id_uq
  ON "ShowcaseHack" (confluence_page_id)
  WHERE confluence_page_id IS NOT NULL;
