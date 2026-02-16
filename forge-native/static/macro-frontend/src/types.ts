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

export interface EventRegistryItem {
  id: string;
  eventName: string;
  icon: string;
  tagline: string | null;
  lifecycleStatus: LifecycleStatus;
  confluencePageId: string;
  confluenceParentPageId: string | null;
  hackingStartsAt: string | null;
  submissionDeadlineAt: string | null;
}

export interface EventSyncState {
  eventId: string;
  syncStatus: SyncStatus;
  lastError: string | null;
  lastAttemptAt: string | null;
  pushedCount: number;
  skippedCount: number;
}

export interface HdcContextResponse {
  pageType: 'parent' | 'instance';
  pageId: string;
  event: EventRegistryItem | null;
  registry: EventRegistryItem[];
  syncState: EventSyncState | null;
  permissions: {
    canCreateInstances: boolean;
    isPrimaryAdmin: boolean;
    isCoAdmin: boolean;
  };
}

export interface CreateInstanceDraftInput {
  parentPageId: string;
  creationRequestId: string;
  basicInfo: {
    eventName: string;
    eventIcon: string;
    eventTagline?: string;
    primaryAdminEmail?: string;
    coAdminEmails?: string[];
  };
  schedule: {
    timezone?: string;
    hackingStartsAt?: string;
    submissionDeadlineAt?: string;
  };
  rules?: {
    allowCrossTeamMentoring?: boolean;
    maxTeamSize?: number;
    requireDemoLink?: boolean;
    judgingModel?: 'panel' | 'popular_vote' | 'hybrid';
  };
  branding?: {
    bannerMessage?: string;
    accentColor?: string;
    bannerImageUrl?: string;
  };
}

export interface CreateInstanceDraftResult {
  eventId: string;
  childPageId: string;
  childPageUrl: string;
}

export interface EventLifecycleResult {
  lifecycleStatus: LifecycleStatus;
}

export interface SubmitHackResult {
  projectId: string;
}

export interface SyncResult {
  syncStatus: SyncStatus;
  pushedCount: number;
  skippedCount: number;
}

export type Defs = {
  hdcGetContext: (payload: { pageId: string }) => HdcContextResponse;
  hdcCreateInstanceDraft: (payload: CreateInstanceDraftInput) => CreateInstanceDraftResult;
  hdcLaunchInstance: (payload: { eventId: string }) => EventLifecycleResult;
  hdcSubmitHack: (payload: { eventId: string; title: string; description?: string }) => SubmitHackResult;
  hdcCompleteAndSync: (payload: { eventId: string }) => SyncResult;
  hdcRetrySync: (payload: { eventId: string }) => SyncResult;
};
