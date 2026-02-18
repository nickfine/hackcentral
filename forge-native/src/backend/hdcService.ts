import type {
  CreateInstanceDraftInput,
  CreateInstanceDraftResult,
  DeleteDraftResult,
  EventBranding,
  EventRegistryItem,
  EventLifecycleResult,
  EventRules,
  EventSchedule,
  EventSyncState,
  HdcContextResponse,
  LifecycleStatus,
  SubmissionRequirement,
  SubmitHackInput,
  SubmitHackResult,
  SyncErrorCategory,
  SyncResult,
  ThemePreference,
  ViewerContext,
} from '../shared/types';
import { createChildPageUnderParent, deletePage, getCurrentUserEmail } from './confluencePages';
import { SupabaseRepository } from './supabase/repositories';

function ensureAdaptavistEmail(email: string): void {
  if (!email.toLowerCase().endsWith('@adaptavist.com')) {
    throw new Error('Only @adaptavist.com users can create HackDay instances.');
  }
}

function fallbackEmailFromAccount(accountId: string): string {
  const safe = accountId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safe}@adaptavist.com`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeEmailList(emails: string[] | undefined): string[] {
  if (!emails || emails.length === 0) return [];

  const deduped = new Set<string>();
  for (const rawEmail of emails) {
    const email = normalizeEmail(rawEmail);
    if (email) {
      deduped.add(email);
    }
  }
  return [...deduped];
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEventSchedule(
  input: CreateInstanceDraftInput['schedule'] | EventSchedule | null | undefined,
  fallback?: { timezone?: string | null; hackingStartsAt?: string | null; submissionDeadlineAt?: string | null }
): EventSchedule {
  return {
    timezone: normalizeOptionalString(input?.timezone) || normalizeOptionalString(fallback?.timezone) || 'Europe/London',
    registrationOpensAt: normalizeOptionalString(input?.registrationOpensAt),
    registrationClosesAt: normalizeOptionalString(input?.registrationClosesAt),
    teamFormationStartsAt: normalizeOptionalString(input?.teamFormationStartsAt),
    teamFormationEndsAt: normalizeOptionalString(input?.teamFormationEndsAt),
    hackingStartsAt: normalizeOptionalString(input?.hackingStartsAt) || normalizeOptionalString(fallback?.hackingStartsAt),
    submissionDeadlineAt:
      normalizeOptionalString(input?.submissionDeadlineAt) || normalizeOptionalString(fallback?.submissionDeadlineAt),
    votingStartsAt: normalizeOptionalString(input?.votingStartsAt),
    votingEndsAt: normalizeOptionalString(input?.votingEndsAt),
    resultsAnnounceAt: normalizeOptionalString(input?.resultsAnnounceAt),
  };
}

function ensureDateOrder(start: string | undefined, end: string | undefined, message: string): void {
  if (start && end && start > end) {
    throw new Error(message);
  }
}

function validateSchedule(schedule: EventSchedule): void {
  ensureDateOrder(
    schedule.registrationOpensAt,
    schedule.registrationClosesAt,
    'Registration close must be after registration open.'
  );
  ensureDateOrder(
    schedule.teamFormationStartsAt,
    schedule.teamFormationEndsAt,
    'Team formation end must be after team formation start.'
  );
  ensureDateOrder(
    schedule.hackingStartsAt,
    schedule.submissionDeadlineAt,
    'Submission deadline must be after the hacking start time.'
  );
  ensureDateOrder(schedule.votingStartsAt, schedule.votingEndsAt, 'Voting end must be after voting start.');
}

function validateRulesInput(input: CreateInstanceDraftInput['rules'] | undefined): void {
  if (!input) return;
  const minTeamSizeRaw = Number(input.minTeamSize);
  const maxTeamSizeRaw = Number(input.maxTeamSize);

  if (Number.isFinite(minTeamSizeRaw) && minTeamSizeRaw < 1) {
    throw new Error('Minimum team size must be at least 1.');
  }
  if (Number.isFinite(maxTeamSizeRaw) && maxTeamSizeRaw < 1) {
    throw new Error('Maximum team size must be at least 1.');
  }
  if (Number.isFinite(minTeamSizeRaw) && Number.isFinite(maxTeamSizeRaw) && minTeamSizeRaw > maxTeamSizeRaw) {
    throw new Error('Minimum team size must be less than or equal to maximum team size.');
  }
}

function validateWizardMetadata(input: CreateInstanceDraftInput): void {
  if (typeof input.wizardSchemaVersion !== 'undefined' && input.wizardSchemaVersion !== 2) {
    throw new Error('Unsupported wizard schema version.');
  }
  if (typeof input.completedStep !== 'undefined' && (input.completedStep < 1 || input.completedStep > 5)) {
    throw new Error('Invalid wizard step value.');
  }
}

function normalizeEventRules(
  input: CreateInstanceDraftInput['rules'] | EventRules | null | undefined
): EventRules {
  const minTeamSizeRaw = Number(input?.minTeamSize);
  const maxTeamSizeRaw = Number(input?.maxTeamSize);
  const minTeamSize = Number.isFinite(minTeamSizeRaw) ? Math.min(20, Math.max(1, Math.floor(minTeamSizeRaw))) : null;
  const judgingModel =
    input?.judgingModel === 'panel' || input?.judgingModel === 'popular_vote' || input?.judgingModel === 'hybrid'
      ? input.judgingModel
      : 'hybrid';
  const maxTeamSizeBase = Number.isFinite(maxTeamSizeRaw) ? Math.min(20, Math.max(1, Math.floor(maxTeamSizeRaw))) : 6;
  const maxTeamSize = minTeamSize === null ? maxTeamSizeBase : Math.max(minTeamSize, maxTeamSizeBase);

  const submissionRequirements = input?.submissionRequirements;
  const normalizedRequirements = Array.isArray(submissionRequirements)
    ? submissionRequirements.filter(
        (item): item is SubmissionRequirement =>
          item === 'video_demo' || item === 'working_prototype' || item === 'documentation'
      )
    : [];
  const categories = input?.categories;
  const normalizedCategories = Array.isArray(categories)
    ? [...new Set(categories.map((item) => item.trim()).filter((item) => item.length > 0))]
    : [];
  const prizesText = typeof input?.prizesText === 'string' && input.prizesText.trim() ? input.prizesText.trim() : null;

  const rules: EventRules = {
    allowCrossTeamMentoring: input?.allowCrossTeamMentoring ?? true,
    maxTeamSize,
    requireDemoLink: input?.requireDemoLink ?? false,
    judgingModel,
  };
  if (minTeamSize !== null) {
    rules.minTeamSize = minTeamSize;
  }
  if (normalizedRequirements.length > 0) {
    rules.submissionRequirements = normalizedRequirements;
  }
  if (normalizedCategories.length > 0) {
    rules.categories = normalizedCategories;
  }
  if (prizesText) {
    rules.prizesText = prizesText;
  }

  return rules;
}

function normalizeEventBranding(
  input: CreateInstanceDraftInput['branding'] | EventBranding | null | undefined
): EventBranding {
  const themePreference: ThemePreference | null =
    input?.themePreference === 'system' || input?.themePreference === 'light' || input?.themePreference === 'dark'
      ? input.themePreference
      : null;
  const branding: EventBranding = {
    accentColor: input?.accentColor?.trim() || '#0f766e',
  };
  if (input?.bannerMessage?.trim()) {
    branding.bannerMessage = input.bannerMessage.trim();
  }
  if (input?.bannerImageUrl?.trim()) {
    branding.bannerImageUrl = input.bannerImageUrl.trim();
  }
  if (themePreference) {
    branding.themePreference = themePreference;
  }
  return branding;
}

const LIFECYCLE_NEXT_STATUS: Partial<Record<LifecycleStatus, LifecycleStatus>> = {
  draft: 'registration',
  registration: 'team_formation',
  team_formation: 'hacking',
  hacking: 'voting',
  voting: 'results',
  results: 'completed',
};

function getSyncGuidance(syncStatus: SyncResult['syncStatus'], lastError: string | null): {
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
  if (message.includes('only event admins')) {
    return {
      syncErrorCategory: 'permission',
      retryable: false,
      retryGuidance: 'You must be a primary admin or co-admin for this instance to run sync.',
    };
  }
  if (message.includes('at least one submitted hack')) {
    return {
      syncErrorCategory: 'validation',
      retryable: false,
      retryGuidance: 'Submit at least one hack in this instance before running Complete + Sync.',
    };
  }
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

function withSyncGuidance(state: {
  syncStatus: SyncResult['syncStatus'];
  lastError: string | null;
  pushedCount: number;
  skippedCount: number;
  eventId: string;
  lastAttemptAt: string | null;
}): EventSyncState {
  const guidance = getSyncGuidance(state.syncStatus, state.lastError);
  return {
    ...state,
    ...guidance,
  };
}

function logContextRegistryNavigability(pageType: 'parent' | 'instance', pageId: string, registry: EventRegistryItem[]): void {
  const total = registry.length;
  const nonNavigable = registry.filter((item) => !item.isNavigable).length;
  const withMissingPageId = registry.filter((item) => !item.confluencePageId).length;
  console.info(
    '[hdc-switcher-telemetry]',
    JSON.stringify({ source: 'hdcGetContext', pageType, pageId, total, nonNavigable, withMissingPageId })
  );
}

export class HdcService {
  private readonly repository: SupabaseRepository;

  constructor(repository = new SupabaseRepository()) {
    this.repository = repository;
  }

  async getContext(viewer: ViewerContext, pageId: string): Promise<HdcContextResponse> {
    const [event, viewerUser] = await Promise.all([
      this.repository.getEventByConfluencePageId(pageId),
      this.repository.ensureUser(viewer),
    ]);

    if (!event) {
      const registry = await this.repository.listEventsByParentPageId(pageId);
      logContextRegistryNavigability('parent', pageId, registry);
      return {
        pageType: 'parent',
        pageId,
        event: null,
        registry,
        syncState: null,
        permissions: {
          canCreateInstances: true,
          isPrimaryAdmin: false,
          isCoAdmin: false,
        },
      };
    }

    const [registry, rawSyncState, admins] = await Promise.all([
      this.repository.listEventsByParentPageId(event.confluence_parent_page_id ?? pageId),
      this.repository.getSyncState(event.id),
      this.repository.listEventAdmins(event.id),
    ]);
    const syncState = rawSyncState ? withSyncGuidance(rawSyncState) : null;

    const isPrimaryAdmin = admins.some((admin) => admin.user_id === viewerUser.id && admin.role === 'primary');
    const isCoAdmin = admins.some((admin) => admin.user_id === viewerUser.id && admin.role === 'co_admin');
    const schedule = normalizeEventSchedule(event.event_schedule, {
      timezone: event.timezone,
      hackingStartsAt: event.hacking_starts_at,
      submissionDeadlineAt: event.submission_deadline_at,
    });
    const confluencePageId =
      typeof event.confluence_page_id === 'string' && event.confluence_page_id.trim()
        ? event.confluence_page_id.trim()
        : null;
    logContextRegistryNavigability('instance', pageId, registry);

    return {
      pageType: 'instance',
      pageId,
      event: {
        id: event.id,
        eventName: event.name,
        icon: event.icon ?? '🚀',
        tagline: event.tagline,
        lifecycleStatus: event.lifecycle_status,
        confluencePageId,
        isNavigable: Boolean(confluencePageId),
        confluenceParentPageId: event.confluence_parent_page_id,
        schedule,
        hackingStartsAt: schedule.hackingStartsAt ?? event.hacking_starts_at,
        submissionDeadlineAt: schedule.submissionDeadlineAt ?? event.submission_deadline_at,
        rules: normalizeEventRules(event.event_rules),
        branding: normalizeEventBranding(event.event_branding),
      },
      registry,
      syncState,
      permissions: {
        canCreateInstances: true,
        isPrimaryAdmin,
        isCoAdmin,
      },
    };
  }

  async createInstanceDraft(
    viewer: ViewerContext,
    input: CreateInstanceDraftInput
  ): Promise<CreateInstanceDraftResult> {
    if (!input.basicInfo.eventName.trim()) {
      throw new Error('Event name is required.');
    }

    validateWizardMetadata(input);
    validateRulesInput(input.rules);
    const launchMode = input.launchMode === 'go_live' ? 'go_live' : 'draft';
    const eventSchedule = normalizeEventSchedule(input.schedule);
    validateSchedule(eventSchedule);

    if (launchMode === 'go_live' && (!eventSchedule.hackingStartsAt || !eventSchedule.submissionDeadlineAt)) {
      throw new Error('Go live requires hacking start and submission deadline.');
    }

    const existingByRequest = await this.repository.getEventByCreationRequestId(input.creationRequestId);
    if (existingByRequest) {
      return {
        eventId: existingByRequest.id,
        childPageId: existingByRequest.confluence_page_id,
        childPageUrl: existingByRequest.confluence_page_url ?? '',
      };
    }

    const viewerEmail =
      (await getCurrentUserEmail(viewer.accountId)) ||
      (await this.repository.getUserByAccountId(viewer.accountId))?.email ||
      fallbackEmailFromAccount(viewer.accountId);

    const normalizedViewerEmail = normalizeEmail(viewerEmail);
    ensureAdaptavistEmail(normalizedViewerEmail);

    const primaryAdminEmail = normalizeEmail(input.basicInfo.primaryAdminEmail || normalizedViewerEmail);
    ensureAdaptavistEmail(primaryAdminEmail);

    const normalizedCoAdminEmails = normalizeEmailList(input.basicInfo.coAdminEmails).filter(
      (email) => email !== primaryAdminEmail
    );
    for (const email of normalizedCoAdminEmails) {
      ensureAdaptavistEmail(email);
    }

    const conflicts = await this.repository.getEventNameConflicts(
      input.basicInfo.eventName,
      input.parentPageId
    );
    if (conflicts.length > 0) {
      throw new Error('Event name must be unique under this HackDay Central parent page.');
    }

    const childPage = await createChildPageUnderParent({
      parentPageId: input.parentPageId,
      title: input.basicInfo.eventName,
      tagline: input.basicInfo.eventTagline,
    });

    try {
      const creator = await this.repository.ensureUser(viewer, normalizedViewerEmail);
      const primaryAdmin =
        primaryAdminEmail === normalizedViewerEmail
          ? creator
          : await this.repository.ensureUserByEmail(primaryAdminEmail);

      const coAdminUserIds = new Set<string>();
      for (const email of normalizedCoAdminEmails) {
        if (email === normalizedViewerEmail) {
          coAdminUserIds.add(creator.id);
          continue;
        }
        if (email === primaryAdminEmail) {
          continue;
        }
        const coAdminUser = await this.repository.ensureUserByEmail(email);
        coAdminUserIds.add(coAdminUser.id);
      }

      if (primaryAdmin.id !== creator.id) {
        coAdminUserIds.add(creator.id);
      }

      const eventRules = normalizeEventRules(input.rules);
      const eventBranding = normalizeEventBranding(input.branding);

      const event = await this.repository.createEvent({
        eventName: input.basicInfo.eventName,
        icon: input.basicInfo.eventIcon || '🚀',
        tagline: input.basicInfo.eventTagline,
        timezone: eventSchedule.timezone || 'Europe/London',
        lifecycleStatus: launchMode === 'go_live' ? 'registration' : 'draft',
        confluencePageId: childPage.pageId,
        confluencePageUrl: childPage.pageUrl,
        confluenceParentPageId: input.parentPageId,
        hackingStartsAt: eventSchedule.hackingStartsAt,
        submissionDeadlineAt: eventSchedule.submissionDeadlineAt,
        eventSchedule,
        creationRequestId: input.creationRequestId,
        createdByUserId: creator.id,
        eventRules,
        eventBranding,
      });

      const coAdminIds = [...coAdminUserIds].filter((id) => id !== primaryAdmin.id);

      await this.repository.addEventAdmin(event.id, primaryAdmin.id, 'primary');
      for (const userId of coAdminIds) {
        await this.repository.addEventAdmin(event.id, userId, 'co_admin');
      }

      await Promise.all([
        this.repository.upsertSyncState(event.id, {
          syncStatus: 'not_started',
          pushedCount: 0,
          skippedCount: 0,
          lastAttemptAt: new Date().toISOString(),
          lastError: null,
        }),
        this.repository.logAudit({
          eventId: event.id,
          actorUserId: creator.id,
          action: 'event_created',
          newValue: {
            eventName: event.name,
            confluencePageId: event.confluence_page_id,
            primaryAdminEmail,
            coAdminEmails: normalizedCoAdminEmails,
            launchMode,
            completedStep: input.completedStep,
            schedule: eventSchedule,
            rules: eventRules,
            branding: eventBranding,
          },
        }),
      ]);

      return {
        eventId: event.id,
        childPageId: childPage.pageId,
        childPageUrl: childPage.pageUrl,
      };
    } catch (error) {
      await deletePage(childPage.pageId);
      throw error;
    }
  }

  async launchInstance(viewer: ViewerContext, eventId: string): Promise<EventLifecycleResult> {
    const user = await this.repository.ensureUser(viewer);
    const event = await this.repository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found for lifecycle update.');
    }
    const admins = await this.repository.listEventAdmins(eventId);

    const canAdmin = admins.some((admin) => admin.user_id === user.id);
    if (!canAdmin) {
      throw new Error('Only event admins can launch an instance.');
    }

    const currentStatus = event.lifecycle_status;
    const nextStatus = LIFECYCLE_NEXT_STATUS[currentStatus];
    if (!nextStatus) {
      throw new Error(
        currentStatus === 'archived'
          ? 'Archived instances cannot be transitioned.'
          : 'Instance lifecycle cannot be advanced further.'
      );
    }

    if (currentStatus === 'results' && nextStatus === 'completed') {
      const syncState = await this.repository.getSyncState(eventId);
      if (!syncState || syncState.syncStatus !== 'complete') {
        throw new Error('Cannot move to completed until sync status is complete.');
      }
    }

    await this.repository.updateEventLifecycle(eventId, nextStatus);
    await this.repository.logAudit({
      eventId,
      actorUserId: user.id,
      action: 'status_changed',
      previousValue: { lifecycle_status: currentStatus },
      newValue: { lifecycle_status: nextStatus },
    });

    return { lifecycleStatus: nextStatus };
  }

  async deleteDraftInstance(viewer: ViewerContext, eventId: string): Promise<DeleteDraftResult> {
    const user = await this.repository.ensureUser(viewer);
    const event = await this.repository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found for draft deletion.');
    }

    const admins = await this.repository.listEventAdmins(eventId);
    const isPrimaryAdmin = admins.some((admin) => admin.user_id === user.id && admin.role === 'primary');
    if (!isPrimaryAdmin) {
      throw new Error('Only the primary admin can delete a draft instance.');
    }
    if (event.lifecycle_status !== 'draft') {
      throw new Error('Only draft instances can be deleted.');
    }

    const eventProjects = await this.repository.listProjectsByEventId(eventId);
    if (eventProjects.length > 0) {
      throw new Error('Draft cannot be deleted after hacks or projects have been created.');
    }

    await this.repository.logAudit({
      eventId,
      actorUserId: user.id,
      action: 'draft_deleted',
      previousValue: {
        eventName: event.name,
        confluencePageId: event.confluence_page_id,
      },
    });

    if (event.confluence_page_id) {
      await deletePage(event.confluence_page_id);
    }
    await this.repository.deleteEventCascade(eventId);

    return { deleted: true };
  }

  async submitHack(viewer: ViewerContext, payload: SubmitHackInput): Promise<SubmitHackResult> {
    const event = await this.repository.getEventById(payload.eventId);
    if (!event) {
      throw new Error('Event not found for hack submission.');
    }

    if (!payload.title.trim()) {
      throw new Error('Hack title is required.');
    }

    const result = await this.repository.submitHack(viewer, payload);
    const user = await this.repository.ensureUser(viewer);

    await this.repository.logAudit({
      eventId: payload.eventId,
      actorUserId: user.id,
      action: 'hack_submitted',
      newValue: {
        projectId: result.projectId,
        title: payload.title,
      },
    });

    return result;
  }

  async completeAndSync(viewer: ViewerContext, eventId: string): Promise<SyncResult> {
    const user = await this.repository.ensureUser(viewer);
    const admins = await this.repository.listEventAdmins(eventId);
    if (!admins.some((admin) => admin.user_id === user.id)) {
      throw new Error('Only event admins can complete and sync this instance.');
    }

    const hacks = await this.repository.listEventHackProjects(eventId);
    if (hacks.length === 0) {
      throw new Error('Cannot complete sync: at least one submitted hack is required.');
    }

    const existingSyncState = await this.repository.getSyncState(eventId);
    const fallbackPushedCount = existingSyncState?.pushedCount ?? 0;
    const fallbackSkippedCount = existingSyncState?.skippedCount ?? 0;

    await this.repository.upsertSyncState(eventId, {
      syncStatus: 'in_progress',
      pushedCount: fallbackPushedCount,
      skippedCount: fallbackSkippedCount,
      lastAttemptAt: new Date().toISOString(),
      lastError: null,
    });

    try {
      const syncResult = await this.repository.completeAndSync(eventId);
      const resultWithGuidance = {
        ...syncResult,
        ...getSyncGuidance(syncResult.syncStatus, syncResult.lastError),
      };
      const auditAction =
        syncResult.syncStatus === 'partial'
          ? 'sync_partial'
          : syncResult.syncStatus === 'failed'
            ? 'sync_failed'
            : 'sync_complete';
      await this.repository.logAudit({
        eventId,
        actorUserId: user.id,
        action: auditAction,
        newValue: resultWithGuidance,
      });
      return resultWithGuidance;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync failure.';
      const guidance = getSyncGuidance('failed', message);
      await this.repository.upsertSyncState(eventId, {
        syncStatus: 'failed',
        pushedCount: fallbackPushedCount,
        skippedCount: fallbackSkippedCount,
        lastAttemptAt: new Date().toISOString(),
        lastError: message,
      });
      throw new Error(`${message} ${guidance.retryGuidance ?? ''}`.trim());
    }
  }

  async retrySync(viewer: ViewerContext, eventId: string): Promise<SyncResult> {
    const user = await this.repository.ensureUser(viewer);
    const admins = await this.repository.listEventAdmins(eventId);
    if (!admins.some((admin) => admin.user_id === user.id)) {
      throw new Error('Only event admins can retry sync.');
    }

    const syncResult = await this.repository.completeAndSync(eventId);
    const resultWithGuidance = {
      ...syncResult,
      ...getSyncGuidance(syncResult.syncStatus, syncResult.lastError),
    };
    await this.repository.logAudit({
      eventId,
      actorUserId: user.id,
      action: 'sync_retry',
      newValue: resultWithGuidance,
    });

    return resultWithGuidance;
  }
}
