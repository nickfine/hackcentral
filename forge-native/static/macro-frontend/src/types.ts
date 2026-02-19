export type LifecycleStatus =
  | 'draft'
  | 'registration'
  | 'team_formation'
  | 'hacking'
  | 'voting'
  | 'results'
  | 'completed'
  | 'archived';

export type SyncStatus = 'not_started' | 'in_progress' | 'partial' | 'failed' | 'complete';
export type SyncErrorCategory = 'none' | 'permission' | 'validation' | 'transient' | 'partial_failure' | 'unknown';
export type SubmissionRequirement = 'video_demo' | 'working_prototype' | 'documentation';
export type ThemePreference = 'system' | 'light' | 'dark';
export type WizardStep = 1 | 2 | 3 | 4 | 5;
export type InstanceRuntime = 'hdc_native' | 'hackday_template';
export type TemplateTarget = 'hackday';
export type TemplateProvisionStatus = 'provisioned' | 'initialized' | 'failed';

export interface EventRules {
  allowCrossTeamMentoring: boolean;
  maxTeamSize: number;
  requireDemoLink: boolean;
  judgingModel: 'panel' | 'popular_vote' | 'hybrid';
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
  reputationTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  calculatedAt: string;
  cacheTtlMs: number;
}

export interface HdcContextResponse {
  pageType: 'parent' | 'instance';
  pageId: string;
  event: EventRegistryItem | null;
  registry: EventRegistryItem[];
  syncState: EventSyncState | null;
  derivedProfile?: DerivedProfileSnapshot | null;
  permissions: {
    canCreateInstances: boolean;
    isPrimaryAdmin: boolean;
    isCoAdmin: boolean;
  };
}

export interface CreateInstanceDraftInput {
  parentPageId: string;
  creationRequestId: string;
  wizardSchemaVersion?: 2;
  completedStep?: WizardStep;
  launchMode?: 'draft' | 'go_live';
  instanceRuntime?: InstanceRuntime;
  templateTarget?: TemplateTarget;
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
    judgingModel?: 'panel' | 'popular_vote' | 'hybrid';
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
  hdcGetContext: (payload: { pageId: string }) => HdcContextResponse;
  hdcCreateInstanceDraft: (payload: CreateInstanceDraftInput) => CreateInstanceDraftResult;
  hdcDeleteDraftInstance: (payload: { eventId: string }) => DeleteDraftResult;
  hdcLaunchInstance: (payload: { eventId: string }) => EventLifecycleResult;
  hdcSubmitHack: (payload: { eventId: string; title: string; description?: string }) => SubmitHackResult;
  hdcCompleteAndSync: (payload: { eventId: string }) => SyncResult;
  hdcRetrySync: (payload: { eventId: string }) => SyncResult;
};
