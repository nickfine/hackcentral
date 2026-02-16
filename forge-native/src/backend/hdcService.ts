import type {
  CreateInstanceDraftInput,
  CreateInstanceDraftResult,
  EventLifecycleResult,
  HdcContextResponse,
  SubmitHackInput,
  SubmitHackResult,
  SyncResult,
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

    const [registry, syncState, admins] = await Promise.all([
      this.repository.listEventsByParentPageId(event.confluence_parent_page_id ?? pageId),
      this.repository.getSyncState(event.id),
      this.repository.listEventAdmins(event.id),
    ]);

    const isPrimaryAdmin = admins.some((admin) => admin.user_id === viewerUser.id && admin.role === 'primary');
    const isCoAdmin = admins.some((admin) => admin.user_id === viewerUser.id && admin.role === 'co_admin');

    return {
      pageType: 'instance',
      pageId,
      event: {
        id: event.id,
        eventName: event.name,
        icon: event.icon ?? '🚀',
        tagline: event.tagline,
        lifecycleStatus: event.lifecycle_status,
        confluencePageId: event.confluence_page_id,
        confluenceParentPageId: event.confluence_parent_page_id,
        hackingStartsAt: event.hacking_starts_at,
        submissionDeadlineAt: event.submission_deadline_at,
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

      const event = await this.repository.createEvent({
        eventName: input.basicInfo.eventName,
        icon: input.basicInfo.eventIcon || '🚀',
        tagline: input.basicInfo.eventTagline,
        timezone: input.schedule.timezone || 'Europe/London',
        lifecycleStatus: 'draft',
        confluencePageId: childPage.pageId,
        confluencePageUrl: childPage.pageUrl,
        confluenceParentPageId: input.parentPageId,
        hackingStartsAt: input.schedule.hackingStartsAt,
        submissionDeadlineAt: input.schedule.submissionDeadlineAt,
        creationRequestId: input.creationRequestId,
        createdByUserId: creator.id,
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
    const admins = await this.repository.listEventAdmins(eventId);

    const canAdmin = admins.some((admin) => admin.user_id === user.id);
    if (!canAdmin) {
      throw new Error('Only event admins can launch an instance.');
    }

    await this.repository.updateEventLifecycle(eventId, 'hacking');
    await this.repository.logAudit({
      eventId,
      actorUserId: user.id,
      action: 'status_changed',
      newValue: { lifecycle_status: 'hacking' },
    });

    return { lifecycleStatus: 'hacking' };
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
      const result = await this.repository.completeAndSync(eventId);
      const action =
        result.syncStatus === 'complete'
          ? 'sync_complete'
          : result.syncStatus === 'partial'
            ? 'sync_partial'
            : 'sync_failed';
      await this.repository.logAudit({
        eventId,
        actorUserId: user.id,
        action,
        newValue: result,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync failure';
      await this.repository.upsertSyncState(eventId, {
        syncStatus: 'failed',
        pushedCount: fallbackPushedCount,
        skippedCount: fallbackSkippedCount,
        lastAttemptAt: new Date().toISOString(),
        lastError: message,
      });
      throw error;
    }
  }

  async retrySync(viewer: ViewerContext, eventId: string): Promise<SyncResult> {
    return this.completeAndSync(viewer, eventId);
  }
}
