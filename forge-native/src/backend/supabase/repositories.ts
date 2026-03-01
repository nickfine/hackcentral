import { randomUUID } from 'node:crypto';
import { ALLOWED_EMAIL_DOMAIN, DEFAULT_TIMEZONE } from '../../shared/types';
import type {
  ArtifactListItem,
  ArtifactType,
  ArtifactVisibility,
  BootstrapData,
  CreateProblemInput,
  CreateProblemResult,
  CreateArtifactInput,
  CreateArtifactResult,
  CreateHackInput,
  CreateHackResult,
  CreateProjectInput,
  CreateProjectResult,
  DerivedProfileSnapshot,
  EventBranding,
  EventRegistryItem,
  EventRules,
  EventSchedule,
  ScheduleCustomEvent,
  ScheduleEventSignal,
  EventSyncState,
  FlagProblemInput,
  FlagProblemResult,
  GetArtifactResult,
  InstanceRuntime,
  LifecycleStatus,
  ListProblemImportCandidatesInput,
  ListProblemImportCandidatesResult,
  ListProblemsInput,
  ListProblemsResult,
  ModerateProblemInput,
  ModerateProblemResult,
  ListArtifactsInput,
  ListArtifactsResult,
  MarkArtifactReuseResult,
  GetPipelineBoardInput,
  GetPipelineBoardResult,
  MovePipelineItemInput,
  MovePipelineItemResult,
  ListShowcaseHacksInput,
  ListShowcaseHacksResult,
  ShowcaseHackListItem,
  ShowcaseHackStatus,
  GetShowcaseHackDetailResult,
  SetShowcaseFeaturedInput,
  SetShowcaseFeaturedResult,
  UpdatePipelineStageCriteriaInput,
  UpdatePipelineStageCriteriaResult,
  PipelineBoardItem,
  PipelineMetrics,
  PipelineStage,
  PipelineStageCriteria,
  PersonSnapshot,
  ProblemFrequency,
  ProblemImportCandidate,
  ProblemListItem,
  ProblemModerationState,
  ProblemStatus,
  RecognitionSnapshot,
  PathwayListItem,
  PathwayProgressSnapshot,
  PathwayStep,
  PathwayStepType,
  ListPathwaysInput,
  ListPathwaysResult,
  GetPathwayResult,
  UpsertPathwayInput,
  UpsertPathwayResult,
  SetPathwayStepCompletionInput,
  SetPathwayStepCompletionResult,
  TeamPulseMetrics,
  TrackTeamPulseExportInput,
  TrackTeamPulseExportResult,
  SubmissionRequirement,
  SubmitHackInput,
  SubmitHackResult,
  SyncResult,
  SyncErrorCategory,
  SyncStatus,
  ThemePreference,
  UpdateProblemStatusInput,
  UpdateProblemStatusResult,
  UpdateMentorProfileInput,
  UpdateMentorProfileResult,
  VoteProblemResult,
  ViewerContext,
} from '../../shared/types';
import { SupabaseRestClient, type QueryFilter } from './client';

const EVENT_TABLE = 'Event';
const USER_TABLE = 'User';
const TEAM_TABLE = 'Team';
const TEAM_MEMBER_TABLE = 'TeamMember';
const PROJECT_TABLE = 'Project';
const EVENT_ADMIN_TABLE = 'EventAdmin';
const EVENT_SYNC_STATE_TABLE = 'EventSyncState';
const EVENT_AUDIT_LOG_TABLE = 'EventAuditLog';
const HACKDAY_TEMPLATE_SEED_TABLE = 'HackdayTemplateSeed';
const MILESTONE_TABLE = 'Milestone';
const ARTIFACT_TABLE = 'Artifact';
const ARTIFACT_REUSE_TABLE = 'ArtifactReuse';
const PROBLEM_TABLE = 'Problem';
const PROBLEM_VOTE_TABLE = 'ProblemVote';
const PROBLEM_FLAG_TABLE = 'ProblemFlag';
const PROBLEM_STATUS_HISTORY_TABLE = 'ProblemStatusHistory';
const PROBLEM_MODERATION_LOG_TABLE = 'ProblemModerationLog';
const PATHWAY_TABLE = 'Pathway';
const PATHWAY_STEP_TABLE = 'PathwayStep';
const PATHWAY_PROGRESS_TABLE = 'PathwayProgress';
const PIPELINE_STAGE_CRITERIA_TABLE = 'PipelineStageCriteria';
const PIPELINE_TRANSITION_LOG_TABLE = 'PipelineTransitionLog';
const SHOWCASE_HACK_TABLE = 'ShowcaseHack';
const EVENT_AUDIT_RETENTION_LIMIT = 100;
const EVENT_AUTO_ARCHIVE_AFTER_DAYS = 90;
const RECOGNITION_MENTOR_BADGE_THRESHOLD = 3;
const RECOGNITION_MENTOR_LEADERBOARD_LIMIT = 25;
const RECOGNITION_PATHWAY_BADGE_THRESHOLD_DISTINCT_PATHWAYS = 1;
const RECOGNITION_PATHWAY_LEADERBOARD_LIMIT = 25;
const RECOGNITION_SEGMENT_LEADERBOARD_LIMIT = 25;

const EVENT_SELECT_CORE =
  'id,name,icon,tagline,timezone,lifecycle_status,confluence_page_id,confluence_page_url,confluence_parent_page_id,hacking_starts_at,submission_deadline_at,creation_request_id,created_by_user_id';
const EVENT_SELECT_WITH_CONFIG = `${EVENT_SELECT_CORE},event_rules,event_branding,event_schedule,runtime_type,template_target`;

const EXPERIENCE_LABELS: Record<string, string> = {
  newbie: 'Newbie',
  curious: 'AI Curious',
  comfortable: 'Comfortable',
  power_user: 'Power User',
  expert: 'Expert',
};

const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  building: 'Building',
  incubation: 'Incubation',
  completed: 'Completed',
  archived: 'Archived',
};

const PIPELINE_STAGES: PipelineStage[] = [
  'hack',
  'validated_prototype',
  'incubating_project',
  'product_candidate',
];

type Visibility = 'private' | 'org' | 'public';

interface DbUser {
  id: string;
  email: string;
  full_name: string | null;
  atlassian_account_id: string | null;
  role?: string | null;
  experience_level: string | null;
  mentor_capacity: number | null;
  mentor_sessions_used: number | null;
  happy_to_mentor: boolean | null;
  seeking_mentor: boolean | null;
  capability_tags: string[] | null;
  created_at?: string | null;
  createdAt?: string | null;
}

interface DbProblemExchangeModeratorLookup {
  id: string;
  role?: string | null;
  capability_tags?: string[] | null;
}

interface DbPipelineAdminLookup {
  id: string;
  role?: string | null;
  capability_tags?: string[] | null;
}

interface DbPathwayEditorLookup {
  id: string;
  role?: string | null;
  capability_tags?: string[] | null;
}

interface DbPathway {
  id: string;
  title: string;
  summary: string | null;
  intro_text: string | null;
  domain: string | null;
  role: string | null;
  tags: string[] | null;
  published: boolean | null;
  recommended: boolean | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DbPathwayStep {
  id: string;
  pathway_id: string;
  position: number | null;
  step_type: PathwayStepType | null;
  title: string;
  description: string | null;
  linked_hack_project_id: string | null;
  linked_artifact_id: string | null;
  external_url: string | null;
  challenge_prompt: string | null;
  is_optional: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DbPathwayProgress {
  id: string;
  pathway_id: string;
  step_id: string;
  user_id: string;
  completed_at: string | null;
  created_at: string | null;
}

interface DbProject {
  id: string;
  title: string;
  description: string | null;
  status: string;
  hack_type: 'prompt' | 'skill' | 'app' | null;
  visibility: Visibility | null;
  owner_id: string | null;
  workflow_transformed: boolean | null;
  ai_impact_hypothesis: string | null;
  ai_tools_used: string[] | null;
  time_saved_estimate: number | null;
  failures_and_lessons: string | null;
  source_type: 'hack_submission' | 'project' | null;
  team_id: string | null;
  synced_to_library_at: string | null;
  event_id: string | null;
  pipeline_stage: PipelineStage | null;
  pipeline_stage_entered_at: string | null;
  created_at: string | null;
}
type DbProjectRow = Record<string, unknown>;

interface DbShowcaseHack {
  project_id: string;
  featured: boolean | null;
  demo_url: string | null;
  team_members: string[] | null;
  source_event_id: string | null;
  tags: string[] | null;
  linked_artifact_ids: string[] | null;
  context: string | null;
  limitations: string | null;
  risk_notes: string | null;
  source_repo_url: string | null;
  created_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DbPipelineStageCriteriaRow {
  stage: string;
  label: string;
  description: string | null;
  criteria: string[] | null;
  updated_at: string | null;
}

interface DbPipelineTransitionLog {
  id: string;
  project_id: string;
  from_stage: PipelineStage;
  to_stage: PipelineStage;
  note: string;
  changed_by_user_id: string;
  changed_at: string;
}

interface DbArtifact {
  id: string;
  title: string;
  description: string;
  artifact_type: ArtifactType;
  tags: string[] | null;
  source_url: string;
  source_label: string | null;
  source_hack_project_id: string | null;
  source_hackday_event_id: string | null;
  created_by_user_id: string;
  visibility: ArtifactVisibility | null;
  reuse_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  archived_at: string | null;
}

interface DbArtifactReuse {
  id: string;
  artifact_id: string;
  user_id: string;
  used_at: string;
  context_note: string | null;
}

interface DbProblem {
  id: string;
  title: string;
  description: string;
  frequency: ProblemFrequency;
  estimated_time_wasted_hours: number | null;
  team: string;
  domain: string;
  contact_details: string;
  status: ProblemStatus | null;
  moderation_state: ProblemModerationState | null;
  vote_count: number | null;
  flag_count: number | null;
  created_by_user_id: string;
  claimed_by_user_id: string | null;
  linked_hack_project_id: string | null;
  linked_artifact_id: string | null;
  auto_hidden_at: string | null;
  hidden_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DbProblemVote {
  id: string;
  problem_id: string;
  user_id: string;
  created_at: string;
}

interface DbProblemFlag {
  id: string;
  problem_id: string;
  user_id: string;
  reason: string | null;
  created_at: string;
}

interface DbProblemStatusHistory {
  id: string;
  problem_id: string;
  from_status: ProblemStatus | null;
  to_status: ProblemStatus;
  changed_by_user_id: string;
  change_note: string | null;
  linked_hack_project_id: string | null;
  linked_artifact_id: string | null;
  created_at: string;
}

interface DbProblemModerationLog {
  id: string;
  problem_id: string;
  action: 'auto_hidden' | 'remove' | 'reinstate';
  changed_by_user_id: string | null;
  note: string | null;
  created_at: string;
}

interface DbEvent {
  id: string;
  name: string;
  icon: string | null;
  tagline: string | null;
  timezone: string | null;
  lifecycle_status: LifecycleStatus;
  confluence_page_id: string;
  confluence_page_url: string | null;
  confluence_parent_page_id: string | null;
  hacking_starts_at: string | null;
  submission_deadline_at: string | null;
  creation_request_id: string | null;
  created_by_user_id: string | null;
  event_rules: EventRules | null;
  event_branding: EventBranding | null;
  event_schedule: EventSchedule | null;
  runtime_type: InstanceRuntime | null;
  template_target: 'hackday' | null;
}
type DbEventLegacyCore = Omit<
  DbEvent,
  'event_rules' | 'event_branding' | 'event_schedule' | 'runtime_type' | 'template_target'
>;

interface DbEventAdmin {
  id: string;
  event_id: string;
  user_id: string;
  role: 'primary' | 'co_admin';
}

interface DbSyncState {
  event_id: string;
  sync_status: SyncStatus;
  last_error: string | null;
  last_attempt_at: string | null;
  pushed_count: number | null;
  skipped_count: number | null;
}

interface DbEventAuditLogRetentionRow {
  id: string;
  created_at: string | null;
}

interface DbHackdayTemplateSeed {
  id: string;
  confluence_page_id: string;
  confluence_parent_page_id: string;
  hdc_event_id: string;
  template_name: string;
  primary_admin_email: string;
  co_admin_emails: string[] | null;
  seed_payload: Record<string, unknown> | null;
  hackday_event_id: string | null;
  provision_status: 'provisioned' | 'initialized' | 'failed';
  created_at: string;
  updated_at: string;
  initialized_at: string | null;
}

export interface MigrationEventCandidate {
  id: string;
  name: string;
  icon: string | null;
  lifecycle_status: LifecycleStatus;
  confluence_page_id: string;
  confluence_page_url: string | null;
  confluence_parent_page_id: string | null;
  creation_request_id: string | null;
}

function asVisibility(value: string | null | undefined): Visibility {
  if (value === 'private' || value === 'public') return value;
  return 'org';
}

function nowIso(): string {
  return new Date().toISOString();
}

function durationMsSince(startedAtMs: number): number {
  return Math.max(0, Date.now() - startedAtMs);
}

function logRegistryLookupTelemetry(input: {
  source: 'listAllEvents' | 'listEventsByParentPageId';
  parentPageId?: string;
  durationMs: number;
  rowCount?: number;
  usedLegacyConfigFallback: boolean;
  outcome: 'success' | 'error';
  warning?: string;
}): void {
  console.info(
    '[hdc-performance-telemetry]',
    JSON.stringify({
      metric: 'registry_lookup',
      ...input,
    })
  );
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}

function calculateRatioPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return roundMetric((numerator / denominator) * 100);
}

function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const ordered = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) {
    return roundMetric(ordered[middle]);
  }
  return roundMetric((ordered[middle - 1] + ordered[middle]) / 2);
}

function calculateDaysBetween(startIso: string, endIso: string): number | null {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return (end - start) / (1000 * 60 * 60 * 24);
}

function toStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function toExperienceLabel(level: string | null): string | null {
  if (!level) return null;
  return EXPERIENCE_LABELS[level] ?? level;
}

function isArtifactType(value: unknown): value is ArtifactType {
  return (
    value === 'skill' ||
    value === 'prompt' ||
    value === 'template' ||
    value === 'learning' ||
    value === 'code_snippet' ||
    value === 'other'
  );
}

function isProblemFrequency(value: unknown): value is ProblemFrequency {
  return value === 'daily' || value === 'weekly' || value === 'monthly';
}

function isProblemStatus(value: unknown): value is ProblemStatus {
  return value === 'open' || value === 'claimed' || value === 'solved' || value === 'closed';
}

function isPathwayStepType(value: unknown): value is PathwayStepType {
  return value === 'read' || value === 'try' || value === 'build';
}

function normalizeProblemModerationState(value: unknown): ProblemModerationState {
  if (value === 'hidden_pending_review' || value === 'removed') {
    return value;
  }
  return 'visible';
}

function normalizeArtifactVisibility(value: unknown): ArtifactVisibility {
  if (value === 'private' || value === 'public') return value;
  return 'org';
}

function isPipelineStage(value: unknown): value is PipelineStage {
  return (
    value === 'hack' ||
    value === 'validated_prototype' ||
    value === 'incubating_project' ||
    value === 'product_candidate'
  );
}

function mapProjectStatusToPipelineStage(status: string | null | undefined): PipelineStage {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'incubation') return 'incubating_project';
  if (normalized === 'building' || normalized === 'in_progress') return 'validated_prototype';
  if (normalized === 'completed' || normalized === 'verified') return 'product_candidate';
  return 'hack';
}

function resolveProjectPipelineStage(project: DbProject): PipelineStage {
  if (isPipelineStage(project.pipeline_stage)) return project.pipeline_stage;
  return mapProjectStatusToPipelineStage(project.status);
}

function defaultPipelineStageCriteria(): PipelineStageCriteria[] {
  return [
    {
      stage: 'hack',
      label: 'Hack',
      description: 'Submitted and demoed.',
      criteria: ['Demo exists', 'Problem Exchange link if applicable'],
    },
    {
      stage: 'validated_prototype',
      label: 'Validated Prototype',
      description: 'Tested with real users and evidence of value.',
      criteria: ['At least 3 people outside the original team have tried it', 'At least 1 piece of qualitative feedback collected'],
    },
    {
      stage: 'incubating_project',
      label: 'Incubating Project',
      description: 'Allocated time/resources with active development.',
      criteria: ['Evidence of repeated use (not only demo usage)', 'Named owner committed to ongoing development', 'Endorsement from at least 1 team lead outside the builder team'],
    },
    {
      stage: 'product_candidate',
      label: 'Product Candidate',
      description: 'Business case, sponsor, and roadmap identified.',
      criteria: ['Business case drafted', 'Target internal user base or market identified', 'Technical feasibility confirmed', 'Named leadership sponsor'],
    },
  ];
}

function defaultPipelineStageCriteriaByStage(): Record<PipelineStage, PipelineStageCriteria> {
  const defaults = defaultPipelineStageCriteria();
  const map = {} as Record<PipelineStage, PipelineStageCriteria>;
  for (const item of defaults) {
    map[item.stage] = item;
  }
  return map;
}

function normalizeArtifactTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeArtifactTags(tags: string[]): string[] {
  const normalized = tags
    .map((tag) => normalizeArtifactTag(tag))
    .filter((tag) => tag.length >= 2 && tag.length <= 32);
  return [...new Set(normalized)].slice(0, 12);
}

function normalizeShowcaseTags(tags: string[]): string[] {
  return normalizeArtifactTags(tags).slice(0, 16);
}

function normalizeShowcaseTeamMembers(teamMembers: string[]): string[] {
  const normalized = teamMembers
    .map((member) => member.trim())
    .filter((member) => member.length >= 2 && member.length <= 80);
  return [...new Set(normalized)].slice(0, 12);
}

function normalizeShowcaseLinkedArtifactIds(linkedArtifactIds: string[]): string[] {
  const normalized = linkedArtifactIds
    .map((artifactId) => artifactId.trim())
    .filter((artifactId) => artifactId.length > 0);
  return [...new Set(normalized)].slice(0, 24);
}

function normalizeShowcaseStatus(project: DbProject): ShowcaseHackStatus {
  const status = project.status.trim().toLowerCase();
  if (status === 'completed' || status === 'verified') {
    return 'completed';
  }
  return 'in_progress';
}

function isShowcaseHackStatus(value: unknown): value is ShowcaseHackStatus {
  return value === 'completed' || value === 'in_progress';
}

function isDuplicateArtifactReuseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const normalized = normalizeSupabaseErrorMessage(error).toLowerCase();
  return normalized.includes('duplicate key value violates unique constraint');
}

function isDuplicateProblemVoteError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const normalized = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    normalized.includes('duplicate key value violates unique constraint') &&
    (normalized.includes('problemvote') || normalized.includes('problem_vote'))
  );
}

function isDuplicateProblemFlagError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const normalized = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    normalized.includes('duplicate key value violates unique constraint') &&
    (normalized.includes('problemflag') || normalized.includes('problem_flag'))
  );
}

function createRegistryValidationError(message: string): Error {
  return new Error(`[ARTIFACT_VALIDATION_FAILED] ${message}`);
}

function createProblemValidationError(message: string): Error {
  return new Error(`[PROBLEM_VALIDATION_FAILED] ${message}`);
}

function createPipelineValidationError(message: string): Error {
  return new Error(`[PIPELINE_VALIDATION_FAILED] ${message}`);
}

function createShowcaseValidationError(message: string): Error {
  return new Error(`[SHOWCASE_VALIDATION_FAILED] ${message}`);
}

function createPathwayValidationError(message: string): Error {
  return new Error(`[PATHWAY_VALIDATION_FAILED] ${message}`);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function logProblemExchangeTelemetry(
  metric: string,
  payload: Record<string, unknown>
): void {
  console.info(
    '[hdc-problem-exchange-telemetry]',
    JSON.stringify({
      metric,
      source: 'supabase_repository',
      ...payload,
    })
  );
}

function logPipelineTelemetry(metric: string, payload: Record<string, unknown>): void {
  console.info(
    '[hdc-pipeline-telemetry]',
    JSON.stringify({
      metric,
      source: 'supabase_repository',
      ...payload,
    })
  );
}

function logPhase2Telemetry(metric: string, payload: Record<string, unknown>): void {
  console.info(
    '[hdc-phase2-telemetry]',
    JSON.stringify({
      metric,
      source: 'supabase_repository',
      ...payload,
    })
  );
}

function createArtifactListItem(row: DbArtifact, authorName: string): ArtifactListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    artifactType: row.artifact_type,
    tags: row.tags ?? [],
    sourceUrl: row.source_url,
    sourceLabel: row.source_label ?? undefined,
    sourceHackProjectId: row.source_hack_project_id ?? undefined,
    sourceHackdayEventId: row.source_hackday_event_id ?? undefined,
    visibility: normalizeArtifactVisibility(row.visibility),
    reuseCount: row.reuse_count ?? 0,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
    authorName,
  };
}

function createProblemListItem(row: DbProblem, createdByName: string): ProblemListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    frequency: isProblemFrequency(row.frequency) ? row.frequency : 'weekly',
    estimatedTimeWastedHours: row.estimated_time_wasted_hours ?? 0,
    team: row.team,
    domain: row.domain,
    contactDetails: row.contact_details,
    status: isProblemStatus(row.status) ? row.status : 'open',
    moderationState: normalizeProblemModerationState(row.moderation_state),
    voteCount: row.vote_count ?? 0,
    flagCount: row.flag_count ?? 0,
    linkedHackProjectId: row.linked_hack_project_id ?? undefined,
    linkedArtifactId: row.linked_artifact_id ?? undefined,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
    createdByName,
  };
}

function createProblemImportCandidate(row: DbProblem, createdByName: string): ProblemImportCandidate {
  return {
    problemId: row.id,
    title: row.title,
    description: row.description,
    status: isProblemStatus(row.status) ? row.status : 'open',
    voteCount: row.vote_count ?? 0,
    estimatedTimeWastedHours: row.estimated_time_wasted_hours ?? 0,
    team: row.team,
    domain: row.domain,
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
    createdByName,
  };
}

function createPathwayStep(row: DbPathwayStep): PathwayStep {
  const position = Number.isFinite(row.position) ? Math.max(1, Number(row.position)) : 1;
  return {
    stepId: row.id,
    position,
    type: isPathwayStepType(row.step_type) ? row.step_type : 'read',
    title: row.title,
    description: row.description ?? '',
    linkedHackProjectId: row.linked_hack_project_id ?? undefined,
    linkedArtifactId: row.linked_artifact_id ?? undefined,
    externalUrl: row.external_url ?? undefined,
    challengePrompt: row.challenge_prompt ?? undefined,
    isOptional: row.is_optional === true,
  };
}

function createPathwayProgressSnapshot(steps: PathwayStep[], completions: DbPathwayProgress[]): PathwayProgressSnapshot {
  const completedSet = new Set(completions.map((row) => row.step_id));
  const completedStepIds = steps
    .map((step) => step.stepId)
    .filter((stepId) => completedSet.has(stepId));
  const totalSteps = steps.length;
  const completedSteps = completedStepIds.length;
  const completionPercent = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
  return {
    completedStepIds,
    completedSteps,
    totalSteps,
    completionPercent,
  };
}

function createPathwayListItem(
  row: DbPathway,
  steps: PathwayStep[],
  updatedByName: string,
  progress: PathwayProgressSnapshot
): PathwayListItem {
  return {
    pathwayId: row.id,
    title: row.title,
    summary: row.summary ?? '',
    introText: row.intro_text ?? '',
    domain: row.domain ?? null,
    role: row.role ?? null,
    tags: row.tags ?? [],
    stepCount: steps.length,
    published: row.published !== false,
    recommended: row.recommended === true,
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
    updatedByName,
    progress,
  };
}

function buildRecognitionSnapshot(input: {
  calculatedAt: string;
  users: DbUser[];
  projects: DbProject[];
  artifacts: DbArtifact[];
  problems: DbProblem[];
  pathwayProgressRows: Record<string, unknown>[];
  viewerAccountId: string;
}): RecognitionSnapshot {
  const { calculatedAt, users, projects, artifacts, problems, pathwayProgressRows, viewerAccountId } = input;
  const normalizedMentorRows = users.map((user) => {
    const mentorSessionsUsed = isFiniteNumber(user.mentor_sessions_used)
      ? Math.max(0, Math.floor(user.mentor_sessions_used))
      : 0;
    return {
      userId: user.id,
      userName: user.full_name || user.email,
      mentorSessionsUsed,
    };
  });

  const qualifiedMentorChampionCount = normalizedMentorRows.filter(
    (row) => row.mentorSessionsUsed >= RECOGNITION_MENTOR_BADGE_THRESHOLD
  ).length;

  const leaderboardRows = normalizedMentorRows
    .filter((row) => row.mentorSessionsUsed > 0)
    .sort((a, b) => {
      if (a.mentorSessionsUsed !== b.mentorSessionsUsed) return b.mentorSessionsUsed - a.mentorSessionsUsed;
      if (a.userName !== b.userName) return a.userName.localeCompare(b.userName);
      return a.userId.localeCompare(b.userId);
    })
    .slice(0, RECOGNITION_SEGMENT_LEADERBOARD_LIMIT)
    .map((row, index) => ({
      userId: row.userId,
      userName: row.userName,
      mentorSessionsUsed: row.mentorSessionsUsed,
      rank: index + 1,
      qualifiesMentorChampion: row.mentorSessionsUsed >= RECOGNITION_MENTOR_BADGE_THRESHOLD,
    }));

  const pathwayByUserId = new Map<
    string,
    {
      distinctPathwayIds: Set<string>;
      completedStepCount: number;
      lastCompletedAt: string | null;
      lastCompletedAtMs: number;
    }
  >();
  for (const row of pathwayProgressRows) {
    const userId = getStringField(row, ['user_id', 'userId']);
    if (!userId) continue;
    const pathwayId = getStringField(row, ['pathway_id', 'pathwayId']);
    const completedAt =
      getStringField(row, ['completed_at', 'completedAt']) ?? getStringField(row, ['created_at', 'createdAt']);
    const existing = pathwayByUserId.get(userId) ?? {
      distinctPathwayIds: new Set<string>(),
      completedStepCount: 0,
      lastCompletedAt: null,
      lastCompletedAtMs: Number.NEGATIVE_INFINITY,
    };
    if (pathwayId) {
      existing.distinctPathwayIds.add(pathwayId);
    }
    existing.completedStepCount += 1;
    const completedAtMs = completedAt ? Date.parse(completedAt) : Number.NaN;
    if (Number.isFinite(completedAtMs) && completedAtMs > existing.lastCompletedAtMs) {
      existing.lastCompletedAtMs = completedAtMs;
      existing.lastCompletedAt = completedAt;
    }
    pathwayByUserId.set(userId, existing);
  }

  const normalizedPathwayRows = users.map((user) => {
    const pathway = pathwayByUserId.get(user.id);
    const distinctPathwayCount = pathway ? pathway.distinctPathwayIds.size : 0;
    const completedStepCount = pathway ? pathway.completedStepCount : 0;
    return {
      userId: user.id,
      userName: user.full_name || user.email,
      distinctPathwayCount,
      completedStepCount,
      lastCompletedAt: pathway?.lastCompletedAt ?? null,
    };
  });

  const qualifiedPathwayContributorCount = normalizedPathwayRows.filter(
    (row) => row.distinctPathwayCount >= RECOGNITION_PATHWAY_BADGE_THRESHOLD_DISTINCT_PATHWAYS
  ).length;

  const pathwayLeaderboardRows = normalizedPathwayRows
    .filter((row) => row.completedStepCount > 0)
    .sort((a, b) => {
      if (a.distinctPathwayCount !== b.distinctPathwayCount) return b.distinctPathwayCount - a.distinctPathwayCount;
      if (a.completedStepCount !== b.completedStepCount) return b.completedStepCount - a.completedStepCount;
      if (a.userName !== b.userName) return a.userName.localeCompare(b.userName);
      return a.userId.localeCompare(b.userId);
    })
    .slice(0, RECOGNITION_SEGMENT_LEADERBOARD_LIMIT)
    .map((row, index) => ({
      userId: row.userId,
      userName: row.userName,
      distinctPathwayCount: row.distinctPathwayCount,
      completedStepCount: row.completedStepCount,
      lastCompletedAt: row.lastCompletedAt,
      rank: index + 1,
      qualifiesPathwayContributor:
        row.distinctPathwayCount >= RECOGNITION_PATHWAY_BADGE_THRESHOLD_DISTINCT_PATHWAYS,
    }));

  const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));

  const buildersCounter = new Map<string, number>();
  for (const project of projects) {
    if (project.source_type !== 'hack_submission' || !project.owner_id) continue;
    buildersCounter.set(project.owner_id, (buildersCounter.get(project.owner_id) ?? 0) + 1);
  }

  const sharersCounter = new Map<string, number>();
  const artifactReuseByAuthorCounter = new Map<string, number>();
  for (const artifact of artifacts) {
    if (artifact.archived_at) continue;
    sharersCounter.set(artifact.created_by_user_id, (sharersCounter.get(artifact.created_by_user_id) ?? 0) + 1);
    artifactReuseByAuthorCounter.set(
      artifact.created_by_user_id,
      (artifactReuseByAuthorCounter.get(artifact.created_by_user_id) ?? 0) + Math.max(0, artifact.reuse_count ?? 0)
    );
  }

  const solversCounter = new Map<string, number>();
  for (const problem of problems) {
    if (problem.status !== 'solved' || !problem.claimed_by_user_id) continue;
    solversCounter.set(problem.claimed_by_user_id, (solversCounter.get(problem.claimed_by_user_id) ?? 0) + 1);
  }

  const buildSegmentLeaderboard = (counter: Map<string, number>, tieBreaker?: (userId: string) => number) =>
    Array.from(counter.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => {
        if (a[1] !== b[1]) return b[1] - a[1];
        const tieA = tieBreaker ? tieBreaker(a[0]) : 0;
        const tieB = tieBreaker ? tieBreaker(b[0]) : 0;
        if (tieA !== tieB) return tieB - tieA;
        const nameA = userNameById.get(a[0]) ?? a[0];
        const nameB = userNameById.get(b[0]) ?? b[0];
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return a[0].localeCompare(b[0]);
      })
      .slice(0, RECOGNITION_SEGMENT_LEADERBOARD_LIMIT)
      .map(([userId, count], index) => ({
        userId,
        userName: userNameById.get(userId) ?? userId,
        count,
        rank: index + 1,
      }));

  const buildersLeaderboard = buildSegmentLeaderboard(buildersCounter);
  const sharersLeaderboard = buildSegmentLeaderboard(sharersCounter, (userId) =>
    artifactReuseByAuthorCounter.get(userId) ?? 0
  );
  const solversLeaderboard = buildSegmentLeaderboard(solversCounter);
  const mentorsLeaderboard = leaderboardRows.map((entry) => ({
    userId: entry.userId,
    userName: entry.userName,
    count: entry.mentorSessionsUsed,
    rank: entry.rank,
  }));

  const viewerUser =
    users.find((user) => user.id === viewerAccountId) ??
    users.find((user) => user.atlassian_account_id === viewerAccountId) ??
    null;
  const viewerUserId = viewerUser?.id ?? null;

  const viewerArtifactCount = viewerUserId
    ? artifacts.filter((artifact) => !artifact.archived_at && artifact.created_by_user_id === viewerUserId).length
    : 0;
  const viewerArtifactReuseCount = viewerUserId ? artifactReuseByAuthorCounter.get(viewerUserId) ?? 0 : 0;
  const viewerSolvedLinkedProblemCount = viewerUserId
    ? problems.filter(
        (problem) =>
          problem.status === 'solved' &&
          problem.claimed_by_user_id === viewerUserId &&
          Boolean(problem.linked_hack_project_id || problem.linked_artifact_id)
      ).length
    : 0;
  const viewerMentorSessionsUsed =
    viewerUser && isFiniteNumber(viewerUser.mentor_sessions_used) ? Math.max(0, Math.floor(viewerUser.mentor_sessions_used)) : 0;
  const viewerPathwayDistinctCount = viewerUserId ? pathwayByUserId.get(viewerUserId)?.distinctPathwayIds.size ?? 0 : 0;

  return {
    mentorSignal: {
      calculatedAt,
      policyVersion: 'r8-mentor-sessions-used-v1',
      policySource: 'User.mentor_sessions_used',
      badgeThreshold: RECOGNITION_MENTOR_BADGE_THRESHOLD,
      leaderboardLimit: RECOGNITION_MENTOR_LEADERBOARD_LIMIT,
      leaderboard: leaderboardRows,
      qualifiedMentorChampionCount,
    },
    pathwaySignal: {
      calculatedAt,
      policyVersion: 'r8-pathway-completion-v1',
      policySource: 'PathwayProgress',
      badgeThresholdDistinctPathways: RECOGNITION_PATHWAY_BADGE_THRESHOLD_DISTINCT_PATHWAYS,
      leaderboardLimit: RECOGNITION_PATHWAY_LEADERBOARD_LIMIT,
      leaderboard: pathwayLeaderboardRows,
      qualifiedPathwayContributorCount,
    },
    leaderboards: {
      builders: buildersLeaderboard,
      sharers: sharersLeaderboard,
      solvers: solversLeaderboard,
      mentors: mentorsLeaderboard,
    },
    viewerBadges: {
      firstArtifactPublished: viewerArtifactCount >= 1,
      firstProblemSolved: viewerSolvedLinkedProblemCount >= 1,
      fiveArtifactsReused: viewerArtifactReuseCount >= 5,
      mentoredThreePeople: viewerMentorSessionsUsed >= RECOGNITION_MENTOR_BADGE_THRESHOLD,
      contributedToPathway: viewerPathwayDistinctCount >= RECOGNITION_PATHWAY_BADGE_THRESHOLD_DISTINCT_PATHWAYS,
    },
  };
}

function buildTeamPulseMetrics(input: {
  calculatedAt: string;
  users: DbUser[];
  projects: DbProject[];
  artifacts: DbArtifact[];
  artifactReuses: Record<string, unknown>[];
  problems: DbProblem[];
  teamRows: Record<string, unknown>[];
  teamMemberRows: Record<string, unknown>[];
}): TeamPulseMetrics {
  const { calculatedAt, users, projects, artifacts, artifactReuses, problems, teamRows, teamMemberRows } = input;

  const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));
  const teamLabelById = new Map<string, string>();
  for (const row of teamRows) {
    const teamId = getStringField(row, ['id']);
    if (!teamId) continue;
    const label =
      getStringField(row, ['name', 'title', 'display_name', 'slug']) ??
      `Team ${teamId.slice(Math.max(0, teamId.length - 6))}`;
    teamLabelById.set(teamId, label);
  }

  const rolePriority = (role: string | null): number => {
    if (!role) return 4;
    const normalized = role.trim().toLowerCase();
    if (normalized === 'owner') return 0;
    if (normalized === 'admin') return 1;
    if (normalized === 'lead') return 2;
    if (normalized === 'member') return 3;
    return 4;
  };

  const membershipSortTime = (value: string | null): number => {
    if (!value) return Number.POSITIVE_INFINITY;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  };

  const membershipsByUserId = new Map<
    string,
    Array<{ teamId: string; rolePriority: number; createdAtMs: number; sourceIndex: number }>
  >();
  for (let index = 0; index < teamMemberRows.length; index += 1) {
    const row = teamMemberRows[index];
    const userId = getStringField(row, ['user_id', 'userId']);
    const teamId = getStringField(row, ['team_id', 'teamId']);
    const status = getStringField(row, ['status'])?.trim().toLowerCase() ?? null;
    if (!userId || !teamId) continue;
    if (status && status !== 'accepted') continue;
    const createdAt = getStringField(row, ['created_at', 'createdAt']);
    const existing = membershipsByUserId.get(userId) ?? [];
    existing.push({
      teamId,
      rolePriority: rolePriority(getStringField(row, ['role'])),
      createdAtMs: membershipSortTime(createdAt),
      sourceIndex: index,
    });
    membershipsByUserId.set(userId, existing);
  }

  const userPrimaryTeamId = new Map<string, string>();
  for (const [userId, memberships] of membershipsByUserId) {
    memberships.sort((a, b) => {
      if (a.rolePriority !== b.rolePriority) return a.rolePriority - b.rolePriority;
      if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
      if (a.teamId !== b.teamId) return a.teamId.localeCompare(b.teamId);
      return a.sourceIndex - b.sourceIndex;
    });
    const primary = memberships[0];
    if (primary) {
      userPrimaryTeamId.set(userId, primary.teamId);
    }
  }

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));

  const activeArtifacts = artifacts.filter((artifact) => !artifact.archived_at);
  const totalArtifactCount = activeArtifacts.length;
  const reusedArtifactCount = activeArtifacts.filter((artifact) => Math.max(0, artifact.reuse_count ?? 0) > 0).length;
  const reuseRatePct = calculateRatioPercent(reusedArtifactCount, totalArtifactCount);

  const resolveTeamLabel = (teamId: string): string => {
    if (teamId.startsWith('user:')) {
      const userId = teamId.slice(5);
      return userNameById.get(userId) ?? userId;
    }
    return teamLabelById.get(teamId) ?? teamId;
  };

  const edgeCounter = new Map<string, { sourceTeamId: string; targetTeamId: string; reuseCount: number }>();
  for (const reuseRow of artifactReuses) {
    const artifactId = getStringField(reuseRow, ['artifact_id', 'artifactId']);
    const userId = getStringField(reuseRow, ['user_id', 'userId']);
    if (!artifactId || !userId) continue;

    const artifact = artifactById.get(artifactId);
    if (!artifact || artifact.archived_at) continue;
    const sourceProjectId = artifact.source_hack_project_id;
    if (!sourceProjectId) continue;

    const sourceProject = projectById.get(sourceProjectId);
    if (!sourceProject) continue;
    const sourceTeamId = sourceProject.team_id ?? (sourceProject.owner_id ? `user:${sourceProject.owner_id}` : null);
    const targetTeamId = userPrimaryTeamId.get(userId) ?? `user:${userId}`;
    if (!sourceTeamId || sourceTeamId === targetTeamId) continue;

    const edgeKey = `${sourceTeamId}::${targetTeamId}`;
    const existing = edgeCounter.get(edgeKey);
    if (existing) {
      existing.reuseCount += 1;
    } else {
      edgeCounter.set(edgeKey, { sourceTeamId, targetTeamId, reuseCount: 1 });
    }
  }

  const crossTeamAdoptionCount = Array.from(edgeCounter.values()).reduce((sum, edge) => sum + edge.reuseCount, 0);
  const crossTeamAdoptionEdges = Array.from(edgeCounter.values())
    .map((edge) => ({
      sourceTeamId: edge.sourceTeamId,
      sourceTeamLabel: resolveTeamLabel(edge.sourceTeamId),
      targetTeamId: edge.targetTeamId,
      targetTeamLabel: resolveTeamLabel(edge.targetTeamId),
      reuseCount: edge.reuseCount,
    }))
    .sort((a, b) => b.reuseCount - a.reuseCount)
    .slice(0, 24);

  const firstHackAtByUser = new Map<string, string>();
  for (const project of projects) {
    if (project.source_type !== 'hack_submission' || !project.owner_id || !project.created_at) continue;
    const current = firstHackAtByUser.get(project.owner_id);
    if (!current || project.created_at < current) {
      firstHackAtByUser.set(project.owner_id, project.created_at);
    }
  }

  const leadTimeSamples: Array<{ firstHackAt: string; days: number }> = [];
  for (const user of users) {
    const firstHackAt = firstHackAtByUser.get(user.id);
    const joinedAt = user.created_at ?? user.createdAt ?? null;
    if (!firstHackAt || !joinedAt) continue;
    const days = calculateDaysBetween(joinedAt, firstHackAt);
    if (days === null) continue;
    leadTimeSamples.push({ firstHackAt, days });
  }

  const timeToFirstHackMedianDays = calculateMedian(leadTimeSamples.map((sample) => sample.days));
  const timeToFirstHackSampleSize = leadTimeSamples.length;

  const trendBuckets = new Map<string, number[]>();
  for (const sample of leadTimeSamples) {
    const month = sample.firstHackAt.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const existing = trendBuckets.get(month) ?? [];
    existing.push(sample.days);
    trendBuckets.set(month, existing);
  }

  const timeToFirstHackTrend = Array.from(trendBuckets.keys())
    .sort()
    .slice(-6)
    .map((month) => {
      const values = trendBuckets.get(month) ?? [];
      return {
        periodStart: `${month}-01T00:00:00.000Z`,
        periodLabel: month,
        medianDays: calculateMedian(values),
        sampleSize: values.length,
      };
    });

  const visibleProblems = problems.filter((problem) => normalizeProblemModerationState(problem.moderation_state) !== 'removed');
  const totalProblemCount = visibleProblems.length;
  const solvedProblemCount = visibleProblems.filter((problem) => problem.status === 'solved').length;
  const problemConversionPct = calculateRatioPercent(solvedProblemCount, totalProblemCount);

  return {
    calculatedAt,
    reuseRatePct,
    reusedArtifactCount,
    totalArtifactCount,
    crossTeamAdoptionCount,
    crossTeamAdoptionEdges,
    timeToFirstHackMedianDays,
    timeToFirstHackSampleSize,
    timeToFirstHackTrend,
    problemConversionPct,
    solvedProblemCount,
    totalProblemCount,
  };
}

function createPipelineBoardItem(project: DbProject, ownerName: string): PipelineBoardItem {
  const stage = resolveProjectPipelineStage(project);
  const enteredStageAt = project.pipeline_stage_entered_at ?? project.created_at ?? nowIso();
  const enteredMs = Date.parse(enteredStageAt);
  const daysInStage = Number.isNaN(enteredMs)
    ? 0
    : Math.max(0, Math.floor((Date.now() - enteredMs) / (24 * 60 * 60 * 1000)));

  return {
    projectId: project.id,
    title: project.title,
    description: project.description ?? '',
    ownerName,
    stage,
    status: project.status,
    statusLabel: toStatusLabel(project.status),
    daysInStage,
    attachedHacksCount: 0,
    commentCount: 0,
    timeSavedEstimate: project.time_saved_estimate ?? null,
    visibility: asVisibility(project.visibility),
    enteredStageAt,
    updatedAt: project.created_at ?? enteredStageAt,
  };
}

function createShowcaseHackListItem(input: {
  project: DbProject;
  metadata: DbShowcaseHack | null;
  authorName: string;
  reuseCount: number;
}): ShowcaseHackListItem {
  const { project, metadata, authorName, reuseCount } = input;
  const linkedArtifactIds = normalizeShowcaseLinkedArtifactIds(metadata?.linked_artifact_ids ?? []);
  return {
    projectId: project.id,
    title: project.title,
    description: project.description ?? '',
    assetType: (project.hack_type ?? 'prompt') as ShowcaseHackListItem['assetType'],
    status: normalizeShowcaseStatus(project),
    featured: metadata?.featured === true,
    authorName,
    visibility: asVisibility(project.visibility),
    tags: normalizeShowcaseTags(metadata?.tags ?? []),
    sourceEventId: metadata?.source_event_id ?? project.event_id ?? undefined,
    demoUrl: metadata?.demo_url ?? undefined,
    pipelineStage: resolveProjectPipelineStage(project),
    reuseCount: Math.max(0, Math.floor(reuseCount)),
    teamMembersCount: normalizeShowcaseTeamMembers(metadata?.team_members ?? []).length,
    linkedArtifactsCount: linkedArtifactIds.length,
    createdAt: project.created_at ?? metadata?.created_at ?? nowIso(),
    updatedAt: metadata?.updated_at ?? project.created_at ?? nowIso(),
  };
}

function buildPipelineMetrics(items: PipelineBoardItem[]): PipelineMetrics {
  const counts: Record<PipelineStage, number> = {
    hack: 0,
    validated_prototype: 0,
    incubating_project: 0,
    product_candidate: 0,
  };
  const days: Record<PipelineStage, number[]> = {
    hack: [],
    validated_prototype: [],
    incubating_project: [],
    product_candidate: [],
  };

  for (const item of items) {
    counts[item.stage] += 1;
    days[item.stage].push(item.daysInStage);
  }

  const average = (values: number[]): number => {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  };

  const asRate = (numerator: number, denominator: number): number => {
    if (denominator <= 0) return 0;
    return (numerator / denominator) * 100;
  };

  return {
    itemsPerStage: PIPELINE_STAGES.map((stage) => ({ stage, count: counts[stage] })),
    averageDaysInStage: PIPELINE_STAGES.map((stage) => ({ stage, averageDays: average(days[stage]) })),
    conversionHackToValidated: asRate(counts.validated_prototype, counts.hack),
    conversionValidatedToIncubating: asRate(counts.incubating_project, counts.validated_prototype),
    conversionIncubatingToCandidate: asRate(counts.product_candidate, counts.incubating_project),
    totalEntered: items.length,
    totalGraduated: counts.product_candidate,
  };
}

function asSyncState(row: DbSyncState): EventSyncState {
  const guidance = getSyncGuidance(row.sync_status, row.last_error);
  return {
    eventId: row.event_id,
    syncStatus: row.sync_status,
    lastError: row.last_error,
    lastAttemptAt: row.last_attempt_at,
    pushedCount: row.pushed_count ?? 0,
    skippedCount: row.skipped_count ?? 0,
    ...guidance,
  };
}

function eventCompletionReferenceMs(event: DbEvent): number | null {
  const schedule = asEventSchedule(event.event_schedule, {
    timezone: event.timezone,
    hackingStartsAt: event.hacking_starts_at,
    submissionDeadlineAt: event.submission_deadline_at,
  });
  const candidates = [
    schedule.resultsAnnounceAt,
    schedule.votingEndsAt,
    schedule.submissionDeadlineAt,
    schedule.hackingStartsAt,
    event.submission_deadline_at,
    event.hacking_starts_at,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function shouldAutoArchiveCompletedEvent(event: DbEvent, nowMs: number): boolean {
  if (event.lifecycle_status !== 'completed') return false;
  const referenceMs = eventCompletionReferenceMs(event);
  if (referenceMs === null || referenceMs > nowMs) return false;
  const ageMs = nowMs - referenceMs;
  return ageMs > EVENT_AUTO_ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

function toReputationTier(score: number): DerivedProfileSnapshot['reputationTier'] {
  if (score >= 200) return 'platinum';
  if (score >= 120) return 'gold';
  if (score >= 60) return 'silver';
  return 'bronze';
}

function getSyncGuidance(syncStatus: SyncStatus, lastError: string | null): {
  syncErrorCategory: SyncErrorCategory;
  retryable: boolean;
  retryGuidance: string | null;
} {
  if (syncStatus === 'complete' || syncStatus === 'not_started' || syncStatus === 'in_progress') {
    return {
      syncErrorCategory: 'none',
      retryable: false,
      retryGuidance: null,
    };
  }

  if (syncStatus === 'partial') {
    return {
      syncErrorCategory: 'partial_failure',
      retryable: true,
      retryGuidance: 'Some hacks did not sync. Retry sync now; if failures repeat, review recent project updates and retry.',
    };
  }

  const message = (lastError ?? '').toLowerCase();
  if (
    message.includes('failed to sync') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('network') ||
    message.includes('connection')
  ) {
    return {
      syncErrorCategory: 'transient',
      retryable: true,
      retryGuidance: 'This appears transient. Retry sync in a few seconds; if it persists, capture the error text and escalate.',
    };
  }

  return {
    syncErrorCategory: 'unknown',
    retryable: true,
    retryGuidance: 'Retry sync once. If the same error repeats, escalate with the event ID and timestamp.',
  };
}

function hasMissingEventConfigColumns(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('column') &&
    (message.includes('event_rules') ||
      message.includes('event_branding') ||
      message.includes('event_schedule') ||
      message.includes('runtime_type') ||
      message.includes('template_target'))
  );
}

function hasMissingTable(error: unknown, tableName: string): boolean {
  if (!(error instanceof Error)) return false;
  const normalized = normalizeSupabaseErrorMessage(error).toLowerCase();
  const table = tableName.toLowerCase();
  return (
    normalized.includes(`relation "${table}" does not exist`) ||
    normalized.includes(`could not find the table '${table}'`) ||
    normalized.includes(`failed to find table '${table}'`)
  );
}

function extractEventNotNullColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const match = normalized.match(
    /null value in column "([a-zA-Z0-9_]+)" of relation "Event" violates not-null constraint/i
  );
  return match ? match[1].toLowerCase() : null;
}

function extractMissingEventColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const quoted = normalized.match(/column\s+"Event"\."([a-zA-Z0-9_]+)"\s+does not exist/i);
  if (quoted) return quoted[1];
  const plain = normalized.match(/column\s+Event\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (plain) return plain[1];
  const pgrst = normalized.match(/Could not find the '([a-zA-Z0-9_]+)' column of 'Event' in the schema cache/i);
  if (pgrst) return pgrst[1];
  return null;
}

function hasLegacyEventRequiredFieldError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const normalized = normalizeSupabaseErrorMessage(error).toLowerCase();
  if (!normalized.includes('"code":"23502"') && !normalized.includes('23502')) {
    return false;
  }
  const notNullColumn = extractEventNotNullColumn(error);
  if (notNullColumn) {
    return (
      notNullColumn === 'id' ||
      notNullColumn === 'slug' ||
      notNullColumn === 'year' ||
      notNullColumn === 'phase' ||
      notNullColumn === 'rubric_config' ||
      notNullColumn === 'updated_at'
    );
  }
  return normalized.includes('failing row contains (null, null,');
}

function toEventSlug(eventName: string): string {
  const normalized = eventName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = (normalized || 'event').slice(0, 48);
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function buildLegacyEventRequiredFields(eventName: string): Record<string, unknown> {
  return {
    id: randomUUID(),
    slug: toEventSlug(eventName),
    year: new Date().getUTCFullYear(),
    phase: 'SETUP',
    rubric_config: {},
    updated_at: nowIso(),
    updatedAt: nowIso(),
  };
}

async function insertEventWithPrunedColumns<T>(
  insertFn: (payload: Record<string, unknown>) => Promise<T>,
  payload: Record<string, unknown>
): Promise<T> {
  const queue: Array<Record<string, unknown>> = [payload];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const candidate = queue.shift()!;
    const signature = JSON.stringify(
      Object.entries(candidate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, value ?? null])
    );
    if (seen.has(signature)) continue;
    seen.add(signature);

    try {
      return await insertFn(candidate);
    } catch (error) {
      const missingColumn = extractMissingEventColumn(error);
      if (missingColumn && missingColumn in candidate) {
        const withoutMissing = { ...candidate };
        delete withoutMissing[missingColumn];
        queue.push(withoutMissing);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to insert Event after pruning unsupported columns.');
}

function hasMissingProjectTitleColumn(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    (message.includes('does not exist') &&
      (message.includes('project.title') || message.includes('"project"."title"'))) ||
    message.includes("could not find the 'title' column of 'project' in the schema cache")
  );
}

function hasMissingProjectNameColumn(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    (message.includes('does not exist') &&
      (message.includes('project.name') || message.includes('"project"."name"'))) ||
    message.includes("could not find the 'name' column of 'project' in the schema cache")
  );
}

function hasMissingProjectColumn(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    ((message.includes('does not exist') &&
      (message.includes('project.') || message.includes('"project"."'))) ||
      (message.includes("could not find the '") &&
        message.includes("' column of 'project' in the schema cache")))
  );
}

function hasMissingUserRoleColumn(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    (message.includes('does not exist') &&
      (message.includes('user.role') || message.includes('"user"."role"'))) ||
    message.includes("could not find the 'role' column of 'user' in the schema cache")
  );
}

function hasMissingUserCreatedAtColumn(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    (message.includes('does not exist') &&
      (message.includes('user.created_at') || message.includes('"user"."created_at"'))) ||
    message.includes("could not find the 'created_at' column of 'user' in the schema cache")
  );
}

function extractMissingProjectColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const quoted = normalized.match(/column\s+"Project"\."([a-zA-Z0-9_]+)"\s+does not exist/i);
  if (quoted) return quoted[1];
  const plain = normalized.match(/column\s+Project\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (plain) return plain[1];
  const pgrst = normalized.match(/Could not find the '([a-zA-Z0-9_]+)' column of 'Project' in the schema cache/i);
  if (pgrst) return pgrst[1];
  return null;
}

function extractMissingMilestoneColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const quoted = normalized.match(/column\s+"Milestone"\."([a-zA-Z0-9_]+)"\s+does not exist/i);
  if (quoted) return quoted[1];
  const plain = normalized.match(/column\s+Milestone\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (plain) return plain[1];
  const pgrst = normalized.match(/Could not find the '([a-zA-Z0-9_]+)' column of 'Milestone' in the schema cache/i);
  if (pgrst) return pgrst[1];
  return null;
}

function extractProjectNotNullColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const match = normalized.match(
    /null value in column "([a-zA-Z0-9_]+)" of relation "Project" violates not-null constraint/i
  );
  return match ? match[1] : null;
}

function hasDuplicateProjectTeamId(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    (message.includes('23505') || message.includes('duplicate key value violates unique constraint')) &&
    (message.includes('"teamid"') || message.includes('(teamid)') || message.includes('teamid'))
  );
}

function hasProjectTeamForeignKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    (message.includes('23503') || message.includes('foreign key constraint')) &&
    (message.includes('"teamid"') || message.includes('(teamid)') || message.includes('teamid'))
  );
}

function normalizeSupabaseErrorMessage(error: Error): string {
  return error.message.replace(/\\+"/g, '"');
}

function extractMissingTeamColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const quoted = normalized.match(/column\s+"Team"\."([a-zA-Z0-9_]+)"\s+does not exist/i);
  if (quoted) return quoted[1];
  const plain = normalized.match(/column\s+Team\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (plain) return plain[1];
  const pgrst = normalized.match(/Could not find the '([a-zA-Z0-9_]+)' column of 'Team' in the schema cache/i);
  if (pgrst) return pgrst[1];
  return null;
}

function extractTeamNotNullColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const match = normalized.match(
    /null value in column "([a-zA-Z0-9_]+)" of relation "Team" violates not-null constraint/i
  );
  return match ? match[1] : null;
}

function defaultTeamFieldValue(column: string, teamId: string, ownerId: string | null, now: string): unknown {
  const col = column.toLowerCase();
  if (col === 'id') return teamId;
  if (col === 'teamid') return teamId;
  if (col === 'name' || col === 'title') return `Forge Team ${teamId.slice(-8)}`;
  if (col === 'createdat' || col === 'updatedat') return now;
  if (col === 'created_at' || col === 'updated_at') return now;
  if (col === 'ownerid' || col === 'owner_id') return ownerId ?? 'forge-system';
  if (col === 'description') return '';
  if (col === 'slug') return `forge-${teamId.slice(-8)}`;
  return null;
}

async function ensureLegacyTeamRecord(
  client: SupabaseRestClient,
  ownerId: string | null,
  preferredTeamId?: string
): Promise<string | null> {
  const teamId = preferredTeamId || generateLegacyTeamId();
  const now = nowIso();
  const baseName = `Forge Team ${teamId.slice(-8)}`;
  const queue: Array<Record<string, unknown>> = [
    { id: teamId, name: baseName, ownerId: ownerId ?? undefined, createdAt: now, updatedAt: now },
    { teamId, name: baseName, ownerId: ownerId ?? undefined, createdAt: now, updatedAt: now },
    { id: teamId, name: baseName, owner_id: ownerId ?? undefined, created_at: now, updated_at: now },
    { teamId, name: baseName, owner_id: ownerId ?? undefined, created_at: now, updated_at: now },
    { id: teamId, name: baseName, createdAt: now, updatedAt: now },
    { teamId, name: baseName, createdAt: now, updatedAt: now },
    { id: teamId, name: baseName },
    { teamId, name: baseName },
    { id: teamId },
    { teamId },
  ];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const candidate = queue.shift()!;
    const signature = JSON.stringify(
      Object.entries(candidate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, value ?? null])
    );
    if (seen.has(signature)) continue;
    seen.add(signature);

    try {
      await client.insert(TEAM_TABLE, candidate);
      return teamId;
    } catch (error) {
      if (error instanceof Error) {
        const normalized = normalizeSupabaseErrorMessage(error).toLowerCase();
        if (normalized.includes('23505') || normalized.includes('duplicate key value violates unique constraint')) {
          return teamId;
        }
      }

      const missingColumn = extractMissingTeamColumn(error);
      if (missingColumn && missingColumn in candidate) {
        const withoutMissing = { ...candidate };
        delete withoutMissing[missingColumn];
        queue.push(withoutMissing);
      }

      const notNullColumn = extractTeamNotNullColumn(error);
      if (notNullColumn && !(notNullColumn in candidate)) {
        const defaultValue = defaultTeamFieldValue(notNullColumn, teamId, ownerId, now);
        queue.push({
          ...candidate,
          [notNullColumn]: defaultValue,
        });
      }
    }
  }

  return null;
}

function generateLegacyTeamId(): string {
  return `confluence-team-${randomUUID()}`;
}

function getStringField(row: DbProjectRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') return value;
  }
  return null;
}

function getNumberField(row: DbProjectRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function getBooleanField(row: DbProjectRow, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'boolean') return value;
  }
  return null;
}

function getStringArrayField(row: DbProjectRow, keys: string[]): string[] | null {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
  }
  return null;
}

function normalizeProjectRow(row: DbProjectRow): DbProject {
  const submittedAt = getStringField(row, ['submitted_at']);
  const title = getStringField(row, ['title', 'name']) ?? 'Untitled';
  const status = getStringField(row, ['status']) ?? (submittedAt ? 'completed' : 'idea');
  const sourceTypeRaw = getStringField(row, ['source_type']) as DbProject['source_type'];
  const sourceType =
    sourceTypeRaw === 'hack_submission'
      ? 'hack_submission'
      : submittedAt
        ? 'hack_submission'
        : 'project';

  return {
    id: getStringField(row, ['id']) ?? '',
    title,
    description: getStringField(row, ['description']),
    status,
    hack_type: (getStringField(row, ['hack_type']) as DbProject['hack_type']) ?? null,
    visibility: (getStringField(row, ['visibility']) as Visibility | null) ?? 'org',
    owner_id: getStringField(row, ['owner_id']),
    workflow_transformed: getBooleanField(row, ['workflow_transformed']) ?? false,
    ai_impact_hypothesis: getStringField(row, ['ai_impact_hypothesis']),
    ai_tools_used: getStringArrayField(row, ['ai_tools_used']) ?? [],
    time_saved_estimate: getNumberField(row, ['time_saved_estimate']),
    failures_and_lessons: getStringField(row, ['failures_and_lessons']),
    source_type: sourceType ?? 'project',
    team_id: getStringField(row, ['team_id', 'teamId']),
    synced_to_library_at: getStringField(row, ['synced_to_library_at']),
    event_id: getStringField(row, ['event_id']),
    pipeline_stage: (getStringField(row, ['pipeline_stage']) as PipelineStage | null) ?? null,
    pipeline_stage_entered_at: getStringField(row, ['pipeline_stage_entered_at']),
    created_at: getStringField(row, ['created_at']),
  };
}

function matchesProjectFilter(project: DbProject, filter: QueryFilter): boolean {
  let value: string | number | boolean | null | undefined;

  switch (filter.field) {
    case 'id':
      value = project.id;
      break;
    case 'event_id':
      value = project.event_id;
      break;
    case 'source_type':
      value = project.source_type;
      break;
    case 'owner_id':
      value = project.owner_id;
      break;
    default:
      return true;
  }

  if (filter.op === 'eq') return String(value ?? '') === String(filter.value ?? '');
  if (filter.op === 'neq') return String(value ?? '') !== String(filter.value ?? '');
  if (filter.op === 'is') {
    if (filter.value === null) return value === null;
    return String(value ?? '') === String(filter.value);
  }
  return true;
}

function withNullEventConfig(row: DbEventLegacyCore): DbEvent {
  return {
    ...row,
    event_rules: null,
    event_branding: null,
    event_schedule: null,
    runtime_type: 'hdc_native',
    template_target: null,
  };
}

function defaultEventRules(): EventRules {
  return {
    allowCrossTeamMentoring: true,
    maxTeamSize: 6,
    requireDemoLink: false,
    judgingModel: 'hybrid',
  };
}

function defaultEventBranding(): EventBranding {
  return {
    accentColor: '#0f766e',
  };
}

function asEventRules(value: unknown): EventRules {
  if (!value || typeof value !== 'object') return defaultEventRules();
  const candidate = value as Partial<EventRules>;
  const minTeamSizeRaw = Number(candidate.minTeamSize);
  const maxTeamSizeRaw = Number(candidate.maxTeamSize);
  const minTeamSize = Number.isFinite(minTeamSizeRaw) ? Math.min(20, Math.max(1, Math.floor(minTeamSizeRaw))) : null;
  const maxTeamSizeBase = Number.isFinite(maxTeamSizeRaw) ? Math.min(20, Math.max(1, Math.floor(maxTeamSizeRaw))) : 6;
  const judgingModel =
    candidate.judgingModel === 'panel' || candidate.judgingModel === 'popular_vote' || candidate.judgingModel === 'hybrid'
      ? candidate.judgingModel
      : 'hybrid';
  const maxTeamSize = minTeamSize === null ? maxTeamSizeBase : Math.max(minTeamSize, maxTeamSizeBase);
  const submissionRequirements =
    Array.isArray(candidate.submissionRequirements)
      ? candidate.submissionRequirements.filter(
          (item): item is SubmissionRequirement =>
            item === 'video_demo' || item === 'working_prototype' || item === 'documentation'
        )
      : [];
  const categories =
    Array.isArray(candidate.categories)
      ? [...new Set(candidate.categories.map((item) => item.trim()).filter((item) => item.length > 0))]
      : [];
  const prizesText = typeof candidate.prizesText === 'string' && candidate.prizesText.trim()
    ? candidate.prizesText.trim()
    : null;

  const rules: EventRules = {
    allowCrossTeamMentoring: candidate.allowCrossTeamMentoring ?? true,
    maxTeamSize,
    requireDemoLink: candidate.requireDemoLink ?? false,
    judgingModel,
  };
  if (minTeamSize !== null) {
    rules.minTeamSize = minTeamSize;
  }
  if (submissionRequirements.length > 0) {
    rules.submissionRequirements = submissionRequirements;
  }
  if (categories.length > 0) {
    rules.categories = categories;
  }
  if (prizesText) {
    rules.prizesText = prizesText;
  }
  return rules;
}

function asEventBranding(value: unknown): EventBranding {
  const defaults = defaultEventBranding();
  if (!value || typeof value !== 'object') return defaults;
  const candidate = value as Partial<EventBranding>;
  const themePreference: ThemePreference | null =
    candidate.themePreference === 'system' || candidate.themePreference === 'light' || candidate.themePreference === 'dark'
      ? candidate.themePreference
      : null;
  const branding: EventBranding = {
    accentColor: typeof candidate.accentColor === 'string' && candidate.accentColor.trim()
      ? candidate.accentColor.trim()
      : defaults.accentColor,
  };
  if (typeof candidate.bannerMessage === 'string' && candidate.bannerMessage.trim()) {
    branding.bannerMessage = candidate.bannerMessage.trim();
  }
  if (typeof candidate.bannerImageUrl === 'string' && candidate.bannerImageUrl.trim()) {
    branding.bannerImageUrl = candidate.bannerImageUrl.trim();
  }
  if (themePreference) {
    branding.themePreference = themePreference;
  }
  return branding;
}

function sanitizeScheduleDatetime(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const SCHEDULE_EVENT_SIGNALS = new Set<ScheduleEventSignal>([
  'start',
  'deadline',
  'ceremony',
  'presentation',
  'judging',
  'neutral',
]);

function sanitizeScheduleDuration(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(1, Math.min(3, Math.floor(value)));
}

function sanitizeScheduleStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function sanitizeScheduleCustomEvents(value: unknown): ScheduleCustomEvent[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized: ScheduleCustomEvent[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<ScheduleCustomEvent>;
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
    const timestamp = typeof candidate.timestamp === 'string' ? candidate.timestamp.trim() : '';
    const signal =
      typeof candidate.signal === 'string' && SCHEDULE_EVENT_SIGNALS.has(candidate.signal as ScheduleEventSignal)
        ? (candidate.signal as ScheduleEventSignal)
        : null;
    if (!name || !timestamp || !signal) continue;
    const description =
      typeof candidate.description === 'string' && candidate.description.trim()
        ? candidate.description.trim()
        : undefined;
    normalized.push({
      name,
      timestamp,
      signal,
      ...(description ? { description } : {}),
    });
  }
  return normalized.length > 0 ? normalized : undefined;
}

function asEventSchedule(
  value: unknown,
  fallback: { timezone: string | null; hackingStartsAt: string | null; submissionDeadlineAt: string | null }
): EventSchedule {
  const schedule = value && typeof value === 'object' ? (value as Partial<EventSchedule>) : {};
  return {
    timezone:
      (typeof schedule.timezone === 'string' && schedule.timezone.trim() ? schedule.timezone.trim() : null) ||
      fallback.timezone ||
      DEFAULT_TIMEZONE,
    duration: sanitizeScheduleDuration(schedule.duration),
    selectedEvents: sanitizeScheduleStringList((schedule as EventSchedule).selectedEvents),
    customEvents: sanitizeScheduleCustomEvents((schedule as EventSchedule).customEvents),
    registrationOpensAt: sanitizeScheduleDatetime(schedule.registrationOpensAt),
    registrationClosesAt: sanitizeScheduleDatetime(schedule.registrationClosesAt),
    teamFormationStartsAt: sanitizeScheduleDatetime(schedule.teamFormationStartsAt),
    teamFormationEndsAt: sanitizeScheduleDatetime(schedule.teamFormationEndsAt),
    openingCeremonyAt: sanitizeScheduleDatetime(schedule.openingCeremonyAt),
    hackingStartsAt: sanitizeScheduleDatetime(schedule.hackingStartsAt) || fallback.hackingStartsAt || undefined,
    lunchBreakDay1At: sanitizeScheduleDatetime((schedule as EventSchedule).lunchBreakDay1At),
    afternoonCheckinDay1At: sanitizeScheduleDatetime((schedule as EventSchedule).afternoonCheckinDay1At),
    dinnerBreakDay1At: sanitizeScheduleDatetime((schedule as EventSchedule).dinnerBreakDay1At),
    eveningCheckinDay1At: sanitizeScheduleDatetime((schedule as EventSchedule).eveningCheckinDay1At),
    lunchBreakDay2At: sanitizeScheduleDatetime((schedule as EventSchedule).lunchBreakDay2At),
    afternoonCheckinDay2At: sanitizeScheduleDatetime((schedule as EventSchedule).afternoonCheckinDay2At),
    dinnerBreakDay2At: sanitizeScheduleDatetime((schedule as EventSchedule).dinnerBreakDay2At),
    eveningCheckinDay2At: sanitizeScheduleDatetime((schedule as EventSchedule).eveningCheckinDay2At),
    lunchBreakDay3At: sanitizeScheduleDatetime((schedule as EventSchedule).lunchBreakDay3At),
    afternoonCheckinDay3At: sanitizeScheduleDatetime((schedule as EventSchedule).afternoonCheckinDay3At),
    dinnerBreakDay3At: sanitizeScheduleDatetime((schedule as EventSchedule).dinnerBreakDay3At),
    submissionDeadlineAt:
      sanitizeScheduleDatetime(schedule.submissionDeadlineAt) || fallback.submissionDeadlineAt || undefined,
    presentationsAt: sanitizeScheduleDatetime(schedule.presentationsAt),
    judgingStartsAt: sanitizeScheduleDatetime(schedule.judgingStartsAt),
    votingStartsAt: sanitizeScheduleDatetime(schedule.votingStartsAt),
    votingEndsAt: sanitizeScheduleDatetime(schedule.votingEndsAt),
    resultsAnnounceAt: sanitizeScheduleDatetime(schedule.resultsAnnounceAt),
  };
}

function toEventRegistryItem(event: DbEvent): EventRegistryItem {
  const pageId = typeof event.confluence_page_id === 'string' ? event.confluence_page_id.trim() : '';
  const schedule = asEventSchedule(event.event_schedule, {
    timezone: event.timezone,
    hackingStartsAt: event.hacking_starts_at,
    submissionDeadlineAt: event.submission_deadline_at,
  });
  return {
    id: event.id,
    eventName: event.name,
    icon: event.icon ?? '🚀',
    tagline: event.tagline,
    runtimeType: event.runtime_type ?? 'hdc_native',
    templateTarget: event.template_target,
    lifecycleStatus: event.lifecycle_status,
    confluencePageId: pageId || null,
    isNavigable: pageId.length > 0,
    confluenceParentPageId: event.confluence_parent_page_id,
    schedule,
    hackingStartsAt: schedule.hackingStartsAt ?? event.hacking_starts_at,
    submissionDeadlineAt: schedule.submissionDeadlineAt ?? event.submission_deadline_at,
    rules: asEventRules(event.event_rules),
    branding: asEventBranding(event.event_branding),
  };
}

function buildAccountFallbackEmail(accountId: string): string {
  const safe = accountId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safe}${ALLOWED_EMAIL_DOMAIN}`;
}

function buildDisplayNameFromEmail(email: string): string {
  const [localPart] = email.split('@');
  return localPart || email;
}

export class SupabaseRepository {
  private readonly client: SupabaseRestClient;

  constructor(client = new SupabaseRestClient()) {
    this.client = client;
  }

  getSourceInfo(): BootstrapData['source'] {
    return {
      provider: 'supabase',
      deploymentUrl: this.client.deploymentUrl,
      schema: this.client.schema,
    };
  }

  async getUserByAccountId(accountId: string): Promise<DbUser | null> {
    try {
      return await this.client.selectOne<DbUser>(
        USER_TABLE,
        'id,email,full_name,atlassian_account_id,role,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags',
        [{ field: 'atlassian_account_id', op: 'eq', value: accountId }]
      );
    } catch (error) {
      if (!hasMissingUserRoleColumn(error)) throw error;
      return this.client.selectOne<DbUser>(
        USER_TABLE,
        'id,email,full_name,atlassian_account_id,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags',
        [{ field: 'atlassian_account_id', op: 'eq', value: accountId }]
      );
    }
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    try {
      return await this.client.selectOne<DbUser>(
        USER_TABLE,
        'id,email,full_name,atlassian_account_id,role,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags',
        [{ field: 'email', op: 'eq', value: email.trim().toLowerCase() }]
      );
    } catch (error) {
      if (!hasMissingUserRoleColumn(error)) throw error;
      return this.client.selectOne<DbUser>(
        USER_TABLE,
        'id,email,full_name,atlassian_account_id,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags',
        [{ field: 'email', op: 'eq', value: email.trim().toLowerCase() }]
      );
    }
  }

  async getUserById(userId: string): Promise<DbUser | null> {
    try {
      return await this.client.selectOne<DbUser>(
        USER_TABLE,
        'id,email,full_name,atlassian_account_id,role,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags',
        [{ field: 'id', op: 'eq', value: userId }]
      );
    } catch (error) {
      if (!hasMissingUserRoleColumn(error)) throw error;
      return this.client.selectOne<DbUser>(
        USER_TABLE,
        'id,email,full_name,atlassian_account_id,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags',
        [{ field: 'id', op: 'eq', value: userId }]
      );
    }
  }

  async canUserModerateProblemExchange(viewer: ViewerContext): Promise<boolean> {
    const accountId = viewer.accountId?.trim();
    if (!accountId || accountId === 'unknown-atlassian-account') {
      return false;
    }

    try {
      const row = await this.client.selectOne<DbProblemExchangeModeratorLookup>(
        USER_TABLE,
        'id,role,capability_tags',
        [{ field: 'atlassian_account_id', op: 'eq', value: accountId }]
      );
      if (!row) return false;

      const normalizedRole = typeof row.role === 'string' ? row.role.trim().toUpperCase() : '';
      if (normalizedRole === 'ADMIN') {
        return true;
      }

      const tags = Array.isArray(row.capability_tags)
        ? row.capability_tags
            .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
            .filter(Boolean)
        : [];

      return tags.includes('problem_exchange_moderator') || tags.includes('platform_admin');
    } catch (error) {
      if (hasMissingUserRoleColumn(error)) {
        const fallbackUser = await this.getUserByAccountId(accountId);
        if (!fallbackUser) return false;
        const tags = (fallbackUser.capability_tags ?? [])
          .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
          .filter(Boolean);
        return tags.includes('problem_exchange_moderator') || tags.includes('platform_admin');
      }
      throw error;
    }
  }

  async canUserManagePipeline(viewer: ViewerContext): Promise<boolean> {
    const accountId = viewer.accountId?.trim();
    if (!accountId || accountId === 'unknown-atlassian-account') {
      return false;
    }

    try {
      const row = await this.client.selectOne<DbPipelineAdminLookup>(
        USER_TABLE,
        'id,role,capability_tags',
        [{ field: 'atlassian_account_id', op: 'eq', value: accountId }]
      );
      if (!row) return false;

      const normalizedRole = typeof row.role === 'string' ? row.role.trim().toUpperCase() : '';
      if (normalizedRole === 'ADMIN') {
        return true;
      }

      const tags = Array.isArray(row.capability_tags)
        ? row.capability_tags
            .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
            .filter(Boolean)
        : [];

      return tags.includes('pipeline_admin') || tags.includes('platform_admin');
    } catch (error) {
      if (hasMissingUserRoleColumn(error)) {
        const fallbackUser = await this.getUserByAccountId(accountId);
        if (!fallbackUser) return false;
        const tags = (fallbackUser.capability_tags ?? [])
          .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
          .filter(Boolean);
        return tags.includes('pipeline_admin') || tags.includes('platform_admin');
      }
      throw error;
    }
  }

  async canUserManagePathways(viewer: ViewerContext): Promise<boolean> {
    const accountId = viewer.accountId?.trim();
    if (!accountId || accountId === 'unknown-atlassian-account') {
      return false;
    }

    try {
      const row = await this.client.selectOne<DbPathwayEditorLookup>(
        USER_TABLE,
        'id,role,capability_tags',
        [{ field: 'atlassian_account_id', op: 'eq', value: accountId }]
      );
      if (!row) return false;

      const normalizedRole = typeof row.role === 'string' ? row.role.trim().toUpperCase() : '';
      if (normalizedRole === 'ADMIN') {
        return true;
      }

      const tags = Array.isArray(row.capability_tags)
        ? row.capability_tags
            .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
            .filter(Boolean)
        : [];

      return tags.includes('pathway_admin') || tags.includes('pathway_contributor') || tags.includes('platform_admin');
    } catch (error) {
      if (hasMissingUserRoleColumn(error)) {
        const fallbackUser = await this.getUserByAccountId(accountId);
        if (!fallbackUser) return false;
        const tags = (fallbackUser.capability_tags ?? [])
          .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
          .filter(Boolean);
        return tags.includes('pathway_admin') || tags.includes('pathway_contributor') || tags.includes('platform_admin');
      }
      throw error;
    }
  }

  async ensureUser(viewer: ViewerContext, explicitEmail?: string): Promise<DbUser> {
    const existing = await this.getUserByAccountId(viewer.accountId);
    if (existing) return existing;

    const email = (explicitEmail || buildAccountFallbackEmail(viewer.accountId)).trim().toLowerCase();
    const existingByEmail = await this.getUserByEmail(email);
    if (existingByEmail) return existingByEmail;

    return this.client.insert<DbUser>(USER_TABLE, {
      id: randomUUID(),
      email,
      full_name: `Atlassian User ${viewer.accountId.slice(0, 8)}`,
      atlassian_account_id: viewer.accountId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      mentor_capacity: 0,
      mentor_sessions_used: 0,
      happy_to_mentor: false,
      seeking_mentor: false,
      capability_tags: [],
    });
  }

  async ensureUserByEmail(email: string): Promise<DbUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.getUserByEmail(normalizedEmail);
    if (existing) return existing;

    return this.client.insert<DbUser>(USER_TABLE, {
      id: randomUUID(),
      email: normalizedEmail,
      full_name: buildDisplayNameFromEmail(normalizedEmail),
      atlassian_account_id: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      mentor_capacity: 0,
      mentor_sessions_used: 0,
      happy_to_mentor: false,
      seeking_mentor: false,
      capability_tags: [],
    });
  }

  private async getAnyTeamId(): Promise<string | null> {
    try {
      const row = await this.client.selectOne<{ id: string }>(TEAM_TABLE, 'id');
      return row?.id ?? null;
    } catch {
      return null;
    }
  }

  private async listTeamIds(): Promise<string[]> {
    try {
      const rows = await this.client.selectMany<{ id: string }>(TEAM_TABLE, 'id');
      return rows.map((row) => row.id).filter((id) => typeof id === 'string' && id.length > 0);
    } catch {
      return [];
    }
  }

  private async listProjects(filters: QueryFilter[] = []): Promise<DbProject[]> {
    try {
      const rows = await this.client.selectMany<DbProjectRow>(PROJECT_TABLE, '*', filters);
      return rows.map(normalizeProjectRow);
    } catch (error) {
      if (!hasMissingProjectColumn(error)) {
        throw error;
      }
      const rows = await this.client.selectMany<DbProjectRow>(PROJECT_TABLE, '*');
      const projects = rows.map(normalizeProjectRow);
      return projects.filter((project) => filters.every((filter) => matchesProjectFilter(project, filter)));
    }
  }

  private async getProjectById(projectId: string): Promise<DbProject | null> {
    const rows = await this.listProjects([{ field: 'id', op: 'eq', value: projectId }]);
    return rows[0] ?? null;
  }

  private async getArtifactRowById(artifactId: string): Promise<DbArtifact | null> {
    return this.client.selectOne<DbArtifact>(
      ARTIFACT_TABLE,
      'id,title,description,artifact_type,tags,source_url,source_label,source_hack_project_id,source_hackday_event_id,created_by_user_id,visibility,reuse_count,created_at,updated_at,archived_at',
      [{ field: 'id', op: 'eq', value: artifactId }]
    );
  }

  private async getProblemById(problemId: string): Promise<DbProblem | null> {
    return this.client.selectOne<DbProblem>(
      PROBLEM_TABLE,
      'id,title,description,frequency,estimated_time_wasted_hours,team,domain,contact_details,status,moderation_state,vote_count,flag_count,created_by_user_id,claimed_by_user_id,linked_hack_project_id,linked_artifact_id,auto_hidden_at,hidden_at,closed_at,created_at,updated_at',
      [{ field: 'id', op: 'eq', value: problemId }]
    );
  }

  private async insertProject(payload: Record<string, unknown> & { title: string }): Promise<{
    id: string;
    title?: string | null;
    name?: string | null;
  }> {
    const projectId = typeof payload.id === 'string' && payload.id.trim() ? payload.id : randomUUID();
    const ownerId =
      typeof payload.owner_id === 'string'
        ? payload.owner_id
        : typeof payload.ownerId === 'string'
          ? payload.ownerId
          : null;
    let fallbackTeamId = await this.getAnyTeamId();
    if (!fallbackTeamId) {
      fallbackTeamId = await ensureLegacyTeamRecord(this.client, ownerId);
    }
    const exhaustedTeamIds = new Set<string>();
    const legacyTimestamp = nowIso();
    const withLegacyTeam = fallbackTeamId ? { teamId: fallbackTeamId } : {};
    const withLegacyTimestamps = { createdAt: legacyTimestamp, updatedAt: legacyTimestamp };
    const queue: Array<Record<string, unknown>> = [
      { ...payload, id: projectId, name: payload.title, ...withLegacyTeam, ...withLegacyTimestamps },
      { ...payload, id: projectId, ...withLegacyTeam, ...withLegacyTimestamps },
      { ...payload, id: projectId, name: payload.title, ...withLegacyTimestamps },
      { ...payload, id: projectId, ...withLegacyTimestamps },
      { ...payload, id: projectId, name: payload.title },
      { ...payload, id: projectId },
    ];
    const seen = new Set<string>();
    let lastError: unknown = null;

    while (queue.length > 0) {
      const candidate = queue.shift()!;
      const signature = JSON.stringify(
        Object.entries(candidate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, value ?? null])
      );
      if (seen.has(signature)) continue;
      seen.add(signature);

      try {
        return await this.client.insert<{ id: string; title?: string | null; name?: string | null }>(
          PROJECT_TABLE,
          candidate
        );
      } catch (error) {
        lastError = error;

        if (hasDuplicateProjectTeamId(error) && candidate.teamId) {
          const currentTeamId = String(candidate.teamId);
          exhaustedTeamIds.add(currentTeamId);
          const alternatives = await this.listTeamIds();
          const alternativeTeamId = alternatives.find((teamId) => !exhaustedTeamIds.has(teamId));

          if (alternativeTeamId) {
            exhaustedTeamIds.add(alternativeTeamId);
            queue.push({
              ...candidate,
              teamId: alternativeTeamId,
            });
          } else {
            const freshTeamId = await ensureLegacyTeamRecord(this.client, ownerId);
            if (freshTeamId) {
              exhaustedTeamIds.add(freshTeamId);
              queue.push({
                ...candidate,
                teamId: freshTeamId,
              });
            }
          }
        }

        const notNullColumn = extractProjectNotNullColumn(error);
        if (notNullColumn === 'teamId' && !candidate.teamId) {
          if (!fallbackTeamId || exhaustedTeamIds.has(fallbackTeamId)) {
            const alternatives = await this.listTeamIds();
            fallbackTeamId = alternatives.find((teamId) => !exhaustedTeamIds.has(teamId)) ?? null;
          }
          if (!fallbackTeamId) {
            fallbackTeamId = await ensureLegacyTeamRecord(this.client, ownerId);
          }
          if (fallbackTeamId) {
            exhaustedTeamIds.add(fallbackTeamId);
            queue.push({
              ...candidate,
              teamId: fallbackTeamId,
            });
          }
        }
        if (notNullColumn === 'name' && !candidate.name) {
          queue.push({ ...candidate, name: String(candidate.title ?? payload.title) });
        }
        if (notNullColumn === 'updatedAt' && !candidate.updatedAt) {
          queue.push({ ...candidate, updatedAt: nowIso() });
        }
        if (notNullColumn === 'createdAt' && !candidate.createdAt) {
          queue.push({ ...candidate, createdAt: nowIso() });
        }

        if (!hasMissingProjectColumn(error)) {
          if (hasProjectTeamForeignKeyError(error) && typeof candidate.teamId === 'string' && candidate.teamId) {
            const ensured = await ensureLegacyTeamRecord(this.client, ownerId, candidate.teamId);
            if (ensured) {
              queue.push({ ...candidate, teamId: ensured });
              continue;
            }
          }
          if (
            hasDuplicateProjectTeamId(error) ||
            hasProjectTeamForeignKeyError(error) ||
            notNullColumn === 'teamId' ||
            notNullColumn === 'name' ||
            notNullColumn === 'updatedAt' ||
            notNullColumn === 'createdAt'
          ) {
            continue;
          }
          throw error;
        }

        const missingColumn = extractMissingProjectColumn(error);
        if (missingColumn && missingColumn in candidate) {
          const withoutMissing = { ...candidate };
          delete withoutMissing[missingColumn];
          queue.push(withoutMissing);
        }

        if (hasMissingProjectNameColumn(error) && 'name' in candidate) {
          const withoutName = { ...candidate };
          delete withoutName.name;
          queue.push(withoutName);
        }

        if (hasMissingProjectTitleColumn(error) && 'title' in candidate) {
          const withoutTitle = { ...candidate };
          delete withoutTitle.title;
          queue.push(withoutTitle);
        }

      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error('Supabase insert Project failed: no compatible payload variant succeeded.');
  }

  async getBootstrapData(viewer: ViewerContext): Promise<BootstrapData> {
    const [
      users,
      projects,
      registry,
      showcaseRows,
      artifacts,
      artifactReuseRows,
      problemRows,
      teamRows,
      teamMemberRows,
      pathwayProgressRows,
    ] =
      await Promise.all([
      (async (): Promise<DbUser[]> => {
        const baseColumns =
          'id,email,full_name,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags';
        try {
          return await this.client.selectMany<DbUser>(USER_TABLE, `${baseColumns},created_at`);
        } catch (error) {
          if (!hasMissingUserCreatedAtColumn(error)) throw error;
          const legacyRows = await this.client.selectMany<Record<string, unknown>>(USER_TABLE, `${baseColumns},createdAt`);
          return legacyRows.map((row) => ({
            id: getStringField(row, ['id']) ?? '',
            email: getStringField(row, ['email']) ?? '',
            full_name: getStringField(row, ['full_name']),
            atlassian_account_id: getStringField(row, ['atlassian_account_id']),
            experience_level: getStringField(row, ['experience_level']),
            mentor_capacity: getNumberField(row, ['mentor_capacity']),
            mentor_sessions_used: getNumberField(row, ['mentor_sessions_used']),
            happy_to_mentor: getBooleanField(row, ['happy_to_mentor']),
            seeking_mentor: getBooleanField(row, ['seeking_mentor']),
            capability_tags: getStringArrayField(row, ['capability_tags']),
            created_at: getStringField(row, ['created_at', 'createdAt']),
            createdAt: getStringField(row, ['createdAt', 'created_at']),
          }));
        }
      })(),
      this.listProjects(),
      this.listAllEvents(),
      this.client
        .selectMany<DbShowcaseHack>(
          SHOWCASE_HACK_TABLE,
          'project_id,featured,demo_url,team_members,source_event_id,tags,linked_artifact_ids,context,limitations,risk_notes,source_repo_url,created_by_user_id,created_at,updated_at'
        )
        .catch((error) => {
          if (hasMissingTable(error, SHOWCASE_HACK_TABLE)) return [];
          throw error;
        }),
      this.client
        .selectMany<DbArtifact>(
          ARTIFACT_TABLE,
          'id,reuse_count,archived_at,source_hack_project_id,created_by_user_id,title,description,artifact_type,tags,source_url,source_label,source_hackday_event_id,visibility,created_at,updated_at'
        )
        .catch((error) => {
          if (hasMissingTable(error, ARTIFACT_TABLE)) return [];
          throw error;
        }),
      this.client
        .selectMany<Record<string, unknown>>(ARTIFACT_REUSE_TABLE, '*')
        .catch((error) => {
          if (hasMissingTable(error, ARTIFACT_REUSE_TABLE)) return [];
          throw error;
        }),
      this.client
        .selectMany<DbProblem>(
          PROBLEM_TABLE,
          'id,status,moderation_state,created_by_user_id,claimed_by_user_id,linked_hack_project_id,linked_artifact_id'
        )
        .catch((error) => {
          if (hasMissingTable(error, PROBLEM_TABLE)) return [];
          throw error;
        }),
      this.client
        .selectMany<Record<string, unknown>>(TEAM_TABLE, '*')
        .catch((error) => {
          if (hasMissingTable(error, TEAM_TABLE)) return [];
          throw error;
        }),
      this.client
        .selectMany<Record<string, unknown>>(TEAM_MEMBER_TABLE, '*')
        .catch((error) => {
          if (hasMissingTable(error, TEAM_MEMBER_TABLE)) return [];
          throw error;
        }),
      this.client
        .selectMany<Record<string, unknown>>(PATHWAY_PROGRESS_TABLE, '*')
        .catch((error) => {
          if (hasMissingTable(error, PATHWAY_PROGRESS_TABLE)) return [];
          throw error;
        }),
    ]);
    const showcaseByProjectId = new Map(showcaseRows.map((row) => [row.project_id, row]));

    const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));

    let hackRows = projects.filter((project) => project.source_type === 'hack_submission');
    let projectRows = projects.filter((project) => project.source_type !== 'hack_submission');

    if (hackRows.length === 0 && projects.length > 0) {
      // Legacy schema/data can classify everything as generic projects; surface those as hacks instead of an empty UI.
      hackRows = projects;
      projectRows = projects;
    }

    const featuredHacks = hackRows
      .slice()
      .sort((a, b) => {
        const aFeatured = showcaseByProjectId.get(a.id)?.featured === true;
        const bFeatured = showcaseByProjectId.get(b.id)?.featured === true;
        if (aFeatured !== bFeatured) return aFeatured ? 1 : -1;
        return (b.created_at || '').localeCompare(a.created_at || '');
      })
      .slice(0, 8)
      .map((project) => {
        const metadata = showcaseByProjectId.get(project.id) ?? null;
        return {
          id: project.id,
          title: project.title,
          description: project.description ?? '',
          assetType: (project.hack_type ?? 'prompt') as 'prompt' | 'skill' | 'app',
          status: project.synced_to_library_at ? 'verified' : 'in_progress',
          reuseCount: project.synced_to_library_at ? 1 : 0,
          authorName: project.owner_id ? userNameById.get(project.owner_id) ?? 'Unknown' : 'Unknown',
          visibility: asVisibility(project.visibility),
          intendedUser: null,
          context: metadata?.context ?? null,
          limitations: metadata?.limitations ?? null,
          riskNotes: metadata?.risk_notes ?? null,
          sourceRepoUrl: metadata?.source_repo_url ?? null,
          demoUrl: metadata?.demo_url ?? null,
        };
      });

    const recentProjects = projectRows
      .slice()
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 8)
      .map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description ?? '',
        status: project.status,
        statusLabel: toStatusLabel(project.status),
        hackType: project.hack_type,
        ownerName: project.owner_id ? userNameById.get(project.owner_id) ?? 'Unknown' : 'Unknown',
        attachedHacksCount: 0,
        commentCount: 0,
        visibility: asVisibility(project.visibility),
        workflowTransformed: project.workflow_transformed ?? false,
        aiImpactHypothesis: project.ai_impact_hypothesis,
        aiToolsUsed: project.ai_tools_used ?? [],
        timeSavedEstimate: project.time_saved_estimate,
        failuresAndLessons: project.failures_and_lessons,
      }));

    const people: PersonSnapshot[] = users.slice(0, 12).map((user) => {
      const mentorCapacity = isFiniteNumber(user.mentor_capacity) ? user.mentor_capacity : 0;
      const mentorSessionsUsed = isFiniteNumber(user.mentor_sessions_used) ? user.mentor_sessions_used : 0;
      const capabilities = [...(user.capability_tags ?? [])];
      if (user.happy_to_mentor) capabilities.push('Happy to Mentor');
      if (user.seeking_mentor) capabilities.push('Seeking Mentor');

      return {
        id: user.id,
        fullName: user.full_name || user.email,
        email: user.email,
        experienceLevel: user.experience_level,
        experienceLabel: toExperienceLabel(user.experience_level),
        mentorCapacity,
        mentorSessionsUsed,
        mentorSlotsRemaining: Math.max(mentorCapacity - mentorSessionsUsed, 0),
        capabilities,
      };
    });

    const inProgressProjects = projectRows.filter((project) => ['idea', 'building', 'incubation'].includes(project.status));
    const completedProjects = projectRows.filter((project) => project.status === 'completed');
    const calculatedAt = nowIso();
    const teamPulse = buildTeamPulseMetrics({
      calculatedAt,
      users,
      projects,
      artifacts,
      artifactReuses: artifactReuseRows,
      problems: problemRows,
      teamRows,
      teamMemberRows,
    });
    const recognition = buildRecognitionSnapshot({
      calculatedAt,
      users,
      projects,
      artifacts,
      problems: problemRows,
      pathwayProgressRows,
      viewerAccountId: viewer.accountId,
    });
    const viewerBadgeCount = Object.values(recognition.viewerBadges).filter(Boolean).length;
    logPhase2Telemetry('recognition_snapshot_read', {
      provider: 'supabase',
      mentorPolicyVersion: recognition.mentorSignal.policyVersion,
      pathwayPolicyVersion: recognition.pathwaySignal.policyVersion,
      buildersCount: recognition.leaderboards.builders.length,
      sharersCount: recognition.leaderboards.sharers.length,
      solversCount: recognition.leaderboards.solvers.length,
      mentorsCount: recognition.leaderboards.mentors.length,
      qualifiedMentorChampionCount: recognition.mentorSignal.qualifiedMentorChampionCount,
      qualifiedPathwayContributorCount: recognition.pathwaySignal.qualifiedPathwayContributorCount,
      viewerBadgeCount,
    });

    return {
      viewer,
      source: this.getSourceInfo(),
      summary: {
        totalPeople: users.length,
        totalHacks: hackRows.length,
        featuredHacks: featuredHacks.length,
        inProgressProjects: inProgressProjects.length,
        completedProjects: completedProjects.length,
        activeMentors: people.filter((person) => person.mentorSlotsRemaining > 0).length,
      },
      teamPulse,
      recognition,
      featuredHacks,
      recentProjects,
      people,
      registry,
    };
  }

  async trackTeamPulseExport(
    viewer: ViewerContext,
    input: TrackTeamPulseExportInput
  ): Promise<TrackTeamPulseExportResult> {
    const loggedAt = nowIso();
    const format = input.format === 'csv' ? 'csv' : 'json';
    logPhase2Telemetry('team_pulse_export', {
      provider: 'supabase',
      format,
      exportedAt: input.exportedAt,
      hasTeamPulseData: input.hasTeamPulseData,
      reuseRatePct: input.reuseRatePct,
      crossTeamAdoptionCount: input.crossTeamAdoptionCount,
      crossTeamEdgeCount: input.crossTeamEdgeCount,
      timeToFirstHackMedianDays: input.timeToFirstHackMedianDays,
      timeToFirstHackSampleSize: input.timeToFirstHackSampleSize,
      timeToFirstHackTrendPointCount: input.timeToFirstHackTrendPointCount,
      problemConversionPct: input.problemConversionPct,
      solvedProblemCount: input.solvedProblemCount,
      totalProblemCount: input.totalProblemCount,
      csvRowCount: format === 'csv' ? Math.max(0, input.csvRowCount ?? 0) : null,
      viewerTimezone: viewer.timezone,
      viewerSiteUrl: viewer.siteUrl,
      loggedAt,
    });
    return {
      logged: true,
      metric: 'team_pulse_export',
      loggedAt,
    };
  }

  async createHack(viewer: ViewerContext, input: CreateHackInput): Promise<CreateHackResult> {
    const user = await this.ensureUser(viewer);
    const sourceEventId = input.sourceEventId?.trim() || null;
    const demoUrl = input.demoUrl?.trim() || null;
    const normalizedTags = normalizeShowcaseTags(input.tags ?? []);
    const normalizedTeamMembers = normalizeShowcaseTeamMembers(input.teamMembers ?? []);
    const linkedArtifactIds = normalizeShowcaseLinkedArtifactIds(input.linkedArtifactIds ?? []);

    if (!demoUrl) {
      throw createShowcaseValidationError('demoUrl is required.');
    }
    try {
      const parsed = new URL(demoUrl);
      if (parsed.protocol !== 'https:') {
        throw new Error('invalid protocol');
      }
    } catch {
      throw createShowcaseValidationError('demoUrl must be a valid https URL.');
    }

    if (linkedArtifactIds.length > 0) {
      for (const artifactId of linkedArtifactIds) {
        const artifact = await this.getArtifactRowById(artifactId);
        if (!artifact || artifact.archived_at) {
          throw createShowcaseValidationError(`linkedArtifactId "${artifactId}" was not found.`);
        }
      }
    }

    const inserted = await this.insertProject({
      title: input.title,
      name: input.title,
      description: input.description ?? null,
      status: 'completed',
      hack_type: input.assetType,
      visibility: input.visibility ?? 'org',
      owner_id: user.id,
      workflow_transformed: false,
      source_type: 'hack_submission',
      event_id: sourceEventId,
      synced_to_library_at: null,
      pipeline_stage: 'hack',
      pipeline_stage_entered_at: nowIso(),
    });

    try {
      await this.client.upsert<DbShowcaseHack>(
        SHOWCASE_HACK_TABLE,
        {
          project_id: inserted.id,
          featured: false,
          demo_url: demoUrl,
          team_members: normalizedTeamMembers,
          source_event_id: sourceEventId,
          tags: normalizedTags,
          linked_artifact_ids: linkedArtifactIds,
          context: null,
          limitations: null,
          risk_notes: null,
          source_repo_url: null,
          created_by_user_id: user.id,
        },
        'project_id'
      );
    } catch (error) {
      // Best-effort rollback to avoid partially created showcase projects if metadata persistence fails.
      await this.client
        .deleteMany(PROJECT_TABLE, [{ field: 'id', op: 'eq', value: inserted.id }])
        .catch(() => []);
      if (hasMissingTable(error, SHOWCASE_HACK_TABLE)) {
        throw new Error(
          `Missing required table ${SHOWCASE_HACK_TABLE}. Apply the phase 1 showcase migration before calling createHack.`
        );
      }
      throw error;
    }

    return {
      assetId: inserted.id,
      title: inserted.title ?? inserted.name ?? input.title,
    };
  }

  async createArtifact(viewer: ViewerContext, input: CreateArtifactInput): Promise<CreateArtifactResult> {
    const title = input.title?.trim();
    if (!title || title.length < 3 || title.length > 120) {
      throw createRegistryValidationError('title must be 3-120 characters.');
    }

    const description = input.description?.trim();
    if (!description || description.length < 10 || description.length > 2000) {
      throw createRegistryValidationError('description must be 10-2000 characters.');
    }

    if (!isArtifactType(input.artifactType)) {
      throw createRegistryValidationError('artifactType is invalid.');
    }

    const tags = normalizeArtifactTags(input.tags ?? []);
    if (tags.length === 0) {
      throw createRegistryValidationError('at least one valid tag is required.');
    }

    const sourceUrl = input.sourceUrl?.trim();
    if (!sourceUrl) {
      throw createRegistryValidationError('sourceUrl is required.');
    }
    try {
      const parsed = new URL(sourceUrl);
      if (parsed.protocol !== 'https:') {
        throw new Error('invalid protocol');
      }
    } catch {
      throw createRegistryValidationError('sourceUrl must be a valid https URL.');
    }

    const sourceHackProjectId =
      typeof input.sourceHackProjectId === 'string' && input.sourceHackProjectId.trim()
        ? input.sourceHackProjectId.trim()
        : null;

    if (sourceHackProjectId) {
      const sourceHack = await this.getProjectById(sourceHackProjectId);
      if (!sourceHack || sourceHack.source_type !== 'hack_submission') {
        throw new Error('[ARTIFACT_SOURCE_HACK_INVALID] sourceHackProjectId must reference a hack submission project.');
      }
    }

    const user = await this.ensureUser(viewer);
    const createdAt = nowIso();

    try {
      const inserted = await this.client.insert<DbArtifact>(ARTIFACT_TABLE, {
        id: randomUUID(),
        title,
        description,
        artifact_type: input.artifactType,
        tags,
        source_url: sourceUrl,
        source_label: input.sourceLabel?.trim() || null,
        source_hack_project_id: sourceHackProjectId,
        source_hackday_event_id: input.sourceHackdayEventId?.trim() || null,
        created_by_user_id: user.id,
        visibility: normalizeArtifactVisibility(input.visibility),
        reuse_count: 0,
        created_at: createdAt,
        updated_at: createdAt,
        archived_at: null,
      });

      return {
        artifactId: inserted.id,
        createdAt: inserted.created_at ?? createdAt,
      };
    } catch (error) {
      if (hasMissingTable(error, ARTIFACT_TABLE)) {
        throw new Error(
          `Missing required table ${ARTIFACT_TABLE}. Apply the phase 1 registry migration before calling hdcCreateArtifact.`
        );
      }
      throw error;
    }
  }

  async listArtifacts(_viewer: ViewerContext, input: ListArtifactsInput): Promise<ListArtifactsResult> {
    const query = input.query?.trim().toLowerCase() || '';
    const typeFilter = new Set((input.artifactTypes || []).filter((type) => isArtifactType(type)));
    const tagFilter = new Set(normalizeArtifactTags(input.tags || []));
    const sortBy = input.sortBy === 'reuse_count' ? 'reuse_count' : 'newest';
    const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));

    try {
      const [rows, users] = await Promise.all([
        this.client.selectMany<DbArtifact>(
          ARTIFACT_TABLE,
          'id,title,description,artifact_type,tags,source_url,source_label,source_hack_project_id,source_hackday_event_id,created_by_user_id,visibility,reuse_count,created_at,updated_at,archived_at'
        ),
        this.client.selectMany<DbUser>(USER_TABLE, 'id,email,full_name'),
      ]);

      const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));
      let filtered = rows.filter((row) => !row.archived_at);

      if (query) {
        filtered = filtered.filter((row) =>
          `${row.title} ${row.description}`.toLowerCase().includes(query)
        );
      }

      if (typeFilter.size > 0) {
        filtered = filtered.filter((row) => typeFilter.has(row.artifact_type));
      }

      if (tagFilter.size > 0) {
        filtered = filtered.filter((row) => {
          const tags = new Set((row.tags || []).map((tag) => normalizeArtifactTag(tag)));
          for (const requested of tagFilter) {
            if (!tags.has(requested)) return false;
          }
          return true;
        });
      }

      filtered = filtered.slice().sort((a, b) => {
        if (sortBy === 'reuse_count') {
          const reuseDiff = (b.reuse_count ?? 0) - (a.reuse_count ?? 0);
          if (reuseDiff !== 0) return reuseDiff;
        }
        return (b.created_at || '').localeCompare(a.created_at || '');
      });

      return {
        items: filtered
          .slice(0, limit)
          .map((row) => createArtifactListItem(row, userNameById.get(row.created_by_user_id) ?? 'Unknown')),
        nextCursor: null,
      };
    } catch (error) {
      if (hasMissingTable(error, ARTIFACT_TABLE)) {
        throw new Error(
          `Missing required table ${ARTIFACT_TABLE}. Apply the phase 1 registry migration before calling hdcListArtifacts.`
        );
      }
      throw error;
    }
  }

  async getArtifact(_viewer: ViewerContext, artifactId: string): Promise<GetArtifactResult> {
    const normalizedId = artifactId.trim();
    if (!normalizedId) {
      throw createRegistryValidationError('artifactId is required.');
    }

    let artifact: DbArtifact | null = null;
    try {
      artifact = await this.client.selectOne<DbArtifact>(
        ARTIFACT_TABLE,
        'id,title,description,artifact_type,tags,source_url,source_label,source_hack_project_id,source_hackday_event_id,created_by_user_id,visibility,reuse_count,created_at,updated_at,archived_at',
        [{ field: 'id', op: 'eq', value: normalizedId }]
      );
    } catch (error) {
      if (hasMissingTable(error, ARTIFACT_TABLE)) {
        throw new Error(
          `Missing required table ${ARTIFACT_TABLE}. Apply the phase 1 registry migration before calling hdcGetArtifact.`
        );
      }
      throw error;
    }

    if (!artifact || artifact.archived_at) {
      throw new Error('[ARTIFACT_NOT_FOUND] Artifact not found.');
    }

    const [author, sourceHack] = await Promise.all([
      this.getUserById(artifact.created_by_user_id),
      artifact.source_hack_project_id ? this.getProjectById(artifact.source_hack_project_id) : Promise.resolve(null),
    ]);

    return {
      artifact: createArtifactListItem(artifact, author?.full_name || author?.email || 'Unknown'),
      sourceHack: sourceHack
        ? {
            projectId: sourceHack.id,
            title: sourceHack.title,
            status: sourceHack.status,
            eventId: sourceHack.event_id ?? null,
          }
        : null,
    };
  }

  async markArtifactReuse(viewer: ViewerContext, artifactId: string): Promise<MarkArtifactReuseResult> {
    const normalizedId = artifactId.trim();
    if (!normalizedId) {
      throw createRegistryValidationError('artifactId is required.');
    }
    const user = await this.ensureUser(viewer);

    const artifact = await this.client.selectOne<DbArtifact>(
      ARTIFACT_TABLE,
      'id,reuse_count',
      [{ field: 'id', op: 'eq', value: normalizedId }]
    );
    if (!artifact) {
      throw new Error('[ARTIFACT_NOT_FOUND] Artifact not found.');
    }

    const currentReuseCount = artifact.reuse_count ?? 0;
    const now = nowIso();
    try {
      await this.client.insert<DbArtifactReuse>(ARTIFACT_REUSE_TABLE, {
        id: randomUUID(),
        artifact_id: normalizedId,
        user_id: user.id,
        used_at: now,
      });

      const rows = await this.client.patchMany<DbArtifact>(
        ARTIFACT_TABLE,
        { reuse_count: currentReuseCount + 1, updated_at: now },
        [{ field: 'id', op: 'eq', value: normalizedId }]
      );
      const updatedReuseCount = rows[0]?.reuse_count ?? currentReuseCount + 1;
      return {
        artifactId: normalizedId,
        reuseCount: updatedReuseCount,
        alreadyMarked: false,
      };
    } catch (error) {
      if (hasMissingTable(error, ARTIFACT_REUSE_TABLE) || hasMissingTable(error, ARTIFACT_TABLE)) {
        throw new Error(
          `Missing required registry tables (${ARTIFACT_TABLE}/${ARTIFACT_REUSE_TABLE}). Apply the phase 1 registry migration before calling hdcMarkArtifactReuse.`
        );
      }
      if (isDuplicateArtifactReuseError(error)) {
        return {
          artifactId: normalizedId,
          reuseCount: currentReuseCount,
          alreadyMarked: true,
        };
      }
      throw error;
    }
  }

  async createProblem(viewer: ViewerContext, input: CreateProblemInput): Promise<CreateProblemResult> {
    const title = input.title?.trim();
    if (!title || title.length < 5 || title.length > 180) {
      throw createProblemValidationError('title must be 5-180 characters.');
    }

    const description = input.description?.trim();
    if (!description || description.length < 20 || description.length > 4000) {
      throw createProblemValidationError('description must be 20-4000 characters.');
    }

    if (!isProblemFrequency(input.frequency)) {
      throw createProblemValidationError('frequency is invalid.');
    }

    const estimatedHours = Number(input.estimatedTimeWastedHours);
    if (!Number.isFinite(estimatedHours) || estimatedHours <= 0 || estimatedHours > 500) {
      throw createProblemValidationError('estimatedTimeWastedHours must be a number > 0 and <= 500.');
    }

    const team = input.team?.trim();
    if (!team) {
      throw createProblemValidationError('team is required.');
    }

    const domain = input.domain?.trim();
    if (!domain) {
      throw createProblemValidationError('domain is required.');
    }

    const contactDetails = input.contactDetails?.trim();
    if (!contactDetails) {
      throw createProblemValidationError('contactDetails is required.');
    }

    const user = await this.ensureUser(viewer);
    const createdAt = nowIso();

    try {
      const inserted = await this.client.insert<DbProblem>(PROBLEM_TABLE, {
        id: randomUUID(),
        title,
        description,
        frequency: input.frequency,
        estimated_time_wasted_hours: Math.round(estimatedHours * 100) / 100,
        team,
        domain,
        contact_details: contactDetails,
        status: 'open',
        moderation_state: 'visible',
        vote_count: 0,
        flag_count: 0,
        created_by_user_id: user.id,
        claimed_by_user_id: null,
        linked_hack_project_id: null,
        linked_artifact_id: null,
        auto_hidden_at: null,
        hidden_at: null,
        closed_at: null,
        created_at: createdAt,
        updated_at: createdAt,
      });

      logProblemExchangeTelemetry('problem_created', {
        problemId: inserted.id,
        accountId: viewer.accountId,
        frequency: input.frequency,
        estimatedTimeWastedHours: Math.round(estimatedHours * 100) / 100,
        team,
        domain,
      });

      return {
        problemId: inserted.id,
        status: 'open',
        moderationState: 'visible',
        createdAt: inserted.created_at ?? createdAt,
      };
    } catch (error) {
      if (hasMissingTable(error, PROBLEM_TABLE)) {
        throw new Error(
          `Missing required table ${PROBLEM_TABLE}. Apply the phase 1 problem exchange migration before calling hdcCreateProblem.`
        );
      }
      throw error;
    }
  }

  async listProblems(_viewer: ViewerContext, input: ListProblemsInput): Promise<ListProblemsResult> {
    const query = input.query?.trim().toLowerCase() || '';
    const teamFilter = new Set((input.teams || []).map((team) => team.trim().toLowerCase()).filter(Boolean));
    const domainFilter = new Set((input.domains || []).map((domain) => domain.trim().toLowerCase()).filter(Boolean));
    const statusFilter = new Set((input.statuses || []).filter((status) => isProblemStatus(status)));
    const sortBy = input.sortBy === 'time_wasted' || input.sortBy === 'newest' ? input.sortBy : 'votes';
    const includeHidden = input.includeHidden === true;
    const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));

    try {
      const [rows, users] = await Promise.all([
        this.client.selectMany<DbProblem>(
          PROBLEM_TABLE,
          'id,title,description,frequency,estimated_time_wasted_hours,team,domain,contact_details,status,moderation_state,vote_count,flag_count,created_by_user_id,claimed_by_user_id,linked_hack_project_id,linked_artifact_id,auto_hidden_at,hidden_at,closed_at,created_at,updated_at'
        ),
        this.client.selectMany<DbUser>(USER_TABLE, 'id,email,full_name'),
      ]);

      const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));
      let filtered = rows.slice();

      if (!includeHidden) {
        filtered = filtered.filter((row) => normalizeProblemModerationState(row.moderation_state) === 'visible');
      }

      if (statusFilter.size > 0) {
        filtered = filtered.filter((row) => row.status && statusFilter.has(row.status));
      } else {
        filtered = filtered.filter((row) => row.status === 'open');
      }

      if (query) {
        filtered = filtered.filter((row) =>
          `${row.title} ${row.description}`.toLowerCase().includes(query)
        );
      }

      if (teamFilter.size > 0) {
        filtered = filtered.filter((row) => teamFilter.has(row.team.trim().toLowerCase()));
      }

      if (domainFilter.size > 0) {
        filtered = filtered.filter((row) => domainFilter.has(row.domain.trim().toLowerCase()));
      }

      filtered = filtered.slice().sort((a, b) => {
        if (sortBy === 'time_wasted') {
          const timeDiff = (b.estimated_time_wasted_hours ?? 0) - (a.estimated_time_wasted_hours ?? 0);
          if (timeDiff !== 0) return timeDiff;
          const voteDiff = (b.vote_count ?? 0) - (a.vote_count ?? 0);
          if (voteDiff !== 0) return voteDiff;
          return (b.created_at || '').localeCompare(a.created_at || '');
        }

        if (sortBy === 'newest') {
          return (b.created_at || '').localeCompare(a.created_at || '');
        }

        const voteDiff = (b.vote_count ?? 0) - (a.vote_count ?? 0);
        if (voteDiff !== 0) return voteDiff;
        const timeDiff = (b.estimated_time_wasted_hours ?? 0) - (a.estimated_time_wasted_hours ?? 0);
        if (timeDiff !== 0) return timeDiff;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });

      return {
        items: filtered
          .slice(0, limit)
          .map((row) => createProblemListItem(row, userNameById.get(row.created_by_user_id) ?? 'Unknown')),
        nextCursor: null,
      };
    } catch (error) {
      if (hasMissingTable(error, PROBLEM_TABLE)) {
        throw new Error(
          `Missing required table ${PROBLEM_TABLE}. Apply the phase 1 problem exchange migration before calling hdcListProblems.`
        );
      }
      throw error;
    }
  }

  async listProblemImportCandidates(
    _viewer: ViewerContext,
    input: ListProblemImportCandidatesInput = {}
  ): Promise<ListProblemImportCandidatesResult> {
    const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));
    const minVoteCount = Math.max(0, Math.floor(input.minVoteCount ?? 3));
    const statusCandidates = (input.statuses || []).filter((status) => isProblemStatus(status));
    const statuses: ProblemStatus[] =
      statusCandidates.length > 0
        ? statusCandidates
        : ['open', 'claimed'];

    try {
      const [rows, users] = await Promise.all([
        this.client.selectMany<DbProblem>(
          PROBLEM_TABLE,
          'id,title,description,frequency,estimated_time_wasted_hours,team,domain,contact_details,status,moderation_state,vote_count,flag_count,created_by_user_id,claimed_by_user_id,linked_hack_project_id,linked_artifact_id,auto_hidden_at,hidden_at,closed_at,created_at,updated_at'
        ),
        this.client.selectMany<DbUser>(USER_TABLE, 'id,email,full_name'),
      ]);

      const allowedStatuses = new Set(statuses);
      const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));

      const items = rows
        .filter((row) => normalizeProblemModerationState(row.moderation_state) === 'visible')
        .filter((row) => {
          const status = isProblemStatus(row.status) ? row.status : 'open';
          return allowedStatuses.has(status);
        })
        .filter((row) => (row.vote_count ?? 0) >= minVoteCount)
        .sort((a, b) => {
          const voteDiff = (b.vote_count ?? 0) - (a.vote_count ?? 0);
          if (voteDiff !== 0) return voteDiff;
          const hoursDiff = (b.estimated_time_wasted_hours ?? 0) - (a.estimated_time_wasted_hours ?? 0);
          if (hoursDiff !== 0) return hoursDiff;
          return (b.updated_at ?? b.created_at ?? '').localeCompare(a.updated_at ?? a.created_at ?? '');
        })
        .slice(0, limit)
        .map((row) => createProblemImportCandidate(row, userNameById.get(row.created_by_user_id) ?? 'Unknown'));

      return {
        items,
        criteria: {
          minVoteCount,
          statuses,
        },
      };
    } catch (error) {
      if (hasMissingTable(error, PROBLEM_TABLE)) {
        throw new Error(
          `Missing required table ${PROBLEM_TABLE}. Apply the phase 1 problem exchange migration before calling hdcListProblemImportCandidates.`
        );
      }
      throw error;
    }
  }

  async listPathways(
    viewer: ViewerContext,
    input: ListPathwaysInput = {}
  ): Promise<ListPathwaysResult> {
    const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));
    const query = input.query?.trim().toLowerCase() ?? '';
    const domainFilter = input.domain?.trim().toLowerCase() ?? '';
    const roleFilter = input.role?.trim().toLowerCase() ?? '';
    const requestedTags = normalizeArtifactTags(input.tags ?? []);
    const recommendedOnly = input.recommendedOnly === true;
    const publishedOnly = input.publishedOnly !== false;

    try {
      const canManage = await this.canUserManagePathways(viewer);
      const accountId = viewer.accountId?.trim();
      const viewerUser =
        accountId && accountId !== 'unknown-atlassian-account' ? await this.getUserByAccountId(accountId) : null;

      const [pathways, stepRows, users, progressRows] = await Promise.all([
        this.client.selectMany<DbPathway>(
          PATHWAY_TABLE,
          'id,title,summary,intro_text,domain,role,tags,published,recommended,created_by_user_id,updated_by_user_id,created_at,updated_at'
        ),
        this.client.selectMany<DbPathwayStep>(
          PATHWAY_STEP_TABLE,
          'id,pathway_id,position,step_type,title,description,linked_hack_project_id,linked_artifact_id,external_url,challenge_prompt,is_optional,created_at,updated_at'
        ),
        this.client.selectMany<DbUser>(USER_TABLE, 'id,email,full_name'),
        viewerUser
          ? this.client.selectMany<DbPathwayProgress>(
              PATHWAY_PROGRESS_TABLE,
              'id,pathway_id,step_id,user_id,completed_at,created_at',
              [{ field: 'user_id', op: 'eq', value: viewerUser.id }]
            )
          : Promise.resolve([] as DbPathwayProgress[]),
      ]);

      const preferredDomains = new Set<string>();
      const preferredRoles = new Set<string>();
      for (const tag of viewerUser?.capability_tags ?? []) {
        const normalized = String(tag || '').trim().toLowerCase();
        if (normalized.startsWith('domain:')) {
          preferredDomains.add(normalized.slice('domain:'.length).trim());
        }
        if (normalized.startsWith('role:')) {
          preferredRoles.add(normalized.slice('role:'.length).trim());
        }
      }

      const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));
      const progressByPathwayId = new Map<string, DbPathwayProgress[]>();
      for (const row of progressRows) {
        const list = progressByPathwayId.get(row.pathway_id) ?? [];
        list.push(row);
        progressByPathwayId.set(row.pathway_id, list);
      }

      const stepsByPathwayId = new Map<string, PathwayStep[]>();
      for (const row of stepRows) {
        const list = stepsByPathwayId.get(row.pathway_id) ?? [];
        list.push(createPathwayStep(row));
        stepsByPathwayId.set(row.pathway_id, list);
      }
      for (const [pathwayId, steps] of stepsByPathwayId.entries()) {
        steps.sort((a, b) => a.position - b.position);
        stepsByPathwayId.set(pathwayId, steps);
      }

      const items = pathways
        .filter((row) => (publishedOnly && !canManage ? row.published === true : true))
        .filter((row) => (publishedOnly && canManage ? row.published !== false : true))
        .filter((row) => (recommendedOnly ? row.recommended === true : true))
        .filter((row) => (domainFilter ? (row.domain ?? '').trim().toLowerCase() === domainFilter : true))
        .filter((row) => (roleFilter ? (row.role ?? '').trim().toLowerCase() === roleFilter : true))
        .filter((row) => {
          if (requestedTags.length === 0) return true;
          const rowTags = new Set((row.tags ?? []).map((tag) => String(tag).trim().toLowerCase()));
          return requestedTags.every((tag) => rowTags.has(tag));
        })
        .filter((row) => {
          if (!query) return true;
          const haystack = [
            row.title,
            row.summary ?? '',
            row.intro_text ?? '',
            ...(row.tags ?? []),
            row.domain ?? '',
            row.role ?? '',
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(query);
        })
        .map((row) => {
          const steps = stepsByPathwayId.get(row.id) ?? [];
          const progress = createPathwayProgressSnapshot(steps, progressByPathwayId.get(row.id) ?? []);
          const item = createPathwayListItem(
            row,
            steps,
            userNameById.get(row.updated_by_user_id ?? row.created_by_user_id ?? '') ?? 'Unknown',
            progress
          );
          const normalizedDomain = (item.domain ?? '').trim().toLowerCase();
          const normalizedRole = (item.role ?? '').trim().toLowerCase();
          let rankScore = 0;
          if (item.recommended) rankScore += 1;
          if (query && item.title.toLowerCase().includes(query)) rankScore += 3;
          if (query && item.summary.toLowerCase().includes(query)) rankScore += 1;
          if (normalizedDomain && preferredDomains.has(normalizedDomain)) rankScore += 4;
          if (normalizedRole && preferredRoles.has(normalizedRole)) rankScore += 4;
          return { item, rankScore };
        })
        .sort((a, b) => {
          if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
          return b.item.updatedAt.localeCompare(a.item.updatedAt);
        })
        .slice(0, limit)
        .map((row) => row.item);

      return {
        items,
        canManage,
      };
    } catch (error) {
      if (
        hasMissingTable(error, PATHWAY_TABLE) ||
        hasMissingTable(error, PATHWAY_STEP_TABLE) ||
        hasMissingTable(error, PATHWAY_PROGRESS_TABLE)
      ) {
        throw new Error(
          `Missing required pathways tables (${PATHWAY_TABLE}/${PATHWAY_STEP_TABLE}/${PATHWAY_PROGRESS_TABLE}). Apply the phase 2 pathways migration before calling pathway resolvers.`
        );
      }
      throw error;
    }
  }

  async getPathway(viewer: ViewerContext, pathwayId: string): Promise<GetPathwayResult> {
    const normalizedPathwayId = pathwayId.trim();
    if (!normalizedPathwayId) {
      throw createPathwayValidationError('pathwayId is required.');
    }

    try {
      const canManage = await this.canUserManagePathways(viewer);
      const accountId = viewer.accountId?.trim();
      const viewerUser =
        accountId && accountId !== 'unknown-atlassian-account' ? await this.getUserByAccountId(accountId) : null;

      const [row, stepRows, users, progressRows] = await Promise.all([
        this.client.selectOne<DbPathway>(
          PATHWAY_TABLE,
          'id,title,summary,intro_text,domain,role,tags,published,recommended,created_by_user_id,updated_by_user_id,created_at,updated_at',
          [{ field: 'id', op: 'eq', value: normalizedPathwayId }]
        ),
        this.client.selectMany<DbPathwayStep>(
          PATHWAY_STEP_TABLE,
          'id,pathway_id,position,step_type,title,description,linked_hack_project_id,linked_artifact_id,external_url,challenge_prompt,is_optional,created_at,updated_at',
          [{ field: 'pathway_id', op: 'eq', value: normalizedPathwayId }]
        ),
        this.client.selectMany<DbUser>(USER_TABLE, 'id,email,full_name'),
        viewerUser
          ? this.client.selectMany<DbPathwayProgress>(
              PATHWAY_PROGRESS_TABLE,
              'id,pathway_id,step_id,user_id,completed_at,created_at',
              [
                { field: 'pathway_id', op: 'eq', value: normalizedPathwayId },
                { field: 'user_id', op: 'eq', value: viewerUser.id },
              ]
            )
          : Promise.resolve([] as DbPathwayProgress[]),
      ]);

      if (!row || (!canManage && row.published !== true)) {
        throw new Error('[PATHWAY_NOT_FOUND] Pathway not found.');
      }

      const steps = stepRows.map((step) => createPathwayStep(step)).sort((a, b) => a.position - b.position);
      const progress = createPathwayProgressSnapshot(steps, progressRows);
      const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));

      return {
        pathway: createPathwayListItem(
          row,
          steps,
          userNameById.get(row.updated_by_user_id ?? row.created_by_user_id ?? '') ?? 'Unknown',
          progress
        ),
        steps,
        canManage,
      };
    } catch (error) {
      if (
        hasMissingTable(error, PATHWAY_TABLE) ||
        hasMissingTable(error, PATHWAY_STEP_TABLE) ||
        hasMissingTable(error, PATHWAY_PROGRESS_TABLE)
      ) {
        throw new Error(
          `Missing required pathways tables (${PATHWAY_TABLE}/${PATHWAY_STEP_TABLE}/${PATHWAY_PROGRESS_TABLE}). Apply the phase 2 pathways migration before calling pathway resolvers.`
        );
      }
      throw error;
    }
  }

  async upsertPathway(viewer: ViewerContext, input: UpsertPathwayInput): Promise<UpsertPathwayResult> {
    const canManage = await this.canUserManagePathways(viewer);
    if (!canManage) {
      throw new Error(
        `[PATHWAY_FORBIDDEN] Pathway editor access required via org admin role/capability tags. accountId=${viewer.accountId}`
      );
    }

    const title = input.title?.trim();
    if (!title || title.length < 3) {
      throw createPathwayValidationError('title must be at least 3 characters.');
    }

    const stepsInput = Array.isArray(input.steps) ? input.steps : [];
    if (stepsInput.length === 0) {
      throw createPathwayValidationError('at least one pathway step is required.');
    }
    if (stepsInput.length > 50) {
      throw createPathwayValidationError('no more than 50 steps are allowed.');
    }

    const normalizedPathwayId = input.pathwayId?.trim() || randomUUID();
    const user = await this.ensureUser(viewer);
    const now = nowIso();

    try {
      const existing =
        input.pathwayId?.trim()
          ? await this.client.selectOne<DbPathway>(
              PATHWAY_TABLE,
              'id,created_by_user_id,created_at',
              [{ field: 'id', op: 'eq', value: normalizedPathwayId }]
            )
          : null;
      const existingStepRows = existing
        ? await this.client.selectMany<DbPathwayStep>(PATHWAY_STEP_TABLE, 'id,created_at', [
            { field: 'pathway_id', op: 'eq', value: normalizedPathwayId },
          ])
        : [];
      const existingStepById = new Map(existingStepRows.map((row) => [row.id, row]));
      const normalizedStepIds = new Set<string>();

      const normalizedSteps = stepsInput.map((step, index) => {
        const type = isPathwayStepType(step.type) ? step.type : null;
        if (!type) {
          throw createPathwayValidationError(`step ${index + 1}: type must be read, try, or build.`);
        }
        const stepTitle = step.title?.trim();
        if (!stepTitle || stepTitle.length < 3) {
          throw createPathwayValidationError(`step ${index + 1}: title must be at least 3 characters.`);
        }
        const externalUrl = step.externalUrl?.trim();
        if (externalUrl && !/^https?:\/\//i.test(externalUrl)) {
          throw createPathwayValidationError(`step ${index + 1}: externalUrl must be a valid http(s) URL.`);
        }
        const linkedArtifactId = step.linkedArtifactId?.trim() || null;
        if (linkedArtifactId && !isUuid(linkedArtifactId)) {
          throw createPathwayValidationError(`step ${index + 1}: linkedArtifactId must be a valid UUID.`);
        }

        const requestedStepId = step.stepId?.trim() || null;
        if (requestedStepId && existing && !existingStepById.has(requestedStepId)) {
          throw createPathwayValidationError(`step ${index + 1}: stepId does not belong to this pathway.`);
        }
        const stepId = requestedStepId && existingStepById.has(requestedStepId) ? requestedStepId : randomUUID();
        if (normalizedStepIds.has(stepId)) {
          throw createPathwayValidationError(`step ${index + 1}: duplicate stepId in payload.`);
        }
        normalizedStepIds.add(stepId);

        return {
          id: stepId,
          pathway_id: normalizedPathwayId,
          position: index + 1,
          step_type: type,
          title: stepTitle,
          description: step.description?.trim() || '',
          linked_hack_project_id: step.linkedHackProjectId?.trim() || null,
          linked_artifact_id: linkedArtifactId,
          external_url: externalUrl || null,
          challenge_prompt: step.challengePrompt?.trim() || null,
          is_optional: step.isOptional === true,
          created_at: existingStepById.get(stepId)?.created_at ?? now,
          updated_at: now,
        };
      });

      await this.client.upsert<DbPathway>(
        PATHWAY_TABLE,
        {
          id: normalizedPathwayId,
          title,
          summary: input.summary?.trim() || '',
          intro_text: input.introText?.trim() || '',
          domain: input.domain?.trim() || null,
          role: input.role?.trim() || null,
          tags: normalizeArtifactTags(input.tags ?? []),
          published: input.published === true,
          recommended: input.recommended === true,
          created_by_user_id: existing?.created_by_user_id ?? user.id,
          updated_by_user_id: user.id,
          created_at: existing?.created_at ?? now,
          updated_at: now,
        },
        'id'
      );

      const retainedStepIds = existingStepRows.filter((step) => normalizedStepIds.has(step.id)).map((step) => step.id);
      for (let index = 0; index < retainedStepIds.length; index += 1) {
        await this.client.patchMany<DbPathwayStep>(
          PATHWAY_STEP_TABLE,
          { position: 1000 + index + 1, updated_at: now },
          [{ field: 'id', op: 'eq', value: retainedStepIds[index] }]
        );
      }

      for (const existingStep of existingStepRows) {
        if (!normalizedStepIds.has(existingStep.id)) {
          await this.client.deleteMany(PATHWAY_STEP_TABLE, [{ field: 'id', op: 'eq', value: existingStep.id }]);
        }
      }

      for (const step of normalizedSteps) {
        await this.client.upsert<DbPathwayStep>(PATHWAY_STEP_TABLE, step, 'id');
      }

      const result = await this.getPathway(viewer, normalizedPathwayId);
      return {
        pathway: result.pathway,
        steps: result.steps,
      };
    } catch (error) {
      if (hasMissingTable(error, PATHWAY_TABLE) || hasMissingTable(error, PATHWAY_STEP_TABLE)) {
        throw new Error(
          `Missing required pathways tables (${PATHWAY_TABLE}/${PATHWAY_STEP_TABLE}). Apply the phase 2 pathways migration before calling hdcUpsertPathway.`
        );
      }
      throw error;
    }
  }

  async setPathwayStepCompletion(
    viewer: ViewerContext,
    input: SetPathwayStepCompletionInput
  ): Promise<SetPathwayStepCompletionResult> {
    const pathwayId = input.pathwayId?.trim();
    const stepId = input.stepId?.trim();
    if (!pathwayId) {
      throw createPathwayValidationError('pathwayId is required.');
    }
    if (!stepId) {
      throw createPathwayValidationError('stepId is required.');
    }

    const user = await this.ensureUser(viewer);
    const canManage = await this.canUserManagePathways(viewer);

    try {
      const pathway = await this.client.selectOne<DbPathway>(
        PATHWAY_TABLE,
        'id,published',
        [{ field: 'id', op: 'eq', value: pathwayId }]
      );
      if (!pathway || (!canManage && pathway.published !== true)) {
        throw new Error('[PATHWAY_NOT_FOUND] Pathway not found.');
      }

      const step = await this.client.selectOne<DbPathwayStep>(
        PATHWAY_STEP_TABLE,
        'id,pathway_id,position,step_type,title,description,linked_hack_project_id,linked_artifact_id,external_url,challenge_prompt,is_optional,created_at,updated_at',
        [
          { field: 'id', op: 'eq', value: stepId },
          { field: 'pathway_id', op: 'eq', value: pathwayId },
        ]
      );
      if (!step) {
        throw new Error('[PATHWAY_STEP_NOT_FOUND] Step not found for pathway.');
      }

      const existingProgress = await this.client.selectOne<DbPathwayProgress>(
        PATHWAY_PROGRESS_TABLE,
        'id,pathway_id,step_id,user_id,completed_at,created_at',
        [
          { field: 'pathway_id', op: 'eq', value: pathwayId },
          { field: 'step_id', op: 'eq', value: stepId },
          { field: 'user_id', op: 'eq', value: user.id },
        ]
      );

      const completedAt = input.completed ? nowIso() : null;
      if (input.completed) {
        if (existingProgress) {
          await this.client.patchMany(
            PATHWAY_PROGRESS_TABLE,
            { completed_at: completedAt },
            [{ field: 'id', op: 'eq', value: existingProgress.id }]
          );
        } else {
          await this.client.insert(PATHWAY_PROGRESS_TABLE, {
            id: randomUUID(),
            pathway_id: pathwayId,
            step_id: stepId,
            user_id: user.id,
            completed_at: completedAt,
            created_at: completedAt,
          });
        }
      } else if (existingProgress) {
        await this.client.deleteMany(PATHWAY_PROGRESS_TABLE, [{ field: 'id', op: 'eq', value: existingProgress.id }]);
      }

      const [allSteps, allProgress] = await Promise.all([
        this.client.selectMany<DbPathwayStep>(
          PATHWAY_STEP_TABLE,
          'id,pathway_id,position,step_type,title,description,linked_hack_project_id,linked_artifact_id,external_url,challenge_prompt,is_optional,created_at,updated_at',
          [{ field: 'pathway_id', op: 'eq', value: pathwayId }]
        ),
        this.client.selectMany<DbPathwayProgress>(
          PATHWAY_PROGRESS_TABLE,
          'id,pathway_id,step_id,user_id,completed_at,created_at',
          [
            { field: 'pathway_id', op: 'eq', value: pathwayId },
            { field: 'user_id', op: 'eq', value: user.id },
          ]
        ),
      ]);

      const progress = createPathwayProgressSnapshot(
        allSteps.map((row) => createPathwayStep(row)).sort((a, b) => a.position - b.position),
        allProgress
      );

      return {
        pathwayId,
        stepId,
        completed: input.completed,
        completedAt,
        progress,
      };
    } catch (error) {
      if (
        hasMissingTable(error, PATHWAY_TABLE) ||
        hasMissingTable(error, PATHWAY_STEP_TABLE) ||
        hasMissingTable(error, PATHWAY_PROGRESS_TABLE)
      ) {
        throw new Error(
          `Missing required pathways tables (${PATHWAY_TABLE}/${PATHWAY_STEP_TABLE}/${PATHWAY_PROGRESS_TABLE}). Apply the phase 2 pathways migration before calling pathway progress APIs.`
        );
      }
      throw error;
    }
  }

  async voteProblem(viewer: ViewerContext, problemId: string): Promise<VoteProblemResult> {
    const normalizedId = problemId.trim();
    if (!normalizedId) {
      throw createProblemValidationError('problemId is required.');
    }

    const user = await this.ensureUser(viewer);
    const problem = await this.getProblemById(normalizedId);
    if (!problem) {
      throw new Error('[PROBLEM_NOT_FOUND] Problem not found.');
    }
    if (normalizeProblemModerationState(problem.moderation_state) === 'removed') {
      throw new Error('[PROBLEM_MODERATION_INVALID] Removed problems cannot be voted on.');
    }

    const currentVoteCount = problem.vote_count ?? 0;
    const now = nowIso();
    try {
      await this.client.insert<DbProblemVote>(PROBLEM_VOTE_TABLE, {
        id: randomUUID(),
        problem_id: normalizedId,
        user_id: user.id,
        created_at: now,
      });

      const rows = await this.client.patchMany<DbProblem>(
        PROBLEM_TABLE,
        { vote_count: currentVoteCount + 1, updated_at: now },
        [{ field: 'id', op: 'eq', value: normalizedId }]
      );
      const updatedVoteCount = rows[0]?.vote_count ?? currentVoteCount + 1;
      logProblemExchangeTelemetry('problem_voted', {
        problemId: normalizedId,
        accountId: viewer.accountId,
        voteCount: updatedVoteCount,
        alreadyVoted: false,
      });
      return {
        problemId: normalizedId,
        voteCount: updatedVoteCount,
        alreadyVoted: false,
      };
    } catch (error) {
      if (hasMissingTable(error, PROBLEM_TABLE) || hasMissingTable(error, PROBLEM_VOTE_TABLE)) {
        throw new Error(
          `Missing required problem exchange tables (${PROBLEM_TABLE}/${PROBLEM_VOTE_TABLE}). Apply the phase 1 problem exchange migration before calling hdcVoteProblem.`
        );
      }
      if (isDuplicateProblemVoteError(error)) {
        logProblemExchangeTelemetry('problem_voted', {
          problemId: normalizedId,
          accountId: viewer.accountId,
          voteCount: currentVoteCount,
          alreadyVoted: true,
        });
        return {
          problemId: normalizedId,
          voteCount: currentVoteCount,
          alreadyVoted: true,
        };
      }
      throw error;
    }
  }

  async updateProblemStatus(
    viewer: ViewerContext,
    input: UpdateProblemStatusInput
  ): Promise<UpdateProblemStatusResult> {
    const problemId = input.problemId?.trim();
    if (!problemId) {
      throw createProblemValidationError('problemId is required.');
    }
    if (!isProblemStatus(input.status)) {
      throw createProblemValidationError('status is invalid.');
    }

    const user = await this.ensureUser(viewer);
    const problem = await this.getProblemById(problemId);
    if (!problem) {
      throw new Error('[PROBLEM_NOT_FOUND] Problem not found.');
    }

    const linkedHackProjectId = input.linkedHackProjectId?.trim() || problem.linked_hack_project_id || null;
    const linkedArtifactId = input.linkedArtifactId?.trim() || problem.linked_artifact_id || null;

    if (input.status === 'solved' && !linkedHackProjectId && !linkedArtifactId) {
      throw createProblemValidationError('solved status requires linkedHackProjectId or linkedArtifactId.');
    }

    if (linkedHackProjectId) {
      const sourceHack = await this.getProjectById(linkedHackProjectId);
      if (!sourceHack || sourceHack.source_type !== 'hack_submission') {
        throw new Error('[PROBLEM_SOURCE_LINK_INVALID] linkedHackProjectId must reference a hack submission project.');
      }
    }

    if (linkedArtifactId) {
      const sourceArtifact = await this.getArtifactRowById(linkedArtifactId);
      if (!sourceArtifact || sourceArtifact.archived_at) {
        throw new Error('[PROBLEM_SOURCE_LINK_INVALID] linkedArtifactId must reference an active Artifact.');
      }
    }

    const now = nowIso();
    const patchPayload: Record<string, unknown> = {
      status: input.status,
      linked_hack_project_id: linkedHackProjectId,
      linked_artifact_id: linkedArtifactId,
      updated_at: now,
    };

    if (input.status === 'claimed') {
      patchPayload.claimed_by_user_id = user.id;
    }
    if (input.status === 'closed') {
      patchPayload.closed_at = now;
    }

    try {
      const updatedRows = await this.client.patchMany<DbProblem>(
        PROBLEM_TABLE,
        patchPayload,
        [{ field: 'id', op: 'eq', value: problemId }]
      );
      const updated = updatedRows[0];
      if (!updated) {
        throw new Error('[PROBLEM_NOT_FOUND] Problem not found.');
      }

      await this.client.insert<DbProblemStatusHistory>(PROBLEM_STATUS_HISTORY_TABLE, {
        id: randomUUID(),
        problem_id: problemId,
        from_status: problem.status,
        to_status: input.status,
        changed_by_user_id: user.id,
        change_note: input.note?.trim() || null,
        linked_hack_project_id: linkedHackProjectId,
        linked_artifact_id: linkedArtifactId,
        created_at: now,
      });

      logProblemExchangeTelemetry('problem_status_updated', {
        problemId,
        accountId: viewer.accountId,
        fromStatus: problem.status,
        toStatus: input.status,
        linkedHackProjectId: linkedHackProjectId ?? null,
        linkedArtifactId: linkedArtifactId ?? null,
      });

      return {
        problemId,
        status: isProblemStatus(updated.status) ? updated.status : input.status,
        linkedHackProjectId: updated.linked_hack_project_id ?? undefined,
        linkedArtifactId: updated.linked_artifact_id ?? undefined,
        updatedAt: updated.updated_at ?? now,
      };
    } catch (error) {
      if (
        hasMissingTable(error, PROBLEM_TABLE) ||
        hasMissingTable(error, PROBLEM_STATUS_HISTORY_TABLE) ||
        hasMissingTable(error, ARTIFACT_TABLE)
      ) {
        throw new Error(
          `Missing required problem exchange tables. Apply the phase 1 problem exchange migration before calling hdcUpdateProblemStatus.`
        );
      }
      throw error;
    }
  }

  async flagProblem(viewer: ViewerContext, input: FlagProblemInput): Promise<FlagProblemResult> {
    const problemId = input.problemId?.trim();
    if (!problemId) {
      throw createProblemValidationError('problemId is required.');
    }

    const user = await this.ensureUser(viewer);
    const problem = await this.getProblemById(problemId);
    if (!problem) {
      throw new Error('[PROBLEM_NOT_FOUND] Problem not found.');
    }

    const moderationState = normalizeProblemModerationState(problem.moderation_state);
    if (moderationState === 'removed') {
      throw new Error('[PROBLEM_MODERATION_INVALID] Removed problems cannot be flagged.');
    }

    const currentFlagCount = problem.flag_count ?? 0;
    const now = nowIso();
    try {
      await this.client.insert<DbProblemFlag>(PROBLEM_FLAG_TABLE, {
        id: randomUUID(),
        problem_id: problemId,
        user_id: user.id,
        reason: input.reason?.trim() || null,
        created_at: now,
      });

      const rows = await this.client.patchMany<DbProblem>(
        PROBLEM_TABLE,
        { flag_count: currentFlagCount + 1, updated_at: now },
        [{ field: 'id', op: 'eq', value: problemId }]
      );
      const updated = rows[0] ?? problem;
      const updatedFlagCount = updated.flag_count ?? currentFlagCount + 1;

      let nextModerationState = normalizeProblemModerationState(updated.moderation_state);
      let autoHidden = false;
      if (updatedFlagCount >= 3 && nextModerationState === 'visible') {
        await this.client.patchMany<DbProblem>(
          PROBLEM_TABLE,
          {
            moderation_state: 'hidden_pending_review',
            auto_hidden_at: now,
            hidden_at: now,
            updated_at: now,
          },
          [{ field: 'id', op: 'eq', value: problemId }]
        );
        await this.client.insert<DbProblemModerationLog>(PROBLEM_MODERATION_LOG_TABLE, {
          id: randomUUID(),
          problem_id: problemId,
          action: 'auto_hidden',
          changed_by_user_id: null,
          note: 'Auto-hidden after 3 distinct community flags.',
          created_at: now,
        });
        nextModerationState = 'hidden_pending_review';
        autoHidden = true;
      }

      logProblemExchangeTelemetry('problem_flagged', {
        problemId,
        accountId: viewer.accountId,
        flagCount: updatedFlagCount,
        alreadyFlagged: false,
        moderationState: nextModerationState,
        autoHidden,
      });

      return {
        problemId,
        flagCount: updatedFlagCount,
        alreadyFlagged: false,
        moderationState: nextModerationState,
        autoHidden,
      };
    } catch (error) {
      if (hasMissingTable(error, PROBLEM_TABLE) || hasMissingTable(error, PROBLEM_FLAG_TABLE)) {
        throw new Error(
          `Missing required problem exchange tables (${PROBLEM_TABLE}/${PROBLEM_FLAG_TABLE}). Apply the phase 1 problem exchange migration before calling hdcFlagProblem.`
        );
      }
      if (isDuplicateProblemFlagError(error)) {
        logProblemExchangeTelemetry('problem_flagged', {
          problemId,
          accountId: viewer.accountId,
          flagCount: currentFlagCount,
          alreadyFlagged: true,
          moderationState,
          autoHidden: false,
        });
        return {
          problemId,
          flagCount: currentFlagCount,
          alreadyFlagged: true,
          moderationState,
          autoHidden: false,
        };
      }
      throw error;
    }
  }

  async moderateProblem(
    viewer: ViewerContext,
    input: ModerateProblemInput
  ): Promise<ModerateProblemResult> {
    const problemId = input.problemId?.trim();
    if (!problemId) {
      throw createProblemValidationError('problemId is required.');
    }
    if (input.decision !== 'remove' && input.decision !== 'reinstate') {
      throw createProblemValidationError('decision must be remove or reinstate.');
    }

    const user = await this.ensureUser(viewer);
    const problem = await this.getProblemById(problemId);
    if (!problem) {
      throw new Error('[PROBLEM_NOT_FOUND] Problem not found.');
    }

    const now = nowIso();
    const nextState: ProblemModerationState =
      input.decision === 'remove' ? 'removed' : 'visible';
    const patchPayload: Record<string, unknown> = {
      moderation_state: nextState,
      updated_at: now,
    };
    if (input.decision === 'remove') {
      patchPayload.hidden_at = now;
    } else {
      patchPayload.hidden_at = null;
    }

    try {
      await this.client.patchMany<DbProblem>(
        PROBLEM_TABLE,
        patchPayload,
        [{ field: 'id', op: 'eq', value: problemId }]
      );
      await this.client.insert<DbProblemModerationLog>(PROBLEM_MODERATION_LOG_TABLE, {
        id: randomUUID(),
        problem_id: problemId,
        action: input.decision,
        changed_by_user_id: user.id,
        note: input.note?.trim() || null,
        created_at: now,
      });
      logProblemExchangeTelemetry('problem_moderated', {
        problemId,
        accountId: viewer.accountId,
        decision: input.decision,
        moderationState: nextState,
      });
      return {
        problemId,
        moderationState: nextState,
        reviewedAt: now,
      };
    } catch (error) {
      if (hasMissingTable(error, PROBLEM_TABLE) || hasMissingTable(error, PROBLEM_MODERATION_LOG_TABLE)) {
        throw new Error(
          `Missing required problem exchange tables (${PROBLEM_TABLE}/${PROBLEM_MODERATION_LOG_TABLE}). Apply the phase 1 problem exchange migration before calling hdcModerateProblem.`
        );
      }
      throw error;
    }
  }

  async getPipelineBoard(
    viewer: ViewerContext,
    input: GetPipelineBoardInput = {}
  ): Promise<GetPipelineBoardResult> {
    const query = input.query?.trim().toLowerCase() || '';
    const stageFilter = new Set((input.stages || []).filter((stage) => isPipelineStage(stage)));
    const limit = Math.max(1, Math.min(200, Math.floor(input.limit ?? 200)));

    const canManage = await this.canUserManagePipeline(viewer);

    try {
      const [projects, users] = await Promise.all([
        this.listProjects(),
        this.client.selectMany<DbUser>(USER_TABLE, 'id,email,full_name'),
      ]);

      let stageCriteria: PipelineStageCriteria[] = defaultPipelineStageCriteria();
      try {
        const rows = await this.client.selectMany<DbPipelineStageCriteriaRow>(
          PIPELINE_STAGE_CRITERIA_TABLE,
          'stage,label,description,criteria,updated_at'
        );
        if (rows.length > 0) {
          stageCriteria = rows
            .filter((row) => isPipelineStage(row.stage))
            .map((row) => ({
              stage: row.stage as PipelineStage,
              label: row.label?.trim() || row.stage,
              description: row.description?.trim() || '',
              criteria: Array.isArray(row.criteria) ? row.criteria.filter((item): item is string => typeof item === 'string') : [],
              updatedAt: row.updated_at ?? undefined,
            }));
        }
      } catch (criteriaError) {
        if (!hasMissingTable(criteriaError, PIPELINE_STAGE_CRITERIA_TABLE)) {
          throw criteriaError;
        }
      }

      const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));
      let items = projects
        .filter((project) => project.id.trim().length > 0)
        .map((project) => createPipelineBoardItem(project, userNameById.get(project.owner_id ?? '') ?? 'Unknown'));

      if (query) {
        items = items.filter((item) =>
          `${item.title} ${item.description} ${item.ownerName}`.toLowerCase().includes(query)
        );
      }

      if (stageFilter.size > 0) {
        items = items.filter((item) => stageFilter.has(item.stage));
      }

      items = items
        .slice()
        .sort((a, b) => {
          const stageDiff = PIPELINE_STAGES.indexOf(a.stage) - PIPELINE_STAGES.indexOf(b.stage);
          if (stageDiff !== 0) return stageDiff;
          return b.daysInStage - a.daysInStage;
        })
        .slice(0, limit);

      const metrics = buildPipelineMetrics(items);

      return {
        items,
        stageCriteria: stageCriteria
          .slice()
          .sort((a, b) => PIPELINE_STAGES.indexOf(a.stage) - PIPELINE_STAGES.indexOf(b.stage)),
        metrics,
        canManage,
      };
    } catch (error) {
      if (hasMissingTable(error, PROJECT_TABLE)) {
        throw new Error(
          `Missing required table ${PROJECT_TABLE}. Apply the phase 1 baseline migrations before calling hdcGetPipelineBoard.`
        );
      }
      throw error;
    }
  }

  async movePipelineItem(viewer: ViewerContext, input: MovePipelineItemInput): Promise<MovePipelineItemResult> {
    const projectId = input.projectId?.trim();
    if (!projectId) {
      throw createPipelineValidationError('projectId is required.');
    }
    if (!isPipelineStage(input.toStage)) {
      throw createPipelineValidationError('toStage is invalid.');
    }
    const note = input.note?.trim() ?? '';
    if (note.length < 6 || note.length > 1000) {
      throw createPipelineValidationError('note must be 6-1000 characters.');
    }

    const user = await this.ensureUser(viewer);
    const project = await this.getProjectById(projectId);
    if (!project) {
      throw new Error('[PIPELINE_ITEM_NOT_FOUND] Project not found.');
    }

    const fromStage = resolveProjectPipelineStage(project);
    if (fromStage === input.toStage) {
      throw createPipelineValidationError('toStage must differ from current stage.');
    }

    const movedAt = nowIso();

    try {
      await this.client.patchMany<DbProject>(
        PROJECT_TABLE,
        {
          pipeline_stage: input.toStage,
          pipeline_stage_entered_at: movedAt,
        },
        [{ field: 'id', op: 'eq', value: projectId }]
      );

      await this.client.insert<DbPipelineTransitionLog>(PIPELINE_TRANSITION_LOG_TABLE, {
        id: randomUUID(),
        project_id: projectId,
        from_stage: fromStage,
        to_stage: input.toStage,
        note,
        changed_by_user_id: user.id,
        changed_at: movedAt,
      });

      logPipelineTelemetry('pipeline_stage_moved', {
        projectId,
        accountId: viewer.accountId,
        fromStage,
        toStage: input.toStage,
      });

      return {
        projectId,
        fromStage,
        toStage: input.toStage,
        movedAt,
        note,
      };
    } catch (error) {
      if (hasMissingTable(error, PIPELINE_TRANSITION_LOG_TABLE) || hasMissingTable(error, PROJECT_TABLE)) {
        throw new Error(
          `Missing required pipeline tables. Apply phase 1 pipeline migration before calling hdcMovePipelineItem.`
        );
      }
      if (hasMissingProjectColumn(error)) {
        const missingColumn = extractMissingProjectColumn(error);
        if (missingColumn === 'pipeline_stage' || missingColumn === 'pipeline_stage_entered_at') {
          throw new Error(
            'Missing required Project pipeline columns. Apply phase 1 pipeline migration before calling hdcMovePipelineItem.'
          );
        }
      }
      throw error;
    }
  }

  async updatePipelineStageCriteria(
    viewer: ViewerContext,
    input: UpdatePipelineStageCriteriaInput
  ): Promise<UpdatePipelineStageCriteriaResult> {
    if (!isPipelineStage(input.stage)) {
      throw createPipelineValidationError('stage is invalid.');
    }

    const normalizedCriteria = [...new Set((input.criteria ?? []).map((item) => item.trim()).filter(Boolean))];
    if (normalizedCriteria.length === 0) {
      throw createPipelineValidationError('criteria must include at least one item.');
    }
    if (normalizedCriteria.length > 12) {
      throw createPipelineValidationError('criteria cannot exceed 12 items.');
    }
    if (normalizedCriteria.some((item) => item.length < 3 || item.length > 240)) {
      throw createPipelineValidationError('each criteria item must be 3-240 characters.');
    }

    const existing = await this.client.selectOne<DbPipelineStageCriteriaRow>(
      PIPELINE_STAGE_CRITERIA_TABLE,
      'stage,label,description,criteria,updated_at',
      [{ field: 'stage', op: 'eq', value: input.stage }]
    );
    const defaultsByStage = defaultPipelineStageCriteriaByStage();
    const defaults = defaultsByStage[input.stage];

    const rawLabel = (input.label ?? existing?.label ?? defaults.label).trim();
    if (rawLabel.length < 2 || rawLabel.length > 80) {
      throw createPipelineValidationError('label must be 2-80 characters.');
    }

    const rawDescription = (input.description ?? existing?.description ?? defaults.description).trim();
    if (rawDescription.length > 500) {
      throw createPipelineValidationError('description must be 0-500 characters.');
    }

    const user = await this.ensureUser(viewer);

    try {
      const row = await this.client.upsert<DbPipelineStageCriteriaRow>(
        PIPELINE_STAGE_CRITERIA_TABLE,
        {
          stage: input.stage,
          label: rawLabel,
          description: rawDescription,
          criteria: normalizedCriteria,
          updated_by_user_id: user.id,
        },
        'stage'
      );

      return {
        stageCriteria: {
          stage: input.stage,
          label: row.label || rawLabel,
          description: row.description ?? rawDescription,
          criteria: row.criteria ?? normalizedCriteria,
          updatedAt: row.updated_at ?? nowIso(),
        },
      };
    } catch (error) {
      if (hasMissingTable(error, PIPELINE_STAGE_CRITERIA_TABLE)) {
        throw new Error(
          'Missing required PipelineStageCriteria table. Apply phase 1 pipeline migration before calling hdcUpdatePipelineStageCriteria.'
        );
      }
      throw error;
    }
  }

  async listShowcaseHacks(
    viewer: ViewerContext,
    input: ListShowcaseHacksInput = {}
  ): Promise<ListShowcaseHacksResult> {
    const query = input.query?.trim().toLowerCase() || '';
    const assetTypeFilter = new Set(
      (input.assetTypes ?? []).filter(
        (assetType): assetType is ShowcaseHackListItem['assetType'] =>
          assetType === 'prompt' || assetType === 'skill' || assetType === 'app'
      )
    );
    const statusFilter = new Set(
      (input.statuses ?? []).filter((status): status is ShowcaseHackStatus => isShowcaseHackStatus(status))
    );
    const tagFilter = new Set(normalizeShowcaseTags(input.tags ?? []));
    const sourceEventIdFilter = input.sourceEventId?.trim() || null;
    const featuredOnly = input.featuredOnly === true;
    const sortBy = input.sortBy === 'featured' || input.sortBy === 'reuse_count' ? input.sortBy : 'newest';
    const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));
    const canManage = await this.canUserManagePipeline(viewer);

    try {
      const [projects, users, showcaseRows, artifacts] = await Promise.all([
        this.listProjects(),
        this.client.selectMany<DbUser>(USER_TABLE, 'id,email,full_name'),
        this.client.selectMany<DbShowcaseHack>(
          SHOWCASE_HACK_TABLE,
          'project_id,featured,demo_url,team_members,source_event_id,tags,linked_artifact_ids,context,limitations,risk_notes,source_repo_url,created_by_user_id,created_at,updated_at'
        ),
        this.client
          .selectMany<DbArtifact>(
            ARTIFACT_TABLE,
            'id,source_hack_project_id,reuse_count,archived_at'
          )
          .catch((error) => {
            if (hasMissingTable(error, ARTIFACT_TABLE)) return [];
            throw error;
          }),
      ]);

      const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));
      const showcaseByProjectId = new Map(showcaseRows.map((row) => [row.project_id, row]));
      const reuseCountByProjectId = new Map<string, number>();
      for (const artifact of artifacts) {
        if (!artifact.source_hack_project_id || artifact.archived_at) continue;
        const current = reuseCountByProjectId.get(artifact.source_hack_project_id) ?? 0;
        reuseCountByProjectId.set(artifact.source_hack_project_id, current + Math.max(0, artifact.reuse_count ?? 0));
      }

      let hackRows = projects.filter((project) => project.source_type === 'hack_submission');
      if (hackRows.length === 0 && projects.length > 0) {
        // Legacy schema/data can classify everything as generic projects; surface those as hacks instead of an empty UI.
        hackRows = projects;
      }

      let items = hackRows
        .filter((project) => project.id.trim().length > 0)
        .map((project) =>
          createShowcaseHackListItem({
            project,
            metadata: showcaseByProjectId.get(project.id) ?? null,
            authorName: project.owner_id ? userNameById.get(project.owner_id) ?? 'Unknown' : 'Unknown',
            reuseCount: reuseCountByProjectId.get(project.id) ?? 0,
          })
        );

      if (query) {
        items = items.filter((item) =>
          `${item.title} ${item.description} ${item.authorName}`.toLowerCase().includes(query)
        );
      }
      if (assetTypeFilter.size > 0) {
        items = items.filter((item) => assetTypeFilter.has(item.assetType));
      }
      if (statusFilter.size > 0) {
        items = items.filter((item) => statusFilter.has(item.status));
      }
      if (tagFilter.size > 0) {
        items = items.filter((item) => {
          const itemTags = new Set(item.tags);
          for (const tag of tagFilter) {
            if (!itemTags.has(tag)) return false;
          }
          return true;
        });
      }
      if (sourceEventIdFilter) {
        items = items.filter((item) => (item.sourceEventId ?? '') === sourceEventIdFilter);
      }
      if (featuredOnly) {
        items = items.filter((item) => item.featured);
      }

      items = items
        .slice()
        .sort((a, b) => {
          if (sortBy === 'featured') {
            if (a.featured !== b.featured) return a.featured ? -1 : 1;
            const reuseDiff = b.reuseCount - a.reuseCount;
            if (reuseDiff !== 0) return reuseDiff;
            return b.createdAt.localeCompare(a.createdAt);
          }
          if (sortBy === 'reuse_count') {
            const reuseDiff = b.reuseCount - a.reuseCount;
            if (reuseDiff !== 0) return reuseDiff;
            return b.createdAt.localeCompare(a.createdAt);
          }
          return b.createdAt.localeCompare(a.createdAt);
        })
        .slice(0, limit);

      return { items, canManage };
    } catch (error) {
      if (hasMissingTable(error, SHOWCASE_HACK_TABLE)) {
        throw new Error(
          `Missing required table ${SHOWCASE_HACK_TABLE}. Apply the phase 1 showcase migration before calling hdcListShowcaseHacks.`
        );
      }
      if (hasMissingTable(error, PROJECT_TABLE)) {
        throw new Error(
          `Missing required table ${PROJECT_TABLE}. Apply the phase 1 baseline migrations before calling hdcListShowcaseHacks.`
        );
      }
      throw error;
    }
  }

  async getShowcaseHackDetail(
    _viewer: ViewerContext,
    projectId: string
  ): Promise<GetShowcaseHackDetailResult> {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      throw createShowcaseValidationError('projectId is required.');
    }

    const project = await this.getProjectById(normalizedProjectId);
    if (!project) {
      throw new Error('[SHOWCASE_NOT_FOUND] Hack not found.');
    }

    try {
      const [showcaseRow, artifacts, problems, owner] = await Promise.all([
        this.client.selectOne<DbShowcaseHack>(
          SHOWCASE_HACK_TABLE,
          'project_id,featured,demo_url,team_members,source_event_id,tags,linked_artifact_ids,context,limitations,risk_notes,source_repo_url,created_by_user_id,created_at,updated_at',
          [{ field: 'project_id', op: 'eq', value: normalizedProjectId }]
        ),
        this.client
          .selectMany<DbArtifact>(
            ARTIFACT_TABLE,
            'id,title,artifact_type,visibility,reuse_count,source_hack_project_id,archived_at',
            [{ field: 'source_hack_project_id', op: 'eq', value: normalizedProjectId }]
          )
          .catch((error) => {
            if (hasMissingTable(error, ARTIFACT_TABLE)) return [];
            throw error;
          }),
        this.client
          .selectMany<DbProblem>(
            PROBLEM_TABLE,
            'id,title,status,updated_at,linked_hack_project_id',
            [{ field: 'linked_hack_project_id', op: 'eq', value: normalizedProjectId }]
          )
          .catch((error) => {
            if (hasMissingTable(error, PROBLEM_TABLE)) return [];
            throw error;
          }),
        project.owner_id ? this.getUserById(project.owner_id) : Promise.resolve(null),
      ]);

      const publishedArtifacts = artifacts.filter((artifact) => !artifact.archived_at);
      const reuseCount = publishedArtifacts.reduce((sum, artifact) => sum + Math.max(0, artifact.reuse_count ?? 0), 0);
      const listItem = createShowcaseHackListItem({
        project,
        metadata: showcaseRow ?? null,
        authorName: owner?.full_name || owner?.email || 'Unknown',
        reuseCount,
      });

      const linkedArtifactIds = normalizeShowcaseLinkedArtifactIds(showcaseRow?.linked_artifact_ids ?? []);

      return {
        hack: {
          ...listItem,
          teamMembers: normalizeShowcaseTeamMembers(showcaseRow?.team_members ?? []),
          linkedArtifactIds,
          context: showcaseRow?.context ?? null,
          limitations: showcaseRow?.limitations ?? null,
          riskNotes: showcaseRow?.risk_notes ?? null,
          sourceRepoUrl: showcaseRow?.source_repo_url ?? null,
        },
        artifactsProduced: publishedArtifacts
          .map((artifact) => ({
            artifactId: artifact.id,
            title: artifact.title,
            artifactType: artifact.artifact_type,
            visibility: normalizeArtifactVisibility(artifact.visibility),
            reuseCount: artifact.reuse_count ?? 0,
          }))
          .sort((a, b) => b.reuseCount - a.reuseCount),
        problemsSolved: problems
          .filter((problem) => problem.status === 'solved' || problem.status === 'closed')
          .map((problem) => ({
            problemId: problem.id,
            title: problem.title,
            status: isProblemStatus(problem.status) ? problem.status : 'open',
            updatedAt: problem.updated_at ?? nowIso(),
          }))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      };
    } catch (error) {
      if (hasMissingTable(error, SHOWCASE_HACK_TABLE)) {
        throw new Error(
          `Missing required table ${SHOWCASE_HACK_TABLE}. Apply the phase 1 showcase migration before calling hdcGetShowcaseHackDetail.`
        );
      }
      throw error;
    }
  }

  async setShowcaseFeatured(
    viewer: ViewerContext,
    input: SetShowcaseFeaturedInput
  ): Promise<SetShowcaseFeaturedResult> {
    const normalizedProjectId = input.projectId?.trim();
    if (!normalizedProjectId) {
      throw createShowcaseValidationError('projectId is required.');
    }

    const project = await this.getProjectById(normalizedProjectId);
    if (!project) {
      throw new Error('[SHOWCASE_NOT_FOUND] Hack not found.');
    }

    const user = await this.ensureUser(viewer);

    try {
      const row = await this.client.upsert<DbShowcaseHack>(
        SHOWCASE_HACK_TABLE,
        {
          project_id: normalizedProjectId,
          featured: input.featured === true,
          source_event_id: project.event_id,
          created_by_user_id: user.id,
        },
        'project_id'
      );
      return {
        projectId: normalizedProjectId,
        featured: row.featured === true,
        updatedAt: row.updated_at ?? nowIso(),
      };
    } catch (error) {
      if (hasMissingTable(error, SHOWCASE_HACK_TABLE)) {
        throw new Error(
          `Missing required table ${SHOWCASE_HACK_TABLE}. Apply the phase 1 showcase migration before calling hdcSetShowcaseFeatured.`
        );
      }
      throw error;
    }
  }

  async createProject(viewer: ViewerContext, input: CreateProjectInput): Promise<CreateProjectResult> {
    const user = await this.ensureUser(viewer);
    const inserted = await this.insertProject({
      title: input.title,
      name: input.title,
      description: input.description ?? null,
      status: 'idea',
      hack_type: input.hackType ?? null,
      visibility: input.visibility ?? 'org',
      owner_id: user.id,
      workflow_transformed: false,
      source_type: 'project',
      synced_to_library_at: null,
      pipeline_stage: 'hack',
      pipeline_stage_entered_at: nowIso(),
    });

    return {
      projectId: inserted.id,
      title: inserted.title ?? inserted.name ?? input.title,
    };
  }

  async updateMentorProfile(
    viewer: ViewerContext,
    input: UpdateMentorProfileInput
  ): Promise<UpdateMentorProfileResult> {
    const user = await this.ensureUser(viewer);
    const rows = await this.client.patchMany<DbUser>(
      USER_TABLE,
      {
        mentor_capacity: Math.max(0, Math.floor(input.mentorCapacity)),
        happy_to_mentor: input.happyToMentor,
        seeking_mentor: input.seekingMentor,
      },
      [{ field: 'id', op: 'eq', value: user.id }]
    );

    const updated = rows[0] ?? user;
    return {
      profileId: updated.id,
      mentorCapacity: Math.max(0, Math.floor(updated.mentor_capacity ?? 0)),
    };
  }

  async getEventByConfluencePageId(pageId: string): Promise<DbEvent | null> {
    const event = await this.getEventByConfluencePageIdNoArchive(pageId);
    if (!event) return null;
    return this.tryAutoArchiveCompletedEvent(event);
  }

  async getEventByCreationRequestId(creationRequestId: string): Promise<DbEvent | null> {
    try {
      return await this.client.selectOne<DbEvent>(EVENT_TABLE, EVENT_SELECT_WITH_CONFIG, [
        { field: 'creation_request_id', op: 'eq', value: creationRequestId },
      ]);
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.selectOne<DbEventLegacyCore>(
        EVENT_TABLE,
        EVENT_SELECT_CORE,
        [{ field: 'creation_request_id', op: 'eq', value: creationRequestId }]
      );
      return legacy ? withNullEventConfig(legacy) : null;
    }
  }

  async getEventById(eventId: string): Promise<DbEvent | null> {
    const event = await this.getEventByIdNoArchive(eventId);
    if (!event) return null;
    return this.tryAutoArchiveCompletedEvent(event);
  }

  async listEventsByParentPageId(parentPageId: string): Promise<EventRegistryItem[]> {
    const startedAtMs = Date.now();
    let usedLegacyConfigFallback = false;
    let events: DbEvent[] = [];
    try {
      try {
        events = await this.client.selectMany<DbEvent>(EVENT_TABLE, `${EVENT_SELECT_WITH_CONFIG}`, [
          { field: 'confluence_parent_page_id', op: 'eq', value: parentPageId },
        ]);
      } catch (error) {
        if (!hasMissingEventConfigColumns(error)) {
          throw error;
        }
        usedLegacyConfigFallback = true;
        const legacy = await this.client.selectMany<DbEventLegacyCore>(
          EVENT_TABLE,
          EVENT_SELECT_CORE,
          [{ field: 'confluence_parent_page_id', op: 'eq', value: parentPageId }]
        );
        events = legacy.map((row) => withNullEventConfig(row));
      }
      events = await this.tryAutoArchiveCompletedEvents(events);

      const registry = events
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(toEventRegistryItem);

      logRegistryLookupTelemetry({
        source: 'listEventsByParentPageId',
        parentPageId,
        durationMs: durationMsSince(startedAtMs),
        rowCount: registry.length,
        usedLegacyConfigFallback,
        outcome: 'success',
      });
      return registry;
    } catch (error) {
      const warning = error instanceof Error ? error.message : String(error);
      logRegistryLookupTelemetry({
        source: 'listEventsByParentPageId',
        parentPageId,
        durationMs: durationMsSince(startedAtMs),
        usedLegacyConfigFallback,
        outcome: 'error',
        warning,
      });
      throw error;
    }
  }

  async listAllEvents(): Promise<EventRegistryItem[]> {
    const startedAtMs = Date.now();
    let usedLegacyConfigFallback = false;
    let events: DbEvent[] = [];
    try {
      try {
        events = await this.client.selectMany<DbEvent>(EVENT_TABLE, `${EVENT_SELECT_WITH_CONFIG}`);
      } catch (error) {
        if (!hasMissingEventConfigColumns(error)) {
          throw error;
        }
        usedLegacyConfigFallback = true;
        const legacy = await this.client.selectMany<DbEventLegacyCore>(
          EVENT_TABLE,
          EVENT_SELECT_CORE
        );
        events = legacy.map((row) => withNullEventConfig(row));
      }
      events = await this.tryAutoArchiveCompletedEvents(events);

      const registry = events
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(toEventRegistryItem);

      logRegistryLookupTelemetry({
        source: 'listAllEvents',
        durationMs: durationMsSince(startedAtMs),
        rowCount: registry.length,
        usedLegacyConfigFallback,
        outcome: 'success',
      });
      return registry;
    } catch (error) {
      const warning = error instanceof Error ? error.message : String(error);
      logRegistryLookupTelemetry({
        source: 'listAllEvents',
        durationMs: durationMsSince(startedAtMs),
        usedLegacyConfigFallback,
        outcome: 'error',
        warning,
      });
      throw error;
    }
  }

  async listMigrationEventCandidatesByName(eventNameQuery: string): Promise<MigrationEventCandidate[]> {
    const query = eventNameQuery.trim();
    if (!query) return [];

    let events: DbEvent[] = [];
    try {
      events = await this.client.selectMany<DbEvent>(EVENT_TABLE, `${EVENT_SELECT_WITH_CONFIG}`, [
        { field: 'name', op: 'ilike', value: `%${query}%` },
      ]);
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.selectMany<DbEventLegacyCore>(
        EVENT_TABLE,
        EVENT_SELECT_CORE,
        [{ field: 'name', op: 'ilike', value: `%${query}%` }]
      );
      events = legacy.map((row) => withNullEventConfig(row));
    }

    const archivedSafeEvents = await this.tryAutoArchiveCompletedEvents(events);
    return archivedSafeEvents
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((event) => ({
        id: event.id,
        name: event.name,
        icon: event.icon,
        lifecycle_status: event.lifecycle_status,
        confluence_page_id: event.confluence_page_id,
        confluence_page_url: event.confluence_page_url,
        confluence_parent_page_id: event.confluence_parent_page_id,
        creation_request_id: event.creation_request_id,
      }));
  }

  private async autoArchiveCompletedEvent(event: DbEvent): Promise<DbEvent> {
    if (!shouldAutoArchiveCompletedEvent(event, Date.now())) {
      return event;
    }

    const rows = await this.client.patchMany<DbEvent>(
      EVENT_TABLE,
      { lifecycle_status: 'archived' },
      [{ field: 'id', op: 'eq', value: event.id }]
    );
    if (rows.length > 0) {
      return rows[0];
    }
    return {
      ...event,
      lifecycle_status: 'archived',
    };
  }

  private async autoArchiveCompletedEvents(events: DbEvent[]): Promise<DbEvent[]> {
    if (events.length === 0) return events;
    const nowMs = Date.now();
    const staleIds = new Set(
      events.filter((event) => shouldAutoArchiveCompletedEvent(event, nowMs)).map((event) => event.id)
    );
    if (staleIds.size === 0) return events;

    const staleEvents = events.filter((event) => staleIds.has(event.id));
    const archivedRows = await Promise.all(staleEvents.map((event) => this.autoArchiveCompletedEvent(event)));
    const archivedById = new Map<string, DbEvent>(archivedRows.map((event) => [event.id, event]));

    return events.map((event) => archivedById.get(event.id) ?? event);
  }

  private async tryAutoArchiveCompletedEvent(event: DbEvent): Promise<DbEvent> {
    try {
      return await this.autoArchiveCompletedEvent(event);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        '[hdc-auto-archive]',
        JSON.stringify({ eventId: event.id, lifecycleStatus: event.lifecycle_status, warning: message })
      );
      return event;
    }
  }

  private async tryAutoArchiveCompletedEvents(events: DbEvent[]): Promise<DbEvent[]> {
    try {
      return await this.autoArchiveCompletedEvents(events);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[hdc-auto-archive]', JSON.stringify({ warning: message, rowCount: events.length }));
      return events;
    }
  }

  async createEvent(input: {
    eventName: string;
    icon: string;
    tagline?: string;
    timezone: string;
    lifecycleStatus: LifecycleStatus;
    confluencePageId: string;
    confluencePageUrl?: string;
    confluenceParentPageId: string;
    hackingStartsAt?: string;
    submissionDeadlineAt?: string;
    eventSchedule: EventSchedule;
    creationRequestId: string;
    createdByUserId: string;
    eventRules: EventRules;
    eventBranding: EventBranding;
    runtimeType?: InstanceRuntime;
    templateTarget?: 'hackday' | null;
  }): Promise<DbEvent> {
    const basePayload = {
      name: input.eventName,
      icon: input.icon,
      tagline: input.tagline ?? null,
      timezone: input.timezone,
      lifecycle_status: input.lifecycleStatus,
      confluence_page_id: input.confluencePageId,
      confluence_page_url: input.confluencePageUrl ?? null,
      confluence_parent_page_id: input.confluenceParentPageId,
      hacking_starts_at: input.hackingStartsAt ?? null,
      submission_deadline_at: input.submissionDeadlineAt ?? null,
      creation_request_id: input.creationRequestId,
      created_by_user_id: input.createdByUserId,
      runtime_type: input.runtimeType ?? 'hdc_native',
      template_target: input.templateTarget ?? null,
    };
    const payloadWithConfig = {
      ...basePayload,
      event_rules: input.eventRules,
      event_branding: input.eventBranding,
      event_schedule: input.eventSchedule,
    };
    const legacyRequiredFields = buildLegacyEventRequiredFields(input.eventName);

    try {
      return await this.client.insert<DbEvent>(EVENT_TABLE, payloadWithConfig);
    } catch (error) {
      if (hasLegacyEventRequiredFieldError(error)) {
        return insertEventWithPrunedColumns<DbEvent>(
          (payload) => this.client.insert<DbEvent>(EVENT_TABLE, payload),
          {
          ...payloadWithConfig,
          ...legacyRequiredFields,
          }
        );
      }
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      try {
        const legacy = await insertEventWithPrunedColumns<DbEventLegacyCore>(
          (payload) => this.client.insert<DbEventLegacyCore>(EVENT_TABLE, payload),
          basePayload
        );
        return withNullEventConfig(legacy);
      } catch (legacyError) {
        if (!hasLegacyEventRequiredFieldError(legacyError)) {
          throw legacyError;
        }
        const legacy = await insertEventWithPrunedColumns<DbEventLegacyCore>(
          (payload) =>
            this.client.insert<DbEventLegacyCore>(EVENT_TABLE, payload),
          {
            ...basePayload,
            ...legacyRequiredFields,
          }
        );
        return withNullEventConfig(legacy);
      }
    }
  }

  async addEventAdmin(eventId: string, userId: string, role: 'primary' | 'co_admin'): Promise<DbEventAdmin> {
    return this.client.insert<DbEventAdmin>(EVENT_ADMIN_TABLE, {
      event_id: eventId,
      user_id: userId,
      role,
      added_at: nowIso(),
    });
  }

  async addEventAdminsBatch(
    entries: Array<{ eventId: string; userId: string; role: 'primary' | 'co_admin' }>
  ): Promise<DbEventAdmin[]> {
    if (!entries.length) return [];
    return this.client.insertMany<DbEventAdmin>(
      EVENT_ADMIN_TABLE,
      entries.map((entry) => ({
        event_id: entry.eventId,
        user_id: entry.userId,
        role: entry.role,
        added_at: nowIso(),
      }))
    );
  }

  async createMilestones(milestones: Array<{
    eventId: string;
    title: string;
    description: string | null;
    phase: string;
    signal?: ScheduleEventSignal | null;
    startTime: string;
    endTime: string | null;
    location: string | null;
  }>): Promise<void> {
    if (milestones.length === 0) return;

    const buildPayload = (omitSignalColumn: boolean): Array<Record<string, unknown>> => {
      return milestones.map((m) => {
        const payload: Record<string, unknown> = {
          id: randomUUID(),
          eventId: m.eventId,
          title: m.title,
          description: m.description,
          phase: m.phase,
          signal: m.signal ?? null,
          startTime: m.startTime,
          endTime: m.endTime,
          location: m.location,
        };
        if (omitSignalColumn) {
          delete payload.signal;
        }
        return payload;
      });
    };

    try {
      await this.client.insertMany(MILESTONE_TABLE, buildPayload(false));
      return;
    } catch (error) {
      const missingColumn = extractMissingMilestoneColumn(error);
      if (missingColumn?.toLowerCase() !== 'signal') {
        throw error;
      }
      console.warn(
        '[SupabaseRepository.createMilestones] Milestone.signal column missing; continuing without signal persistence.'
      );
    }

    await this.client.insertMany(MILESTONE_TABLE, buildPayload(true));
  }

  async createMilestonesOneByOne(milestones: Array<{
    eventId: string;
    title: string;
    description: string | null;
    phase: string;
    signal?: ScheduleEventSignal | null;
    startTime: string;
    endTime: string | null;
    location: string | null;
  }>): Promise<void> {
    if (milestones.length === 0) return;
    let omitSignalColumn = false;
    let loggedMissingSignalColumn = false;
    for (const m of milestones) {
      const payload: Record<string, unknown> = {
        id: randomUUID(),
        eventId: m.eventId,
        title: m.title,
        description: m.description,
        phase: m.phase,
        signal: m.signal ?? null,
        startTime: m.startTime,
        endTime: m.endTime,
        location: m.location,
      };
      if (omitSignalColumn) {
        delete payload.signal;
      }

      try {
        await this.client.insert(MILESTONE_TABLE, payload);
      } catch (error) {
        const missingColumn = extractMissingMilestoneColumn(error);
        if (missingColumn?.toLowerCase() === 'signal' && !omitSignalColumn) {
          omitSignalColumn = true;
          delete payload.signal;
          if (!loggedMissingSignalColumn) {
            loggedMissingSignalColumn = true;
            console.warn(
              '[SupabaseRepository.createMilestones] Milestone.signal column missing; continuing without signal persistence.'
            );
          }
          await this.client.insert(MILESTONE_TABLE, payload);
          continue;
        }
        throw error;
      }
    }
  }

  async deleteMilestonesByEventId(eventId: string): Promise<number> {
    const deleted = await this.client.deleteMany<Record<string, unknown>>(MILESTONE_TABLE, [
      { field: 'eventId', op: 'eq', value: eventId },
    ]);
    return deleted.length;
  }

  async createHackdayTemplateSeed(input: {
    confluencePageId: string;
    confluenceParentPageId: string;
    hdcEventId: string;
    templateName: string;
    primaryAdminEmail: string;
    coAdminEmails: string[];
    seedPayload: Record<string, unknown>;
    provisionStatus?: 'provisioned' | 'initialized' | 'failed';
  }): Promise<DbHackdayTemplateSeed> {
    const timestamp = nowIso();
    try {
      return await this.client.upsert<DbHackdayTemplateSeed>(
        HACKDAY_TEMPLATE_SEED_TABLE,
        {
          confluence_page_id: input.confluencePageId,
          confluence_parent_page_id: input.confluenceParentPageId,
          hdc_event_id: input.hdcEventId,
          template_name: input.templateName,
          primary_admin_email: input.primaryAdminEmail,
          co_admin_emails: input.coAdminEmails,
          seed_payload: input.seedPayload,
          provision_status: input.provisionStatus ?? 'provisioned',
          updated_at: timestamp,
        },
        'confluence_page_id'
      );
    } catch (error) {
      if (hasMissingTable(error, HACKDAY_TEMPLATE_SEED_TABLE)) {
        throw new Error(
          `Missing required table ${HACKDAY_TEMPLATE_SEED_TABLE}. Apply migration 20260218161000_phase7_hackday_template_seed.sql.`
        );
      }
      throw error;
    }
  }

  async getHackdayTemplateSeedByConfluencePageId(pageId: string): Promise<DbHackdayTemplateSeed | null> {
    try {
      return await this.client.selectOne<DbHackdayTemplateSeed>(
        HACKDAY_TEMPLATE_SEED_TABLE,
        'id,confluence_page_id,confluence_parent_page_id,hdc_event_id,template_name,primary_admin_email,co_admin_emails,seed_payload,hackday_event_id,provision_status,created_at,updated_at,initialized_at',
        [{ field: 'confluence_page_id', op: 'eq', value: pageId }]
      );
    } catch (error) {
      if (hasMissingTable(error, HACKDAY_TEMPLATE_SEED_TABLE)) {
        return null;
      }
      throw error;
    }
  }

  async listEventAdmins(eventId: string): Promise<DbEventAdmin[]> {
    return this.client.selectMany<DbEventAdmin>(
      EVENT_ADMIN_TABLE,
      'id,event_id,user_id,role',
      [{ field: 'event_id', op: 'eq', value: eventId }]
    );
  }

  async upsertSyncState(eventId: string, payload: Partial<EventSyncState> & { syncStatus: SyncStatus }): Promise<EventSyncState> {
    const row = await this.client.upsert<DbSyncState>(
      EVENT_SYNC_STATE_TABLE,
      {
        event_id: eventId,
        sync_status: payload.syncStatus,
        last_error: payload.lastError ?? null,
        last_attempt_at: payload.lastAttemptAt ?? nowIso(),
        pushed_count: payload.pushedCount ?? 0,
        skipped_count: payload.skippedCount ?? 0,
      },
      'event_id'
    );

    return asSyncState(row);
  }

  async getSyncState(eventId: string): Promise<EventSyncState | null> {
    const row = await this.client.selectOne<DbSyncState>(
      EVENT_SYNC_STATE_TABLE,
      'event_id,sync_status,last_error,last_attempt_at,pushed_count,skipped_count',
      [{ field: 'event_id', op: 'eq', value: eventId }]
    );
    return row ? asSyncState(row) : null;
  }

  async updateEventLifecycle(eventId: string, lifecycleStatus: LifecycleStatus): Promise<DbEvent> {
    const rows = await this.client.patchMany<DbEvent>(
      EVENT_TABLE,
      { lifecycle_status: lifecycleStatus },
      [{ field: 'id', op: 'eq', value: eventId }]
    );

    if (rows.length === 0) {
      throw new Error(`Event ${eventId} not found while updating lifecycle.`);
    }
    return rows[0];
  }

  async submitHack(viewer: ViewerContext, payload: SubmitHackInput): Promise<SubmitHackResult> {
    const user = await this.ensureUser(viewer);
    const inserted = await this.insertProject({
      title: payload.title,
      description: payload.description ?? null,
      status: 'completed',
      source_type: 'hack_submission',
      hack_type: 'prompt',
      visibility: 'org',
      owner_id: user.id,
      workflow_transformed: false,
      event_id: payload.eventId,
      synced_to_library_at: null,
      pipeline_stage: 'hack',
      pipeline_stage_entered_at: nowIso(),
    });

    return { projectId: inserted.id };
  }

  async seedHackForEventAsUser(input: {
    eventId: string;
    userId: string;
    title: string;
    description?: string;
  }): Promise<SubmitHackResult> {
    const inserted = await this.insertProject({
      title: input.title,
      description: input.description ?? null,
      status: 'completed',
      source_type: 'hack_submission',
      hack_type: 'prompt',
      visibility: 'org',
      owner_id: input.userId,
      workflow_transformed: false,
      event_id: input.eventId,
      synced_to_library_at: null,
      pipeline_stage: 'hack',
      pipeline_stage_entered_at: nowIso(),
    });
    return { projectId: inserted.id };
  }

  async listEventHackProjects(eventId: string): Promise<DbProject[]> {
    const filters: QueryFilter[] = [
      { field: 'event_id', op: 'eq', value: eventId },
      { field: 'source_type', op: 'eq', value: 'hack_submission' },
    ];

    return this.listProjects(filters);
  }

  async listProjectsByEventId(eventId: string): Promise<DbProject[]> {
    return this.listProjects([{ field: 'event_id', op: 'eq', value: eventId }]);
  }

  async getDerivedProfile(userId: string, cacheTtlMs: number): Promise<DerivedProfileSnapshot> {
    const [ownedProjects, adminRows] = await Promise.all([
      this.listProjects([{ field: 'owner_id', op: 'eq', value: userId }]),
      this.listEventAdminsByUserId(userId),
    ]);

    const ownedHacks = ownedProjects.filter((project) => project.source_type === 'hack_submission');
    const syncedHacks = ownedHacks.filter((project) => Boolean(project.synced_to_library_at));
    const relevantEventIds = new Set<string>();
    for (const row of adminRows) {
      relevantEventIds.add(row.event_id);
    }
    for (const project of ownedHacks) {
      if (project.event_id) {
        relevantEventIds.add(project.event_id);
      }
    }

    let activeInstances = 0;
    let completedInstances = 0;
    const events = await Promise.all([...relevantEventIds].map((eventId) => this.getEventByIdNoArchive(eventId)));
    for (const event of events) {
      if (!event) continue;
      if (event.lifecycle_status === 'completed' || event.lifecycle_status === 'archived') {
        completedInstances += 1;
      } else {
        activeInstances += 1;
      }
    }

    const reputationScore = ownedHacks.length * 10 + syncedHacks.length * 15 + activeInstances * 5 + completedInstances * 12;

    return {
      userId,
      submittedHacks: ownedHacks.length,
      syncedHacks: syncedHacks.length,
      activeInstances,
      completedInstances,
      reputationScore,
      reputationTier: toReputationTier(reputationScore),
      calculatedAt: nowIso(),
      cacheTtlMs,
    };
  }

  async markHackSynced(projectId: string): Promise<void> {
    await this.client.patchMany<DbProject>(
      PROJECT_TABLE,
      { synced_to_library_at: nowIso() },
      [{ field: 'id', op: 'eq', value: projectId }]
    );
  }

  private async listEventAdminsByUserId(userId: string): Promise<DbEventAdmin[]> {
    return this.client.selectMany<DbEventAdmin>(
      EVENT_ADMIN_TABLE,
      'id,event_id,user_id,role',
      [{ field: 'user_id', op: 'eq', value: userId }]
    );
  }

  private async getEventByIdNoArchive(eventId: string): Promise<DbEvent | null> {
    try {
      return await this.client.selectOne<DbEvent>(EVENT_TABLE, EVENT_SELECT_WITH_CONFIG, [
        { field: 'id', op: 'eq', value: eventId },
      ]);
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.selectOne<DbEventLegacyCore>(
        EVENT_TABLE,
        EVENT_SELECT_CORE,
        [{ field: 'id', op: 'eq', value: eventId }]
      );
      return legacy ? withNullEventConfig(legacy) : null;
    }
  }

  private async getEventByConfluencePageIdNoArchive(pageId: string): Promise<DbEvent | null> {
    try {
      return await this.client.selectOne<DbEvent>(EVENT_TABLE, EVENT_SELECT_WITH_CONFIG, [
        { field: 'confluence_page_id', op: 'eq', value: pageId },
      ]);
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.selectOne<DbEventLegacyCore>(
        EVENT_TABLE,
        EVENT_SELECT_CORE,
        [{ field: 'confluence_page_id', op: 'eq', value: pageId }]
      );
      return legacy ? withNullEventConfig(legacy) : null;
    }
  }

  async logAudit(input: {
    eventId: string;
    actorUserId: string;
    action: string;
    previousValue?: unknown;
    newValue?: unknown;
    enforceRetention?: boolean;
  }): Promise<void> {
    await this.client.insert(EVENT_AUDIT_LOG_TABLE, {
      event_id: input.eventId,
      actor_user_id: input.actorUserId,
      action: input.action,
      previous_value: input.previousValue ?? null,
      new_value: input.newValue ?? null,
      created_at: nowIso(),
    });

    if (input.enforceRetention !== false) {
      await this.enforceEventAuditRetention(input.eventId);
    }
  }

  async countEventAuditLogs(eventId: string): Promise<number> {
    const rows = await this.client.selectMany<{ id: string }>(EVENT_AUDIT_LOG_TABLE, 'id', [
      { field: 'event_id', op: 'eq', value: eventId },
    ]);
    return rows.length;
  }

  private async enforceEventAuditRetention(eventId: string): Promise<void> {
    const rows = await this.client.selectMany<DbEventAuditLogRetentionRow>(
      EVENT_AUDIT_LOG_TABLE,
      'id,created_at',
      [{ field: 'event_id', op: 'eq', value: eventId }]
    );
    if (rows.length <= EVENT_AUDIT_RETENTION_LIMIT) {
      return;
    }

    const rowsToDelete = rows
      .slice()
      .sort((a, b) => {
        const aTime = a.created_at ? Date.parse(a.created_at) : Number.NEGATIVE_INFINITY;
        const bTime = b.created_at ? Date.parse(b.created_at) : Number.NEGATIVE_INFINITY;
        if (aTime !== bTime) return aTime - bTime;
        return a.id.localeCompare(b.id);
      })
      .slice(0, rows.length - EVENT_AUDIT_RETENTION_LIMIT);

    for (const row of rowsToDelete) {
      await this.client.deleteMany(EVENT_AUDIT_LOG_TABLE, [{ field: 'id', op: 'eq', value: row.id }]);
    }
  }

  async deleteEventCascade(eventId: string): Promise<void> {
    try {
      await this.client.deleteMany(HACKDAY_TEMPLATE_SEED_TABLE, [{ field: 'hdc_event_id', op: 'eq', value: eventId }]);
    } catch (error) {
      if (!hasMissingTable(error, HACKDAY_TEMPLATE_SEED_TABLE)) {
        throw error;
      }
    }

    await this.client.deleteMany(MILESTONE_TABLE, [{ field: 'eventId', op: 'eq', value: eventId }]);
    await this.client.deleteMany(EVENT_ADMIN_TABLE, [{ field: 'event_id', op: 'eq', value: eventId }]);
    await this.client.deleteMany(EVENT_SYNC_STATE_TABLE, [{ field: 'event_id', op: 'eq', value: eventId }]);
    await this.client.deleteMany(EVENT_AUDIT_LOG_TABLE, [{ field: 'event_id', op: 'eq', value: eventId }]);

    const deleted = await this.client.deleteMany<DbEvent>(EVENT_TABLE, [{ field: 'id', op: 'eq', value: eventId }]);
    if (deleted.length === 0) {
      throw new Error(`Event ${eventId} not found while deleting draft.`);
    }
  }

  async getEventNameConflicts(eventName: string, parentPageId: string): Promise<EventRegistryItem[]> {
    const all = await this.listEventsByParentPageId(parentPageId);
    const normalized = eventName.trim().toLowerCase();
    return all.filter((event) => event.eventName.trim().toLowerCase() === normalized);
  }

  async hasEventNameConflictExact(eventName: string, parentPageId: string): Promise<boolean> {
    const normalized = eventName.trim().toLowerCase();
    if (!normalized) return false;

    const rows = await this.client.selectMany<DbEventLegacyCore>(EVENT_TABLE, EVENT_SELECT_CORE, [
      { field: 'confluence_parent_page_id', op: 'eq', value: parentPageId },
      { field: 'name', op: 'ilike', value: eventName.trim() },
    ]);
    return rows.some((row) => row.name.trim().toLowerCase() === normalized);
  }

  async completeAndSync(eventId: string): Promise<SyncResult> {
    const projects = await this.listEventHackProjects(eventId);
    let pushedCount = 0;
    let skippedCount = 0;
    const failedProjectIds: string[] = [];

    for (const project of projects) {
      if (project.synced_to_library_at) {
        skippedCount += 1;
        continue;
      }
      try {
        await this.markHackSynced(project.id);
        pushedCount += 1;
      } catch {
        failedProjectIds.push(project.id);
      }
    }

    const syncStatus: SyncStatus =
      failedProjectIds.length === 0
        ? 'complete'
        : pushedCount > 0 || skippedCount > 0
          ? 'partial'
          : 'failed';
    const syncFinishedAt = nowIso();

    if (syncStatus !== 'failed') {
      await this.updateEventLifecycle(eventId, 'completed');
    }

    const failedSample = failedProjectIds.slice(0, 3).join(', ');
    const failedSuffix = failedProjectIds.length > 3 ? ', ...' : '';
    const lastError =
      failedProjectIds.length > 0
        ? `Failed to sync ${failedProjectIds.length} hack(s)${
            failedSample ? ` (${failedSample}${failedSuffix})` : ''
          }.`
        : null;

    await this.upsertSyncState(eventId, {
      syncStatus,
      pushedCount,
      skippedCount,
      lastError,
      lastAttemptAt: syncFinishedAt,
    });

    const guidance = getSyncGuidance(syncStatus, lastError);
    return {
      syncStatus,
      pushedCount,
      skippedCount,
      lastError,
      ...guidance,
    };
  }
}
