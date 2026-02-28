/** Default timezone for events when none is supplied by the event record. */
export const DEFAULT_TIMEZONE = 'Europe/London';

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
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
export type InstanceRuntime = 'hdc_native' | 'hackday_template';
export type TemplateTarget = 'hackday';
export type TemplateProvisionStatus = 'provisioned' | 'initialized' | 'failed';
export type AppRuntimeOwner = 'hd26forge' | 'hackcentral';
export type AppRouteVersion = 'v1' | 'v2';
export type RuntimeRouteSource = string;

// Event duration in days
export type EventDuration = 1 | 2 | 3;

// Predefined schedule event types
export type ScheduleEventType =
  | 'registrationOpens'
  | 'registrationCloses'
  | 'teamFormationStarts'
  | 'teamFormationEnds'
  | 'openingCeremony'
  | 'hackingStarts'
  | 'lunchBreak'
  | 'afternoonCheckin'
  | 'dinnerBreak'
  | 'eveningCheckin'
  | 'submissionDeadline'
  | 'presentations'
  | 'votingStarts'
  | 'votingEnds'
  | 'judgingStarts'
  | 'resultsAnnounce';

// Schedule event selection state
export interface ScheduleEventSelection {
  [key: string]: boolean;
}

// Default event metadata
export interface ScheduleEventDefinition {
  id: ScheduleEventType;
  label: string;
  description: string;
  category: 'pre-event' | 'core' | 'activities' | 'closing';
  phase: string;
  icon: string;
  defaultIncluded: boolean;
}

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
  duration?: EventDuration;
  selectedEvents?: ScheduleEventType[];

  // Existing timestamp fields (now optional based on selection)
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
  votingStartsAt?: string;
  votingEndsAt?: string;
  judgingStartsAt?: string;
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
  /** Base URL of the HackCentral web app for "Create in app" link. Set HACKDAY_CREATE_APP_URL in Forge env. */
  createAppUrl?: string | null;
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
  hdcGetAppViewUrl: (payload: { pageId: string }) => AppViewUrlResult;
  hdcActivateAppModeContext: (payload: { pageId: string }) => ActivateAppModeContextResult;
  hdcSetActiveAppModeContext: (payload: { pageId: string; eventId: string }) => SetActiveAppModeContextResult;
  hdcCreateInstanceDraft: (payload: CreateInstanceDraftInput) => CreateInstanceDraftResult;
  hdcDeleteDraftInstance: (payload: { eventId: string }) => DeleteDraftResult;
  hdcLaunchInstance: (payload: { eventId: string }) => EventLifecycleResult;
  hdcSubmitHack: (payload: { eventId: string; title: string; description?: string }) => SubmitHackResult;
  hdcCompleteAndSync: (payload: { eventId: string }) => SyncResult;
  hdcRetrySync: (payload: { eventId: string }) => SyncResult;
};
