/** Allowed email domain for admin operations — single source of truth for backend. */
export const ALLOWED_EMAIL_DOMAIN = '@adaptavist.com';

/** Default timezone for events when none is supplied by the event record. */
export const DEFAULT_TIMEZONE = 'Europe/London';

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
}

export interface CreateHackResult {
  assetId: string;
  title: string;
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

export type SubmissionRequirement = "video_demo" | "working_prototype" | "documentation";
export type ThemePreference = "system" | "light" | "dark";
export type WizardStep = 1 | 2 | 3 | 4 | 5;

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
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  teamFormationStartsAt?: string;
  teamFormationEndsAt?: string;
  hackingStartsAt?: string;
  submissionDeadlineAt?: string;
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
}

export interface CreateInstanceDraftResult {
  eventId: string;
  childPageId: string;
  childPageUrl: string;
  templateProvisionStatus: TemplateProvisionStatus | null;
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

export type Defs = {
  getBootstrapData: () => BootstrapData;
  createHack: (payload: CreateHackInput) => CreateHackResult;
  createProject: (payload: CreateProjectInput) => CreateProjectResult;
  updateMentorProfile: (payload: UpdateMentorProfileInput) => UpdateMentorProfileResult;
  hdcGetContext: (payload: { pageId: string }) => HdcContextResponse;
  hdcCreateInstanceDraft: (payload: CreateInstanceDraftInput) => CreateInstanceDraftResult;
  hdcDeleteDraftInstance: (payload: { eventId: string }) => DeleteDraftResult;
  hdcLaunchInstance: (payload: { eventId: string }) => EventLifecycleResult;
  hdcSubmitHack: (payload: SubmitHackInput) => SubmitHackResult;
  hdcCompleteAndSync: (payload: { eventId: string }) => SyncResult;
  hdcRetrySync: (payload: { eventId: string }) => SyncResult;
};
