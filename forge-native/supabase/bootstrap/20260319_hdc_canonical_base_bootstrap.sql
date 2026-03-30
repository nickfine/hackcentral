-- Canonical HackCentral/HD26Forge base bootstrap for fresh tenant projects.
-- This replaces the legacy lowercase Prisma bootstrap with the live PascalCase
-- runtime schema expected by HackCentral + HD26Forge before replaying later
-- checked-in migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DO $$
BEGIN
  IF to_regclass('public."HackdaySubmissionPageLink"') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS hackday_submission_page_link_set_updated_at ON public."HackdaySubmissionPageLink"';
  END IF;
END$$;
DROP FUNCTION IF EXISTS public.hackday_submission_page_link_set_updated_at_fn();

DROP TABLE IF EXISTS public."HackdaySubmissionPageLink" CASCADE;
DROP TABLE IF EXISTS public."HackdayTemplateSeed" CASCADE;
DROP TABLE IF EXISTS public."EventAuditLog" CASCADE;
DROP TABLE IF EXISTS public."EventSyncState" CASCADE;
DROP TABLE IF EXISTS public."EventAdmin" CASCADE;
DROP TABLE IF EXISTS public."Notification" CASCADE;
DROP TABLE IF EXISTS public."TeamInvite" CASCADE;
DROP TABLE IF EXISTS public."JudgeScore" CASCADE;
DROP TABLE IF EXISTS public."Vote" CASCADE;
DROP TABLE IF EXISTS public."Project" CASCADE;
DROP TABLE IF EXISTS public."Milestone" CASCADE;
DROP TABLE IF EXISTS public."TeamMember" CASCADE;
DROP TABLE IF EXISTS public."Team" CASCADE;
DROP TABLE IF EXISTS public."EventRegistration" CASCADE;
DROP TABLE IF EXISTS public."Event" CASCADE;
DROP TABLE IF EXISTS public."VerificationToken" CASCADE;
DROP TABLE IF EXISTS public."Session" CASCADE;
DROP TABLE IF EXISTS public."Account" CASCADE;
DROP TABLE IF EXISTS public."User" CASCADE;

DROP TABLE IF EXISTS public.judge_scores CASCADE;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.milestones CASCADE;
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.verification_tokens CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public."TrackSide" CASCADE;
DROP TYPE IF EXISTS public."MemberStatus" CASCADE;
DROP TYPE IF EXISTS public."MemberRole" CASCADE;
DROP TYPE IF EXISTS public."TeamMemberStatus" CASCADE;
DROP TYPE IF EXISTS public."TeamMemberRole" CASCADE;
DROP TYPE IF EXISTS public.sync_status_enum CASCADE;
DROP TYPE IF EXISTS public.project_source_type_enum CASCADE;
DROP TYPE IF EXISTS public.lifecycle_status_enum CASCADE;
DROP TYPE IF EXISTS public.event_admin_role_enum CASCADE;
DROP TYPE IF EXISTS public."UserRole" CASCADE;
DROP TYPE IF EXISTS public."EventPhase" CASCADE;

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

CREATE TYPE public."UserRole" AS ENUM ('USER', 'JUDGE', 'ADMIN');
CREATE TYPE public."TrackSide" AS ENUM ('HUMAN', 'AI');
CREATE TYPE public."MemberRole" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE public."MemberStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
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
CREATE TYPE public.project_source_type_enum AS ENUM ('hack_submission', 'project');
CREATE TYPE public.event_admin_role_enum AS ENUM ('primary', 'co_admin');
CREATE TYPE public.sync_status_enum AS ENUM ('not_started', 'in_progress', 'partial', 'failed', 'complete');

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
  atlassian_account_id text UNIQUE,
  callsign text,
  "autoAssignOptIn" boolean DEFAULT false,
  full_name text,
  experience_level text,
  mentor_capacity integer DEFAULT 0,
  mentor_sessions_used integer DEFAULT 0,
  happy_to_mentor boolean DEFAULT false,
  seeking_mentor boolean DEFAULT false,
  capability_tags text[] DEFAULT ARRAY[]::text[]
);

CREATE UNIQUE INDEX "User_email_key" ON public."User" (email);

CREATE TABLE public."Account" (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text
);

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key"
  ON public."Account" (provider, "providerAccountId");

CREATE TABLE public."Session" (
  id text PRIMARY KEY,
  "sessionToken" text NOT NULL,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  expires timestamp without time zone NOT NULL
);

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" ("sessionToken");

CREATE TABLE public."VerificationToken" (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamp without time zone NOT NULL
);

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key"
  ON public."VerificationToken" (identifier, token);

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
  timezone text DEFAULT 'Europe/London'::text,
  lifecycle_status public.lifecycle_status_enum DEFAULT 'draft',
  hacking_starts_at timestamptz,
  submission_deadline_at timestamptz,
  creation_request_id text,
  created_by_user_id uuid,
  event_rules jsonb,
  event_branding jsonb,
  event_schedule jsonb,
  runtime_type text DEFAULT 'hdc_native'::text,
  template_target text,
  event_content_overrides jsonb,
  event_config_draft jsonb,
  CONSTRAINT event_runtime_type_check
    CHECK (runtime_type IN ('hdc_native', 'hackday_template')),
  CONSTRAINT event_template_target_check
    CHECK (template_target IS NULL OR template_target = 'hackday')
);

CREATE UNIQUE INDEX "Event_slug_key" ON public."Event" (slug);

CREATE TABLE public."EventRegistration" (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "eventId" text NOT NULL REFERENCES public."Event"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "EventRegistration_userId_eventId_key"
  ON public."EventRegistration" ("userId", "eventId");

CREATE TABLE public."Team" (
  id text PRIMARY KEY,
  "eventId" text NOT NULL REFERENCES public."Event"(id) ON DELETE CASCADE ON UPDATE CASCADE,
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
  "isAutoCreated" boolean DEFAULT false
);

CREATE UNIQUE INDEX "Team_slug_key" ON public."Team" (slug);

CREATE TABLE public."TeamMember" (
  id text PRIMARY KEY,
  "teamId" text NOT NULL REFERENCES public."Team"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  role public."MemberRole" NOT NULL DEFAULT 'MEMBER',
  status public."MemberStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "TeamMember_teamId_userId_key"
  ON public."TeamMember" ("teamId", "userId");

CREATE TABLE public."Milestone" (
  id text PRIMARY KEY,
  "eventId" text NOT NULL REFERENCES public."Event"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  title text NOT NULL,
  description text,
  phase public."EventPhase" NOT NULL,
  "startTime" timestamp without time zone NOT NULL,
  "endTime" timestamp without time zone,
  location text,
  signal text,
  CONSTRAINT milestone_signal_check
    CHECK (
      signal IS NULL OR signal IN ('start', 'deadline', 'ceremony', 'presentation', 'judging', 'neutral')
    )
);

CREATE TABLE public."Project" (
  id text PRIMARY KEY,
  "teamId" text NOT NULL REFERENCES public."Team"(id) ON DELETE CASCADE ON UPDATE CASCADE,
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
  visibility text DEFAULT 'org'::text,
  owner_id uuid,
  workflow_transformed boolean DEFAULT false,
  ai_impact_hypothesis text,
  ai_tools_used text[] DEFAULT ARRAY[]::text[],
  time_saved_estimate numeric,
  failures_and_lessons text,
  created_at timestamptz DEFAULT now(),
  pipeline_stage text,
  pipeline_stage_entered_at timestamptz,
  CONSTRAINT project_pipeline_stage_valid
    CHECK (
      pipeline_stage IS NULL OR pipeline_stage IN (
        'hack',
        'validated_prototype',
        'incubating_project',
        'product_candidate'
      )
    )
);

CREATE UNIQUE INDEX "Project_teamId_key" ON public."Project" ("teamId");
CREATE INDEX project_pipeline_stage_idx ON public."Project" (pipeline_stage);
CREATE INDEX project_pipeline_stage_entered_at_idx ON public."Project" (pipeline_stage_entered_at DESC);

CREATE TABLE public."Vote" (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "projectId" text NOT NULL REFERENCES public."Project"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Vote_userId_projectId_key"
  ON public."Vote" ("userId", "projectId");

CREATE TABLE public."JudgeScore" (
  id text PRIMARY KEY,
  "judgeId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "projectId" text NOT NULL REFERENCES public."Project"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  scores jsonb NOT NULL,
  comments text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL
);

CREATE UNIQUE INDEX "JudgeScore_judgeId_projectId_key"
  ON public."JudgeScore" ("judgeId", "projectId");

CREATE TABLE public."TeamInvite" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "teamId" text NOT NULL REFERENCES public."Team"(id) ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "expiresAt" timestamptz,
  CONSTRAINT "TeamInvite_status_check"
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
  CONSTRAINT "TeamInvite_teamId_userId_key"
    UNIQUE ("teamId", "userId")
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
  CONSTRAINT "Notification_type_check"
    CHECK (type IN ('TEAM_INVITE', 'JOIN_REQUEST', 'PHASE_CHANGE', 'REMINDER', 'SYSTEM'))
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
  CONSTRAINT hackday_template_seed_provision_status_check
    CHECK (provision_status IN ('provisioned', 'initialized', 'failed'))
);

CREATE TABLE public."HackdaySubmissionPageLink" (
  project_id text PRIMARY KEY,
  event_id text,
  team_id text,
  submission_page_id text UNIQUE,
  submission_page_url text,
  output_page_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."HackdaySubmissionPageLink"
  ADD CONSTRAINT hackday_submission_page_link_project_fk
  FOREIGN KEY (project_id) REFERENCES public."Project"(id) ON DELETE CASCADE;

ALTER TABLE public."HackdaySubmissionPageLink"
  ADD CONSTRAINT hackday_submission_page_link_event_fk
  FOREIGN KEY (event_id) REFERENCES public."Event"(id) ON DELETE SET NULL;

ALTER TABLE public."HackdaySubmissionPageLink"
  ADD CONSTRAINT hackday_submission_page_link_team_fk
  FOREIGN KEY (team_id) REFERENCES public."Team"(id) ON DELETE SET NULL;
