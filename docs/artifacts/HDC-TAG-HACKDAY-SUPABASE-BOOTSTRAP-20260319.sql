-- Bootstrap the dedicated tag-hackday Supabase project to the live HackDay/HDC
-- core schema expected by HackCentral and HD26Forge.
--
-- Target project ref: easooezlgwbiiqqlpvpb
-- Generated from live production schema inspection on 2026-03-19.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.judge_scores CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.milestones CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.verification_tokens CASCADE;

DROP TYPE IF EXISTS public."TeamMemberStatus" CASCADE;
DROP TYPE IF EXISTS public."TeamMemberRole" CASCADE;
DROP TYPE IF EXISTS public."UserRole" CASCADE;
DROP TYPE IF EXISTS public."EventPhase" CASCADE;

DROP TABLE IF EXISTS public."HackdaySubmissionPageLink" CASCADE;
DROP TABLE IF EXISTS public."HackdayTemplateSeed" CASCADE;
DROP TABLE IF EXISTS public."Notification" CASCADE;
DROP TABLE IF EXISTS public."TeamInvite" CASCADE;
DROP TABLE IF EXISTS public."EventAuditLog" CASCADE;
DROP TABLE IF EXISTS public."EventSyncState" CASCADE;
DROP TABLE IF EXISTS public."EventAdmin" CASCADE;
DROP TABLE IF EXISTS public."Vote" CASCADE;
DROP TABLE IF EXISTS public."JudgeScore" CASCADE;
DROP TABLE IF EXISTS public."Project" CASCADE;
DROP TABLE IF EXISTS public."TeamMember" CASCADE;
DROP TABLE IF EXISTS public."Team" CASCADE;
DROP TABLE IF EXISTS public."Milestone" CASCADE;
DROP TABLE IF EXISTS public."EventRegistration" CASCADE;
DROP TABLE IF EXISTS public."Event" CASCADE;
DROP TABLE IF EXISTS public."User" CASCADE;
DROP TABLE IF EXISTS public."VerificationToken" CASCADE;
DROP TABLE IF EXISTS public."Session" CASCADE;
DROP TABLE IF EXISTS public."Account" CASCADE;

DROP TYPE IF EXISTS public."TrackSide" CASCADE;
DROP TYPE IF EXISTS public."MemberStatus" CASCADE;
DROP TYPE IF EXISTS public."MemberRole" CASCADE;
DROP TYPE IF EXISTS public.lifecycle_status_enum CASCADE;
DROP TYPE IF EXISTS public.project_source_type_enum CASCADE;
DROP TYPE IF EXISTS public.event_admin_role_enum CASCADE;
DROP TYPE IF EXISTS public.sync_status_enum CASCADE;

CREATE TYPE public."EventPhase" AS ENUM (
  'SETUP',
  'REGISTRATION',
  'TEAM_FORMATION',
  'HACKING',
  'SUBMISSION',
  'VOTING',
  'JUDGING',
  'RESULTS'
);

CREATE TYPE public."UserRole" AS ENUM (
  'USER',
  'JUDGE',
  'ADMIN',
  'AMBASSADOR'
);

CREATE TYPE public."TrackSide" AS ENUM (
  'HUMAN',
  'AI'
);

CREATE TYPE public."MemberRole" AS ENUM (
  'OWNER',
  'MEMBER'
);

CREATE TYPE public."MemberStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED'
);

CREATE TYPE public.lifecycle_status_enum AS ENUM (
  'draft',
  'registration',
  'team_formation',
  'hacking',
  'voting',
  'results',
  'completed',
  'archived'
);

CREATE TYPE public.project_source_type_enum AS ENUM (
  'hack_submission',
  'project'
);

CREATE TYPE public.event_admin_role_enum AS ENUM (
  'primary',
  'co_admin'
);

CREATE TYPE public.sync_status_enum AS ENUM (
  'not_started',
  'in_progress',
  'partial',
  'failed',
  'complete'
);

CREATE TABLE public."User" (
  id text PRIMARY KEY,
  name text,
  email text,
  "emailVerified" timestamp without time zone,
  image text,
  role public."UserRole" NOT NULL DEFAULT 'USER',
  skills text,
  bio text,
  "isFreeAgent" boolean NOT NULL DEFAULT false,
  "lookingFor" text,
  "trackSide" public."TrackSide",
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  atlassian_account_id text,
  callsign text,
  "autoAssignOptIn" boolean DEFAULT false,
  full_name text,
  experience_level text,
  mentor_capacity integer DEFAULT 0,
  mentor_sessions_used integer DEFAULT 0,
  happy_to_mentor boolean DEFAULT false,
  seeking_mentor boolean DEFAULT false,
  capability_tags text[] DEFAULT ARRAY[]::text[],
  CONSTRAINT "User_email_key" UNIQUE (email),
  CONSTRAINT "User_atlassian_account_id_key" UNIQUE (atlassian_account_id)
);

CREATE TABLE public."Account" (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES public."User"(id),
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE (provider, "providerAccountId")
);

CREATE TABLE public."Session" (
  id text PRIMARY KEY,
  "sessionToken" text NOT NULL UNIQUE,
  "userId" text NOT NULL REFERENCES public."User"(id),
  expires timestamp without time zone NOT NULL
);

CREATE TABLE public."VerificationToken" (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamp without time zone NOT NULL,
  CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE (identifier, token)
);

CREATE TABLE public."Event" (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  year integer NOT NULL,
  description text,
  "isCurrent" boolean NOT NULL DEFAULT false,
  phase public."EventPhase" NOT NULL DEFAULT 'SETUP',
  "rubricConfig" jsonb,
  "prizesConfig" jsonb,
  "startDate" timestamp without time zone,
  "endDate" timestamp without time zone,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  "maxTeamSize" integer DEFAULT 6,
  "maxVotesPerUser" integer DEFAULT 5,
  "submissionDeadline" timestamptz,
  "votingDeadline" timestamptz,
  confluence_page_id text,
  confluence_page_url text,
  confluence_parent_page_id text,
  icon text,
  tagline text,
  timezone text DEFAULT 'Europe/London',
  lifecycle_status public.lifecycle_status_enum DEFAULT 'draft',
  hacking_starts_at timestamptz,
  submission_deadline_at timestamptz,
  creation_request_id text,
  created_by_user_id uuid,
  event_rules jsonb,
  event_branding jsonb,
  event_schedule jsonb,
  runtime_type text DEFAULT 'hdc_native',
  template_target text,
  event_content_overrides jsonb,
  event_config_draft jsonb,
  CONSTRAINT "Event_slug_key" UNIQUE (slug),
  CONSTRAINT event_runtime_type_check CHECK (runtime_type IN ('hdc_native', 'hackday_template')),
  CONSTRAINT event_template_target_check CHECK (template_target IS NULL OR template_target = 'hackday')
);

CREATE TABLE public."EventRegistration" (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "eventId" text NOT NULL REFERENCES public."Event"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventRegistration_userId_eventId_key" UNIQUE ("userId", "eventId")
);

CREATE TABLE public."Team" (
  id text PRIMARY KEY,
  "eventId" text NOT NULL REFERENCES public."Event"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  "maxSize" integer NOT NULL DEFAULT 8,
  "lookingFor" text,
  "trackSide" public."TrackSide" NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  emoji text,
  "isPublic" boolean NOT NULL DEFAULT true,
  slug text,
  "isAutoCreated" boolean DEFAULT false,
  CONSTRAINT "Team_slug_key" UNIQUE (slug)
);

CREATE TABLE public."TeamMember" (
  id text PRIMARY KEY,
  "teamId" text NOT NULL REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  role public."MemberRole" NOT NULL DEFAULT 'MEMBER',
  status public."MemberStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamMember_teamId_userId_key" UNIQUE ("teamId", "userId")
);

CREATE TABLE public."Project" (
  id text PRIMARY KEY,
  "teamId" text NOT NULL REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  "videoUrl" text,
  "slideUrl" text,
  "repoUrl" text,
  "demoUrl" text,
  "submittedAt" timestamp without time zone,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  event_id uuid,
  source_type public.project_source_type_enum DEFAULT 'project',
  synced_to_library_at timestamptz,
  hack_type text,
  visibility text DEFAULT 'org',
  owner_id uuid,
  workflow_transformed boolean DEFAULT false,
  ai_impact_hypothesis text,
  ai_tools_used text[] DEFAULT ARRAY[]::text[],
  time_saved_estimate numeric,
  failures_and_lessons text,
  created_at timestamptz DEFAULT now(),
  pipeline_stage text,
  pipeline_stage_entered_at timestamptz,
  CONSTRAINT "Project_teamId_key" UNIQUE ("teamId"),
  CONSTRAINT project_pipeline_stage_valid CHECK (
    pipeline_stage IS NULL OR pipeline_stage IN ('hack', 'validated_prototype', 'incubating_project', 'product_candidate')
  )
);

CREATE TABLE public."Vote" (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "projectId" text NOT NULL REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Vote_userId_projectId_key" UNIQUE ("userId", "projectId")
);

CREATE TABLE public."JudgeScore" (
  id text PRIMARY KEY,
  "judgeId" text NOT NULL REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "projectId" text NOT NULL REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  scores jsonb NOT NULL,
  comments text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "JudgeScore_judgeId_projectId_key" UNIQUE ("judgeId", "projectId")
);

CREATE TABLE public."Milestone" (
  id text PRIMARY KEY,
  "eventId" text NOT NULL REFERENCES public."Event"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  phase public."EventPhase" NOT NULL,
  "startTime" timestamp without time zone NOT NULL,
  "endTime" timestamp without time zone,
  location text,
  signal text,
  CONSTRAINT milestone_signal_check CHECK (
    signal IS NULL OR signal IN ('start', 'deadline', 'ceremony', 'presentation', 'judging', 'neutral')
  )
);

CREATE TABLE public."TeamInvite" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "teamId" text NOT NULL REFERENCES public."Team"(id) ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "expiresAt" timestamptz,
  CONSTRAINT "TeamInvite_teamId_userId_key" UNIQUE ("teamId", "userId"),
  CONSTRAINT "TeamInvite_status_check" CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'))
);

CREATE TABLE public."Notification" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "actionUrl" text,
  metadata jsonb,
  CONSTRAINT "Notification_type_check" CHECK (type IN ('TEAM_INVITE', 'JOIN_REQUEST', 'PHASE_CHANGE', 'REMINDER', 'SYSTEM'))
);

CREATE TABLE public."EventAdmin" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.event_admin_role_enum NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "EventAdmin_event_id_user_id_role_key" UNIQUE (event_id, user_id, role)
);

CREATE TABLE public."EventSyncState" (
  event_id uuid PRIMARY KEY,
  sync_status public.sync_status_enum NOT NULL DEFAULT 'not_started',
  last_error text,
  last_attempt_at timestamptz,
  pushed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0
);

CREATE TABLE public."EventAuditLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public."HackdayTemplateSeed" (
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
  CONSTRAINT hackday_template_seed_provision_status_check CHECK (provision_status IN ('provisioned', 'initialized', 'failed'))
);

CREATE TABLE public."HackdaySubmissionPageLink" (
  project_id text PRIMARY KEY REFERENCES public."Project"(id) ON DELETE CASCADE,
  event_id text REFERENCES public."Event"(id) ON DELETE SET NULL,
  team_id text REFERENCES public."Team"(id) ON DELETE SET NULL,
  submission_page_id text UNIQUE,
  submission_page_url text,
  output_page_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX event_confluence_page_id_idx ON public."Event"(confluence_page_id);
CREATE UNIQUE INDEX event_creation_request_id_idx ON public."Event"(creation_request_id);
CREATE INDEX event_runtime_type_idx ON public."Event"(runtime_type);
CREATE INDEX event_admin_event_id_idx ON public."EventAdmin"(event_id);
CREATE INDEX event_admin_user_id_idx ON public."EventAdmin"(user_id);
CREATE INDEX event_audit_log_event_id_idx ON public."EventAuditLog"(event_id);
CREATE INDEX hackday_template_seed_hdc_event_id_idx ON public."HackdayTemplateSeed"(hdc_event_id);
CREATE INDEX hackday_template_seed_provision_status_idx ON public."HackdayTemplateSeed"(provision_status);
CREATE INDEX hackday_submission_page_link_event_idx ON public."HackdaySubmissionPageLink"(event_id);
CREATE INDEX hackday_submission_page_link_team_idx ON public."HackdaySubmissionPageLink"(team_id);
CREATE INDEX "Notification_userId_idx" ON public."Notification"("userId");
CREATE INDEX "Notification_read_idx" ON public."Notification"(read);
CREATE INDEX "Notification_createdAt_idx" ON public."Notification"("createdAt");
CREATE INDEX "Notification_type_idx" ON public."Notification"(type);
CREATE INDEX project_event_id_idx ON public."Project"(event_id);
CREATE INDEX project_source_type_idx ON public."Project"(source_type);
CREATE INDEX project_pipeline_stage_idx ON public."Project"(pipeline_stage);
CREATE INDEX project_pipeline_stage_entered_at_idx ON public."Project"(pipeline_stage_entered_at DESC);
CREATE INDEX "TeamInvite_userId_idx" ON public."TeamInvite"("userId");
CREATE INDEX "TeamInvite_teamId_idx" ON public."TeamInvite"("teamId");
CREATE INDEX "TeamInvite_status_idx" ON public."TeamInvite"(status);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, image, role, "isFreeAgent", "createdAt", "updatedAt")
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'USER'::public."UserRole",
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public."User".name),
    image = COALESCE(EXCLUDED.image, public."User".image),
    "updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.hackday_submission_page_link_set_updated_at_fn()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog, public;

CREATE TRIGGER hackday_submission_page_link_set_updated_at
BEFORE UPDATE ON public."HackdaySubmissionPageLink"
FOR EACH ROW
EXECUTE FUNCTION public.hackday_submission_page_link_set_updated_at_fn();

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EventRegistration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Vote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."JudgeScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Milestone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeamInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EventAdmin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EventSyncState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EventAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HackdayTemplateSeed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HackdaySubmissionPageLink" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users are viewable by everyone"
  ON public."User"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public."User"
  FOR UPDATE
  USING (auth.uid()::text = id);

CREATE POLICY "Forge backend can create users"
  ON public."User"
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Forge backend can update users by atlassian_id"
  ON public."User"
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Events are viewable by everyone"
  ON public."Event"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage events"
  ON public."Event"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public."User"
      WHERE public."User".id = auth.uid()::text
        AND public."User".role = 'ADMIN'::public."UserRole"
    )
  );

CREATE POLICY "Registrations viewable by everyone"
  ON public."EventRegistration"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can register for events"
  ON public."EventRegistration"
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND "userId" = auth.uid()::text);

CREATE POLICY "Forge backend can register users"
  ON public."EventRegistration"
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Public teams are viewable by everyone"
  ON public."Team"
  FOR SELECT
  TO anon, authenticated
  USING (
    "isPublic" = true
    OR EXISTS (
      SELECT 1
      FROM public."TeamMember"
      WHERE public."TeamMember"."teamId" = public."Team".id
        AND public."TeamMember"."userId" = auth.uid()::text
        AND public."TeamMember".status = 'ACCEPTED'::public."MemberStatus"
    )
  );

CREATE POLICY "Authenticated users can create teams"
  ON public."Team"
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Team owners can update team"
  ON public."Team"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public."TeamMember"
      WHERE public."TeamMember"."teamId" = public."Team".id
        AND public."TeamMember"."userId" = auth.uid()::text
        AND public."TeamMember".role = 'OWNER'::public."MemberRole"
        AND public."TeamMember".status = 'ACCEPTED'::public."MemberStatus"
    )
  );

CREATE POLICY "Team owners can delete team"
  ON public."Team"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public."TeamMember"
      WHERE public."TeamMember"."teamId" = public."Team".id
        AND public."TeamMember"."userId" = auth.uid()::text
        AND public."TeamMember".role = 'OWNER'::public."MemberRole"
        AND public."TeamMember".status = 'ACCEPTED'::public."MemberStatus"
    )
  );

CREATE POLICY "Forge backend can create teams"
  ON public."Team"
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Forge backend can update teams"
  ON public."Team"
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Forge backend can delete teams"
  ON public."Team"
  FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY "TeamMember readable by authenticated users"
  ON public."TeamMember"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can request to join teams"
  ON public."TeamMember"
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND "userId" = auth.uid()::text
    AND status = 'PENDING'::public."MemberStatus"
  );

CREATE POLICY "Users can leave teams"
  ON public."TeamMember"
  FOR DELETE
  USING ("userId" = auth.uid()::text);

CREATE POLICY "Forge backend can manage team members"
  ON public."TeamMember"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Projects are viewable by everyone"
  ON public."Project"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Team members can create projects"
  ON public."Project"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public."TeamMember"
      WHERE public."TeamMember"."teamId" = public."Project"."teamId"
        AND public."TeamMember"."userId" = auth.uid()::text
        AND public."TeamMember".status = 'ACCEPTED'::public."MemberStatus"
    )
  );

CREATE POLICY "Team members can update projects"
  ON public."Project"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public."TeamMember"
      WHERE public."TeamMember"."teamId" = public."Project"."teamId"
        AND public."TeamMember"."userId" = auth.uid()::text
        AND public."TeamMember".status = 'ACCEPTED'::public."MemberStatus"
    )
  );

CREATE POLICY "Forge backend can manage projects"
  ON public."Project"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Votes are viewable by everyone"
  ON public."Vote"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can vote"
  ON public."Vote"
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND "userId" = auth.uid()::text);

CREATE POLICY "Users can remove own votes"
  ON public."Vote"
  FOR DELETE
  USING ("userId" = auth.uid()::text);

CREATE POLICY "Forge backend can manage votes"
  ON public."Vote"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Judge scores are viewable"
  ON public."JudgeScore"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Judges can create scores"
  ON public."JudgeScore"
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = "judgeId"
    AND EXISTS (
      SELECT 1
      FROM public."User"
      WHERE public."User".id = auth.uid()::text
        AND public."User".role IN ('JUDGE'::public."UserRole", 'ADMIN'::public."UserRole")
    )
  );

CREATE POLICY "Judges can update own scores"
  ON public."JudgeScore"
  FOR UPDATE
  USING (
    "judgeId" = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public."User"
      WHERE public."User".id = auth.uid()::text
        AND public."User".role IN ('JUDGE'::public."UserRole", 'ADMIN'::public."UserRole")
    )
  );

CREATE POLICY "Forge backend can manage judge scores"
  ON public."JudgeScore"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Milestones are viewable by everyone"
  ON public."Milestone"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage milestones"
  ON public."Milestone"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public."User"
      WHERE public."User".id = auth.uid()::text
        AND public."User".role = 'ADMIN'::public."UserRole"
    )
  );

CREATE POLICY "Users can view their own invites"
  ON public."TeamInvite"
  FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Team captains can view invites for their teams"
  ON public."TeamInvite"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public."TeamMember"
      WHERE public."TeamMember"."teamId" = public."TeamInvite"."teamId"
        AND public."TeamMember"."userId" = auth.uid()::text
        AND public."TeamMember".role = 'OWNER'::public."MemberRole"
        AND public."TeamMember".status = 'ACCEPTED'::public."MemberStatus"
    )
  );

CREATE POLICY "Team captains can create invites"
  ON public."TeamInvite"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public."TeamMember"
      WHERE public."TeamMember"."teamId" = public."TeamInvite"."teamId"
        AND public."TeamMember"."userId" = auth.uid()::text
        AND public."TeamMember".role = 'OWNER'::public."MemberRole"
        AND public."TeamMember".status = 'ACCEPTED'::public."MemberStatus"
    )
  );

CREATE POLICY "Users can update their own invites"
  ON public."TeamInvite"
  FOR UPDATE
  USING (auth.uid()::text = "userId");

CREATE POLICY "Forge backend can manage team invites"
  ON public."TeamInvite"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own notifications"
  ON public."Notification"
  FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own notifications"
  ON public."Notification"
  FOR UPDATE
  USING (auth.uid()::text = "userId");

CREATE POLICY "Service role can manage rows"
  ON public."EventAdmin"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage rows"
  ON public."EventSyncState"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage rows"
  ON public."EventAuditLog"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage rows"
  ON public."HackdayTemplateSeed"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage rows"
  ON public."HackdaySubmissionPageLink"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DELETE FROM supabase_migrations.schema_migrations
WHERE version >= '20251205142749';

INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback)
VALUES
  ('20251205142749', ARRAY[]::text[], 'create_hackday_schema', 'codex', NULL, NULL),
  ('20251207173004', ARRAY[]::text[], 'add_auth_sync_trigger', 'codex', NULL, NULL),
  ('20251207173030', ARRAY[]::text[], 'enable_rls_and_policies', 'codex', NULL, NULL),
  ('20251207173541', ARRAY[]::text[], 'fix_function_search_path', 'codex', NULL, NULL),
  ('20260116171228', ARRAY[]::text[], 'add_atlassian_account_id', 'codex', NULL, NULL),
  ('20260116173817', ARRAY[]::text[], 'add_forge_backend_rls_policies', 'codex', NULL, NULL),
  ('20260116175029', ARRAY[]::text[], 'fix_teammember_rls_recursion', 'codex', NULL, NULL),
  ('20260117233225', ARRAY[]::text[], 'create_team_invite_table', 'codex', NULL, NULL),
  ('20260118222817', ARRAY[]::text[], 'add_ambassador_role', 'codex', NULL, NULL),
  ('20260118234821', ARRAY[]::text[], 'add_event_settings', 'codex', NULL, NULL),
  ('20260118234832', ARRAY[]::text[], 'create_notifications_table_fixed', 'codex', NULL, NULL),
  ('20260216090000', ARRAY[]::text[], 'phase1_multi_tenant', 'codex', NULL, NULL),
  ('20260216091000', ARRAY[]::text[], 'phase2_event_config', 'codex', NULL, NULL),
  ('20260216092000', ARRAY[]::text[], 'phase2_supabase_grants_fix', 'codex', NULL, NULL),
  ('20260216100000', ARRAY[]::text[], 'phase2_event_schedule', 'codex', NULL, NULL),
  ('20260218161000', ARRAY[]::text[], 'phase7_hackday_template_seed', 'codex', NULL, NULL),
  ('20260226120000', ARRAY[]::text[], 'phase8_milestone_signal', 'codex', NULL, NULL),
  ('20260226231500', ARRAY[]::text[], 'add_event_config_mode_content_columns', 'codex', NULL, NULL)
ON CONFLICT (version) DO UPDATE SET
  statements = EXCLUDED.statements,
  name = EXCLUDED.name,
  created_by = EXCLUDED.created_by,
  idempotency_key = EXCLUDED.idempotency_key,
  rollback = EXCLUDED.rollback;

COMMIT;
