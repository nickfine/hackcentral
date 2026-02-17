ALTER TABLE IF EXISTS "Event"
  ADD COLUMN IF NOT EXISTS event_schedule jsonb;
