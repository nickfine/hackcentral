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
  ForkArtifactInput,
  ForkArtifactResult,
  GetHackdayExtractionCandidatesInput,
  HackdayExtractionCandidatesResult,
  GetHomeFeedInput,
  HomeFeedSnapshot,
  HomeFeedActivityItem,
  HomeFeedRecommendation,
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
  ForkShowcaseHackInput,
  ForkShowcaseHackResult,
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
  RoiDashboardSnapshot,
  LogRoiTokenUsageInput,
  LogRoiTokenUsageResult,
  RoiOutputMetrics,
  RoiTimeWindow,
  GetRoiDashboardInput,
  TrackTeamPulseExportInput,
  TrackTeamPulseExportResult,
  TrackRoiExportInput,
  TrackRoiExportResult,
  TriggerPostHackdayExtractionPromptInput,
  TriggerPostHackdayExtractionPromptResult,
  BulkImportHackdaySubmissionsInput,
  BulkImportHackdaySubmissionsResult,
  HackdayExtractionPolicyVersion,
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
import {
  buildConfluencePageUrl,
  buildHackOutputPageStorageValue,
  buildHackPageStorageValue,
  createStandardChildPage,
  deletePage,
  ensureHacksParentPageUnderParent,
  setPageStorageContent,
} from '../confluencePages';

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
const FORK_RELATION_TABLE = 'ForkRelation';
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
const HACKDAY_EXTRACTION_PROMPT_TABLE = 'HackdayExtractionPrompt';
const HACKDAY_EXTRACTION_IMPORT_TABLE = 'HackdayExtractionImport';
const EVENT_AUDIT_RETENTION_LIMIT = 100;
const EVENT_AUTO_ARCHIVE_AFTER_DAYS = 90;
const RECOGNITION_MENTOR_BADGE_THRESHOLD = 3;
const RECOGNITION_MENTOR_LEADERBOARD_LIMIT = 25;
const RECOGNITION_PATHWAY_BADGE_THRESHOLD_DISTINCT_PATHWAYS = 1;
const RECOGNITION_PATHWAY_LEADERBOARD_LIMIT = 25;
const RECOGNITION_SEGMENT_LEADERBOARD_LIMIT = 25;
const ROI_POLICY_VERSION = 'r9-roi-scaffold-v1';
const ROI_BREAKDOWN_LIMIT = 25;
const ROI_TREND_LIMIT = 6;
const HOME_FEED_POLICY_VERSION = 'r12-home-feed-v1';
const HOME_FEED_DEFAULT_LIMIT = 20;
const HOME_FEED_MAX_LIMIT = 50;
const HOME_FEED_DEFAULT_RECOMMENDATION_LIMIT = 6;
const HOME_FEED_MAX_RECOMMENDATION_LIMIT = 12;
const PHASE3_FEED_ACTIVITY_COVERAGE_MIN_PCT = 80;
const PHASE3_FEED_RECOMMENDATION_COVERAGE_MIN_PCT = 67;
const PHASE3_ROI_MIN_TOKEN_ATTRIBUTION_PCT = 60;
const PHASE3_ROI_HIGH_COST_PER_HACK_THRESHOLD_GBP = 0.25;
const PHASE3_ROI_MIN_TREND_POINTS = 2;
const HACKDAY_EXTRACTION_POLICY_VERSION: HackdayExtractionPolicyVersion = 'r11-extraction-v1';
const HACKDAY_EXTRACTION_DEFAULT_LIMIT = 200;
const HACKDAY_EXTRACTION_IMPORT_DEFAULT_LIMIT = 500;
const HACKDAY_EXTRACTION_MAX_LIMIT = 1000;
const ROI_TOKEN_TOTAL_KEYS = ['tokenvolume', 'tokencount', 'totaltokens', 'tokensused', 'usagetokens'];
const ROI_TOKEN_PROMPT_KEYS = ['prompttokens', 'inputtokens'];
const ROI_TOKEN_COMPLETION_KEYS = ['completiontokens', 'outputtokens'];
const ROI_TOKEN_GENERIC_KEYS = ['tokens'];
const ROI_TOKEN_TEAM_ID_KEYS = ['teamid'];
const ROI_TOKEN_MODEL_KEYS = [
  'model',
  'modelname',
  'modelid',
  'aimodel',
  'llmmodel',
  'providermodel',
  'deployment',
  'engine',
  'variant',
];
const ROI_RATE_CARD_ENV = 'HDC_ROI_RATE_CARD_JSON';
const ROI_BUSINESS_UNIT_TEAM_MAP_ENV = 'HDC_ROI_BUSINESS_UNIT_TEAM_MAP_JSON';
const ROI_DEFAULT_RATE_CARD_PER_1K_TOKENS_GBP = 0.01;
const ROI_DEFAULT_RATE_CARD_BY_MODEL_PER_1K_GBP: Record<string, number> = {
  'gpt-4o': 0.01,
  'gpt-4o-mini': 0.001,
  'claude-3-5-sonnet': 0.012,
  'claude-3-7-sonnet': 0.015,
  'claude-3-opus': 0.03,
  'gemini-1.5-pro': 0.008,
  'gemini-1.5-flash': 0.0012,
};
const ROI_BUSINESS_UNIT_KEYS = [
  'business_unit',
  'businessUnit',
  'businessunit',
  'business_unit_name',
  'businessUnitName',
  'org_unit',
  'orgUnit',
  'orgunit',
  'department',
  'division',
  'cost_centre',
  'costCentre',
];

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

interface DbRoiAccessLookup {
  id: string;
  role?: string | null;
  capability_tags?: string[] | null;
}

interface DbExtractionAccessLookup {
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
  confluence_page_id: string | null;
  confluence_page_url: string | null;
  output_page_ids: string[] | null;
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

interface DbEventAuditLog {
  id: string;
  event_id: string | null;
  actor_user_id: string | null;
  action: string | null;
  new_value: unknown;
  created_at: string | null;
}

interface DbHackdayExtractionPrompt {
  id: string;
  event_id: string;
  participant_user_id: string;
  lifecycle_status: LifecycleStatus;
  policy_version: HackdayExtractionPolicyVersion;
  prompted_at: string | null;
  notify_participants: boolean | null;
  created_by_user_id: string | null;
  created_at: string | null;
}

interface DbHackdayExtractionImport {
  id: string;
  event_id: string;
  source_project_id: string;
  imported_project_id: string;
  policy_version: HackdayExtractionPolicyVersion;
  imported_at: string | null;
  notify_participants: boolean | null;
  imported_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface RoiRateCardConfig {
  source: string;
  modelRatesPer1kTokensGbp: Map<string, number>;
  defaultRatePer1kTokensGbp: number;
  parseWarning: string | null;
}

interface RoiRateResolution {
  model: string | null;
  ratePer1kTokensGbp: number | null;
  usedDefaultRate: boolean;
  matchedRateKey: string | null;
}

interface RoiBusinessUnitMapConfig {
  source: string;
  teamMap: Map<string, string>;
  parseWarning: string | null;
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

interface DbForkRelation {
  id: string;
  entity_type: 'project' | 'artifact' | null;
  source_id: string;
  fork_id: string;
  source_owner_user_id: string | null;
  forked_by_user_id: string | null;
  metadata: unknown;
  created_at: string | null;
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

function normalizeRoiWindow(window: unknown): RoiTimeWindow {
  if (window === 'weekly' || window === 'quarterly') return window;
  return 'monthly';
}

function emptyRoiOutputs(): RoiOutputMetrics {
  return {
    hacksCompleted: 0,
    artifactsPublished: 0,
    problemsSolved: 0,
    pipelineItemsProgressed: 0,
  };
}

function addRoiOutput(outputs: RoiOutputMetrics, metric: keyof RoiOutputMetrics, amount = 1): void {
  outputs[metric] += amount;
}

function cloneRoiOutputs(outputs: RoiOutputMetrics): RoiOutputMetrics {
  return {
    hacksCompleted: outputs.hacksCompleted,
    artifactsPublished: outputs.artifactsPublished,
    problemsSolved: outputs.problemsSolved,
    pipelineItemsProgressed: outputs.pipelineItemsProgressed,
  };
}

function sumRoiOutputs(outputs: RoiOutputMetrics): number {
  return outputs.hacksCompleted + outputs.artifactsPublished + outputs.problemsSolved + outputs.pipelineItemsProgressed;
}

function resolveRoiPeriod(timestamp: string | null | undefined, window: RoiTimeWindow): {
  periodLabel: string;
  periodStart: string;
} | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth() + 1;
  const day = parsed.getUTCDate();

  if (window === 'monthly') {
    const mm = String(month).padStart(2, '0');
    return {
      periodLabel: `${year}-${mm}`,
      periodStart: `${year}-${mm}-01T00:00:00.000Z`,
    };
  }

  if (window === 'quarterly') {
    const quarter = Math.floor((month - 1) / 3) + 1;
    const quarterStartMonth = (quarter - 1) * 3 + 1;
    const mm = String(quarterStartMonth).padStart(2, '0');
    return {
      periodLabel: `${year}-Q${quarter}`,
      periodStart: `${year}-${mm}-01T00:00:00.000Z`,
    };
  }

  const dayOfWeek = parsed.getUTCDay();
  const dayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(Date.UTC(year, month - 1, day + dayOffset, 0, 0, 0, 0));
  const isoYear = monday.getUTCFullYear();
  const isoMonth = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const isoDay = String(monday.getUTCDate()).padStart(2, '0');
  const label = `${isoYear}-W${isoMonth}${isoDay}`;
  return {
    periodLabel: label,
    periodStart: `${isoYear}-${isoMonth}-${isoDay}T00:00:00.000Z`,
  };
}

function normalizeMetricKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeRoiModelKey(model: string): string {
  return model.trim().toLowerCase().replace(/\s+/g, '-');
}

function normalizeRoiBusinessUnitLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function roundRoiTokenVolume(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

function isAcceptedTeamMembershipStatus(status: string | null): boolean {
  if (!status) return true;
  const normalized = status.trim().toLowerCase();
  return normalized === 'accepted' || normalized === 'active';
}

function clampPositiveInt(value: unknown, fallback: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

function toFeedTimestamp(value: string | null | undefined, fallback: string): string {
  if (!value || typeof value !== 'string') return fallback;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return fallback;
  return new Date(parsed).toISOString();
}

function roundRoiCost(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

function calculateRoiCostPerOutput(totalCost: number | null, outputCount: number): number | null {
  if (!isFiniteNumber(totalCost) || outputCount <= 0) return null;
  if (totalCost <= 0) return 0;
  return roundRoiCost(totalCost / outputCount);
}

function toPositiveFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function collectNumericValuesByNormalizedKey(
  value: unknown,
  bucket: Map<string, number[]>,
  depth = 0
): void {
  if (depth > 8 || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectNumericValuesByNormalizedKey(item, bucket, depth + 1);
    }
    return;
  }
  if (typeof value !== 'object') return;

  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = normalizeMetricKey(rawKey);
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      const existing = bucket.get(normalizedKey) ?? [];
      existing.push(rawValue);
      bucket.set(normalizedKey, existing);
    }
    collectNumericValuesByNormalizedKey(rawValue, bucket, depth + 1);
  }
}

function findFirstStringValueByNormalizedKey(
  value: unknown,
  normalizedKeys: Set<string>,
  depth = 0
): string | null {
  if (depth > 8 || value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringValueByNormalizedKey(item, normalizedKeys, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;

  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = normalizeMetricKey(rawKey);
    if (normalizedKeys.has(normalizedKey) && typeof rawValue === 'string' && rawValue.trim()) {
      return rawValue.trim();
    }
    const found = findFirstStringValueByNormalizedKey(rawValue, normalizedKeys, depth + 1);
    if (found) return found;
  }
  return null;
}

function sumNumericValuesByKeys(bucket: Map<string, number[]>, keys: string[]): number {
  let total = 0;
  for (const key of keys) {
    const values = bucket.get(key) ?? [];
    for (const value of values) {
      total += value;
    }
  }
  return total;
}

function parseRoiRateCardConfig(): RoiRateCardConfig {
  const rates = new Map<string, number>();
  for (const [model, rate] of Object.entries(ROI_DEFAULT_RATE_CARD_BY_MODEL_PER_1K_GBP)) {
    rates.set(normalizeRoiModelKey(model), rate);
  }
  let defaultRatePer1kTokensGbp = ROI_DEFAULT_RATE_CARD_PER_1K_TOKENS_GBP;
  let parseWarning: string | null = null;
  const raw = process.env[ROI_RATE_CARD_ENV]?.trim() ?? '';
  if (!raw) {
    return {
      source: 'in-code-default-rate-card',
      modelRatesPer1kTokensGbp: rates,
      defaultRatePer1kTokensGbp,
      parseWarning,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('rate-card payload must be an object');
    }

    const parsedObject = parsed as Record<string, unknown>;
    const parsedDefault =
      toPositiveFiniteNumber(parsedObject.defaultPer1kTokensGbp) ??
      toPositiveFiniteNumber(parsedObject.default_rate_per_1k_tokens_gbp) ??
      toPositiveFiniteNumber(parsedObject.default) ??
      toPositiveFiniteNumber(parsedObject.defaultPer1kTokens) ??
      toPositiveFiniteNumber(parsedObject.default_rate_per_1k_tokens);
    if (parsedDefault !== null) {
      defaultRatePer1kTokensGbp = parsedDefault;
    }

    const applyRateEntries = (candidate: Record<string, unknown>): void => {
      for (const [rawKey, rawRate] of Object.entries(candidate)) {
        const normalizedKey = normalizeRoiModelKey(rawKey);
        if (
          !normalizedKey ||
          normalizedKey === 'default' ||
          normalizedKey === 'defaultper1ktokensgbp' ||
          normalizedKey === 'default_rate_per_1k_tokens_gbp' ||
          normalizedKey === 'defaultper1ktokens' ||
          normalizedKey === 'default_rate_per_1k_tokens' ||
          normalizedKey === 'models' ||
          normalizedKey === 'currency'
        ) {
          continue;
        }
        const parsedRate = toPositiveFiniteNumber(rawRate);
        if (parsedRate !== null) {
          rates.set(normalizedKey, parsedRate);
        }
      }
    };

    const modelsValue = parsedObject.models;
    if (modelsValue && typeof modelsValue === 'object' && !Array.isArray(modelsValue)) {
      applyRateEntries(modelsValue as Record<string, unknown>);
    }
    applyRateEntries(parsedObject);
  } catch (error) {
    parseWarning =
      error instanceof Error
        ? `Failed to parse ${ROI_RATE_CARD_ENV}; using in-code defaults (${error.message}).`
        : `Failed to parse ${ROI_RATE_CARD_ENV}; using in-code defaults.`;
  }

  return {
    source: parseWarning ? 'in-code-default-rate-card' : `env:${ROI_RATE_CARD_ENV}`,
    modelRatesPer1kTokensGbp: rates,
    defaultRatePer1kTokensGbp,
    parseWarning,
  };
}

function resolveRoiRateForModel(model: string | null, config: RoiRateCardConfig): RoiRateResolution {
  if (model) {
    const normalizedModel = normalizeRoiModelKey(model);
    if (normalizedModel) {
      const exact = config.modelRatesPer1kTokensGbp.get(normalizedModel);
      if (exact !== undefined) {
        return {
          model: normalizedModel,
          ratePer1kTokensGbp: exact,
          usedDefaultRate: false,
          matchedRateKey: normalizedModel,
        };
      }

      for (const [configuredModel, configuredRate] of config.modelRatesPer1kTokensGbp.entries()) {
        if (!configuredModel) continue;
        if (normalizedModel.startsWith(configuredModel) || configuredModel.startsWith(normalizedModel)) {
          return {
            model: normalizedModel,
            ratePer1kTokensGbp: configuredRate,
            usedDefaultRate: false,
            matchedRateKey: configuredModel,
          };
        }
      }
    }
  }

  if (config.defaultRatePer1kTokensGbp > 0) {
    return {
      model: model ? normalizeRoiModelKey(model) : null,
      ratePer1kTokensGbp: config.defaultRatePer1kTokensGbp,
      usedDefaultRate: true,
      matchedRateKey: null,
    };
  }

  return {
    model: model ? normalizeRoiModelKey(model) : null,
    ratePer1kTokensGbp: null,
    usedDefaultRate: false,
    matchedRateKey: null,
  };
}

function calculateRoiCostFromTokenVolume(tokenVolume: number, ratePer1kTokensGbp: number | null): number {
  if (tokenVolume <= 0 || !isFiniteNumber(ratePer1kTokensGbp) || ratePer1kTokensGbp <= 0) return 0;
  return (tokenVolume / 1000) * ratePer1kTokensGbp;
}

function parseRoiBusinessUnitMapConfig(): RoiBusinessUnitMapConfig {
  const teamMap = new Map<string, string>();
  let parseWarning: string | null = null;
  const raw = process.env[ROI_BUSINESS_UNIT_TEAM_MAP_ENV]?.trim() ?? '';
  if (!raw) {
    return {
      source: 'team-record-fields',
      teamMap,
      parseWarning,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('business-unit map payload must be an object');
    }

    const source = parsed as Record<string, unknown>;
    const mapSource =
      source.teams && typeof source.teams === 'object' && !Array.isArray(source.teams)
        ? (source.teams as Record<string, unknown>)
        : source;
    for (const [rawTeamKey, rawBusinessUnit] of Object.entries(mapSource)) {
      const normalizedTeamKey = normalizeMetricKey(rawTeamKey);
      if (!normalizedTeamKey) continue;
      if (typeof rawBusinessUnit !== 'string' || !rawBusinessUnit.trim()) continue;
      teamMap.set(normalizedTeamKey, normalizeRoiBusinessUnitLabel(rawBusinessUnit));
    }
  } catch (error) {
    parseWarning =
      error instanceof Error
        ? `Failed to parse ${ROI_BUSINESS_UNIT_TEAM_MAP_ENV}; using team record fields only (${error.message}).`
        : `Failed to parse ${ROI_BUSINESS_UNIT_TEAM_MAP_ENV}; using team record fields only.`;
  }

  return {
    source: parseWarning ? 'team-record-fields' : `team-record-fields + env:${ROI_BUSINESS_UNIT_TEAM_MAP_ENV}`,
    teamMap,
    parseWarning,
  };
}

function extractRoiTokenVolumeFromAuditPayload(payload: unknown): number | null {
  const parsed = parseJsonObject(payload);
  if (!parsed) return null;

  const valuesByKey = new Map<string, number[]>();
  collectNumericValuesByNormalizedKey(parsed, valuesByKey);

  const totalTokens = sumNumericValuesByKeys(valuesByKey, ROI_TOKEN_TOTAL_KEYS);
  if (totalTokens > 0) return roundRoiTokenVolume(totalTokens);

  const promptTokens = sumNumericValuesByKeys(valuesByKey, ROI_TOKEN_PROMPT_KEYS);
  const completionTokens = sumNumericValuesByKeys(valuesByKey, ROI_TOKEN_COMPLETION_KEYS);
  if (promptTokens > 0 || completionTokens > 0) {
    return roundRoiTokenVolume(promptTokens + completionTokens);
  }

  const genericTokens = sumNumericValuesByKeys(valuesByKey, ROI_TOKEN_GENERIC_KEYS);
  if (genericTokens > 0) return roundRoiTokenVolume(genericTokens);
  return null;
}

function extractRoiModelFromAuditPayload(payload: unknown): string | null {
  const parsed = parseJsonObject(payload);
  if (!parsed) return null;
  const model = findFirstStringValueByNormalizedKey(parsed, new Set(ROI_TOKEN_MODEL_KEYS));
  if (!model) return null;
  const normalized = normalizeRoiModelKey(model);
  return normalized || null;
}

function extractRoiTeamIdFromAuditPayload(payload: unknown): string | null {
  const parsed = parseJsonObject(payload);
  if (!parsed) return null;
  return findFirstStringValueByNormalizedKey(parsed, new Set(ROI_TOKEN_TEAM_ID_KEYS));
}

function resolveBusinessUnitFromTeamRow(
  teamRow: DbProjectRow,
  teamLabel: string | null,
  config: RoiBusinessUnitMapConfig
): string | null {
  const explicitValue = getStringField(teamRow, ROI_BUSINESS_UNIT_KEYS);
  if (explicitValue && explicitValue.trim()) {
    return normalizeRoiBusinessUnitLabel(explicitValue);
  }

  const nestedValue = findFirstStringValueByNormalizedKey(
    teamRow,
    new Set(ROI_BUSINESS_UNIT_KEYS.map((key) => normalizeMetricKey(key)))
  );
  if (nestedValue && nestedValue.trim()) {
    return normalizeRoiBusinessUnitLabel(nestedValue);
  }

  const teamId = getStringField(teamRow, ['id']);
  if (teamId) {
    const mappedById = config.teamMap.get(normalizeMetricKey(teamId));
    if (mappedById) return mappedById;
  }
  if (teamLabel) {
    const mappedByLabel = config.teamMap.get(normalizeMetricKey(teamLabel));
    if (mappedByLabel) return mappedByLabel;
  }
  return null;
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
      criteria: ['Demo exists', 'Pain link if applicable'],
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
    .filter((artifactId) => artifactId.length > 0)
    .filter((artifactId) => isUuid(artifactId));
  return [...new Set(normalized)].slice(0, 24);
}

function normalizeConfluenceParentPageId(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
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

function createRoiValidationError(message: string): Error {
  return new Error(`[ROI_VALIDATION_FAILED] ${message}`);
}

function createForkValidationError(message: string): Error {
  return new Error(`[FORK_VALIDATION_FAILED] ${message}`);
}

function createExtractionValidationError(message: string): Error {
  return new Error(`[EXTRACT_VALIDATION_FAILED] ${message}`);
}

function createExtractionMigrationError(tableName: string): Error {
  return new Error(
    `Missing required table ${tableName}. Apply the phase 3 extraction migration before calling extraction resolvers.`
  );
}

function normalizeCapabilityTags(tags: string[] | null | undefined): string[] {
  return (tags ?? [])
    .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
    .filter(Boolean);
}

function isAdminRole(role: string | null | undefined): boolean {
  return typeof role === 'string' && role.trim().toUpperCase() === 'ADMIN';
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

function logPhase3Telemetry(metric: string, payload: Record<string, unknown>): void {
  console.info(
    '[hdc-phase3-telemetry]',
    JSON.stringify({
      metric,
      source: 'supabase_repository',
      ...payload,
    })
  );
}

function calculateCoveragePct(actual: number, expected: number): number {
  if (expected <= 0) return 100;
  return Math.round((actual / expected) * 1000) / 10;
}

function createArtifactListItem(row: DbArtifact, authorName: string, forkCount = 0): ArtifactListItem {
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
    forkCount: Math.max(0, Math.floor(forkCount)),
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
    authorName,
  };
}

function createProblemListItem(row: DbProblem, createdByName: string, canRemove: boolean): ProblemListItem {
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
    canRemove,
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
  forkCount: number;
}): ShowcaseHackListItem {
  const { project, metadata, authorName, reuseCount, forkCount } = input;
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
    confluencePageId: metadata?.confluence_page_id ?? undefined,
    confluencePageUrl: metadata?.confluence_page_url ?? undefined,
    isPageBacked: Boolean(metadata?.confluence_page_id),
    pipelineStage: resolveProjectPipelineStage(project),
    reuseCount: Math.max(0, Math.floor(reuseCount)),
    forkCount: Math.max(0, Math.floor(forkCount)),
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

function isSupabaseRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return message.includes('(429)') || message.includes('too many requests');
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function defaultTeamFieldValue(
  column: string,
  teamId: string,
  ownerId: string | null,
  now: string,
  eventId: string | null
): unknown {
  const col = column.toLowerCase();
  if (col === 'id') return teamId;
  if (col === 'teamid') return teamId;
  if (col === 'name' || col === 'title') return `Forge Team ${teamId.slice(-8)}`;
  if (col === 'eventid' || col === 'event_id') return eventId;
  if (col === 'trackside' || col === 'track_side') return 'AI';
  if (col === 'maxsize' || col === 'max_size') return 8;
  if (col === 'ispublic' || col === 'is_public') return true;
  if (col === 'isautocreated' || col === 'is_auto_created') return true;
  if (col === 'createdat' || col === 'updatedat') return now;
  if (col === 'created_at' || col === 'updated_at') return now;
  if (col === 'ownerid' || col === 'owner_id') return ownerId ?? 'forge-system';
  if (col === 'description') return '';
  if (col === 'slug') return `forge-${teamId.slice(-8)}`;
  return null;
}

async function getAnyEventId(client: SupabaseRestClient): Promise<string | null> {
  try {
    const rows = await client.selectMany<{ id?: string }>(EVENT_TABLE, 'id');
    for (const row of rows) {
      if (typeof row.id === 'string' && row.id.trim()) {
        return row.id.trim();
      }
    }
  } catch {
    // Best-effort fallback only.
  }
  return null;
}

async function resolveExistingTeamId(client: SupabaseRestClient, identifier: string): Promise<string | null> {
  const normalized = identifier.trim();
  if (!normalized) return null;
  try {
    const byId = await client.selectOne<{ id?: string }>(TEAM_TABLE, 'id', [{ field: 'id', op: 'eq', value: normalized }]);
    if (byId && typeof byId.id === 'string' && byId.id.trim()) {
      return byId.id.trim();
    }
  } catch {
    // Fallback below.
  }
  try {
    const byTeamId = await client.selectOne<{ id?: string }>(TEAM_TABLE, 'id', [
      { field: 'teamId', op: 'eq', value: normalized },
    ]);
    if (byTeamId && typeof byTeamId.id === 'string' && byTeamId.id.trim()) {
      return byTeamId.id.trim();
    }
  } catch {
    // Optional compatibility path.
  }
  return null;
}

async function ensureLegacyTeamRecord(
  client: SupabaseRestClient,
  ownerId: string | null,
  preferredTeamId?: string,
  preferredEventId?: string | null
): Promise<string | null> {
  const teamId = preferredTeamId || generateLegacyTeamId();
  const now = nowIso();
  const baseName = `Forge Team ${teamId.slice(-8)}`;
  let fallbackEventId = preferredEventId?.trim() || null;
  if (!fallbackEventId) {
    fallbackEventId = await getAnyEventId(client);
  }
  const queue: Array<Record<string, unknown>> = [
    {
      id: teamId,
      eventId: fallbackEventId ?? undefined,
      name: baseName,
      description: '',
      trackSide: 'AI',
      createdAt: now,
      updatedAt: now,
      isPublic: true,
      isAutoCreated: true,
      slug: `forge-${teamId.slice(-8)}`,
    },
    { id: teamId, name: baseName, ownerId: ownerId ?? undefined, eventId: fallbackEventId ?? undefined, createdAt: now, updatedAt: now },
    { teamId, name: baseName, ownerId: ownerId ?? undefined, eventId: fallbackEventId ?? undefined, createdAt: now, updatedAt: now },
    {
      id: teamId,
      name: baseName,
      owner_id: ownerId ?? undefined,
      event_id: fallbackEventId ?? undefined,
      created_at: now,
      updated_at: now,
    },
    {
      teamId,
      name: baseName,
      owner_id: ownerId ?? undefined,
      event_id: fallbackEventId ?? undefined,
      created_at: now,
      updated_at: now,
    },
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
      const inserted = await client.insert<Record<string, unknown>>(TEAM_TABLE, candidate);
      const insertedId = getStringField(inserted, ['id', 'teamId']);
      if (insertedId) {
        return insertedId;
      }
      const resolved = await resolveExistingTeamId(client, teamId);
      if (resolved) {
        return resolved;
      }
    } catch (error) {
      if (error instanceof Error) {
        const normalized = normalizeSupabaseErrorMessage(error).toLowerCase();
        if (normalized.includes('23505') || normalized.includes('duplicate key value violates unique constraint')) {
          const resolved = await resolveExistingTeamId(client, teamId);
          if (resolved) {
            return resolved;
          }
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
        const normalizedColumn = notNullColumn.toLowerCase();
        if ((normalizedColumn === 'eventid' || normalizedColumn === 'event_id') && !fallbackEventId) {
          fallbackEventId = await getAnyEventId(client);
        }
        const defaultValue = defaultTeamFieldValue(notNullColumn, teamId, ownerId, now, fallbackEventId);
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
  const submittedAt = getStringField(row, ['submitted_at', 'submittedAt']);
  const title = getStringField(row, ['title', 'name']) ?? 'Untitled';
  const sourceTypeRaw = getStringField(row, ['source_type', 'sourceType']) as DbProject['source_type'];
  const sourceType =
    sourceTypeRaw === 'hack_submission'
      ? 'hack_submission'
      : submittedAt
        ? 'hack_submission'
        : 'project';
  const status =
    getStringField(row, ['status', 'project_status', 'projectStatus']) ??
    (sourceType === 'hack_submission' ? 'completed' : 'idea');

  return {
    id: getStringField(row, ['id']) ?? '',
    title,
    description: getStringField(row, ['description']),
    status,
    hack_type: (getStringField(row, ['hack_type']) as DbProject['hack_type']) ?? null,
    visibility: (getStringField(row, ['visibility']) as Visibility | null) ?? 'org',
    owner_id: getStringField(row, ['owner_id', 'ownerId']),
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
    created_at: getStringField(row, ['created_at', 'createdAt']),
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
    themePreset: 'default',
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
  const candidate = value as Partial<EventBranding> & { bannerMessage?: unknown };
  const themePreset =
    candidate.themePreset === 'default' ||
    candidate.themePreset === 'editorial' ||
    candidate.themePreset === 'summit' ||
    candidate.themePreset === 'studio'
      ? candidate.themePreset
      : defaults.themePreset;
  const themePreference: ThemePreference | null =
    candidate.themePreference === 'system' || candidate.themePreference === 'light' || candidate.themePreference === 'dark'
      ? candidate.themePreference
      : null;
  const branding: EventBranding = {
    accentColor: typeof candidate.accentColor === 'string' && candidate.accentColor.trim()
      ? candidate.accentColor.trim()
      : defaults.accentColor,
    themePreset,
  };
  if (typeof candidate.bannerImageUrl === 'string' && candidate.bannerImageUrl.trim()) {
    branding.bannerImageUrl = candidate.bannerImageUrl.trim();
  }
  if (typeof candidate.heroIconImageUrl === 'string' && candidate.heroIconImageUrl.trim()) {
    branding.heroIconImageUrl = candidate.heroIconImageUrl.trim();
  }
  if (typeof candidate.newToHackdayImageUrl === 'string' && candidate.newToHackdayImageUrl.trim()) {
    branding.newToHackdayImageUrl = candidate.newToHackdayImageUrl.trim();
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
  const [localPart] = email.trim().split('@');
  return localPart?.trim() || 'Unknown';
}

function buildPrimaryTeamAssignmentLookup(
  teamRows: Record<string, unknown>[],
  teamMemberRows: Record<string, unknown>[]
): {
  primaryTeamByUserId: Map<string, string>;
  teamLabelById: Map<string, string>;
} {
  const teamLabelById = new Map<string, string>();
  for (const row of teamRows) {
    const teamId = getStringField(row, ['id']);
    if (!teamId) continue;
    const label =
      getStringField(row, ['name', 'title', 'display_name', 'slug']) ??
      `Team ${teamId.slice(Math.max(0, teamId.length - 6))}`;
    teamLabelById.set(teamId, label);
  }

  const membershipsByUserId = new Map<
    string,
    Array<{ teamId: string; rolePriority: number; createdAtMs: number; sourceIndex: number }>
  >();
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

  for (let index = 0; index < teamMemberRows.length; index += 1) {
    const row = teamMemberRows[index];
    const userId = getStringField(row, ['user_id', 'userId']);
    const teamId = getStringField(row, ['team_id', 'teamId']);
    const status = getStringField(row, ['status'])?.trim().toLowerCase() ?? null;
    if (!userId || !teamId || !isAcceptedTeamMembershipStatus(status)) continue;
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

  const primaryTeamByUserId = new Map<string, string>();
  for (const [userId, memberships] of membershipsByUserId) {
    memberships.sort((a, b) => {
      if (a.rolePriority !== b.rolePriority) return a.rolePriority - b.rolePriority;
      if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
      if (a.teamId !== b.teamId) return a.teamId.localeCompare(b.teamId);
      return a.sourceIndex - b.sourceIndex;
    });
    const primary = memberships[0];
    if (primary) {
      primaryTeamByUserId.set(userId, primary.teamId);
    }
  }

  return {
    primaryTeamByUserId,
    teamLabelById,
  };
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

  async canUserRemoveProblem(viewer: ViewerContext, problemId: string): Promise<boolean> {
    const normalizedProblemId = problemId.trim();
    if (!normalizedProblemId) return false;

    const canModerate = await this.canUserModerateProblemExchange(viewer);
    if (canModerate) return true;

    const viewerUser = await this.getUserByAccountId(viewer.accountId?.trim() ?? '');
    if (!viewerUser) return false;

    const problem = await this.getProblemById(normalizedProblemId);
    if (!problem) return false;

    return problem.created_by_user_id === viewerUser.id;
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

  async canUserViewRoiDashboard(viewer: ViewerContext): Promise<boolean> {
    const accountId = viewer.accountId?.trim();
    if (!accountId || accountId === 'unknown-atlassian-account') {
      return false;
    }

    try {
      const row = await this.client.selectOne<DbRoiAccessLookup>(
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

      return tags.includes('roi_admin') || tags.includes('platform_admin');
    } catch (error) {
      if (hasMissingUserRoleColumn(error)) {
        const fallbackUser = await this.getUserByAccountId(accountId);
        if (!fallbackUser) return false;
        const tags = (fallbackUser.capability_tags ?? [])
          .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
          .filter(Boolean);
        return tags.includes('roi_admin') || tags.includes('platform_admin');
      }
      throw error;
    }
  }

  private async getExtractionAccessLookup(accountId: string): Promise<{
    userId: string | null;
    isAdmin: boolean;
    tags: string[];
  }> {
    try {
      const row = await this.client.selectOne<DbExtractionAccessLookup>(
        USER_TABLE,
        'id,role,capability_tags',
        [{ field: 'atlassian_account_id', op: 'eq', value: accountId }]
      );
      if (!row) {
        return {
          userId: null,
          isAdmin: false,
          tags: [],
        };
      }
      return {
        userId: row.id,
        isAdmin: isAdminRole(row.role),
        tags: normalizeCapabilityTags(row.capability_tags),
      };
    } catch (error) {
      if (!hasMissingUserRoleColumn(error)) {
        throw error;
      }
      const fallbackUser = await this.getUserByAccountId(accountId);
      if (!fallbackUser) {
        return {
          userId: null,
          isAdmin: false,
          tags: [],
        };
      }
      return {
        userId: fallbackUser.id,
        isAdmin: false,
        tags: normalizeCapabilityTags(fallbackUser.capability_tags),
      };
    }
  }

  private async isEventAdminForEvent(eventId: string, userId: string): Promise<boolean> {
    if (!isUuid(userId)) {
      return false;
    }
    try {
      const rows = await this.client.selectMany<{ id: string }>(EVENT_ADMIN_TABLE, 'id', [
        { field: 'event_id', op: 'eq', value: eventId },
        { field: 'user_id', op: 'eq', value: userId },
      ]);
      return rows.length > 0;
    } catch (error) {
      if (hasMissingTable(error, EVENT_ADMIN_TABLE)) {
        return false;
      }
      throw error;
    }
  }

  private async hasAnyEventAdminAccess(userId: string): Promise<boolean> {
    if (!isUuid(userId)) {
      return false;
    }
    try {
      const rows = await this.client.selectMany<{ id: string }>(EVENT_ADMIN_TABLE, 'id', [
        { field: 'user_id', op: 'eq', value: userId },
      ]);
      return rows.length > 0;
    } catch (error) {
      if (hasMissingTable(error, EVENT_ADMIN_TABLE)) {
        return false;
      }
      throw error;
    }
  }

  private async requireExtractionReadOrPromptAccess(viewer: ViewerContext, eventId: string): Promise<string> {
    const accountId = viewer.accountId?.trim();
    if (!accountId || accountId === 'unknown-atlassian-account') {
      throw new Error('[EXTRACT_FORBIDDEN] Extraction access requires a mapped Atlassian account.');
    }

    const access = await this.getExtractionAccessLookup(accountId);
    if (!access.userId) {
      throw new Error('[EXTRACT_FORBIDDEN] Viewer account is not mapped to a User record.');
    }
    if (access.isAdmin || access.tags.includes('hdc_admin') || access.tags.includes('platform_admin')) {
      return access.userId;
    }
    if (access.tags.includes('event_admin')) {
      return access.userId;
    }
    if (await this.isEventAdminForEvent(eventId, access.userId)) {
      return access.userId;
    }

    throw new Error(`[EXTRACT_FORBIDDEN] Event admin or HDC admin access required. accountId=${viewer.accountId}`);
  }

  private async requireExtractionImportAccess(viewer: ViewerContext): Promise<string> {
    const accountId = viewer.accountId?.trim();
    if (!accountId || accountId === 'unknown-atlassian-account') {
      throw new Error('[EXTRACT_IMPORT_FORBIDDEN] Extraction import requires a mapped Atlassian account.');
    }

    const access = await this.getExtractionAccessLookup(accountId);
    if (!access.userId) {
      throw new Error('[EXTRACT_IMPORT_FORBIDDEN] Viewer account is not mapped to a User record.');
    }
    if (access.isAdmin || access.tags.includes('hdc_admin') || access.tags.includes('platform_admin')) {
      return access.userId;
    }

    throw new Error(
      `[EXTRACT_IMPORT_FORBIDDEN] HDC admin or platform admin access required. accountId=${viewer.accountId}`
    );
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
      const [teamRows, projects] = await Promise.all([
        this.client.selectMany<{ id: string }>(TEAM_TABLE, 'id'),
        this.listProjects(),
      ]);
      const teamIds = teamRows.map((row) => row.id).filter((id) => typeof id === 'string' && id.length > 0);
      if (teamIds.length === 0) return null;
      const usedTeamIds = new Set(projects.map((project) => project.team_id).filter((id): id is string => Boolean(id)));
      return teamIds.find((teamId) => !usedTeamIds.has(teamId)) ?? null;
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
    if (!isUuid(artifactId)) {
      return null;
    }
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

  private async listForkRelations(entityType: 'project' | 'artifact'): Promise<DbForkRelation[]> {
    try {
      const rows = await this.client.selectMany<DbForkRelation>(
        FORK_RELATION_TABLE,
        'id,entity_type,source_id,fork_id,source_owner_user_id,forked_by_user_id,metadata,created_at',
        [{ field: 'entity_type', op: 'eq', value: entityType }]
      );
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      if (hasMissingTable(error, FORK_RELATION_TABLE)) {
        return [];
      }
      throw error;
    }
  }

  private async getSourceForkCounts(entityType: 'project' | 'artifact'): Promise<Map<string, number>> {
    const rows = await this.listForkRelations(entityType);
    const countBySourceId = new Map<string, number>();
    for (const row of rows) {
      const sourceId = typeof row.source_id === 'string' ? row.source_id.trim() : '';
      if (!sourceId) continue;
      countBySourceId.set(sourceId, (countBySourceId.get(sourceId) ?? 0) + 1);
    }
    return countBySourceId;
  }

  private async getSourceForkCount(entityType: 'project' | 'artifact', sourceId: string): Promise<number> {
    const counts = await this.getSourceForkCounts(entityType);
    return counts.get(sourceId) ?? 0;
  }

  private async recordForkRelation(input: {
    entityType: 'project' | 'artifact';
    sourceId: string;
    forkId: string;
    sourceOwnerUserId: string | null;
    forkedByUserId: string;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
  }): Promise<void> {
    try {
      await this.client.insert<DbForkRelation>(FORK_RELATION_TABLE, {
        id: randomUUID(),
        entity_type: input.entityType,
        source_id: input.sourceId,
        fork_id: input.forkId,
        source_owner_user_id: input.sourceOwnerUserId ?? null,
        forked_by_user_id: input.forkedByUserId,
        metadata: input.metadata ?? {},
        created_at: input.createdAt,
      });
    } catch (error) {
      if (hasMissingTable(error, FORK_RELATION_TABLE)) {
        throw new Error(
          `Missing required table ${FORK_RELATION_TABLE}. Apply the phase 3 fork migration before calling fork resolvers.`
        );
      }
      throw error;
    }
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
    const projectEventId =
      typeof payload.event_id === 'string'
        ? payload.event_id.trim() || null
        : typeof payload.eventId === 'string'
          ? payload.eventId.trim() || null
          : null;
    let fallbackTeamId = await ensureLegacyTeamRecord(this.client, ownerId, undefined, projectEventId);
    if (!fallbackTeamId) {
      fallbackTeamId = await this.getAnyTeamId();
    }
    const exhaustedTeamIds = new Set<string>();
    const legacyTimestamp = nowIso();
    const normalizedDescription =
      typeof payload.description === 'string'
        ? payload.description
        : payload.description === null || payload.description === undefined
          ? ''
          : String(payload.description);
    const withLegacyTeam = fallbackTeamId ? { teamId: fallbackTeamId } : {};
    const withLegacyTimestamps = { createdAt: legacyTimestamp, updatedAt: legacyTimestamp };
    const legacyCoreCandidate: Record<string, unknown> = {
      id: projectId,
      name: payload.title,
      description: normalizedDescription,
      source_type:
        typeof payload.source_type === 'string'
          ? payload.source_type
          : typeof payload.sourceType === 'string'
            ? payload.sourceType
            : null,
      hack_type: payload.hack_type ?? null,
      visibility: payload.visibility ?? null,
      owner_id: ownerId,
      workflow_transformed:
        typeof payload.workflow_transformed === 'boolean' ? payload.workflow_transformed : false,
      synced_to_library_at: payload.synced_to_library_at ?? null,
      event_id: projectEventId,
      pipeline_stage: payload.pipeline_stage ?? null,
      pipeline_stage_entered_at: payload.pipeline_stage_entered_at ?? null,
      ...withLegacyTeam,
      ...withLegacyTimestamps,
    };
    const queue: Array<Record<string, unknown>> = [
      legacyCoreCandidate,
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
          let nextTeamId = await ensureLegacyTeamRecord(this.client, ownerId, undefined, projectEventId);
          if (!nextTeamId || exhaustedTeamIds.has(nextTeamId)) {
            const alternatives = await this.listTeamIds();
            nextTeamId = alternatives.find((teamId) => !exhaustedTeamIds.has(teamId)) ?? null;
          }
          if (nextTeamId) {
            exhaustedTeamIds.add(nextTeamId);
            queue.push({
              ...candidate,
              teamId: nextTeamId,
            });
          }
        }

        const notNullColumn = extractProjectNotNullColumn(error);
        if (notNullColumn === 'teamId' && !candidate.teamId) {
          if (!fallbackTeamId || exhaustedTeamIds.has(fallbackTeamId)) {
            fallbackTeamId = await ensureLegacyTeamRecord(this.client, ownerId, undefined, projectEventId);
            if (!fallbackTeamId || exhaustedTeamIds.has(fallbackTeamId)) {
              const alternatives = await this.listTeamIds();
              fallbackTeamId = alternatives.find((teamId) => !exhaustedTeamIds.has(teamId)) ?? null;
            }
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
        if (notNullColumn === 'description' && (candidate.description === null || candidate.description === undefined)) {
          queue.push({ ...candidate, description: '' });
        }

        if (!hasMissingProjectColumn(error)) {
          if (hasProjectTeamForeignKeyError(error) && typeof candidate.teamId === 'string' && candidate.teamId) {
            exhaustedTeamIds.add(candidate.teamId);
            const ensured = await ensureLegacyTeamRecord(this.client, ownerId, candidate.teamId, projectEventId);
            if (ensured && !exhaustedTeamIds.has(ensured)) {
              exhaustedTeamIds.add(ensured);
              queue.push({ ...candidate, teamId: ensured });
              continue;
            }
            const freshTeamId = await ensureLegacyTeamRecord(this.client, ownerId, undefined, projectEventId);
            if (freshTeamId && !exhaustedTeamIds.has(freshTeamId)) {
              exhaustedTeamIds.add(freshTeamId);
              queue.push({ ...candidate, teamId: freshTeamId });
              continue;
            }
          }
          if (
            hasDuplicateProjectTeamId(error) ||
            hasProjectTeamForeignKeyError(error) ||
            notNullColumn === 'teamId' ||
            notNullColumn === 'name' ||
            notNullColumn === 'description' ||
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
          'project_id,featured,demo_url,confluence_page_id,confluence_page_url,output_page_ids,team_members,source_event_id,tags,linked_artifact_ids,context,limitations,risk_notes,source_repo_url,created_by_user_id,created_at,updated_at'
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
    const { primaryTeamByUserId, teamLabelById } = buildPrimaryTeamAssignmentLookup(teamRows, teamMemberRows);

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
        fullName: user.full_name?.trim() || buildDisplayNameFromEmail(user.email),
        email: user.email,
        teamLabel: primaryTeamByUserId.get(user.id)
          ? teamLabelById.get(primaryTeamByUserId.get(user.id) ?? '') ?? null
          : null,
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

    let extractionAccess: BootstrapData['extractionAccess'] = {
      canReadPrompt: false,
      canBulkImport: false,
    };
    const accountId = viewer.accountId?.trim();
    if (accountId && accountId !== 'unknown-atlassian-account') {
      const access = await this.getExtractionAccessLookup(accountId);
      if (access.userId) {
        const isHdcOrPlatformAdmin =
          access.isAdmin || access.tags.includes('hdc_admin') || access.tags.includes('platform_admin');
        const hasEventAdminAccess =
          access.tags.includes('event_admin') || (await this.hasAnyEventAdminAccess(access.userId));
        extractionAccess = {
          canReadPrompt: isHdcOrPlatformAdmin || hasEventAdminAccess,
          canBulkImport: isHdcOrPlatformAdmin,
        };
      }
    }

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
      extractionAccess,
    };
  }

  async getHomeFeed(viewer: ViewerContext, input: GetHomeFeedInput): Promise<HomeFeedSnapshot> {
    const calculatedAt = nowIso();
    const limit = clampPositiveInt(input.limit, HOME_FEED_DEFAULT_LIMIT, HOME_FEED_MAX_LIMIT);
    const recommendationLimit = clampPositiveInt(
      input.recommendationLimit,
      HOME_FEED_DEFAULT_RECOMMENDATION_LIMIT,
      HOME_FEED_MAX_RECOMMENDATION_LIMIT
    );
    const includeRecommendations = input.includeRecommendations !== false;

    const [
      users,
      projects,
      artifacts,
      problemRows,
      pipelineTransitions,
      registry,
      teamRows,
      teamMemberRows,
      artifactReuseRows,
      pathwayRows,
    ] = await Promise.all([
      this.client
        .selectMany<DbUser>(USER_TABLE, 'id,email,full_name,atlassian_account_id,experience_level,capability_tags')
        .catch((error) => {
          if (hasMissingTable(error, USER_TABLE)) return [];
          throw error;
        }),
      this.listProjects().catch((error) => {
        if (hasMissingTable(error, PROJECT_TABLE)) return [];
        throw error;
      }),
      this.client
        .selectMany<DbArtifact>(
          ARTIFACT_TABLE,
          'id,title,created_by_user_id,reuse_count,source_hack_project_id,created_at,updated_at,archived_at'
        )
        .catch((error) => {
          if (hasMissingTable(error, ARTIFACT_TABLE)) return [];
          throw error;
        }),
      this.client
        .selectMany<DbProblem>(
          PROBLEM_TABLE,
          'id,title,domain,team,status,moderation_state,vote_count,created_by_user_id,claimed_by_user_id,created_at,updated_at'
        )
        .catch((error) => {
          if (hasMissingTable(error, PROBLEM_TABLE)) return [];
          throw error;
        }),
      this.client
        .selectMany<DbPipelineTransitionLog>(
          PIPELINE_TRANSITION_LOG_TABLE,
          'id,project_id,from_stage,to_stage,note,changed_by_user_id,changed_at'
        )
        .catch((error) => {
          if (hasMissingTable(error, PIPELINE_TRANSITION_LOG_TABLE)) return [];
          throw error;
        }),
      this.listAllEvents().catch((error) => {
        if (hasMissingTable(error, EVENT_TABLE)) return [];
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
        .selectMany<Record<string, unknown>>(ARTIFACT_REUSE_TABLE, '*')
        .catch((error) => {
          if (hasMissingTable(error, ARTIFACT_REUSE_TABLE)) return [];
          throw error;
        }),
      this.client
        .selectMany<DbPathway>(
          PATHWAY_TABLE,
          'id,title,summary,domain,role,tags,published,recommended,updated_at'
        )
        .catch((error) => {
          if (hasMissingTable(error, PATHWAY_TABLE)) return [];
          throw error;
        }),
    ]);

    const userNameById = new Map<string, string>();
    const viewerUser =
      users.find(
        (user) =>
          typeof user.atlassian_account_id === 'string' &&
          user.atlassian_account_id.trim() === viewer.accountId.trim()
      ) ?? null;
    const viewerUserId = viewerUser?.id ?? null;
    for (const user of users) {
      if (!user.id) continue;
      userNameById.set(user.id, user.full_name || user.email || 'Unknown');
    }

    const teamLabelById = new Map<string, string>();
    for (const row of teamRows) {
      const teamId = getStringField(row, ['id']);
      if (!teamId) continue;
      const label = getStringField(row, ['name', 'display_name', 'team_name']) ?? teamId;
      teamLabelById.set(teamId, label);
    }

    const membershipsByUserId = new Map<string, Array<{ teamId: string; role: string | null; createdAt: string | null }>>();
    for (const row of teamMemberRows) {
      const userId = getStringField(row, ['user_id', 'userId']);
      const teamId = getStringField(row, ['team_id', 'teamId']);
      if (!userId || !teamId) continue;
      const status = getStringField(row, ['status']);
      if (!isAcceptedTeamMembershipStatus(status)) continue;
      const role = getStringField(row, ['role']);
      const createdAt = getStringField(row, ['created_at', 'createdAt']);
      const list = membershipsByUserId.get(userId) ?? [];
      list.push({ teamId, role, createdAt });
      membershipsByUserId.set(userId, list);
    }

    const viewerTeamIds = viewerUserId
      ? Array.from(new Set((membershipsByUserId.get(viewerUserId) ?? []).map((row) => row.teamId)))
      : [];
    const viewerTeamIdSet = new Set(viewerTeamIds);
    const viewerTeamLabelsLower = new Set(
      viewerTeamIds.map((teamId) => (teamLabelById.get(teamId) ?? teamId).trim().toLowerCase()).filter(Boolean)
    );

    const hackActivities: HomeFeedActivityItem[] = projects
      .filter((project) => project.source_type === 'hack_submission')
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, Math.max(6, Math.ceil(limit / 2)))
      .map((project) => ({
        id: `new_hack:${project.id}`,
        type: 'new_hack',
        title: `New hack: ${project.title}`,
        description: `${project.owner_id ? userNameById.get(project.owner_id) ?? 'Unknown' : 'Unknown'} submitted a ${project.hack_type ?? 'hack'} project.`,
        occurredAt: toFeedTimestamp(project.created_at, calculatedAt),
        actorName: project.owner_id ? userNameById.get(project.owner_id) ?? 'Unknown' : null,
        relatedId: project.id,
        teamId: project.team_id,
        teamLabel: project.team_id ? teamLabelById.get(project.team_id) ?? project.team_id : null,
        domain: null,
        metadata: {
          status: project.status,
          stage: project.pipeline_stage,
        },
      }));

    const visibleProblems = problemRows.filter((problem) => problem.moderation_state !== 'removed');
    const trendingProblemActivities: HomeFeedActivityItem[] = visibleProblems
      .slice()
      .sort((a, b) => {
        const voteDiff = (b.vote_count ?? 0) - (a.vote_count ?? 0);
        if (voteDiff !== 0) return voteDiff;
        return (b.updated_at ?? b.created_at ?? '').localeCompare(a.updated_at ?? a.created_at ?? '');
      })
      .slice(0, Math.max(4, Math.ceil(limit / 3)))
      .map((problem) => ({
        id: `trending_problem:${problem.id}`,
        type: 'trending_problem',
        title: `Trending pain: ${problem.title}`,
        description: `${problem.vote_count ?? 0} votes · ${problem.team || 'Unknown team'} / ${problem.domain || 'General'}`,
        occurredAt: toFeedTimestamp(problem.updated_at ?? problem.created_at, calculatedAt),
        actorName: problem.created_by_user_id ? userNameById.get(problem.created_by_user_id) ?? 'Unknown' : null,
        relatedId: problem.id,
        teamId: null,
        teamLabel: problem.team ?? null,
        domain: problem.domain ?? null,
        metadata: {
          status: problem.status ?? 'open',
          voteCount: problem.vote_count ?? 0,
        },
      }));

    const artifactActivities: HomeFeedActivityItem[] = artifacts
      .filter((artifact) => artifact.archived_at === null)
      .slice()
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, Math.max(4, Math.ceil(limit / 3)))
      .map((artifact) => ({
        id: `new_artifact:${artifact.id}`,
        type: 'new_artifact',
        title: `New artifact: ${artifact.title}`,
        description: `${artifact.reuse_count ?? 0} reuses so far.`,
        occurredAt: toFeedTimestamp(artifact.created_at, calculatedAt),
        actorName: artifact.created_by_user_id ? userNameById.get(artifact.created_by_user_id) ?? 'Unknown' : null,
        relatedId: artifact.id,
        teamId: null,
        teamLabel: null,
        domain: null,
        metadata: {
          sourceHackProjectId: artifact.source_hack_project_id,
          reuseCount: artifact.reuse_count ?? 0,
        },
      }));

    const pipelineActivities: HomeFeedActivityItem[] = pipelineTransitions
      .slice()
      .sort((a, b) => (b.changed_at ?? '').localeCompare(a.changed_at ?? ''))
      .slice(0, Math.max(4, Math.ceil(limit / 4)))
      .map((row) => ({
        id: `pipeline_movement:${row.id}`,
        type: 'pipeline_movement',
        title: `Pipeline moved: ${row.project_id}`,
        description: `${row.from_stage} → ${row.to_stage}`,
        occurredAt: toFeedTimestamp(row.changed_at, calculatedAt),
        actorName: userNameById.get(row.changed_by_user_id) ?? 'Unknown',
        relatedId: row.project_id,
        teamId: null,
        teamLabel: null,
        domain: null,
        metadata: {
          note: row.note,
          fromStage: row.from_stage,
          toStage: row.to_stage,
        },
      }));

    const upcomingHackdayActivities: HomeFeedActivityItem[] = registry
      .filter((event) => {
        if (!event.hackingStartsAt) return false;
        if (event.lifecycleStatus === 'completed' || event.lifecycleStatus === 'archived') return false;
        return Date.parse(event.hackingStartsAt) >= Date.now();
      })
      .sort((a, b) => (a.hackingStartsAt ?? '').localeCompare(b.hackingStartsAt ?? ''))
      .slice(0, 4)
      .map((event) => ({
        id: `upcoming_hackday:${event.id}`,
        type: 'upcoming_hackday',
        title: `Upcoming HackDay: ${event.eventName}`,
        description:
          event.tagline?.trim() ||
          `${event.icon || '🚀'} starts ${new Date(event.hackingStartsAt as string).toLocaleDateString('en-GB')}`,
        occurredAt: toFeedTimestamp(event.hackingStartsAt, calculatedAt),
        actorName: null,
        relatedId: event.id,
        teamId: null,
        teamLabel: null,
        domain: null,
        metadata: {
          lifecycleStatus: event.lifecycleStatus,
          submissionDeadlineAt: event.submissionDeadlineAt,
          confluencePageId: event.confluencePageId,
        },
      }));

    const items = [
      ...upcomingHackdayActivities,
      ...hackActivities,
      ...trendingProblemActivities,
      ...artifactActivities,
      ...pipelineActivities,
    ]
      .sort((a, b) => {
        if (a.type === 'upcoming_hackday' && b.type === 'upcoming_hackday') {
          return a.occurredAt.localeCompare(b.occurredAt);
        }
        if (a.type === 'upcoming_hackday') return -1;
        if (b.type === 'upcoming_hackday') return 1;
        return b.occurredAt.localeCompare(a.occurredAt);
      })
      .slice(0, limit);

    const recommendations: HomeFeedRecommendation[] = [];

    if (includeRecommendations) {
      const domainSignals = new Map<string, number>();
      for (const problem of visibleProblems) {
        const domain = (problem.domain || '').trim();
        if (!domain) continue;
        let score = 0;
        if (viewerUserId && (problem.created_by_user_id === viewerUserId || problem.claimed_by_user_id === viewerUserId)) {
          score += 3;
        }
        if (viewerTeamLabelsLower.has((problem.team || '').trim().toLowerCase())) {
          score += 1;
        }
        if (score > 0) {
          domainSignals.set(domain, (domainSignals.get(domain) ?? 0) + score);
        }
      }

      const preferredDomain = Array.from(domainSignals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const domainProblems = visibleProblems
        .filter((problem) => (preferredDomain ? problem.domain === preferredDomain : true))
        .filter((problem) => problem.status === 'open' || problem.status === 'claimed')
        .slice()
        .sort((a, b) => {
          const voteDiff = (b.vote_count ?? 0) - (a.vote_count ?? 0);
          if (voteDiff !== 0) return voteDiff;
          return (b.updated_at ?? b.created_at ?? '').localeCompare(a.updated_at ?? a.created_at ?? '');
        })
        .slice(0, 2);

      for (const problem of domainProblems) {
        recommendations.push({
          id: `problem_domain:${problem.id}`,
          type: 'problem_domain',
          title: problem.title,
          reason: preferredDomain
            ? `Matches your active domain signal (${preferredDomain}).`
            : 'Trending in Pains.',
          score: (problem.vote_count ?? 0) + (preferredDomain ? 2 : 0),
          relatedId: problem.id,
          context: [problem.team, problem.domain].filter((value): value is string => Boolean(value)),
        });
      }

      const viewerTeamUserIds = new Set<string>();
      for (const [userId, memberships] of membershipsByUserId.entries()) {
        if (memberships.some((membership) => viewerTeamIdSet.has(membership.teamId))) {
          viewerTeamUserIds.add(userId);
        }
      }
      const teamReuseByArtifactId = new Map<string, number>();
      for (const row of artifactReuseRows) {
        const artifactId = getStringField(row, ['artifact_id', 'artifactId']);
        const userId = getStringField(row, ['user_id', 'userId']);
        if (!artifactId || !userId) continue;
        if (!viewerTeamUserIds.has(userId)) continue;
        teamReuseByArtifactId.set(artifactId, (teamReuseByArtifactId.get(artifactId) ?? 0) + 1);
      }
      const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
      for (const [artifactId, teamUses] of Array.from(teamReuseByArtifactId.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2)) {
        const artifact = artifactById.get(artifactId);
        if (!artifact) continue;
        recommendations.push({
          id: `team_artifact:${artifactId}`,
          type: 'team_artifact',
          title: artifact.title,
          reason: `Used ${teamUses} time${teamUses === 1 ? '' : 's'} by members of your team.`,
          score: teamUses,
          relatedId: artifactId,
          context: artifact.source_hack_project_id ? [`Source hack ${artifact.source_hack_project_id}`] : [],
        });
      }

      const viewerRoleSignals = new Set<string>();
      const experienceRaw = viewerUser?.experience_level?.trim();
      if (experienceRaw) {
        viewerRoleSignals.add(experienceRaw.toLowerCase());
        const experienceLabel = toExperienceLabel(experienceRaw);
        if (experienceLabel) {
          viewerRoleSignals.add(experienceLabel.toLowerCase());
        }
      }
      for (const tag of viewerUser?.capability_tags ?? []) {
        if (typeof tag !== 'string') continue;
        const normalized = tag.trim().toLowerCase();
        if (normalized) {
          viewerRoleSignals.add(normalized);
          viewerRoleSignals.add(normalized.replace(/_/g, ' '));
        }
      }

      const pathwayCandidates = pathwayRows
        .filter((row) => row.published === true)
        .filter((row) => {
          if (viewerRoleSignals.size === 0) return true;
          const role = (row.role || '').trim().toLowerCase();
          if (!role) return false;
          return Array.from(viewerRoleSignals).some((signal) => role.includes(signal));
        })
        .sort((a, b) => {
          if ((a.recommended ?? false) !== (b.recommended ?? false)) {
            return a.recommended ? -1 : 1;
          }
          return (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
        })
        .slice(0, 2);

      for (const pathway of pathwayCandidates) {
        recommendations.push({
          id: `pathway_role:${pathway.id}`,
          type: 'pathway_role',
          title: pathway.title,
          reason: pathway.role
            ? `Recommended pathway for role focus: ${pathway.role}.`
            : 'Recommended pathway based on your participation profile.',
          score: pathway.recommended ? 3 : 1,
          relatedId: pathway.id,
          context: (pathway.tags ?? []).slice(0, 3),
        });
      }
    }

    const dedupedRecommendations: HomeFeedRecommendation[] = [];
    const seenRecommendationIds = new Set<string>();
    for (const recommendation of recommendations.sort((a, b) => b.score - a.score)) {
      if (seenRecommendationIds.has(recommendation.id)) continue;
      seenRecommendationIds.add(recommendation.id);
      dedupedRecommendations.push(recommendation);
      if (dedupedRecommendations.length >= recommendationLimit) break;
    }

    const expectedActivityTypes = new Set<HomeFeedActivityItem['type']>([
      'new_hack',
      'trending_problem',
      'new_artifact',
      'pipeline_movement',
      'upcoming_hackday',
    ]);
    const activityTypesPresent = new Set(items.map((item) => item.type));
    const expectedRecommendationTypes = new Set<HomeFeedRecommendation['type']>([
      'problem_domain',
      'team_artifact',
      'pathway_role',
    ]);
    const recommendationTypesPresent = new Set(dedupedRecommendations.map((item) => item.type));

    const activityStatus: HomeFeedSnapshot['sources']['activities']['status'] =
      activityTypesPresent.size === expectedActivityTypes.size ? 'available' : 'available_partial';
    const recommendationStatus: HomeFeedSnapshot['sources']['recommendations']['status'] = includeRecommendations
      ? recommendationTypesPresent.size === expectedRecommendationTypes.size
        ? 'available'
        : 'available_partial'
      : 'available_partial';
    const missingActivityTypes = Array.from(expectedActivityTypes).filter((type) => !activityTypesPresent.has(type));
    const missingRecommendationTypes = Array.from(expectedRecommendationTypes).filter(
      (type) => !recommendationTypesPresent.has(type)
    );
    const activityCoveragePct = calculateCoveragePct(activityTypesPresent.size, expectedActivityTypes.size);
    const recommendationCoveragePct = includeRecommendations
      ? calculateCoveragePct(recommendationTypesPresent.size, expectedRecommendationTypes.size)
      : 100;
    const feedAlerts: string[] = [];
    if (activityCoveragePct < PHASE3_FEED_ACTIVITY_COVERAGE_MIN_PCT) {
      feedAlerts.push('activity_coverage_below_threshold');
    }
    if (includeRecommendations && recommendationCoveragePct < PHASE3_FEED_RECOMMENDATION_COVERAGE_MIN_PCT) {
      feedAlerts.push('recommendation_coverage_below_threshold');
    }
    if (items.length === 0) {
      feedAlerts.push('empty_activity_feed');
    }

    logPhase3Telemetry('feed_signal_health', {
      provider: 'supabase',
      policyVersion: HOME_FEED_POLICY_VERSION,
      activityStatus,
      recommendationStatus,
      includeRecommendations,
      itemCount: items.length,
      recommendationCount: dedupedRecommendations.length,
      activityCategoryCount: activityTypesPresent.size,
      expectedActivityCategoryCount: expectedActivityTypes.size,
      recommendationCategoryCount: recommendationTypesPresent.size,
      expectedRecommendationCategoryCount: expectedRecommendationTypes.size,
      activityCoveragePct,
      recommendationCoveragePct,
      activityCoverageThresholdPct: PHASE3_FEED_ACTIVITY_COVERAGE_MIN_PCT,
      recommendationCoverageThresholdPct: PHASE3_FEED_RECOMMENDATION_COVERAGE_MIN_PCT,
      missingActivityTypes,
      missingRecommendationTypes: includeRecommendations ? missingRecommendationTypes : [],
      healthy: feedAlerts.length === 0,
      alerts: feedAlerts,
      reportingCadence: 'daily_sample_weekly_checkpoint',
      viewerTimezone: viewer.timezone,
      viewerSiteUrl: viewer.siteUrl,
      loggedAt: calculatedAt,
    });

    return {
      calculatedAt,
      policyVersion: HOME_FEED_POLICY_VERSION,
      appliedFilters: {
        limit,
        recommendationLimit,
        includeRecommendations,
      },
      items,
      recommendations: dedupedRecommendations,
      sources: {
        activities: {
          status: activityStatus,
          reason:
            activityStatus === 'available'
              ? 'All R12.1 activity categories populated.'
              : `Activity categories populated: ${activityTypesPresent.size}/${expectedActivityTypes.size}.`,
        },
        recommendations: {
          status: recommendationStatus,
          reason: !includeRecommendations
            ? 'Recommendations disabled by request.'
            : recommendationStatus === 'available'
              ? 'All R12.2 recommendation categories populated.'
              : `Recommendation categories populated: ${recommendationTypesPresent.size}/${expectedRecommendationTypes.size}.`,
        },
      },
    };
  }

  async getHackdayExtractionCandidates(
    viewer: ViewerContext,
    input: GetHackdayExtractionCandidatesInput
  ): Promise<HackdayExtractionCandidatesResult> {
    const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';
    if (!eventId) {
      throw createExtractionValidationError('eventId is required.');
    }
    const limit = Math.max(1, Math.min(HACKDAY_EXTRACTION_MAX_LIMIT, Math.floor(input.limit ?? HACKDAY_EXTRACTION_DEFAULT_LIMIT)));

    await this.requireExtractionReadOrPromptAccess(viewer, eventId);

    const event = await this.getEventByIdNoArchive(eventId);
    if (!event) {
      throw new Error('[EXTRACT_EVENT_NOT_FOUND] Event not found.');
    }

    const submissions = await this.listEventHackProjects(eventId);
    const participantIds = new Set(
      submissions.map((project) => project.owner_id).filter((ownerId): ownerId is string => Boolean(ownerId))
    );

    let showcaseRows: Array<Pick<DbShowcaseHack, 'project_id'>> = [];
    try {
      showcaseRows = await this.client.selectMany<Pick<DbShowcaseHack, 'project_id'>>(
        SHOWCASE_HACK_TABLE,
        'project_id',
        [{ field: 'source_event_id', op: 'eq', value: eventId }]
      );
    } catch (error) {
      if (hasMissingTable(error, SHOWCASE_HACK_TABLE)) {
        throw new Error(
          `Missing required table ${SHOWCASE_HACK_TABLE}. Apply the phase 1 showcase migration before calling extraction resolvers.`
        );
      }
      throw error;
    }

    const importedProjectIds = new Set(showcaseRows.map((row) => row.project_id).filter(Boolean));
    const candidates = submissions
      .slice()
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, limit)
      .map((project) => ({
        projectId: project.id,
        title: project.title,
        submittedAt: project.created_at ?? null,
        ownerUserId: project.owner_id ?? null,
        alreadyImportedToShowcase: importedProjectIds.has(project.id),
      }));

    return {
      eventId,
      lifecycleStatus: event.lifecycle_status,
      policyVersion: HACKDAY_EXTRACTION_POLICY_VERSION,
      participantCount: participantIds.size,
      submissionCount: submissions.length,
      showcaseDraftCount: importedProjectIds.size,
      candidates,
    };
  }

  async triggerPostHackdayExtractionPrompt(
    viewer: ViewerContext,
    input: TriggerPostHackdayExtractionPromptInput
  ): Promise<TriggerPostHackdayExtractionPromptResult> {
    const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';
    if (!eventId) {
      throw createExtractionValidationError('eventId is required.');
    }
    const dryRun = input.dryRun === true;
    const notifyParticipants = input.notifyParticipants !== false;
    const actorUserId = await this.requireExtractionReadOrPromptAccess(viewer, eventId);
    const event = await this.getEventByIdNoArchive(eventId);
    if (!event) {
      throw new Error('[EXTRACT_EVENT_NOT_FOUND] Event not found.');
    }

    const submissions = await this.listEventHackProjects(eventId);
    const eligibleParticipantIds = Array.from(
      new Set(submissions.map((project) => project.owner_id).filter((ownerId): ownerId is string => Boolean(ownerId)))
    );

    if (event.lifecycle_status !== 'results') {
      return {
        eventId,
        policyVersion: HACKDAY_EXTRACTION_POLICY_VERSION,
        status: 'skipped_not_results',
        lifecycleStatus: event.lifecycle_status,
        eligibleParticipantCount: eligibleParticipantIds.length,
        promptedParticipantCount: 0,
        skippedAlreadyPromptedCount: 0,
        promptedAt: null,
      };
    }

    let promptRows: DbHackdayExtractionPrompt[];
    try {
      promptRows = await this.client.selectMany<DbHackdayExtractionPrompt>(
        HACKDAY_EXTRACTION_PROMPT_TABLE,
        'id,event_id,participant_user_id,lifecycle_status,policy_version,prompted_at,notify_participants,created_by_user_id,created_at',
        [
          { field: 'event_id', op: 'eq', value: eventId },
          { field: 'lifecycle_status', op: 'eq', value: 'results' },
          { field: 'policy_version', op: 'eq', value: HACKDAY_EXTRACTION_POLICY_VERSION },
        ]
      );
    } catch (error) {
      if (hasMissingTable(error, HACKDAY_EXTRACTION_PROMPT_TABLE)) {
        throw createExtractionMigrationError(HACKDAY_EXTRACTION_PROMPT_TABLE);
      }
      throw error;
    }

    const alreadyPrompted = new Set(promptRows.map((row) => row.participant_user_id));
    const participantsToPrompt = eligibleParticipantIds.filter((participantId) => !alreadyPrompted.has(participantId));
    const skippedAlreadyPromptedCount = eligibleParticipantIds.length - participantsToPrompt.length;

    if (dryRun) {
      return {
        eventId,
        policyVersion: HACKDAY_EXTRACTION_POLICY_VERSION,
        status: 'dry_run',
        lifecycleStatus: event.lifecycle_status,
        eligibleParticipantCount: eligibleParticipantIds.length,
        promptedParticipantCount: participantsToPrompt.length,
        skippedAlreadyPromptedCount,
        promptedAt: null,
      };
    }

    const promptedAt = nowIso();
    let promptedParticipantCount = 0;

    for (const participantUserId of participantsToPrompt) {
      await this.client.insert<DbHackdayExtractionPrompt>(HACKDAY_EXTRACTION_PROMPT_TABLE, {
        id: randomUUID(),
        event_id: eventId,
        participant_user_id: participantUserId,
        lifecycle_status: 'results',
        policy_version: HACKDAY_EXTRACTION_POLICY_VERSION,
        prompted_at: promptedAt,
        notify_participants: notifyParticipants,
        created_by_user_id: actorUserId,
        created_at: promptedAt,
      });
      promptedParticipantCount += 1;
    }

    await this.logAudit({
      eventId,
      actorUserId,
      action: 'hackday_extraction_prompted',
      newValue: {
        policyVersion: HACKDAY_EXTRACTION_POLICY_VERSION,
        dryRun: false,
        notifyParticipants,
        eligibleParticipantCount: eligibleParticipantIds.length,
        promptedParticipantCount,
        skippedAlreadyPromptedCount,
      },
    });

    return {
      eventId,
      policyVersion: HACKDAY_EXTRACTION_POLICY_VERSION,
      status: 'prompted',
      lifecycleStatus: event.lifecycle_status,
      eligibleParticipantCount: eligibleParticipantIds.length,
      promptedParticipantCount,
      skippedAlreadyPromptedCount,
      promptedAt,
    };
  }

  async bulkImportHackdaySubmissions(
    viewer: ViewerContext,
    input: BulkImportHackdaySubmissionsInput
  ): Promise<BulkImportHackdaySubmissionsResult> {
    const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';
    if (!eventId) {
      throw createExtractionValidationError('eventId is required.');
    }
    const dryRun = input.dryRun === true;
    const notifyParticipants = input.notifyParticipants !== false;
    const overwriteExistingDrafts = input.overwriteExistingDrafts === true;
    const limit = Math.max(
      1,
      Math.min(HACKDAY_EXTRACTION_MAX_LIMIT, Math.floor(input.limit ?? HACKDAY_EXTRACTION_IMPORT_DEFAULT_LIMIT))
    );
    const actorUserId = await this.requireExtractionImportAccess(viewer);
    const event = await this.getEventByIdNoArchive(eventId);
    if (!event) {
      throw new Error('[EXTRACT_EVENT_NOT_FOUND] Event not found.');
    }

    const submissions = (await this.listEventHackProjects(eventId))
      .slice()
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, limit);
    const scannedSubmissionCount = submissions.length;

    if (event.lifecycle_status !== 'results') {
      return {
        eventId,
        policyVersion: HACKDAY_EXTRACTION_POLICY_VERSION,
        status: 'skipped_not_results',
        scannedSubmissionCount,
        importedDraftCount: 0,
        skippedAlreadyImportedCount: 0,
        skippedInvalidSubmissionCount: 0,
        notifiedParticipantCount: 0,
        importedProjectIds: [],
        importedAt: null,
      };
    }

    let existingImports: DbHackdayExtractionImport[];
    try {
      existingImports = await this.client.selectMany<DbHackdayExtractionImport>(
        HACKDAY_EXTRACTION_IMPORT_TABLE,
        'id,event_id,source_project_id,imported_project_id,policy_version,imported_at,notify_participants,imported_by_user_id,created_at,updated_at',
        [
          { field: 'event_id', op: 'eq', value: eventId },
          { field: 'policy_version', op: 'eq', value: HACKDAY_EXTRACTION_POLICY_VERSION },
        ]
      );
    } catch (error) {
      if (hasMissingTable(error, HACKDAY_EXTRACTION_IMPORT_TABLE)) {
        throw createExtractionMigrationError(HACKDAY_EXTRACTION_IMPORT_TABLE);
      }
      throw error;
    }

    const existingImportBySourceProjectId = new Map(
      existingImports.map((row) => [row.source_project_id, row.imported_project_id])
    );

    const invalidSubmissionIds = new Set<string>();
    const importCandidates: DbProject[] = [];
    let skippedAlreadyImportedCount = 0;
    for (const submission of submissions) {
      if (!submission.id || !submission.title || !submission.owner_id) {
        invalidSubmissionIds.add(submission.id);
        continue;
      }
      const alreadyImported = existingImportBySourceProjectId.has(submission.id);
      if (alreadyImported && !overwriteExistingDrafts) {
        skippedAlreadyImportedCount += 1;
        continue;
      }
      importCandidates.push(submission);
    }

    const skippedInvalidSubmissionCount = invalidSubmissionIds.size;
    const importedProjectIds = importCandidates.map((submission) => submission.id);
    const notifiedParticipantCount = notifyParticipants
      ? new Set(importCandidates.map((submission) => submission.owner_id).filter(Boolean)).size
      : 0;

    if (dryRun) {
      return {
        eventId,
        policyVersion: HACKDAY_EXTRACTION_POLICY_VERSION,
        status: 'dry_run',
        scannedSubmissionCount,
        importedDraftCount: importCandidates.length,
        skippedAlreadyImportedCount,
        skippedInvalidSubmissionCount,
        notifiedParticipantCount,
        importedProjectIds,
        importedAt: null,
      };
    }

    try {
      await this.client.selectMany<Pick<DbShowcaseHack, 'project_id'>>(SHOWCASE_HACK_TABLE, 'project_id', [
        { field: 'source_event_id', op: 'eq', value: eventId },
      ]);
    } catch (error) {
      if (hasMissingTable(error, SHOWCASE_HACK_TABLE)) {
        throw new Error(
          `Missing required table ${SHOWCASE_HACK_TABLE}. Apply the phase 1 showcase migration before calling extraction resolvers.`
        );
      }
      throw error;
    }

    const importedAt = nowIso();
    for (const submission of importCandidates) {
      await this.client.upsert<DbShowcaseHack>(
        SHOWCASE_HACK_TABLE,
        {
          project_id: submission.id,
          featured: false,
          demo_url: null,
          team_members: [],
          source_event_id: eventId,
          tags: [],
          linked_artifact_ids: [],
          context: null,
          limitations: null,
          risk_notes: null,
          source_repo_url: null,
          created_by_user_id: actorUserId,
          created_at: importedAt,
          updated_at: importedAt,
        },
        'project_id'
      );
      await this.client.upsert<DbHackdayExtractionImport>(
        HACKDAY_EXTRACTION_IMPORT_TABLE,
        {
          id: randomUUID(),
          event_id: eventId,
          source_project_id: submission.id,
          imported_project_id: submission.id,
          policy_version: HACKDAY_EXTRACTION_POLICY_VERSION,
          imported_at: importedAt,
          notify_participants: notifyParticipants,
          imported_by_user_id: actorUserId,
          created_at: importedAt,
          updated_at: importedAt,
        },
        'event_id,source_project_id,policy_version'
      );
    }

    await this.logAudit({
      eventId,
      actorUserId,
      action: 'hackday_bulk_imported',
      newValue: {
        policyVersion: HACKDAY_EXTRACTION_POLICY_VERSION,
        dryRun: false,
        notifyParticipants,
        overwriteExistingDrafts,
        scannedSubmissionCount,
        importedDraftCount: importCandidates.length,
        skippedAlreadyImportedCount,
        skippedInvalidSubmissionCount,
        notifiedParticipantCount,
      },
    });

    return {
      eventId,
      policyVersion: HACKDAY_EXTRACTION_POLICY_VERSION,
      status: 'imported',
      scannedSubmissionCount,
      importedDraftCount: importCandidates.length,
      skippedAlreadyImportedCount,
      skippedInvalidSubmissionCount,
      notifiedParticipantCount,
      importedProjectIds,
      importedAt,
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

  async trackRoiExport(
    viewer: ViewerContext,
    input: TrackRoiExportInput
  ): Promise<TrackRoiExportResult> {
    const loggedAt = nowIso();
    const format = input.format === 'summary' ? 'summary' : 'csv';
    const totalTokenVolume = roundRoiTokenVolume(Math.max(0, Number(input.totalTokenVolume) || 0));
    const totalCost = roundRoiCost(Math.max(0, Number(input.totalCost) || 0));
    const totalOutputs = Math.max(0, Math.floor(Number(input.totalOutputs) || 0));

    logPhase3Telemetry('roi_export', {
      provider: 'supabase',
      format,
      exportedAt: input.exportedAt,
      window: normalizeRoiWindow(input.window),
      tokenSourceStatus: input.tokenSourceStatus,
      costRateCardStatus: input.costRateCardStatus,
      outputSourceStatus: input.outputSourceStatus,
      businessUnitSourceStatus: input.businessUnitSourceStatus,
      totalTokenVolume,
      totalCost,
      totalOutputs,
      rowCount: format === 'csv' ? Math.max(0, input.rowCount ?? 0) : null,
      summaryLineCount: format === 'summary' ? Math.max(0, input.summaryLineCount ?? 0) : null,
      reportingCadence: 'daily_sample_weekly_checkpoint',
      viewerTimezone: viewer.timezone,
      viewerSiteUrl: viewer.siteUrl,
      loggedAt,
    });

    return {
      logged: true,
      metric: 'roi_export',
      loggedAt,
    };
  }

  async logRoiTokenUsage(
    viewer: ViewerContext,
    input: LogRoiTokenUsageInput
  ): Promise<LogRoiTokenUsageResult> {
    const canLog = await this.canUserViewRoiDashboard(viewer);
    if (!canLog) {
      throw new Error('[ROI_USAGE_FORBIDDEN] Admin access is required to log ROI token usage.');
    }

    const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';
    if (!eventId) {
      throw createRoiValidationError('eventId is required.');
    }

    const accountId = viewer.accountId?.trim();
    if (!accountId || accountId === 'unknown-atlassian-account') {
      throw new Error('[ROI_USAGE_FORBIDDEN] A mapped Atlassian account is required to log ROI token usage.');
    }

    const viewerUser = await this.getUserByAccountId(accountId);
    if (!viewerUser) {
      throw new Error('[ROI_USAGE_FORBIDDEN] Viewer account is not mapped to a User record.');
    }

    const requestedActorUserId =
      typeof input.actorUserId === 'string' && input.actorUserId.trim() ? input.actorUserId.trim() : null;
    let actorUserId = viewerUser.id;
    if (requestedActorUserId && requestedActorUserId !== viewerUser.id) {
      const actorUser = await this.getUserById(requestedActorUserId);
      if (!actorUser) {
        throw createRoiValidationError(`actorUserId "${requestedActorUserId}" was not found.`);
      }
      actorUserId = actorUser.id;
    }

    const explicitTokenVolume = toPositiveFiniteNumber(input.tokenVolume);
    const promptTokens = toPositiveFiniteNumber(input.promptTokens) ?? 0;
    const completionTokens = toPositiveFiniteNumber(input.completionTokens) ?? 0;
    const derivedTokenVolume = promptTokens + completionTokens;
    const resolvedTokenVolume = explicitTokenVolume ?? (derivedTokenVolume > 0 ? derivedTokenVolume : null);
    if (!resolvedTokenVolume || resolvedTokenVolume <= 0) {
      throw createRoiValidationError('tokenVolume or promptTokens/completionTokens must be > 0.');
    }

    const roundedTokenVolume = roundRoiTokenVolume(resolvedTokenVolume);
    const roundedPromptTokens = promptTokens > 0 ? roundRoiTokenVolume(promptTokens) : null;
    const roundedCompletionTokens = completionTokens > 0 ? roundRoiTokenVolume(completionTokens) : null;
    const model = typeof input.model === 'string' && input.model.trim() ? input.model.trim() : null;
    const teamId = typeof input.teamId === 'string' && input.teamId.trim() ? input.teamId.trim() : null;
    const source = typeof input.source === 'string' && input.source.trim() ? input.source.trim() : 'hdc_roi_manual';
    const metadata =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? input.metadata
        : null;
    const loggedAt = nowIso();

    await this.logAudit({
      eventId,
      actorUserId,
      action: 'llm_usage_logged',
      newValue: {
        tokenVolume: roundedTokenVolume,
        model,
        teamId,
        source,
        usage: {
          model,
          prompt_tokens: roundedPromptTokens,
          completion_tokens: roundedCompletionTokens,
        },
        metadata,
        loggedAt,
      },
    });

    return {
      logged: true,
      action: 'llm_usage_logged',
      eventId,
      actorUserId,
      tokenVolume: roundedTokenVolume,
      loggedAt,
    };
  }

  async getRoiDashboard(viewer: ViewerContext, input: GetRoiDashboardInput = {}): Promise<RoiDashboardSnapshot> {
    const canView = await this.canUserViewRoiDashboard(viewer);
    if (!canView) {
      throw new Error('[ROI_FORBIDDEN] Admin access is required to view ROI dashboard.');
    }

    const window = normalizeRoiWindow(input.window);
    const teamFilter = typeof input.teamId === 'string' && input.teamId.trim() ? input.teamId.trim() : null;
    const businessUnitFilter =
      typeof input.businessUnit === 'string' && input.businessUnit.trim() ? input.businessUnit.trim() : null;
    const calculatedAt = nowIso();
    const rateCardConfig = parseRoiRateCardConfig();
    const businessUnitMapConfig = parseRoiBusinessUnitMapConfig();

    const [users, projects, artifacts, problems, teamRows, teamMemberRows, pipelineTransitions, eventAuditLogs] =
      await Promise.all([
        (async (): Promise<DbUser[]> => {
          const baseColumns = 'id,email,full_name,atlassian_account_id,capability_tags';
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
              role: null,
              experience_level: null,
              mentor_capacity: null,
              mentor_sessions_used: null,
              happy_to_mentor: null,
              seeking_mentor: null,
              capability_tags: getStringArrayField(row, ['capability_tags']),
              created_at: getStringField(row, ['created_at', 'createdAt']),
              createdAt: getStringField(row, ['createdAt', 'created_at']),
            }));
          }
        })(),
        this.listProjects(),
        this.client
          .selectMany<DbArtifact>(
            ARTIFACT_TABLE,
            'id,title,description,artifact_type,tags,source_url,source_label,source_hack_project_id,source_hackday_event_id,created_by_user_id,visibility,reuse_count,created_at,updated_at,archived_at'
          )
          .catch((error) => {
            if (hasMissingTable(error, ARTIFACT_TABLE)) return [];
            throw error;
          }),
        this.client
          .selectMany<DbProblem>(
            PROBLEM_TABLE,
            'id,status,moderation_state,claimed_by_user_id,created_at,updated_at'
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
          .selectMany<DbPipelineTransitionLog>(
            PIPELINE_TRANSITION_LOG_TABLE,
            'id,project_id,from_stage,to_stage,note,changed_by_user_id,changed_at'
          )
          .catch((error) => {
            if (hasMissingTable(error, PIPELINE_TRANSITION_LOG_TABLE)) return [];
            throw error;
          }),
        this.client
          .selectMany<DbEventAuditLog>(
            EVENT_AUDIT_LOG_TABLE,
            'id,event_id,actor_user_id,action,new_value,created_at'
          )
          .catch((error) => {
            if (hasMissingTable(error, EVENT_AUDIT_LOG_TABLE)) return [];
            throw error;
          }),
      ]);

    const projectById = new Map(projects.map((project) => [project.id, project]));
    const userLabelById = new Map(users.map((user) => [user.id, user.full_name || user.email || user.id]));
    const teamLabelById = new Map<string, string>();
    const teamBusinessUnitById = new Map<string, string>();
    for (const row of teamRows) {
      const teamId = getStringField(row, ['id']);
      if (!teamId) continue;
      const label =
        getStringField(row, ['name', 'title', 'display_name', 'slug']) ??
        `Team ${teamId.slice(Math.max(0, teamId.length - 6))}`;
      teamLabelById.set(teamId, label);
      const businessUnit = resolveBusinessUnitFromTeamRow(row, label, businessUnitMapConfig);
      if (businessUnit) {
        teamBusinessUnitById.set(teamId, businessUnit);
      }
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
      if (!isAcceptedTeamMembershipStatus(status)) continue;
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

    const primaryTeamByUserId = new Map<string, string>();
    for (const [userId, memberships] of membershipsByUserId) {
      memberships.sort((a, b) => {
        if (a.rolePriority !== b.rolePriority) return a.rolePriority - b.rolePriority;
        if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
        if (a.teamId !== b.teamId) return a.teamId.localeCompare(b.teamId);
        return a.sourceIndex - b.sourceIndex;
      });
      const primary = memberships[0];
      if (primary) {
        primaryTeamByUserId.set(userId, primary.teamId);
      }
    }

    const resolveTeamId = (candidateUserId: string | null | undefined): string | null => {
      if (!candidateUserId) return null;
      return primaryTeamByUserId.get(candidateUserId) ?? null;
    };

    const resolveBusinessUnit = (
      teamId: string | null,
      candidateUserId: string | null | undefined
    ): string | null => {
      if (teamId) {
        const fromTeam = teamBusinessUnitById.get(teamId);
        if (fromTeam) return fromTeam;
      }
      if (!candidateUserId) return null;
      const primaryTeamId = resolveTeamId(candidateUserId);
      if (!primaryTeamId) return null;
      return teamBusinessUnitById.get(primaryTeamId) ?? null;
    };

    const shouldIncludeDimension = (teamId: string | null, businessUnit: string | null): boolean => {
      if (teamFilter && teamId !== teamFilter) return false;
      if (businessUnitFilter && businessUnit !== businessUnitFilter) return false;
      return true;
    };

    const totals = emptyRoiOutputs();
    let totalTokenVolume = 0;
    let totalCost = 0;
    let tokenSignalRowCount = 0;
    let tokenAttributedRowCount = 0;
    const auditActionCounts = new Map<string, number>();
    let tokenRowsWithModel = 0;
    let tokenRowsUsingExplicitRate = 0;
    let tokenRowsUsingDefaultRate = 0;
    let tokenRowsWithoutRate = 0;
    const personOutputs = new Map<string, RoiOutputMetrics>();
    const personTokenVolumes = new Map<string, number>();
    const personCosts = new Map<string, number>();
    const teamOutputs = new Map<string, RoiOutputMetrics>();
    const teamTokenVolumes = new Map<string, number>();
    const teamCosts = new Map<string, number>();
    const businessUnitOutputs = new Map<string, RoiOutputMetrics>();
    const businessUnitTokenVolumes = new Map<string, number>();
    const businessUnitCosts = new Map<string, number>();
    const trendMetrics = new Map<
      string,
      {
        periodStart: string;
        outputs: RoiOutputMetrics;
        tokenVolume: number;
        cost: number;
      }
    >();

    const addNumericSignal = (map: Map<string, number>, key: string | null, amount: number): void => {
      if (!key || amount <= 0) return;
      map.set(key, (map.get(key) ?? 0) + amount);
    };

    const ensureTrendMetric = (
      occurredAt: string | null | undefined
    ): { periodStart: string; outputs: RoiOutputMetrics; tokenVolume: number; cost: number } | null => {
      const period = resolveRoiPeriod(occurredAt ?? null, window);
      if (!period) return null;
      const existing = trendMetrics.get(period.periodLabel) ?? {
        periodStart: period.periodStart,
        outputs: emptyRoiOutputs(),
        tokenVolume: 0,
        cost: 0,
      };
      trendMetrics.set(period.periodLabel, existing);
      return existing;
    };

    const recordOutput = (
      metric: keyof RoiOutputMetrics,
      actorUserId: string | null,
      actorTeamId: string | null,
      occurredAt: string | null | undefined
    ): void => {
      const actorBusinessUnit = resolveBusinessUnit(actorTeamId, actorUserId);
      if (!shouldIncludeDimension(actorTeamId, actorBusinessUnit)) return;

      addRoiOutput(totals, metric, 1);

      if (actorUserId) {
        const existing = personOutputs.get(actorUserId) ?? emptyRoiOutputs();
        addRoiOutput(existing, metric, 1);
        personOutputs.set(actorUserId, existing);
      }

      if (actorTeamId) {
        const existing = teamOutputs.get(actorTeamId) ?? emptyRoiOutputs();
        addRoiOutput(existing, metric, 1);
        teamOutputs.set(actorTeamId, existing);
      }

      if (actorBusinessUnit) {
        const existing = businessUnitOutputs.get(actorBusinessUnit) ?? emptyRoiOutputs();
        addRoiOutput(existing, metric, 1);
        businessUnitOutputs.set(actorBusinessUnit, existing);
      }

      const trendMetric = ensureTrendMetric(occurredAt);
      if (!trendMetric) return;
      addRoiOutput(trendMetric.outputs, metric, 1);
    };

    const recordTokenVolume = (
      tokenVolume: number,
      cost: number,
      actorUserId: string | null,
      actorTeamId: string | null,
      occurredAt: string | null | undefined
    ): void => {
      if (tokenVolume <= 0) return;
      const actorBusinessUnit = resolveBusinessUnit(actorTeamId, actorUserId);
      if (!shouldIncludeDimension(actorTeamId, actorBusinessUnit)) return;

      totalTokenVolume += tokenVolume;
      addNumericSignal(personTokenVolumes, actorUserId, tokenVolume);
      addNumericSignal(teamTokenVolumes, actorTeamId, tokenVolume);
      addNumericSignal(businessUnitTokenVolumes, actorBusinessUnit, tokenVolume);
      if (cost > 0) {
        totalCost += cost;
        addNumericSignal(personCosts, actorUserId, cost);
        addNumericSignal(teamCosts, actorTeamId, cost);
        addNumericSignal(businessUnitCosts, actorBusinessUnit, cost);
      }
      const trendMetric = ensureTrendMetric(occurredAt);
      if (trendMetric) {
        trendMetric.tokenVolume += tokenVolume;
        trendMetric.cost += cost;
      }
    };

    for (const project of projects) {
      if (project.source_type !== 'hack_submission') continue;
      if (project.status !== 'completed') continue;
      const ownerId = project.owner_id;
      const actorTeamId = project.team_id ?? resolveTeamId(ownerId);
      recordOutput('hacksCompleted', ownerId, actorTeamId, project.created_at);
    }

    for (const artifact of artifacts) {
      if (artifact.archived_at) continue;
      const sourceProject = artifact.source_hack_project_id ? projectById.get(artifact.source_hack_project_id) : null;
      const actorTeamId = sourceProject?.team_id ?? resolveTeamId(artifact.created_by_user_id);
      recordOutput('artifactsPublished', artifact.created_by_user_id, actorTeamId, artifact.created_at);
    }

    for (const problem of problems) {
      if (problem.status !== 'solved') continue;
      if (normalizeProblemModerationState(problem.moderation_state) === 'removed') continue;
      const actorUserId = problem.claimed_by_user_id;
      const actorTeamId = resolveTeamId(actorUserId);
      recordOutput('problemsSolved', actorUserId, actorTeamId, problem.updated_at ?? problem.created_at);
    }

    for (const transition of pipelineTransitions) {
      const actorUserId = transition.changed_by_user_id;
      const actorTeamId = resolveTeamId(actorUserId);
      recordOutput('pipelineItemsProgressed', actorUserId, actorTeamId, transition.changed_at);
    }

    for (const auditRow of eventAuditLogs) {
      const action = typeof auditRow.action === 'string' && auditRow.action.trim() ? auditRow.action.trim() : 'unknown';
      auditActionCounts.set(action, (auditActionCounts.get(action) ?? 0) + 1);
      const tokenVolume = extractRoiTokenVolumeFromAuditPayload(auditRow.new_value);
      if (!tokenVolume || tokenVolume <= 0) continue;
      tokenSignalRowCount += 1;

      const model = extractRoiModelFromAuditPayload(auditRow.new_value);
      if (model) {
        tokenRowsWithModel += 1;
      }
      const rateResolution = resolveRoiRateForModel(model, rateCardConfig);
      if (rateResolution.ratePer1kTokensGbp === null) {
        tokenRowsWithoutRate += 1;
      } else if (rateResolution.usedDefaultRate) {
        tokenRowsUsingDefaultRate += 1;
      } else {
        tokenRowsUsingExplicitRate += 1;
      }
      const tokenCost = calculateRoiCostFromTokenVolume(tokenVolume, rateResolution.ratePer1kTokensGbp);

      const actorUserId = auditRow.actor_user_id;
      const payloadTeamId = extractRoiTeamIdFromAuditPayload(auditRow.new_value);
      const actorTeamId = payloadTeamId ?? resolveTeamId(actorUserId);
      if (actorUserId || actorTeamId) {
        tokenAttributedRowCount += 1;
      }
      recordTokenVolume(tokenVolume, tokenCost, actorUserId, actorTeamId, auditRow.created_at);
    }

    const personDimensionIds = new Set<string>([
      ...personOutputs.keys(),
      ...personTokenVolumes.keys(),
      ...personCosts.keys(),
    ]);
    const teamDimensionIds = new Set<string>([...teamOutputs.keys(), ...teamTokenVolumes.keys(), ...teamCosts.keys()]);

    const personBreakdown = Array.from(personDimensionIds)
      .map((userId) => {
        const outputs = personOutputs.get(userId) ?? emptyRoiOutputs();
        return {
          dimensionId: userId,
          dimensionLabel: userLabelById.get(userId) ?? userId,
          tokenVolume: roundRoiTokenVolume(personTokenVolumes.get(userId) ?? 0),
          cost: roundRoiCost(personCosts.get(userId) ?? 0),
          outputs: cloneRoiOutputs(outputs),
        };
      })
      .sort((a, b) => {
        const outputDiff = sumRoiOutputs(b.outputs) - sumRoiOutputs(a.outputs);
        if (outputDiff !== 0) return outputDiff;
        if (b.tokenVolume !== a.tokenVolume) return b.tokenVolume - a.tokenVolume;
        return a.dimensionLabel.localeCompare(b.dimensionLabel);
      })
      .slice(0, ROI_BREAKDOWN_LIMIT);

    const teamBreakdown = Array.from(teamDimensionIds)
      .map((teamId) => {
        const outputs = teamOutputs.get(teamId) ?? emptyRoiOutputs();
        return {
          dimensionId: teamId,
          dimensionLabel: teamLabelById.get(teamId) ?? teamId,
          tokenVolume: roundRoiTokenVolume(teamTokenVolumes.get(teamId) ?? 0),
          cost: roundRoiCost(teamCosts.get(teamId) ?? 0),
          outputs: cloneRoiOutputs(outputs),
        };
      })
      .sort((a, b) => {
        const outputDiff = sumRoiOutputs(b.outputs) - sumRoiOutputs(a.outputs);
        if (outputDiff !== 0) return outputDiff;
        if (b.tokenVolume !== a.tokenVolume) return b.tokenVolume - a.tokenVolume;
        return a.dimensionLabel.localeCompare(b.dimensionLabel);
      })
      .slice(0, ROI_BREAKDOWN_LIMIT);

    const businessUnitDimensionIds = new Set<string>([
      ...businessUnitOutputs.keys(),
      ...businessUnitTokenVolumes.keys(),
      ...businessUnitCosts.keys(),
    ]);

    const businessUnitBreakdown = Array.from(businessUnitDimensionIds)
      .map((businessUnit) => {
        const outputs = businessUnitOutputs.get(businessUnit) ?? emptyRoiOutputs();
        return {
          dimensionId: businessUnit,
          dimensionLabel: businessUnit,
          tokenVolume: roundRoiTokenVolume(businessUnitTokenVolumes.get(businessUnit) ?? 0),
          cost: roundRoiCost(businessUnitCosts.get(businessUnit) ?? 0),
          outputs: cloneRoiOutputs(outputs),
        };
      })
      .sort((a, b) => {
        const outputDiff = sumRoiOutputs(b.outputs) - sumRoiOutputs(a.outputs);
        if (outputDiff !== 0) return outputDiff;
        if ((b.cost ?? 0) !== (a.cost ?? 0)) return (b.cost ?? 0) - (a.cost ?? 0);
        if (b.tokenVolume !== a.tokenVolume) return b.tokenVolume - a.tokenVolume;
        return a.dimensionLabel.localeCompare(b.dimensionLabel);
      })
      .slice(0, ROI_BREAKDOWN_LIMIT);

    const trend = Array.from(trendMetrics.entries())
      .map(([periodLabel, value]) => ({
        periodLabel,
        periodStart: value.periodStart,
        tokenVolume: roundRoiTokenVolume(value.tokenVolume),
        cost: roundRoiCost(value.cost),
        outputs: cloneRoiOutputs(value.outputs),
      }))
      .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
      .slice(-ROI_TREND_LIMIT);
    const roundedTotalTokenVolume = roundRoiTokenVolume(totalTokenVolume);
    const roundedTotalCost = roundRoiCost(totalCost);
    const totalCostPerOutput = {
      perHack: calculateRoiCostPerOutput(roundedTotalCost, totals.hacksCompleted),
      perArtifact: calculateRoiCostPerOutput(roundedTotalCost, totals.artifactsPublished),
      perProblemSolved: calculateRoiCostPerOutput(roundedTotalCost, totals.problemsSolved),
      perPipelineItemProgressed: calculateRoiCostPerOutput(roundedTotalCost, totals.pipelineItemsProgressed),
    };

    const teamCount = teamLabelById.size;
    const businessUnitMappedTeamCount = teamBusinessUnitById.size;
    const businessUnitSourceStatus: RoiDashboardSnapshot['sources']['businessUnit']['status'] =
      businessUnitMappedTeamCount === 0
        ? 'unavailable'
        : businessUnitMappedTeamCount < teamCount
          ? 'available_partial'
          : 'available';
    const businessUnitSourceReason =
      businessUnitMappedTeamCount === 0
        ? 'No team records include a business-unit value and no business-unit team map override is configured.'
        : businessUnitMappedTeamCount < teamCount
          ? `Business-unit attribution resolved for ${businessUnitMappedTeamCount}/${teamCount} teams.`
          : `Business-unit attribution resolved for ${businessUnitMappedTeamCount}/${teamCount} teams.`;

    const costRateSourceStatus: RoiDashboardSnapshot['sources']['costRateCard']['status'] =
      tokenRowsWithoutRate > 0 || tokenRowsUsingDefaultRate > 0 ? 'available_partial' : 'available';
    const costRateSourceReason =
      tokenSignalRowCount > 0
        ? `Rate card ${rateCardConfig.source}; token rows=${tokenSignalRowCount}, explicit-model-rate=${tokenRowsUsingExplicitRate}, default-rate=${tokenRowsUsingDefaultRate}, without-rate=${tokenRowsWithoutRate}, rows-with-model=${tokenRowsWithModel}.`
        : `Rate card ${rateCardConfig.source}; no token-bearing rows in current filter scope.`;

    const exportRows: RoiDashboardSnapshot['export']['rows'] = [
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'window',
        value: window,
      },
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'hacks_completed',
        value: String(totals.hacksCompleted),
      },
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'artifacts_published',
        value: String(totals.artifactsPublished),
      },
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'problems_solved',
        value: String(totals.problemsSolved),
      },
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'pipeline_items_progressed',
        value: String(totals.pipelineItemsProgressed),
      },
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'token_volume',
        value: String(roundedTotalTokenVolume),
      },
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'cost',
        value: roundedTotalCost.toFixed(2),
      },
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'cost_per_hack',
        value: totalCostPerOutput.perHack === null ? 'n/a' : totalCostPerOutput.perHack.toFixed(2),
      },
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'cost_per_artifact',
        value: totalCostPerOutput.perArtifact === null ? 'n/a' : totalCostPerOutput.perArtifact.toFixed(2),
      },
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'cost_per_problem_solved',
        value: totalCostPerOutput.perProblemSolved === null ? 'n/a' : totalCostPerOutput.perProblemSolved.toFixed(2),
      },
      {
        section: 'summary',
        dimension: 'all',
        id: 'all',
        label: 'All',
        metric: 'cost_per_pipeline_item_progressed',
        value:
          totalCostPerOutput.perPipelineItemProgressed === null
            ? 'n/a'
            : totalCostPerOutput.perPipelineItemProgressed.toFixed(2),
      },
    ];

    for (const row of teamBreakdown.slice(0, 10)) {
      exportRows.push(
        {
          section: 'team',
          dimension: 'team',
          id: row.dimensionId,
          label: row.dimensionLabel,
          metric: 'total_outputs',
          value: String(sumRoiOutputs(row.outputs)),
        },
        {
          section: 'team',
          dimension: 'team',
          id: row.dimensionId,
          label: row.dimensionLabel,
          metric: 'hacks_completed',
          value: String(row.outputs.hacksCompleted),
        },
        {
          section: 'team',
          dimension: 'team',
          id: row.dimensionId,
          label: row.dimensionLabel,
          metric: 'token_volume',
          value: String(row.tokenVolume ?? 0),
        },
        {
          section: 'team',
          dimension: 'team',
          id: row.dimensionId,
          label: row.dimensionLabel,
          metric: 'cost',
          value: row.cost === null ? 'n/a' : row.cost.toFixed(2),
        }
      );
    }

    for (const row of personBreakdown.slice(0, 10)) {
      exportRows.push(
        {
          section: 'person',
          dimension: 'person',
          id: row.dimensionId,
          label: row.dimensionLabel,
          metric: 'total_outputs',
          value: String(sumRoiOutputs(row.outputs)),
        },
        {
          section: 'person',
          dimension: 'person',
          id: row.dimensionId,
          label: row.dimensionLabel,
          metric: 'token_volume',
          value: String(row.tokenVolume ?? 0),
        },
        {
          section: 'person',
          dimension: 'person',
          id: row.dimensionId,
          label: row.dimensionLabel,
          metric: 'cost',
          value: row.cost === null ? 'n/a' : row.cost.toFixed(2),
        }
      );
    }

    for (const row of businessUnitBreakdown.slice(0, 10)) {
      exportRows.push(
        {
          section: 'business_unit',
          dimension: 'business_unit',
          id: row.dimensionId,
          label: row.dimensionLabel,
          metric: 'total_outputs',
          value: String(sumRoiOutputs(row.outputs)),
        },
        {
          section: 'business_unit',
          dimension: 'business_unit',
          id: row.dimensionId,
          label: row.dimensionLabel,
          metric: 'token_volume',
          value: String(row.tokenVolume ?? 0),
        },
        {
          section: 'business_unit',
          dimension: 'business_unit',
          id: row.dimensionId,
          label: row.dimensionLabel,
          metric: 'cost',
          value: row.cost === null ? 'n/a' : row.cost.toFixed(2),
        }
      );
    }

    const topAuditActions = Array.from(auditActionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => `${name}=${count}`)
      .join(', ');
    const tokenSourceReason =
      tokenSignalRowCount > 0
        ? `Token volume is mapped from EventAuditLog.new_value payload keys; ${tokenAttributedRowCount}/${tokenSignalRowCount} token-bearing rows had user/team attribution.`
        : `Token volume mapping is wired to EventAuditLog.new_value payload keys, but no token-bearing rows are present in the current source data. Observed audit actions: ${topAuditActions || 'none'}.`;

    const notes = [
      `Token volume source policy: ${tokenSourceReason}`,
      `Cost-rate-card source policy: ${costRateSourceReason}`,
      `Business-unit attribution policy: ${businessUnitSourceReason}`,
    ];
    if (rateCardConfig.parseWarning) {
      notes.push(rateCardConfig.parseWarning);
    }
    if (businessUnitMapConfig.parseWarning) {
      notes.push(businessUnitMapConfig.parseWarning);
    }
    if (teamFilter) {
      notes.push(`Team filter applied: ${teamFilter}`);
    }
    if (businessUnitFilter) {
      if (businessUnitSourceStatus === 'unavailable') {
        notes.push(`Business-unit filter requested (${businessUnitFilter}) but no business-unit source is available.`);
      } else {
        notes.push(`Business-unit filter applied: ${businessUnitFilter}`);
      }
    }

    const totalOutputs = sumRoiOutputs(totals);
    const tokenAttributionPct =
      tokenSignalRowCount > 0
        ? Math.round((tokenAttributedRowCount / tokenSignalRowCount) * 1000) / 10
        : null;
    const roiAlerts: string[] = [];
    const roiWarnings: string[] = [];
    if (roundedTotalCost > 0 && totalOutputs === 0) {
      roiAlerts.push('spend_without_outputs');
    }
    if (
      totalCostPerOutput.perHack !== null &&
      totalCostPerOutput.perHack > PHASE3_ROI_HIGH_COST_PER_HACK_THRESHOLD_GBP
    ) {
      roiAlerts.push('cost_per_hack_above_threshold');
    }
    if (
      tokenAttributionPct !== null &&
      tokenAttributionPct < PHASE3_ROI_MIN_TOKEN_ATTRIBUTION_PCT
    ) {
      roiAlerts.push('token_attribution_below_threshold');
    }
    if (trend.length < PHASE3_ROI_MIN_TREND_POINTS) {
      roiWarnings.push('trend_points_below_threshold');
    }
    if (businessUnitSourceStatus !== 'available') {
      roiWarnings.push('business_unit_coverage_partial');
    }
    if (costRateSourceStatus !== 'available') {
      roiWarnings.push('cost_rate_card_partial');
    }
    logPhase3Telemetry('roi_signal_health', {
      provider: 'supabase',
      policyVersion: ROI_POLICY_VERSION,
      window,
      teamFilterApplied: Boolean(teamFilter),
      businessUnitFilterApplied: Boolean(businessUnitFilter),
      tokenSourceStatus: 'available_partial',
      costRateCardStatus: costRateSourceStatus,
      outputSourceStatus: businessUnitSourceStatus === 'available' ? 'available' : 'available_partial',
      businessUnitSourceStatus,
      totalTokenVolume: roundedTotalTokenVolume,
      totalCost: roundedTotalCost,
      totalOutputs,
      costPerHack: totalCostPerOutput.perHack,
      tokenSignalRowCount,
      tokenAttributedRowCount,
      tokenAttributionPct,
      trendPointCount: trend.length,
      tokenAttributionThresholdPct: PHASE3_ROI_MIN_TOKEN_ATTRIBUTION_PCT,
      highCostPerHackThresholdGbp: PHASE3_ROI_HIGH_COST_PER_HACK_THRESHOLD_GBP,
      minimumTrendPoints: PHASE3_ROI_MIN_TREND_POINTS,
      healthy: roiAlerts.length === 0,
      alerts: roiAlerts,
      warnings: roiWarnings,
      reportingCadence: 'daily_sample_weekly_checkpoint',
      viewerTimezone: viewer.timezone,
      viewerSiteUrl: viewer.siteUrl,
      loggedAt: calculatedAt,
    });

    return {
      calculatedAt,
      policyVersion: ROI_POLICY_VERSION,
      window,
      appliedFilters: {
        teamId: teamFilter,
        businessUnit: businessUnitFilter,
      },
      sources: {
        tokenVolume: {
          status: 'available_partial',
          source: 'EventAuditLog.new_value',
          reason: tokenSourceReason,
        },
        costRateCard: {
          status: costRateSourceStatus,
          source: `EventAuditLog.new_value + ${rateCardConfig.source}`,
          reason: costRateSourceReason,
        },
        outputs: {
          status: businessUnitSourceStatus === 'available' ? 'available' : 'available_partial',
          source: 'Project, Artifact, Problem, PipelineTransitionLog',
          reason:
            businessUnitSourceStatus === 'available'
              ? 'Output signals are available for person, team, and business-unit aggregation.'
              : 'Output signals are available for people/teams; business-unit aggregation has partial coverage.',
        },
        businessUnit: {
          status: businessUnitSourceStatus,
          source: businessUnitMapConfig.source,
          reason: businessUnitSourceReason,
        },
      },
      totals: {
        tokenVolume: roundedTotalTokenVolume,
        cost: roundedTotalCost,
        outputs: cloneRoiOutputs(totals),
        costPerOutput: totalCostPerOutput,
      },
      breakdowns: {
        person: personBreakdown,
        team: teamBreakdown,
        businessUnit: businessUnitBreakdown,
      },
      trend,
      export: {
        generatedAt: calculatedAt,
        fileName: `hdc-roi-${window}-${calculatedAt.slice(0, 10)}.csv`,
        rows: exportRows,
        formattedSummary:
          `ROI scaffold (${window}) generated ${calculatedAt}. ` +
          `Outputs: hacks=${totals.hacksCompleted}, artifacts=${totals.artifactsPublished}, ` +
          `problems=${totals.problemsSolved}, pipeline_progressions=${totals.pipelineItemsProgressed}. ` +
          `Token volume=${roundedTotalTokenVolume}. ` +
          `Spend=£${roundedTotalCost.toFixed(2)}. ` +
          `Cost-per-hack=${totalCostPerOutput.perHack === null ? 'n/a' : `£${totalCostPerOutput.perHack.toFixed(2)}`}.`,
      },
      notes,
    };
  }

  async createHack(viewer: ViewerContext, input: CreateHackInput): Promise<CreateHackResult> {
    const user = await this.ensureUser(viewer);
    const hackTitle = input.title.trim();
    if (!hackTitle) {
      throw createShowcaseValidationError('title is required.');
    }
    const sourceEventId = input.sourceEventId?.trim() || null;
    const demoUrl = input.demoUrl?.trim() || null;
    const normalizedTags = normalizeShowcaseTags(input.tags ?? []);
    const normalizedTeamMembers = normalizeShowcaseTeamMembers(input.teamMembers ?? []);
    const linkedArtifactIds = normalizeShowcaseLinkedArtifactIds(input.linkedArtifactIds ?? []);
    const linkedArtifacts: DbArtifact[] = [];
    const hdcParentPageId = normalizeConfluenceParentPageId(process.env.CONFLUENCE_HDC_PARENT_PAGE_ID);
    if (!hdcParentPageId) {
      throw createShowcaseValidationError('CONFLUENCE_HDC_PARENT_PAGE_ID must be configured for hack page creation.');
    }

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
        linkedArtifacts.push(artifact);
      }
    }

    const projectInsertPayload = {
      title: hackTitle,
      name: hackTitle,
      description: input.description?.trim() || '',
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
    };

    let inserted: { id: string; title?: string | null; name?: string | null } | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        inserted = await this.insertProject(projectInsertPayload);
        break;
      } catch (error) {
        if (!isSupabaseRateLimitError(error) || attempt === 2) {
          throw error;
        }
        await delayMs(150 * (attempt + 1));
      }
    }

    const createdPageIds: string[] = [];
    const outputPageIds: string[] = [];

    try {
      const hacksParentPage = await ensureHacksParentPageUnderParent({
        parentPageId: hdcParentPageId,
        nonBlockingFullWidth: true,
      });
      const backLinkUrl =
        process.env.CONFLUENCE_HDC_PARENT_PAGE_URL?.trim() || buildConfluencePageUrl(viewer.siteUrl, hdcParentPageId);

      const hackPage = await createStandardChildPage({
        parentPageId: hacksParentPage.pageId,
        title: hackTitle,
        storageValue: buildHackPageStorageValue({
          title: hackTitle,
          description: input.description ?? '',
          assetType: input.assetType,
          visibility: input.visibility ?? 'org',
          authorName: user.full_name || user.email || 'Unknown',
          tags: normalizedTags,
          sourceEventId,
          demoUrl,
          teamMembers: normalizedTeamMembers,
          outputLinks: [],
          backLinkUrl,
        }),
        nonBlockingFullWidth: true,
      });
      createdPageIds.push(hackPage.pageId);

      const outputLinks: Array<{ title: string; url: string }> = [];
      const content = input.content?.trim() || '';
      if (content) {
        const outputTitle = `${hackTitle} · Primary Output`;
        const outputPage = await createStandardChildPage({
          parentPageId: hackPage.pageId,
          title: outputTitle,
          storageValue: buildHackOutputPageStorageValue({
            outputTitle,
            sourceReference: 'Submit Hack content payload',
            content,
          }),
          nonBlockingFullWidth: true,
        });
        createdPageIds.push(outputPage.pageId);
        outputPageIds.push(outputPage.pageId);
        outputLinks.push({
          title: outputTitle,
          url: outputPage.pageUrl || buildConfluencePageUrl(viewer.siteUrl, outputPage.pageId),
        });
      }

      for (const artifact of linkedArtifacts) {
        const outputTitle = `${artifact.title} · Linked Artifact`;
        const outputPage = await createStandardChildPage({
          parentPageId: hackPage.pageId,
          title: outputTitle,
          storageValue: buildHackOutputPageStorageValue({
            outputTitle,
            sourceReference: `Artifact ID: ${artifact.id}`,
            content: artifact.description || `Artifact source URL: ${artifact.source_url}`,
          }),
          nonBlockingFullWidth: true,
        });
        createdPageIds.push(outputPage.pageId);
        outputPageIds.push(outputPage.pageId);
        outputLinks.push({
          title: outputTitle,
          url: outputPage.pageUrl || buildConfluencePageUrl(viewer.siteUrl, outputPage.pageId),
        });
      }

      await setPageStorageContent(
        hackPage.pageId,
        buildHackPageStorageValue({
          title: hackTitle,
          description: input.description ?? '',
          assetType: input.assetType,
          visibility: input.visibility ?? 'org',
          authorName: user.full_name || user.email || 'Unknown',
          tags: normalizedTags,
          sourceEventId,
          demoUrl,
          teamMembers: normalizedTeamMembers,
          outputLinks,
          backLinkUrl,
        })
      );

      if (!inserted) {
        throw new Error('Unable to persist hack record to storage after retries.');
      }

      if (inserted) {
        const showcaseMetadataRow: Omit<
          DbShowcaseHack,
          'created_at' | 'updated_at'
        > = {
          project_id: inserted.id,
          featured: false,
          demo_url: demoUrl,
          confluence_page_id: hackPage.pageId,
          confluence_page_url: hackPage.pageUrl || null,
          output_page_ids: outputPageIds,
          team_members: normalizedTeamMembers,
          source_event_id: sourceEventId,
          tags: normalizedTags,
          linked_artifact_ids: linkedArtifactIds,
          context: null,
          limitations: null,
          risk_notes: null,
          source_repo_url: null,
          created_by_user_id: user.id,
        };

        let showcasePersisted = false;
        let lastShowcaseError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await this.client.upsert<DbShowcaseHack>(SHOWCASE_HACK_TABLE, showcaseMetadataRow, 'project_id');
            showcasePersisted = true;
            break;
          } catch (error) {
            lastShowcaseError = error;
            if (!isSupabaseRateLimitError(error) || attempt === 2) {
              throw error;
            }
            await delayMs(150 * (attempt + 1));
          }
        }
        if (!showcasePersisted && lastShowcaseError) {
          throw lastShowcaseError;
        }
      }

      return {
        assetId: inserted.id,
        title: inserted?.title ?? inserted?.name ?? hackTitle,
        confluencePageId: hackPage.pageId,
        confluencePageUrl: hackPage.pageUrl || null,
        outputPageIds,
      };
    } catch (error) {
      for (const pageId of createdPageIds.slice().reverse()) {
        try {
          await deletePage(pageId);
        } catch {
          // Best-effort cleanup.
        }
      }
      if (inserted?.id) {
        await this.client
          .deleteMany(PROJECT_TABLE, [{ field: 'id', op: 'eq', value: inserted.id }])
          .catch(() => []);
      }
      if (hasMissingTable(error, SHOWCASE_HACK_TABLE)) {
        throw new Error(
          `Missing required table ${SHOWCASE_HACK_TABLE}. Apply the phase 1 showcase migration before calling createHack.`
        );
      }
      throw error;
    }
  }

  async forkShowcaseHack(viewer: ViewerContext, input: ForkShowcaseHackInput): Promise<ForkShowcaseHackResult> {
    const sourceProjectId = typeof input.sourceProjectId === 'string' ? input.sourceProjectId.trim() : '';
    if (!sourceProjectId) {
      throw createForkValidationError('sourceProjectId is required.');
    }

    const sourceProject = await this.getProjectById(sourceProjectId);
    if (!sourceProject) {
      throw new Error('[FORK_SOURCE_NOT_FOUND] Source hack project was not found.');
    }
    if (sourceProject.source_type !== 'hack_submission') {
      throw new Error('[FORK_SOURCE_INVALID] sourceProjectId must reference a hack submission project.');
    }

    let sourceMetadata: DbShowcaseHack | null = null;
    try {
      sourceMetadata = await this.client.selectOne<DbShowcaseHack>(
        SHOWCASE_HACK_TABLE,
        'project_id,featured,demo_url,confluence_page_id,confluence_page_url,output_page_ids,team_members,source_event_id,tags,linked_artifact_ids,context,limitations,risk_notes,source_repo_url,created_by_user_id,created_at,updated_at',
        [{ field: 'project_id', op: 'eq', value: sourceProjectId }]
      );
    } catch (error) {
      if (hasMissingTable(error, SHOWCASE_HACK_TABLE)) {
        throw new Error(
          `Missing required table ${SHOWCASE_HACK_TABLE}. Apply the phase 1 showcase migration before calling fork resolvers.`
        );
      }
      throw error;
    }

    const user = await this.ensureUser(viewer);
    const createdAt = nowIso();
    const title = (input.title?.trim() || `${sourceProject.title} (Fork)`).trim();
    if (title.length < 3 || title.length > 180) {
      throw createForkValidationError('title must be 3-180 characters when provided.');
    }
    const description = (input.description?.trim() || sourceProject.description || '').trim() || null;
    const sourceEventId = sourceMetadata?.source_event_id ?? sourceProject.event_id ?? null;
    const normalizedTags = normalizeShowcaseTags([...(sourceMetadata?.tags ?? []), 'fork']);
    const linkedArtifactIds = normalizeShowcaseLinkedArtifactIds(sourceMetadata?.linked_artifact_ids ?? []);
    const hdcParentPageId = normalizeConfluenceParentPageId(process.env.CONFLUENCE_HDC_PARENT_PAGE_ID);
    if (!hdcParentPageId) {
      throw createForkValidationError('CONFLUENCE_HDC_PARENT_PAGE_ID must be configured for fork page creation.');
    }

    const insertedProject = await this.insertProject({
      title,
      name: title,
      description,
      status: 'in_progress',
      hack_type: sourceProject.hack_type ?? 'app',
      visibility: input.visibility ?? asVisibility(sourceProject.visibility),
      owner_id: user.id,
      workflow_transformed: sourceProject.workflow_transformed ?? false,
      source_type: 'hack_submission',
      event_id: sourceEventId,
      synced_to_library_at: null,
      pipeline_stage: 'hack',
      pipeline_stage_entered_at: createdAt,
    });

    const createdPageIds: string[] = [];
    try {
      const hacksParentPage = await ensureHacksParentPageUnderParent({
        parentPageId: hdcParentPageId,
        nonBlockingFullWidth: true,
      });
      const backLinkUrl =
        process.env.CONFLUENCE_HDC_PARENT_PAGE_URL?.trim() || buildConfluencePageUrl(viewer.siteUrl, hdcParentPageId);
      const hackPage = await createStandardChildPage({
        parentPageId: hacksParentPage.pageId,
        title,
        storageValue: buildHackPageStorageValue({
          title,
          description,
          assetType: sourceProject.hack_type ?? 'app',
          visibility: input.visibility ?? asVisibility(sourceProject.visibility),
          authorName: user.full_name || user.email || 'Unknown',
          tags: normalizedTags,
          sourceEventId,
          demoUrl: null,
          teamMembers: [],
          outputLinks: [],
          backLinkUrl,
        }),
        nonBlockingFullWidth: true,
      });
      createdPageIds.push(hackPage.pageId);

      await this.client.upsert<DbShowcaseHack>(
        SHOWCASE_HACK_TABLE,
        {
          project_id: insertedProject.id,
          featured: false,
          demo_url: null,
          confluence_page_id: hackPage.pageId,
          confluence_page_url: hackPage.pageUrl || null,
          output_page_ids: [],
          team_members: [],
          source_event_id: sourceEventId,
          tags: normalizedTags,
          linked_artifact_ids: linkedArtifactIds,
          context: sourceMetadata?.context ?? null,
          limitations: sourceMetadata?.limitations ?? null,
          risk_notes: sourceMetadata?.risk_notes ?? null,
          source_repo_url: sourceMetadata?.source_repo_url ?? null,
          created_by_user_id: user.id,
          created_at: createdAt,
          updated_at: createdAt,
        },
        'project_id'
      );
    } catch (error) {
      for (const pageId of createdPageIds.slice().reverse()) {
        try {
          await deletePage(pageId);
        } catch {
          // Best-effort cleanup.
        }
      }
      await this.client
        .deleteMany(PROJECT_TABLE, [{ field: 'id', op: 'eq', value: insertedProject.id }])
        .catch(() => []);
      if (hasMissingTable(error, SHOWCASE_HACK_TABLE)) {
        throw new Error(
          `Missing required table ${SHOWCASE_HACK_TABLE}. Apply the phase 1 showcase migration before calling fork resolvers.`
        );
      }
      throw error;
    }

    await this.recordForkRelation({
      entityType: 'project',
      sourceId: sourceProjectId,
      forkId: insertedProject.id,
      sourceOwnerUserId: sourceProject.owner_id,
      forkedByUserId: user.id,
      metadata: {
        sourceType: 'hack_submission',
        sourceVisibility: sourceProject.visibility ?? null,
      },
      createdAt,
    });

    if (sourceEventId) {
      await this.logAudit({
        eventId: sourceEventId,
        actorUserId: user.id,
        action: 'hack_forked',
        newValue: {
          sourceProjectId,
          forkProjectId: insertedProject.id,
          forkedByUserId: user.id,
          createdAt,
        },
      });
    }

    const sourceForkCount = await this.getSourceForkCount('project', sourceProjectId);
    return {
      projectId: insertedProject.id,
      title: insertedProject.title ?? insertedProject.name ?? title,
      createdAt,
      forkedFromProjectId: sourceProjectId,
      sourceForkCount,
    };
  }

  async forkArtifact(viewer: ViewerContext, input: ForkArtifactInput): Promise<ForkArtifactResult> {
    const sourceArtifactId = typeof input.sourceArtifactId === 'string' ? input.sourceArtifactId.trim() : '';
    if (!sourceArtifactId) {
      throw createForkValidationError('sourceArtifactId is required.');
    }

    let sourceArtifact: DbArtifact | null = null;
    try {
      sourceArtifact = await this.getArtifactRowById(sourceArtifactId);
    } catch (error) {
      if (hasMissingTable(error, ARTIFACT_TABLE)) {
        throw new Error(
          `Missing required table ${ARTIFACT_TABLE}. Apply the phase 1 registry migration before calling fork resolvers.`
        );
      }
      throw error;
    }

    if (!sourceArtifact || sourceArtifact.archived_at) {
      throw new Error('[FORK_SOURCE_NOT_FOUND] Source artifact was not found.');
    }

    const user = await this.ensureUser(viewer);
    const createdAt = nowIso();
    const title = (input.title?.trim() || `${sourceArtifact.title} (Fork)`).trim();
    if (title.length < 3 || title.length > 120) {
      throw createForkValidationError('title must be 3-120 characters when provided.');
    }
    const description = (input.description?.trim() || sourceArtifact.description || '').trim();
    if (description.length < 10 || description.length > 2000) {
      throw createForkValidationError('description must be 10-2000 characters.');
    }
    const tags = normalizeArtifactTags([...(sourceArtifact.tags ?? []), 'fork']);
    const visibility =
      input.visibility ?? normalizeArtifactVisibility(sourceArtifact.visibility ?? 'org');

    const inserted = await this.client.insert<DbArtifact>(ARTIFACT_TABLE, {
      id: randomUUID(),
      title,
      description,
      artifact_type: sourceArtifact.artifact_type,
      tags,
      source_url: sourceArtifact.source_url,
      source_label: `Fork of ${sourceArtifact.title} (${sourceArtifact.id})`,
      source_hack_project_id: sourceArtifact.source_hack_project_id,
      source_hackday_event_id: sourceArtifact.source_hackday_event_id,
      created_by_user_id: user.id,
      visibility,
      reuse_count: 0,
      created_at: createdAt,
      updated_at: createdAt,
      archived_at: null,
    });

    await this.recordForkRelation({
      entityType: 'artifact',
      sourceId: sourceArtifactId,
      forkId: inserted.id,
      sourceOwnerUserId: sourceArtifact.created_by_user_id,
      forkedByUserId: user.id,
      metadata: {
        sourceArtifactType: sourceArtifact.artifact_type,
        sourceVisibility: sourceArtifact.visibility ?? null,
      },
      createdAt,
    });

    if (sourceArtifact.source_hackday_event_id) {
      await this.logAudit({
        eventId: sourceArtifact.source_hackday_event_id,
        actorUserId: user.id,
        action: 'artifact_forked',
        newValue: {
          sourceArtifactId,
          forkArtifactId: inserted.id,
          forkedByUserId: user.id,
          createdAt,
        },
      });
    }

    const sourceForkCount = await this.getSourceForkCount('artifact', sourceArtifactId);
    return {
      artifactId: inserted.id,
      title: inserted.title,
      createdAt: inserted.created_at ?? createdAt,
      forkedFromArtifactId: sourceArtifactId,
      sourceForkCount,
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
      const [rows, users, forkCountByArtifactId] = await Promise.all([
        this.client.selectMany<DbArtifact>(
          ARTIFACT_TABLE,
          'id,title,description,artifact_type,tags,source_url,source_label,source_hack_project_id,source_hackday_event_id,created_by_user_id,visibility,reuse_count,created_at,updated_at,archived_at'
        ),
        this.client.selectMany<DbUser>(USER_TABLE, 'id,email,full_name'),
        this.getSourceForkCounts('artifact'),
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
          .map((row) =>
            createArtifactListItem(
              row,
              userNameById.get(row.created_by_user_id) ?? 'Unknown',
              forkCountByArtifactId.get(row.id) ?? 0
            )
          ),
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
    if (!isUuid(normalizedId)) {
      throw createRegistryValidationError('artifactId must be a valid UUID.');
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

    const [author, sourceHack, forkCount] = await Promise.all([
      this.getUserById(artifact.created_by_user_id),
      artifact.source_hack_project_id ? this.getProjectById(artifact.source_hack_project_id) : Promise.resolve(null),
      this.getSourceForkCount('artifact', artifact.id),
    ]);

    return {
      artifact: createArtifactListItem(artifact, author?.full_name || author?.email || 'Unknown', forkCount),
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
    if (!isUuid(normalizedId)) {
      throw createRegistryValidationError('artifactId must be a valid UUID.');
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

  async listProblems(viewer: ViewerContext, input: ListProblemsInput): Promise<ListProblemsResult> {
    const query = input.query?.trim().toLowerCase() || '';
    const teamFilter = new Set((input.teams || []).map((team) => team.trim().toLowerCase()).filter(Boolean));
    const domainFilter = new Set((input.domains || []).map((domain) => domain.trim().toLowerCase()).filter(Boolean));
    const statusFilter = new Set((input.statuses || []).filter((status) => isProblemStatus(status)));
    const sortBy = input.sortBy === 'time_wasted' || input.sortBy === 'newest' ? input.sortBy : 'votes';
    const includeHidden = input.includeHidden === true;
    const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));

    try {
      const [rows, users, viewerUser, canModerate] = await Promise.all([
        this.client.selectMany<DbProblem>(
          PROBLEM_TABLE,
          'id,title,description,frequency,estimated_time_wasted_hours,team,domain,contact_details,status,moderation_state,vote_count,flag_count,created_by_user_id,claimed_by_user_id,linked_hack_project_id,linked_artifact_id,auto_hidden_at,hidden_at,closed_at,created_at,updated_at'
        ),
        this.client.selectMany<DbUser>(USER_TABLE, 'id,email,full_name'),
        this.getUserByAccountId(viewer.accountId?.trim() ?? ''),
        this.canUserModerateProblemExchange(viewer),
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
          .map((row) =>
            createProblemListItem(
              row,
              userNameById.get(row.created_by_user_id) ?? 'Unknown',
              canModerate || (!!viewerUser && row.created_by_user_id === viewerUser.id)
            )
          ),
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
      const [projects, users, showcaseRows, artifacts, forkCountByProjectId] = await Promise.all([
        this.listProjects(),
        this.client.selectMany<DbUser>(USER_TABLE, 'id,email,full_name'),
        this.client.selectMany<DbShowcaseHack>(
          SHOWCASE_HACK_TABLE,
          'project_id,featured,demo_url,confluence_page_id,confluence_page_url,output_page_ids,team_members,source_event_id,tags,linked_artifact_ids,context,limitations,risk_notes,source_repo_url,created_by_user_id,created_at,updated_at'
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
        this.getSourceForkCounts('project'),
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

      const allItems = hackRows
        .filter((project) => project.id.trim().length > 0)
        .map((project) =>
          createShowcaseHackListItem({
            project,
            metadata: showcaseByProjectId.get(project.id) ?? null,
            authorName: project.owner_id ? userNameById.get(project.owner_id) ?? 'Unknown' : 'Unknown',
            reuseCount: reuseCountByProjectId.get(project.id) ?? 0,
            forkCount: forkCountByProjectId.get(project.id) ?? 0,
          })
        );
      const totalCount = allItems.length;
      const pageBackedCount = allItems.filter((item) => item.isPageBacked).length;
      const legacyCount = Math.max(0, totalCount - pageBackedCount);
      let items = allItems;

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

      return { items, canManage, totalCount, pageBackedCount, legacyCount };
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
      const [showcaseRow, artifacts, problems, owner, forkCount] = await Promise.all([
        this.client.selectOne<DbShowcaseHack>(
          SHOWCASE_HACK_TABLE,
          'project_id,featured,demo_url,confluence_page_id,confluence_page_url,output_page_ids,team_members,source_event_id,tags,linked_artifact_ids,context,limitations,risk_notes,source_repo_url,created_by_user_id,created_at,updated_at',
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
        this.getSourceForkCount('project', normalizedProjectId),
      ]);

      const publishedArtifacts = artifacts.filter((artifact) => !artifact.archived_at);
      const reuseCount = publishedArtifacts.reduce((sum, artifact) => sum + Math.max(0, artifact.reuse_count ?? 0), 0);
      const listItem = createShowcaseHackListItem({
        project,
        metadata: showcaseRow ?? null,
        authorName: owner?.full_name || owner?.email || 'Unknown',
        reuseCount,
        forkCount,
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
    if (!isUuid(userId)) {
      return [];
    }
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
