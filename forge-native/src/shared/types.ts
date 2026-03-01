/** Allowed email domain for admin operations — single source of truth for backend. */
export const ALLOWED_EMAIL_DOMAIN = '@adaptavist.com';

/** Default timezone for events when none is supplied by the event record. */
export const DEFAULT_TIMEZONE = 'Europe/London';
export const HDC_RUNTIME_CONFIG_ERROR_CODE = 'HDC_RUNTIME_CONFIG_INVALID';

export interface ViewerContext {
  accountId: string;
  siteUrl: string;
  timezone: string;
}

export interface DataSourceInfo {
  provider: "supabase" | "convex";
  deploymentUrl: string;
  schema: string;
}

export interface SummaryStats {
  totalPeople: number;
  totalHacks: number;
  featuredHacks: number;
  inProgressProjects: number;
  completedProjects: number;
  activeMentors: number;
}

export interface TeamPulseCrossTeamEdge {
  sourceTeamId: string;
  sourceTeamLabel: string;
  targetTeamId: string;
  targetTeamLabel: string;
  reuseCount: number;
}

export interface TeamPulseTrendPoint {
  periodStart: string;
  periodLabel: string;
  medianDays: number | null;
  sampleSize: number;
}

export interface TeamPulseMetrics {
  calculatedAt: string;
  reuseRatePct: number;
  reusedArtifactCount: number;
  totalArtifactCount: number;
  crossTeamAdoptionCount: number;
  crossTeamAdoptionEdges: TeamPulseCrossTeamEdge[];
  timeToFirstHackMedianDays: number | null;
  timeToFirstHackSampleSize: number;
  timeToFirstHackTrend: TeamPulseTrendPoint[];
  problemConversionPct: number;
  solvedProblemCount: number;
  totalProblemCount: number;
}

export type RoiTimeWindow = 'weekly' | 'monthly' | 'quarterly';
export type RoiSourceStatus = 'available' | 'available_partial' | 'unavailable';

export interface RoiSourceDescriptor {
  status: RoiSourceStatus;
  source: string;
  reason: string;
}

export interface RoiOutputMetrics {
  hacksCompleted: number;
  artifactsPublished: number;
  problemsSolved: number;
  pipelineItemsProgressed: number;
}

export interface RoiCostPerOutput {
  perHack: number | null;
  perArtifact: number | null;
  perProblemSolved: number | null;
  perPipelineItemProgressed: number | null;
}

export interface RoiBreakdownRow {
  dimensionId: string;
  dimensionLabel: string;
  tokenVolume: number | null;
  cost: number | null;
  outputs: RoiOutputMetrics;
}

export interface RoiTrendPoint {
  periodStart: string;
  periodLabel: string;
  tokenVolume: number | null;
  cost: number | null;
  outputs: RoiOutputMetrics;
}

export interface RoiExportRow {
  section: 'summary' | 'team' | 'person' | 'business_unit';
  dimension: 'all' | 'team' | 'person' | 'business_unit';
  id: string;
  label: string;
  metric: string;
  value: string;
}

export interface RoiExportBundle {
  generatedAt: string;
  fileName: string;
  rows: RoiExportRow[];
  formattedSummary: string;
}

export interface RoiDashboardSnapshot {
  calculatedAt: string;
  policyVersion: 'r9-roi-scaffold-v1';
  window: RoiTimeWindow;
  appliedFilters: {
    teamId: string | null;
    businessUnit: string | null;
  };
  sources: {
    tokenVolume: RoiSourceDescriptor;
    costRateCard: RoiSourceDescriptor;
    outputs: RoiSourceDescriptor;
    businessUnit: RoiSourceDescriptor;
  };
  totals: {
    tokenVolume: number | null;
    cost: number | null;
    outputs: RoiOutputMetrics;
    costPerOutput: RoiCostPerOutput;
  };
  breakdowns: {
    person: RoiBreakdownRow[];
    team: RoiBreakdownRow[];
    businessUnit: RoiBreakdownRow[];
  };
  trend: RoiTrendPoint[];
  export: RoiExportBundle;
  notes: string[];
}

export interface GetRoiDashboardInput {
  window?: RoiTimeWindow;
  teamId?: string;
  businessUnit?: string;
}

export interface LogRoiTokenUsageInput {
  eventId: string;
  tokenVolume?: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
  teamId?: string;
  actorUserId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface LogRoiTokenUsageResult {
  logged: true;
  action: 'llm_usage_logged';
  eventId: string;
  actorUserId: string;
  tokenVolume: number;
  loggedAt: string;
}

export interface RecognitionMentorSignalEntry {
  userId: string;
  userName: string;
  mentorSessionsUsed: number;
  rank: number;
  qualifiesMentorChampion: boolean;
}

export interface RecognitionMentorSignal {
  calculatedAt: string;
  policyVersion: 'r8-mentor-sessions-used-v1';
  policySource: 'User.mentor_sessions_used';
  badgeThreshold: number;
  leaderboardLimit: number;
  leaderboard: RecognitionMentorSignalEntry[];
  qualifiedMentorChampionCount: number;
}

export interface RecognitionPathwaySignalEntry {
  userId: string;
  userName: string;
  distinctPathwayCount: number;
  completedStepCount: number;
  lastCompletedAt: string | null;
  rank: number;
  qualifiesPathwayContributor: boolean;
}

export interface RecognitionPathwaySignal {
  calculatedAt: string;
  policyVersion: 'r8-pathway-completion-v1';
  policySource: 'PathwayProgress';
  badgeThresholdDistinctPathways: number;
  leaderboardLimit: number;
  leaderboard: RecognitionPathwaySignalEntry[];
  qualifiedPathwayContributorCount: number;
}

export interface RecognitionSegmentLeaderboardEntry {
  userId: string;
  userName: string;
  count: number;
  rank: number;
}

export interface RecognitionSegmentLeaderboards {
  builders: RecognitionSegmentLeaderboardEntry[];
  sharers: RecognitionSegmentLeaderboardEntry[];
  solvers: RecognitionSegmentLeaderboardEntry[];
  mentors: RecognitionSegmentLeaderboardEntry[];
}

export interface RecognitionViewerBadges {
  firstArtifactPublished: boolean;
  firstProblemSolved: boolean;
  fiveArtifactsReused: boolean;
  mentoredThreePeople: boolean;
  contributedToPathway: boolean;
}

export interface RecognitionSnapshot {
  mentorSignal: RecognitionMentorSignal;
  pathwaySignal: RecognitionPathwaySignal;
  leaderboards: RecognitionSegmentLeaderboards;
  viewerBadges: RecognitionViewerBadges;
}

export interface FeaturedHack {
  id: string;
  title: string;
  description: string;
  assetType: "prompt" | "skill" | "app";
  status: string;
  reuseCount: number;
  authorName: string;
  visibility: "private" | "org" | "public";
  intendedUser: string | null;
  context: string | null;
  limitations: string | null;
  riskNotes: string | null;
  sourceRepoUrl: string | null;
  demoUrl: string | null;
}

export interface ProjectSnapshot {
  id: string;
  title: string;
  description: string;
  status: string;
  statusLabel: string;
  hackType: "prompt" | "skill" | "app" | null;
  ownerName: string;
  attachedHacksCount: number;
  commentCount: number;
  visibility: "private" | "org" | "public";
  workflowTransformed: boolean;
  aiImpactHypothesis: string | null;
  aiToolsUsed: string[];
  timeSavedEstimate: number | null;
  failuresAndLessons: string | null;
}

export interface PersonSnapshot {
  id: string;
  fullName: string;
  email: string;
  experienceLevel: string | null;
  experienceLabel: string | null;
  mentorCapacity: number;
  mentorSessionsUsed: number;
  mentorSlotsRemaining: number;
  capabilities: string[];
}

export interface BootstrapData {
  viewer: ViewerContext;
  source: DataSourceInfo;
  summary: SummaryStats;
  teamPulse?: TeamPulseMetrics | null;
  recognition?: RecognitionSnapshot | null;
  featuredHacks: FeaturedHack[];
  recentProjects: ProjectSnapshot[];
  people: PersonSnapshot[];
  registry: EventRegistryItem[];
  /** Base URL of HackCentral web app for "Create HackDay" link. Set HACKDAY_CREATE_APP_URL in Forge env. */
  createAppUrl?: string | null;
  /** Full URL to Confluence parent page (macro with create wizard). Set in Forge env for "Create in Confluence" link. */
  parentPageUrl?: string | null;
  /** Confluence page ID of the HackDay Central parent page. Set CONFLUENCE_HDC_PARENT_PAGE_ID in Forge env. */
  parentPageId?: string | null;
}

export interface CreateHackInput {
  title: string;
  description?: string;
  assetType: "prompt" | "skill" | "app";
  visibility?: "private" | "org" | "public";
  content?: string;
  demoUrl?: string;
  teamMembers?: string[];
  sourceEventId?: string;
  tags?: string[];
  linkedArtifactIds?: string[];
}

export interface CreateHackResult {
  assetId: string;
  title: string;
}

export type ArtifactType = "skill" | "prompt" | "template" | "learning" | "code_snippet" | "other";
export type ArtifactVisibility = "private" | "org" | "public";

export interface CreateArtifactInput {
  title: string;
  description: string;
  artifactType: ArtifactType;
  tags: string[];
  sourceUrl: string;
  sourceLabel?: string;
  sourceHackProjectId?: string;
  sourceHackdayEventId?: string;
  visibility?: ArtifactVisibility;
}

export interface CreateArtifactResult {
  artifactId: string;
  createdAt: string;
}

export interface ListArtifactsInput {
  query?: string;
  artifactTypes?: ArtifactType[];
  tags?: string[];
  sortBy?: "newest" | "reuse_count";
  limit?: number;
  cursor?: string;
}

export interface ArtifactListItem {
  id: string;
  title: string;
  description: string;
  artifactType: ArtifactType;
  tags: string[];
  sourceUrl: string;
  sourceLabel?: string;
  sourceHackProjectId?: string;
  sourceHackdayEventId?: string;
  visibility: ArtifactVisibility;
  reuseCount: number;
  createdAt: string;
  updatedAt: string;
  authorName: string;
}

export interface ListArtifactsResult {
  items: ArtifactListItem[];
  nextCursor: string | null;
}

export interface GetArtifactResult {
  artifact: ArtifactListItem;
  sourceHack: null | {
    projectId: string;
    title: string;
    status: string;
    eventId: string | null;
  };
}

export interface MarkArtifactReuseResult {
  artifactId: string;
  reuseCount: number;
  alreadyMarked: boolean;
}

export type ProblemFrequency = "daily" | "weekly" | "monthly";
export type ProblemStatus = "open" | "claimed" | "solved" | "closed";
export type ProblemModerationState = "visible" | "hidden_pending_review" | "removed";

export interface CreateProblemInput {
  title: string;
  description: string;
  frequency: ProblemFrequency;
  estimatedTimeWastedHours: number;
  team: string;
  domain: string;
  contactDetails: string;
}

export interface CreateProblemResult {
  problemId: string;
  status: ProblemStatus;
  moderationState: ProblemModerationState;
  createdAt: string;
}

export interface ListProblemsInput {
  query?: string;
  teams?: string[];
  domains?: string[];
  statuses?: ProblemStatus[];
  sortBy?: "votes" | "time_wasted" | "newest";
  includeHidden?: boolean;
  limit?: number;
  cursor?: string;
}

export interface ProblemListItem {
  id: string;
  title: string;
  description: string;
  frequency: ProblemFrequency;
  estimatedTimeWastedHours: number;
  team: string;
  domain: string;
  contactDetails: string;
  status: ProblemStatus;
  moderationState: ProblemModerationState;
  voteCount: number;
  flagCount: number;
  linkedHackProjectId?: string;
  linkedArtifactId?: string;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
}

export interface ListProblemsResult {
  items: ProblemListItem[];
  nextCursor: string | null;
}

export interface VoteProblemResult {
  problemId: string;
  voteCount: number;
  alreadyVoted: boolean;
}

export interface UpdateProblemStatusInput {
  problemId: string;
  status: ProblemStatus;
  linkedHackProjectId?: string;
  linkedArtifactId?: string;
  note?: string;
}

export interface UpdateProblemStatusResult {
  problemId: string;
  status: ProblemStatus;
  linkedHackProjectId?: string;
  linkedArtifactId?: string;
  updatedAt: string;
}

export interface FlagProblemInput {
  problemId: string;
  reason?: string;
}

export interface FlagProblemResult {
  problemId: string;
  flagCount: number;
  alreadyFlagged: boolean;
  moderationState: ProblemModerationState;
  autoHidden: boolean;
}

export interface ModerateProblemInput {
  problemId: string;
  decision: "remove" | "reinstate";
  note?: string;
}

export interface ModerateProblemResult {
  problemId: string;
  moderationState: ProblemModerationState;
  reviewedAt: string;
}

export interface ProblemExchangeCapabilitiesResult {
  canModerate: boolean;
  moderationMode: "allowlist" | "none";
}

export interface ListProblemImportCandidatesInput {
  limit?: number;
  minVoteCount?: number;
  statuses?: ProblemStatus[];
}

export interface ProblemImportCandidate {
  problemId: string;
  title: string;
  description: string;
  status: ProblemStatus;
  voteCount: number;
  estimatedTimeWastedHours: number;
  team: string;
  domain: string;
  updatedAt: string;
  createdByName: string;
}

export interface ListProblemImportCandidatesResult {
  items: ProblemImportCandidate[];
  criteria: {
    minVoteCount: number;
    statuses: ProblemStatus[];
  };
}

export type PathwayStepType = "read" | "try" | "build";

export interface PathwayStep {
  stepId: string;
  position: number;
  type: PathwayStepType;
  title: string;
  description: string;
  linkedHackProjectId?: string;
  linkedArtifactId?: string;
  externalUrl?: string;
  challengePrompt?: string;
  isOptional: boolean;
}

export interface PathwayProgressSnapshot {
  completedStepIds: string[];
  completedSteps: number;
  totalSteps: number;
  completionPercent: number;
}

export interface PathwayListItem {
  pathwayId: string;
  title: string;
  summary: string;
  introText: string;
  domain: string | null;
  role: string | null;
  tags: string[];
  stepCount: number;
  published: boolean;
  recommended: boolean;
  updatedAt: string;
  updatedByName: string;
  progress: PathwayProgressSnapshot;
}

export interface ListPathwaysInput {
  query?: string;
  domain?: string;
  role?: string;
  tags?: string[];
  recommendedOnly?: boolean;
  publishedOnly?: boolean;
  limit?: number;
}

export interface ListPathwaysResult {
  items: PathwayListItem[];
  canManage: boolean;
}

export interface GetPathwayResult {
  pathway: PathwayListItem;
  steps: PathwayStep[];
  canManage: boolean;
}

export interface UpsertPathwayStepInput {
  stepId?: string;
  type: PathwayStepType;
  title: string;
  description?: string;
  linkedHackProjectId?: string;
  linkedArtifactId?: string;
  externalUrl?: string;
  challengePrompt?: string;
  isOptional?: boolean;
}

export interface UpsertPathwayInput {
  pathwayId?: string;
  title: string;
  summary?: string;
  introText?: string;
  domain?: string;
  role?: string;
  tags?: string[];
  published?: boolean;
  recommended?: boolean;
  steps: UpsertPathwayStepInput[];
}

export interface UpsertPathwayResult {
  pathway: PathwayListItem;
  steps: PathwayStep[];
}

export interface SetPathwayStepCompletionInput {
  pathwayId: string;
  stepId: string;
  completed: boolean;
}

export interface SetPathwayStepCompletionResult {
  pathwayId: string;
  stepId: string;
  completed: boolean;
  completedAt: string | null;
  progress: PathwayProgressSnapshot;
}

export type PipelineStage = "hack" | "validated_prototype" | "incubating_project" | "product_candidate";

export interface PipelineStageCriteria {
  stage: PipelineStage;
  label: string;
  description: string;
  criteria: string[];
  updatedAt?: string;
}

export interface PipelineBoardItem {
  projectId: string;
  title: string;
  description: string;
  ownerName: string;
  stage: PipelineStage;
  status: string;
  statusLabel: string;
  daysInStage: number;
  attachedHacksCount: number;
  commentCount: number;
  timeSavedEstimate: number | null;
  visibility: "private" | "org" | "public";
  enteredStageAt: string;
  updatedAt: string;
}

export interface PipelineMetrics {
  itemsPerStage: Array<{
    stage: PipelineStage;
    count: number;
  }>;
  averageDaysInStage: Array<{
    stage: PipelineStage;
    averageDays: number;
  }>;
  conversionHackToValidated: number;
  conversionValidatedToIncubating: number;
  conversionIncubatingToCandidate: number;
  totalEntered: number;
  totalGraduated: number;
}

export interface GetPipelineBoardInput {
  query?: string;
  stages?: PipelineStage[];
  limit?: number;
}

export interface GetPipelineBoardResult {
  items: PipelineBoardItem[];
  stageCriteria: PipelineStageCriteria[];
  metrics: PipelineMetrics;
  canManage: boolean;
}

export interface MovePipelineItemInput {
  projectId: string;
  toStage: PipelineStage;
  note: string;
}

export interface MovePipelineItemResult {
  projectId: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  movedAt: string;
  note: string;
}

export type ShowcaseHackStatus = "completed" | "in_progress";

export interface ShowcaseHackListItem {
  projectId: string;
  title: string;
  description: string;
  assetType: "prompt" | "skill" | "app";
  status: ShowcaseHackStatus;
  featured: boolean;
  authorName: string;
  visibility: "private" | "org" | "public";
  tags: string[];
  sourceEventId?: string;
  demoUrl?: string;
  pipelineStage: PipelineStage;
  reuseCount: number;
  teamMembersCount: number;
  linkedArtifactsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListShowcaseHacksInput {
  query?: string;
  assetTypes?: Array<"prompt" | "skill" | "app">;
  statuses?: ShowcaseHackStatus[];
  tags?: string[];
  sourceEventId?: string;
  featuredOnly?: boolean;
  sortBy?: "newest" | "featured" | "reuse_count";
  limit?: number;
}

export interface ListShowcaseHacksResult {
  items: ShowcaseHackListItem[];
  canManage: boolean;
}

export interface GetShowcaseHackDetailResult {
  hack: ShowcaseHackListItem & {
    teamMembers: string[];
    linkedArtifactIds: string[];
    context: string | null;
    limitations: string | null;
    riskNotes: string | null;
    sourceRepoUrl: string | null;
  };
  artifactsProduced: Array<{
    artifactId: string;
    title: string;
    artifactType: ArtifactType;
    visibility: ArtifactVisibility;
    reuseCount: number;
  }>;
  problemsSolved: Array<{
    problemId: string;
    title: string;
    status: ProblemStatus;
    updatedAt: string;
  }>;
}

export interface SetShowcaseFeaturedInput {
  projectId: string;
  featured: boolean;
}

export interface SetShowcaseFeaturedResult {
  projectId: string;
  featured: boolean;
  updatedAt: string;
}

export interface UpdatePipelineStageCriteriaInput {
  stage: PipelineStage;
  label?: string;
  description?: string;
  criteria: string[];
}

export interface UpdatePipelineStageCriteriaResult {
  stageCriteria: PipelineStageCriteria;
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  visibility?: "private" | "org" | "public";
  hackType?: "prompt" | "skill" | "app";
}

export interface CreateProjectResult {
  projectId: string;
  title: string;
}

export interface UpdateMentorProfileInput {
  mentorCapacity: number;
  happyToMentor: boolean;
  seekingMentor: boolean;
}

export interface UpdateMentorProfileResult {
  profileId: string;
  mentorCapacity: number;
}

export type LifecycleStatus =
  | "draft"
  | "registration"
  | "team_formation"
  | "hacking"
  | "voting"
  | "results"
  | "completed"
  | "archived";

export type SyncStatus = "not_started" | "in_progress" | "partial" | "failed" | "complete";
export type SyncErrorCategory = "none" | "permission" | "validation" | "transient" | "partial_failure" | "unknown";
export type InstanceRuntime = "hdc_native" | "hackday_template";
export type TemplateTarget = "hackday";
export type TemplateProvisionStatus = "provisioned" | "initialized" | "failed";
export type AppRuntimeOwner = "hd26forge" | "hackcentral";
export type AppRouteVersion = "v1" | "v2";
export type RuntimeRouteSource = string;

export interface RuntimeConfigDiagnostics {
  owner: AppRuntimeOwner;
  configValid: boolean;
  missingVars: string[];
  routeSource: RuntimeRouteSource;
}

export type SubmissionRequirement = "video_demo" | "working_prototype" | "documentation";
export type ThemePreference = "system" | "light" | "dark";
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
export type ScheduleEventSignal = "start" | "deadline" | "ceremony" | "presentation" | "judging" | "neutral";

export interface ScheduleCustomEvent {
  name: string;
  description?: string;
  timestamp: string;
  signal: ScheduleEventSignal;
}

export interface EventRules {
  allowCrossTeamMentoring: boolean;
  maxTeamSize: number;
  requireDemoLink: boolean;
  judgingModel: "panel" | "popular_vote" | "hybrid";
  minTeamSize?: number;
  submissionRequirements?: SubmissionRequirement[];
  categories?: string[];
  prizesText?: string;
}

export interface EventBranding {
  bannerMessage?: string;
  accentColor: string;
  bannerImageUrl?: string;
  themePreference?: ThemePreference;
}

export interface EventSchedule {
  timezone?: string;
  duration?: number; // 1, 2, or 3 days
  selectedEvents?: string[];
  customEvents?: ScheduleCustomEvent[];
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  teamFormationStartsAt?: string;
  teamFormationEndsAt?: string;
  openingCeremonyAt?: string;
  hackingStartsAt?: string;
  lunchBreakDay1At?: string;
  afternoonCheckinDay1At?: string;
  dinnerBreakDay1At?: string;
  eveningCheckinDay1At?: string;
  lunchBreakDay2At?: string;
  afternoonCheckinDay2At?: string;
  dinnerBreakDay2At?: string;
  eveningCheckinDay2At?: string;
  lunchBreakDay3At?: string;
  afternoonCheckinDay3At?: string;
  dinnerBreakDay3At?: string;
  submissionDeadlineAt?: string;
  presentationsAt?: string;
  judgingStartsAt?: string;
  votingStartsAt?: string;
  votingEndsAt?: string;
  resultsAnnounceAt?: string;
}

export interface EventRegistryItem {
  id: string;
  eventName: string;
  icon: string;
  tagline: string | null;
  runtimeType: InstanceRuntime;
  templateTarget: TemplateTarget | null;
  lifecycleStatus: LifecycleStatus;
  confluencePageId: string | null;
  isNavigable: boolean;
  confluenceParentPageId: string | null;
  schedule: EventSchedule;
  hackingStartsAt: string | null;
  submissionDeadlineAt: string | null;
  rules: EventRules;
  branding: EventBranding;
}

export interface CreationWizardInput {
  basicInfo: {
    eventName: string;
    eventIcon: string;
    eventTagline?: string;
    primaryAdminEmail?: string;
    coAdminEmails?: string[];
  };
  schedule: EventSchedule;
  rules?: {
    allowCrossTeamMentoring?: boolean;
    maxTeamSize?: number;
    requireDemoLink?: boolean;
    judgingModel?: "panel" | "popular_vote" | "hybrid";
    minTeamSize?: number;
    submissionRequirements?: SubmissionRequirement[];
    categories?: string[];
    prizesText?: string;
  };
  branding?: {
    bannerMessage?: string;
    accentColor?: string;
    bannerImageUrl?: string;
    themePreference?: ThemePreference;
  };
}

export interface EventSyncState {
  eventId: string;
  syncStatus: SyncStatus;
  lastError: string | null;
  lastAttemptAt: string | null;
  pushedCount: number;
  skippedCount: number;
  syncErrorCategory: SyncErrorCategory;
  retryable: boolean;
  retryGuidance: string | null;
}

export interface DerivedProfileSnapshot {
  userId: string;
  submittedHacks: number;
  syncedHacks: number;
  activeInstances: number;
  completedInstances: number;
  reputationScore: number;
  reputationTier: "bronze" | "silver" | "gold" | "platinum";
  calculatedAt: string;
  cacheTtlMs: number;
}

export interface HdcContextResponse {
  pageType: "parent" | "instance";
  pageId: string;
  event: EventRegistryItem | null;
  registry: EventRegistryItem[];
  syncState: EventSyncState | null;
  derivedProfile?: DerivedProfileSnapshot | null;
  /** Base URL of the HackCentral app for "Create in app" link. Set HACKDAY_CREATE_APP_URL in Forge env. */
  createAppUrl?: string | null;
  permissions: {
    canCreateInstances: boolean;
    isPrimaryAdmin: boolean;
    isCoAdmin: boolean;
  };
}

export interface CreateInstanceDraftInput extends CreationWizardInput {
  parentPageId: string;
  creationRequestId: string;
  wizardSchemaVersion?: 2;
  completedStep?: WizardStep;
  launchMode?: "draft" | "go_live";
  instanceRuntime?: InstanceRuntime;
  templateTarget?: TemplateTarget;
  childIntegration?: {
    importProblemIds?: string[];
    autoPublishToShowcaseDrafts?: boolean;
    templateMode?: "default" | "customized";
  };
}

export interface CreateInstanceDraftResult {
  eventId: string;
  childPageId: string;
  childPageUrl: string;
  /** Full-page runtime URL for this event page (HD26Forge v1 or HackCentral v2). */
  appViewUrl?: string | null;
  appViewRuntimeOwner?: AppRuntimeOwner;
  appViewRouteVersion?: AppRouteVersion;
  templateProvisionStatus: TemplateProvisionStatus | null;
}

export interface AppViewUrlResult {
  url: string | null;
  runtimeOwner: AppRuntimeOwner;
  routeVersion: AppRouteVersion;
  owner?: AppRuntimeOwner;
  configValid?: boolean;
  missingVars?: string[];
  routeSource?: RuntimeRouteSource;
}

export interface ActivateAppModeContextResult {
  success: boolean;
  pageId?: string | null;
  eventId?: string | null;
  reason?: string | null;
  runtimeSource?: string | null;
}

export interface SetActiveAppModeContextResult {
  success: boolean;
  pageId?: string | null;
  eventId?: string | null;
  reason?: string | null;
  runtimeSource?: string | null;
}

export interface EventLifecycleResult {
  lifecycleStatus: LifecycleStatus;
}

export interface DeleteDraftResult {
  deleted: true;
}

export interface SubmitHackInput {
  eventId: string;
  title: string;
  description?: string;
}

export interface SubmitHackResult {
  projectId: string;
}

export interface SyncResult {
  syncStatus: SyncStatus;
  pushedCount: number;
  skippedCount: number;
  lastError: string | null;
  syncErrorCategory: SyncErrorCategory;
  retryable: boolean;
  retryGuidance: string | null;
}

export type TeamPulseExportFormat = 'json' | 'csv';

export interface TrackTeamPulseExportInput {
  format: TeamPulseExportFormat;
  exportedAt: string;
  hasTeamPulseData: boolean;
  reuseRatePct: number;
  crossTeamAdoptionCount: number;
  crossTeamEdgeCount: number;
  timeToFirstHackMedianDays: number | null;
  timeToFirstHackSampleSize: number;
  timeToFirstHackTrendPointCount: number;
  problemConversionPct: number;
  solvedProblemCount: number;
  totalProblemCount: number;
  csvRowCount?: number;
}

export interface TrackTeamPulseExportResult {
  logged: true;
  metric: 'team_pulse_export';
  loggedAt: string;
}

export type Defs = {
  getBootstrapData: () => BootstrapData;
  createHack: (payload: CreateHackInput) => CreateHackResult;
  hdcCreateArtifact: (payload: CreateArtifactInput) => CreateArtifactResult;
  hdcListArtifacts: (payload: ListArtifactsInput) => ListArtifactsResult;
  hdcGetArtifact: (payload: { artifactId: string }) => GetArtifactResult;
  hdcMarkArtifactReuse: (payload: { artifactId: string }) => MarkArtifactReuseResult;
  hdcCreateProblem: (payload: CreateProblemInput) => CreateProblemResult;
  hdcListProblems: (payload: ListProblemsInput) => ListProblemsResult;
  hdcVoteProblem: (payload: { problemId: string }) => VoteProblemResult;
  hdcUpdateProblemStatus: (payload: UpdateProblemStatusInput) => UpdateProblemStatusResult;
  hdcFlagProblem: (payload: FlagProblemInput) => FlagProblemResult;
  hdcModerateProblem: (payload: ModerateProblemInput) => ModerateProblemResult;
  hdcGetProblemExchangeCapabilities: () => ProblemExchangeCapabilitiesResult;
  hdcListProblemImportCandidates: (payload: ListProblemImportCandidatesInput) => ListProblemImportCandidatesResult;
  hdcListPathways: (payload: ListPathwaysInput) => ListPathwaysResult;
  hdcGetPathway: (payload: { pathwayId: string }) => GetPathwayResult;
  hdcUpsertPathway: (payload: UpsertPathwayInput) => UpsertPathwayResult;
  hdcSetPathwayStepCompletion: (payload: SetPathwayStepCompletionInput) => SetPathwayStepCompletionResult;
  createProject: (payload: CreateProjectInput) => CreateProjectResult;
  updateMentorProfile: (payload: UpdateMentorProfileInput) => UpdateMentorProfileResult;
  hdcGetContext: (payload: { pageId: string }) => HdcContextResponse;
  hdcGetAppViewUrl: (payload: { pageId: string }) => AppViewUrlResult;
  hdcSetActiveAppModeContext: (payload: { pageId: string; eventId: string }) => SetActiveAppModeContextResult;
  hdcCreateInstanceDraft: (payload: CreateInstanceDraftInput) => CreateInstanceDraftResult;
  hdcDeleteDraftInstance: (payload: { eventId: string }) => DeleteDraftResult;
  hdcLaunchInstance: (payload: { eventId: string }) => EventLifecycleResult;
  hdcSubmitHack: (payload: SubmitHackInput) => SubmitHackResult;
  hdcGetRoiDashboard: (payload: GetRoiDashboardInput) => RoiDashboardSnapshot;
  hdcLogRoiTokenUsage: (payload: LogRoiTokenUsageInput) => LogRoiTokenUsageResult;
  hdcTrackTeamPulseExport: (payload: TrackTeamPulseExportInput) => TrackTeamPulseExportResult;
  hdcCompleteAndSync: (payload: { eventId: string }) => SyncResult;
  hdcRetrySync: (payload: { eventId: string }) => SyncResult;
};
