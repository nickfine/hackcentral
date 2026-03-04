-- Phase 9 security cleanup
-- Remove "RLS Enabled No Policy" advisor infos on backend-managed tables by
-- adding explicit service_role-only RLS policies.

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
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Service role can manage rows', tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        'Service role can manage rows',
        tbl
      );
    END IF;
  END LOOP;
END $$;
