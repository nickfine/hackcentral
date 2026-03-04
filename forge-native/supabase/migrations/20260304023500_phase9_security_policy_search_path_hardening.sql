-- Phase 9 security hardening (warning cleanup)
-- 1) Fix mutable search_path warnings for updated_at trigger functions.
-- 2) Move permissive Forge backend RLS policies from anon/authenticated to service_role.

-- --- Function search_path hardening ---
ALTER FUNCTION public.artifact_set_updated_at_fn() SET search_path = pg_catalog, public;
ALTER FUNCTION public.problem_set_updated_at_fn() SET search_path = pg_catalog, public;
ALTER FUNCTION public.showcase_hack_set_updated_at_fn() SET search_path = pg_catalog, public;
ALTER FUNCTION public.pathway_set_updated_at_fn() SET search_path = pg_catalog, public;
ALTER FUNCTION public.pipeline_stage_criteria_set_updated_at_fn() SET search_path = pg_catalog, public;
ALTER FUNCTION public.hackday_submission_page_link_set_updated_at_fn() SET search_path = pg_catalog, public;

-- --- RLS policy role hardening ---
ALTER POLICY "Forge backend can register users" ON public."EventRegistration"
  TO service_role;

ALTER POLICY "Forge backend can manage judge scores" ON public."JudgeScore"
  TO service_role;

ALTER POLICY "Forge backend can manage projects" ON public."Project"
  TO service_role;

ALTER POLICY "Forge backend can create teams" ON public."Team"
  TO service_role;

ALTER POLICY "Forge backend can delete teams" ON public."Team"
  TO service_role;

ALTER POLICY "Forge backend can update teams" ON public."Team"
  TO service_role;

ALTER POLICY "Forge backend can manage team invites" ON public."TeamInvite"
  TO service_role;

ALTER POLICY "Forge backend can manage team members" ON public."TeamMember"
  TO service_role;

ALTER POLICY "Forge backend can create users" ON public."User"
  TO service_role;

ALTER POLICY "Forge backend can update users by atlassian_id" ON public."User"
  TO service_role;

ALTER POLICY "Forge backend can manage votes" ON public."Vote"
  TO service_role;
