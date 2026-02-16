-- HackDay Central Phase 2 (wizard rules + branding persistence)

ALTER TABLE IF EXISTS "Event"
  ADD COLUMN IF NOT EXISTS event_rules jsonb,
  ADD COLUMN IF NOT EXISTS event_branding jsonb;
