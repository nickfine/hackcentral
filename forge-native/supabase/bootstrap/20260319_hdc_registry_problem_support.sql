-- Supplemental live-schema support for registry/problem/pipeline tables that
-- exist in production but are not created by the checked-in migration chain.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artifact_type_enum') THEN
    CREATE TYPE artifact_type_enum AS ENUM (
      'skill',
      'prompt',
      'template',
      'learning',
      'code_snippet',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artifact_visibility_enum') THEN
    CREATE TYPE artifact_visibility_enum AS ENUM ('private', 'org', 'public');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'problem_frequency_enum') THEN
    CREATE TYPE problem_frequency_enum AS ENUM ('daily', 'weekly', 'monthly');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'problem_status_enum') THEN
    CREATE TYPE problem_status_enum AS ENUM ('open', 'claimed', 'solved', 'closed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'problem_moderation_state_enum') THEN
    CREATE TYPE problem_moderation_state_enum AS ENUM (
      'visible',
      'hidden_pending_review',
      'removed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'problem_moderation_action_enum') THEN
    CREATE TYPE problem_moderation_action_enum AS ENUM ('auto_hidden', 'remove', 'reinstate');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public."Artifact" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  artifact_type artifact_type_enum NOT NULL,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  source_url text NOT NULL,
  source_label text,
  source_hack_project_id text,
  source_hackday_event_id text,
  created_by_user_id text NOT NULL,
  visibility artifact_visibility_enum NOT NULL DEFAULT 'org',
  reuse_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artifact_created_by_user_fk') THEN
    ALTER TABLE public."Artifact"
      ADD CONSTRAINT artifact_created_by_user_fk
      FOREIGN KEY (created_by_user_id)
      REFERENCES public."User"(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artifact_source_hack_project_fk') THEN
    ALTER TABLE public."Artifact"
      ADD CONSTRAINT artifact_source_hack_project_fk
      FOREIGN KEY (source_hack_project_id)
      REFERENCES public."Project"(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artifact_source_hackday_event_fk') THEN
    ALTER TABLE public."Artifact"
      ADD CONSTRAINT artifact_source_hackday_event_fk
      FOREIGN KEY (source_hackday_event_id)
      REFERENCES public."Event"(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS artifact_created_at_idx ON public."Artifact" (created_at DESC);
CREATE INDEX IF NOT EXISTS artifact_created_by_user_id_idx ON public."Artifact" (created_by_user_id);
CREATE INDEX IF NOT EXISTS artifact_reuse_count_idx ON public."Artifact" (reuse_count DESC);
CREATE INDEX IF NOT EXISTS artifact_source_hack_project_id_idx ON public."Artifact" (source_hack_project_id);
CREATE INDEX IF NOT EXISTS artifact_type_idx ON public."Artifact" (artifact_type);
CREATE INDEX IF NOT EXISTS artifact_tags_gin_idx ON public."Artifact" USING gin (tags);

CREATE TABLE IF NOT EXISTS public."ArtifactReuse" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL,
  user_id text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  context_note text,
  CONSTRAINT "ArtifactReuse_artifact_id_user_id_key" UNIQUE (artifact_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artifact_reuse_artifact_fk') THEN
    ALTER TABLE public."ArtifactReuse"
      ADD CONSTRAINT artifact_reuse_artifact_fk
      FOREIGN KEY (artifact_id)
      REFERENCES public."Artifact"(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artifact_reuse_user_fk') THEN
    ALTER TABLE public."ArtifactReuse"
      ADD CONSTRAINT artifact_reuse_user_fk
      FOREIGN KEY (user_id)
      REFERENCES public."User"(id)
      ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS artifact_reuse_artifact_id_idx ON public."ArtifactReuse" (artifact_id);
CREATE INDEX IF NOT EXISTS artifact_reuse_user_id_idx ON public."ArtifactReuse" (user_id);

CREATE TABLE IF NOT EXISTS public."PipelineStageCriteria" (
  stage text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  criteria text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_by_user_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pipeline_stage_criteria_updated_by_user_fk') THEN
    ALTER TABLE public."PipelineStageCriteria"
      ADD CONSTRAINT pipeline_stage_criteria_updated_by_user_fk
      FOREIGN KEY (updated_by_user_id)
      REFERENCES public."User"(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public."PipelineTransitionLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  note text NOT NULL,
  changed_by_user_id text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pipeline_transition_log_project_fk') THEN
    ALTER TABLE public."PipelineTransitionLog"
      ADD CONSTRAINT pipeline_transition_log_project_fk
      FOREIGN KEY (project_id)
      REFERENCES public."Project"(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pipeline_transition_log_changed_by_user_fk') THEN
    ALTER TABLE public."PipelineTransitionLog"
      ADD CONSTRAINT pipeline_transition_log_changed_by_user_fk
      FOREIGN KEY (changed_by_user_id)
      REFERENCES public."User"(id)
      ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS pipeline_transition_log_project_id_idx ON public."PipelineTransitionLog" (project_id);
CREATE INDEX IF NOT EXISTS pipeline_transition_log_changed_at_idx ON public."PipelineTransitionLog" (changed_at DESC);

CREATE TABLE IF NOT EXISTS public."Problem" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  frequency problem_frequency_enum NOT NULL,
  estimated_time_wasted_hours numeric NOT NULL,
  team text NOT NULL,
  domain text NOT NULL,
  contact_details text NOT NULL,
  status problem_status_enum NOT NULL DEFAULT 'open',
  moderation_state problem_moderation_state_enum NOT NULL DEFAULT 'visible',
  vote_count integer NOT NULL DEFAULT 0,
  flag_count integer NOT NULL DEFAULT 0,
  created_by_user_id text NOT NULL,
  claimed_by_user_id text,
  linked_hack_project_id text,
  linked_artifact_id uuid,
  auto_hidden_at timestamptz,
  hidden_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_created_by_user_fk') THEN
    ALTER TABLE public."Problem"
      ADD CONSTRAINT problem_created_by_user_fk
      FOREIGN KEY (created_by_user_id)
      REFERENCES public."User"(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_claimed_by_user_fk') THEN
    ALTER TABLE public."Problem"
      ADD CONSTRAINT problem_claimed_by_user_fk
      FOREIGN KEY (claimed_by_user_id)
      REFERENCES public."User"(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_linked_hack_project_fk') THEN
    ALTER TABLE public."Problem"
      ADD CONSTRAINT problem_linked_hack_project_fk
      FOREIGN KEY (linked_hack_project_id)
      REFERENCES public."Project"(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_linked_artifact_fk') THEN
    ALTER TABLE public."Problem"
      ADD CONSTRAINT problem_linked_artifact_fk
      FOREIGN KEY (linked_artifact_id)
      REFERENCES public."Artifact"(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS problem_created_at_idx ON public."Problem" (created_at DESC);
CREATE INDEX IF NOT EXISTS problem_created_by_user_id_idx ON public."Problem" (created_by_user_id);
CREATE INDEX IF NOT EXISTS problem_domain_idx ON public."Problem" (domain);
CREATE INDEX IF NOT EXISTS problem_moderation_state_idx ON public."Problem" (moderation_state);
CREATE INDEX IF NOT EXISTS problem_status_idx ON public."Problem" (status);
CREATE INDEX IF NOT EXISTS problem_team_idx ON public."Problem" (team);
CREATE INDEX IF NOT EXISTS problem_time_wasted_idx ON public."Problem" (estimated_time_wasted_hours DESC);
CREATE INDEX IF NOT EXISTS problem_vote_count_idx ON public."Problem" (vote_count DESC);

CREATE TABLE IF NOT EXISTS public."ProblemVote" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ProblemVote_problem_id_user_id_key" UNIQUE (problem_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_vote_problem_fk') THEN
    ALTER TABLE public."ProblemVote"
      ADD CONSTRAINT problem_vote_problem_fk
      FOREIGN KEY (problem_id)
      REFERENCES public."Problem"(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_vote_user_fk') THEN
    ALTER TABLE public."ProblemVote"
      ADD CONSTRAINT problem_vote_user_fk
      FOREIGN KEY (user_id)
      REFERENCES public."User"(id)
      ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS problem_vote_problem_id_idx ON public."ProblemVote" (problem_id);
CREATE INDEX IF NOT EXISTS problem_vote_user_id_idx ON public."ProblemVote" (user_id);

CREATE TABLE IF NOT EXISTS public."ProblemFlag" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL,
  user_id text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ProblemFlag_problem_id_user_id_key" UNIQUE (problem_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_flag_problem_fk') THEN
    ALTER TABLE public."ProblemFlag"
      ADD CONSTRAINT problem_flag_problem_fk
      FOREIGN KEY (problem_id)
      REFERENCES public."Problem"(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_flag_user_fk') THEN
    ALTER TABLE public."ProblemFlag"
      ADD CONSTRAINT problem_flag_user_fk
      FOREIGN KEY (user_id)
      REFERENCES public."User"(id)
      ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS problem_flag_problem_id_idx ON public."ProblemFlag" (problem_id);
CREATE INDEX IF NOT EXISTS problem_flag_user_id_idx ON public."ProblemFlag" (user_id);

CREATE TABLE IF NOT EXISTS public."ProblemStatusHistory" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL,
  from_status problem_status_enum,
  to_status problem_status_enum NOT NULL,
  changed_by_user_id text NOT NULL,
  change_note text,
  linked_hack_project_id text,
  linked_artifact_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_status_history_problem_fk') THEN
    ALTER TABLE public."ProblemStatusHistory"
      ADD CONSTRAINT problem_status_history_problem_fk
      FOREIGN KEY (problem_id)
      REFERENCES public."Problem"(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_status_history_user_fk') THEN
    ALTER TABLE public."ProblemStatusHistory"
      ADD CONSTRAINT problem_status_history_user_fk
      FOREIGN KEY (changed_by_user_id)
      REFERENCES public."User"(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_status_history_hack_project_fk') THEN
    ALTER TABLE public."ProblemStatusHistory"
      ADD CONSTRAINT problem_status_history_hack_project_fk
      FOREIGN KEY (linked_hack_project_id)
      REFERENCES public."Project"(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_status_history_artifact_fk') THEN
    ALTER TABLE public."ProblemStatusHistory"
      ADD CONSTRAINT problem_status_history_artifact_fk
      FOREIGN KEY (linked_artifact_id)
      REFERENCES public."Artifact"(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS problem_status_history_problem_id_idx ON public."ProblemStatusHistory" (problem_id);

CREATE TABLE IF NOT EXISTS public."ProblemModerationLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL,
  action problem_moderation_action_enum NOT NULL,
  changed_by_user_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_moderation_log_problem_fk') THEN
    ALTER TABLE public."ProblemModerationLog"
      ADD CONSTRAINT problem_moderation_log_problem_fk
      FOREIGN KEY (problem_id)
      REFERENCES public."Problem"(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_moderation_log_user_fk') THEN
    ALTER TABLE public."ProblemModerationLog"
      ADD CONSTRAINT problem_moderation_log_user_fk
      FOREIGN KEY (changed_by_user_id)
      REFERENCES public."User"(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS problem_moderation_log_problem_id_idx ON public."ProblemModerationLog" (problem_id);
