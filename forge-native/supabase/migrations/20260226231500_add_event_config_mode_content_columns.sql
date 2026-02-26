-- Config Mode Phase 1: event-scoped content governance
-- Adds published content override storage and shared draft workspace to Event.

ALTER TABLE IF EXISTS "Event"
  ADD COLUMN IF NOT EXISTS event_content_overrides jsonb,
  ADD COLUMN IF NOT EXISTS event_config_draft jsonb;

COMMENT ON COLUMN "Event".event_content_overrides IS
  'Published participant-facing copy overrides for Config Mode (schemaVersion/version/values envelope)';

COMMENT ON COLUMN "Event".event_config_draft IS
  'Shared draft workspace for Config Mode edits before publish (schemaVersion/draftVersion/patch envelope)';
