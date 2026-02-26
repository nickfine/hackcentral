ALTER TABLE IF EXISTS public."Milestone"
  ADD COLUMN IF NOT EXISTS signal text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Milestone'
  )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'milestone_signal_check'
    ) THEN
    ALTER TABLE public."Milestone"
      ADD CONSTRAINT milestone_signal_check
      CHECK (
        signal IS NULL OR signal IN ('start', 'deadline', 'ceremony', 'presentation', 'judging', 'neutral')
      );
  END IF;
END$$;
