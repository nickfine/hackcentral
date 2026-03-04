-- Phase 9 security hardening
-- Goal: close "RLS Disabled in Public" exposures for backend-managed tables.
-- Strategy:
--   1) Enable RLS on exposed tables.
--   2) Revoke anon/authenticated table privileges on those tables.
--   3) Ensure service_role retains full access for Forge backend service-key operations.

DO $$
DECLARE
  tbl text;
  target_tables text[] := ARRAY[
    'Artifact',
    'ArtifactReuse',
    'EventAdmin',
    'EventAuditLog',
    'EventSyncState',
    'ForkRelation',
    'HackdayExtractionImport',
    'HackdayExtractionPrompt',
    'HackdaySubmissionPageLink',
    'HackdayTemplateSeed',
    'Pathway',
    'PathwayProgress',
    'PathwayStep',
    'PipelineStageCriteria',
    'PipelineTransitionLog',
    'Problem',
    'ProblemFlag',
    'ProblemModerationLog',
    'ProblemStatusHistory',
    'ProblemVote',
    'ShowcaseHack'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', tbl);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated', tbl);
      EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', tbl);
    END IF;
  END LOOP;
END $$;
