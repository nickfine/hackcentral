import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateInstanceDraftInput, ViewerContext } from '../forge-native/src/shared/types';
import type { HdcService } from '../forge-native/src/backend/hdcService';

const createChildPageUnderParentMock = vi.fn();
const deletePageMock = vi.fn();
const getCurrentUserEmailMock = vi.fn();

vi.mock('../forge-native/src/backend/confluencePages', () => ({
  createChildPageUnderParent: createChildPageUnderParentMock,
  deletePage: deletePageMock,
  getCurrentUserEmail: getCurrentUserEmailMock,
}));

type RepoMock = {
  ensureUser: ReturnType<typeof vi.fn>;
  getEventByCreationRequestId: ReturnType<typeof vi.fn>;
  getUserByAccountId: ReturnType<typeof vi.fn>;
  getEventNameConflicts: ReturnType<typeof vi.fn>;
  getEventByConfluencePageId: ReturnType<typeof vi.fn>;
  getEventById: ReturnType<typeof vi.fn>;
  listEventsByParentPageId: ReturnType<typeof vi.fn>;
  ensureUserByEmail: ReturnType<typeof vi.fn>;
  createEvent: ReturnType<typeof vi.fn>;
  addEventAdmin: ReturnType<typeof vi.fn>;
  upsertSyncState: ReturnType<typeof vi.fn>;
  logAudit: ReturnType<typeof vi.fn>;
  updateEventLifecycle: ReturnType<typeof vi.fn>;
  listEventAdmins: ReturnType<typeof vi.fn>;
  listEventHackProjects: ReturnType<typeof vi.fn>;
  listProjectsByEventId: ReturnType<typeof vi.fn>;
  deleteEventCascade: ReturnType<typeof vi.fn>;
  getSyncState: ReturnType<typeof vi.fn>;
  completeAndSync: ReturnType<typeof vi.fn>;
};

function createRepoMock(): RepoMock {
  return {
    ensureUser: vi.fn(),
    getEventByCreationRequestId: vi.fn(),
    getUserByAccountId: vi.fn(),
    getEventNameConflicts: vi.fn(),
    getEventByConfluencePageId: vi.fn(),
    getEventById: vi.fn(),
    listEventsByParentPageId: vi.fn(),
    ensureUserByEmail: vi.fn(),
    createEvent: vi.fn(),
    addEventAdmin: vi.fn(),
    upsertSyncState: vi.fn(),
    logAudit: vi.fn(),
    updateEventLifecycle: vi.fn(),
    listEventAdmins: vi.fn(),
    listEventHackProjects: vi.fn(),
    listProjectsByEventId: vi.fn(),
    deleteEventCascade: vi.fn(),
    getSyncState: vi.fn(),
    completeAndSync: vi.fn(),
  };
}

const viewer: ViewerContext = {
  accountId: 'acc-1',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'UTC',
};

const baseCreateInput: CreateInstanceDraftInput = {
  parentPageId: 'parent-page-1',
  creationRequestId: 'req-123',
  basicInfo: {
    eventName: 'HackDay Spring 2026',
    eventIcon: '🚀',
    primaryAdminEmail: 'owner@adaptavist.com',
  },
  schedule: {
    timezone: 'Europe/London',
  },
};

describe('HdcService hardening behavior', () => {
  let ServiceClass: typeof HdcService;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    ({ HdcService: ServiceClass } = await import('../forge-native/src/backend/hdcService'));
  });

  it('returns existing draft for same creationRequestId without creating a new child page', async () => {
    const repo = createRepoMock();
    repo.getEventByCreationRequestId.mockResolvedValue({
      id: 'event-1',
      confluence_page_id: 'child-100',
      confluence_page_url: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-100',
    });

    const service = new ServiceClass(repo as never);
    const result = await service.createInstanceDraft(viewer, baseCreateInput);

    expect(result).toEqual({
      eventId: 'event-1',
      childPageId: 'child-100',
      childPageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-100',
    });
    expect(createChildPageUnderParentMock).not.toHaveBeenCalled();
    expect(repo.getEventNameConflicts).not.toHaveBeenCalled();
  });

  it('persists normalized rules and branding from wizard payload', async () => {
    const repo = createRepoMock();
    repo.getEventByCreationRequestId.mockResolvedValue(null);
    repo.getEventNameConflicts.mockResolvedValue([]);
    repo.ensureUser.mockResolvedValue({ id: 'user-creator' });
    repo.createEvent.mockResolvedValue({
      id: 'event-created',
      name: 'HackDay Spring 2026',
      confluence_page_id: 'child-901',
      confluence_page_url: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-901',
    });
    repo.addEventAdmin.mockResolvedValue(undefined);
    repo.upsertSyncState.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);
    getCurrentUserEmailMock.mockResolvedValue('owner@adaptavist.com');
    createChildPageUnderParentMock.mockResolvedValue({
      pageId: 'child-901',
      pageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-901',
    });

    const service = new ServiceClass(repo as never);
    const result = await service.createInstanceDraft(viewer, {
      ...baseCreateInput,
      rules: {
        allowCrossTeamMentoring: false,
        minTeamSize: 3,
        maxTeamSize: 99,
        requireDemoLink: true,
        judgingModel: 'panel',
        submissionRequirements: ['video_demo', 'documentation'],
        categories: [' Innovation ', 'Business Impact', 'Innovation'],
        prizesText: '  First place: innovation budget  ',
      },
      branding: {
        bannerMessage: '  Build boldly  ',
        accentColor: '  #123abc  ',
        bannerImageUrl: '  https://cdn.example.com/banner.png  ',
        themePreference: 'dark',
      },
    });

    expect(result).toEqual({
      eventId: 'event-created',
      childPageId: 'child-901',
      childPageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-901',
    });
    expect(repo.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventRules: {
          allowCrossTeamMentoring: false,
          minTeamSize: 3,
          maxTeamSize: 20,
          requireDemoLink: true,
          judgingModel: 'panel',
          submissionRequirements: ['video_demo', 'documentation'],
          categories: ['Innovation', 'Business Impact'],
          prizesText: 'First place: innovation budget',
        },
        eventBranding: {
          bannerMessage: 'Build boldly',
          accentColor: '#123abc',
          bannerImageUrl: 'https://cdn.example.com/banner.png',
          themePreference: 'dark',
        },
      })
    );
    expect(repo.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'event_created',
        newValue: expect.objectContaining({
          rules: expect.objectContaining({
            maxTeamSize: 20,
            judgingModel: 'panel',
          }),
          branding: expect.objectContaining({
            accentColor: '#123abc',
          }),
        }),
      })
    );
  });

  it('persists schedule payload and promotes lifecycle on go_live launch mode', async () => {
    const repo = createRepoMock();
    repo.getEventByCreationRequestId.mockResolvedValue(null);
    repo.getEventNameConflicts.mockResolvedValue([]);
    repo.ensureUser.mockResolvedValue({ id: 'user-creator' });
    repo.createEvent.mockResolvedValue({
      id: 'event-live',
      name: 'HackDay Spring 2026',
      confluence_page_id: 'child-live',
      confluence_page_url: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-live',
    });
    repo.addEventAdmin.mockResolvedValue(undefined);
    repo.upsertSyncState.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);
    getCurrentUserEmailMock.mockResolvedValue('owner@adaptavist.com');
    createChildPageUnderParentMock.mockResolvedValue({
      pageId: 'child-live',
      pageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-live',
    });

    const service = new ServiceClass(repo as never);
    await service.createInstanceDraft(viewer, {
      ...baseCreateInput,
      completedStep: 5,
      launchMode: 'go_live',
      schedule: {
        timezone: 'Europe/London',
        registrationOpensAt: '2026-02-20T09:00',
        registrationClosesAt: '2026-02-27T17:00',
        teamFormationStartsAt: '2026-02-27T17:00',
        teamFormationEndsAt: '2026-03-01T09:00',
        hackingStartsAt: '2026-03-01T09:00',
        submissionDeadlineAt: '2026-03-02T17:00',
        votingStartsAt: '2026-03-03T09:00',
        votingEndsAt: '2026-03-04T17:00',
        resultsAnnounceAt: '2026-03-05T10:00',
      },
    });

    expect(repo.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycleStatus: 'registration',
        eventSchedule: expect.objectContaining({
          registrationOpensAt: '2026-02-20T09:00',
          registrationClosesAt: '2026-02-27T17:00',
          teamFormationStartsAt: '2026-02-27T17:00',
          teamFormationEndsAt: '2026-03-01T09:00',
          hackingStartsAt: '2026-03-01T09:00',
          submissionDeadlineAt: '2026-03-02T17:00',
          votingStartsAt: '2026-03-03T09:00',
          votingEndsAt: '2026-03-04T17:00',
          resultsAnnounceAt: '2026-03-05T10:00',
        }),
      })
    );
  });

  it('rejects invalid schedule ordering before creating a child page', async () => {
    const repo = createRepoMock();
    const service = new ServiceClass(repo as never);

    await expect(
      service.createInstanceDraft(viewer, {
        ...baseCreateInput,
        schedule: {
          timezone: 'Europe/London',
          registrationOpensAt: '2026-02-21T10:00',
          registrationClosesAt: '2026-02-20T10:00',
        },
      })
    ).rejects.toThrow('Registration close must be after registration open.');

    expect(createChildPageUnderParentMock).not.toHaveBeenCalled();
    expect(repo.getEventByCreationRequestId).not.toHaveBeenCalled();
  });

  it('rejects go_live launch mode when hacking/submission dates are missing', async () => {
    const repo = createRepoMock();
    const service = new ServiceClass(repo as never);

    await expect(
      service.createInstanceDraft(viewer, {
        ...baseCreateInput,
        launchMode: 'go_live',
        schedule: {
          timezone: 'Europe/London',
        },
      })
    ).rejects.toThrow('Go live requires hacking start and submission deadline.');

    expect(createChildPageUnderParentMock).not.toHaveBeenCalled();
    expect(repo.getEventByCreationRequestId).not.toHaveBeenCalled();
  });

  it('rejects invalid team-size bounds before creating a child page', async () => {
    const repo = createRepoMock();
    const service = new ServiceClass(repo as never);

    await expect(
      service.createInstanceDraft(viewer, {
        ...baseCreateInput,
        rules: {
          minTeamSize: 7,
          maxTeamSize: 3,
        },
      })
    ).rejects.toThrow('Minimum team size must be less than or equal to maximum team size.');

    expect(createChildPageUnderParentMock).not.toHaveBeenCalled();
    expect(repo.getEventByCreationRequestId).not.toHaveBeenCalled();
  });

  it('returns default rules and branding in context for legacy events without config fields', async () => {
    const repo = createRepoMock();
    repo.getEventByConfluencePageId.mockResolvedValue({
      id: 'event-legacy',
      name: 'Legacy HackDay',
      icon: null,
      tagline: null,
      lifecycle_status: 'draft',
      confluence_page_id: 'child-legacy',
      confluence_parent_page_id: 'parent-legacy',
      hacking_starts_at: null,
      submission_deadline_at: null,
      event_rules: null,
      event_branding: null,
    });
    repo.ensureUser.mockResolvedValue({ id: 'user-ctx' });
    repo.listEventsByParentPageId.mockResolvedValue([]);
    repo.getSyncState.mockResolvedValue(null);
    repo.listEventAdmins.mockResolvedValue([]);

    const service = new ServiceClass(repo as never);
    const context = await service.getContext(viewer, 'child-legacy');

    expect(context.pageType).toBe('instance');
    expect(context.event?.rules).toEqual({
      allowCrossTeamMentoring: true,
      maxTeamSize: 6,
      requireDemoLink: false,
      judgingModel: 'hybrid',
    });
    expect(context.event?.branding).toEqual({
      accentColor: '#0f766e',
    });
  });

  it('preserves previous pushed/skipped counts when sync fails after moving to in_progress', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-1' });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-1', role: 'primary' }]);
    repo.listEventHackProjects.mockResolvedValue([{ id: 'project-1' }]);
    repo.getSyncState.mockResolvedValue({
      eventId: 'event-1',
      syncStatus: 'failed',
      pushedCount: 3,
      skippedCount: 2,
      lastError: 'old',
      lastAttemptAt: '2026-02-16T00:00:00.000Z',
    });
    repo.completeAndSync.mockRejectedValue(new Error('sync exploded'));
    repo.upsertSyncState.mockResolvedValue({
      eventId: 'event-1',
      syncStatus: 'failed',
      pushedCount: 3,
      skippedCount: 2,
      lastError: 'sync exploded',
      lastAttemptAt: '2026-02-16T01:00:00.000Z',
    });

    const service = new ServiceClass(repo as never);
    await expect(service.completeAndSync(viewer, 'event-1')).rejects.toThrow('sync exploded');

    expect(repo.upsertSyncState).toHaveBeenCalledTimes(2);
    expect(repo.upsertSyncState.mock.calls[0][0]).toBe('event-1');
    expect(repo.upsertSyncState.mock.calls[0][1]).toMatchObject({
      syncStatus: 'in_progress',
      pushedCount: 3,
      skippedCount: 2,
      lastError: null,
    });
    expect(repo.upsertSyncState.mock.calls[1][0]).toBe('event-1');
    expect(repo.upsertSyncState.mock.calls[1][1]).toMatchObject({
      syncStatus: 'failed',
      pushedCount: 3,
      skippedCount: 2,
      lastError: 'sync exploded',
    });
    expect(repo.logAudit).not.toHaveBeenCalled();
  });

  it('records sync_partial audit action when repository returns partial sync', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-7' });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-7', role: 'co_admin' }]);
    repo.listEventHackProjects.mockResolvedValue([{ id: 'project-9' }]);
    repo.getSyncState.mockResolvedValue(null);
    repo.completeAndSync.mockResolvedValue({
      syncStatus: 'partial',
      pushedCount: 1,
      skippedCount: 1,
    });
    repo.upsertSyncState.mockResolvedValue({
      eventId: 'event-9',
      syncStatus: 'in_progress',
      pushedCount: 0,
      skippedCount: 0,
      lastError: null,
      lastAttemptAt: '2026-02-16T01:00:00.000Z',
    });

    const service = new ServiceClass(repo as never);
    const result = await service.completeAndSync(viewer, 'event-9');

    expect(result).toEqual({
      syncStatus: 'partial',
      pushedCount: 1,
      skippedCount: 1,
    });
    expect(repo.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-9',
        actorUserId: 'user-7',
        action: 'sync_partial',
      })
    );
  });

  it('blocks completeAndSync when viewer is not an event admin', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-2' });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'someone-else', role: 'primary' }]);

    const service = new ServiceClass(repo as never);
    await expect(service.completeAndSync(viewer, 'event-2')).rejects.toThrow(
      'Only event admins can complete and sync this instance.'
    );

    expect(repo.listEventHackProjects).not.toHaveBeenCalled();
    expect(repo.completeAndSync).not.toHaveBeenCalled();
  });

  it('blocks completeAndSync when no hacks have been submitted', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-3' });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-3', role: 'primary' }]);
    repo.listEventHackProjects.mockResolvedValue([]);

    const service = new ServiceClass(repo as never);
    await expect(service.completeAndSync(viewer, 'event-3')).rejects.toThrow(
      'Cannot complete sync: at least one submitted hack is required.'
    );

    expect(repo.completeAndSync).not.toHaveBeenCalled();
    expect(repo.upsertSyncState).not.toHaveBeenCalled();
  });

  it('deletes draft instance only for primary admin with no projects', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-primary' });
    repo.getEventById.mockResolvedValue({
      id: 'event-draft',
      name: 'Draft Event',
      lifecycle_status: 'draft',
      confluence_page_id: 'child-draft',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-primary', role: 'primary' }]);
    repo.listProjectsByEventId.mockResolvedValue([]);
    repo.logAudit.mockResolvedValue(undefined);
    repo.deleteEventCascade.mockResolvedValue(undefined);
    deletePageMock.mockResolvedValue(undefined);

    const service = new ServiceClass(repo as never);
    const result = await service.deleteDraftInstance(viewer, 'event-draft');

    expect(result).toEqual({ deleted: true });
    expect(deletePageMock).toHaveBeenCalledWith('child-draft');
    expect(repo.deleteEventCascade).toHaveBeenCalledWith('event-draft');
  });

  it('blocks draft deletion when caller is not primary admin', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-coadmin' });
    repo.getEventById.mockResolvedValue({
      id: 'event-draft',
      lifecycle_status: 'draft',
      confluence_page_id: 'child-draft',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-coadmin', role: 'co_admin' }]);

    const service = new ServiceClass(repo as never);
    await expect(service.deleteDraftInstance(viewer, 'event-draft')).rejects.toThrow(
      'Only the primary admin can delete a draft instance.'
    );

    expect(repo.deleteEventCascade).not.toHaveBeenCalled();
  });

  it('advances lifecycle from draft to registration for co-admin launch action', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-coadmin' });
    repo.getEventById.mockResolvedValue({
      id: 'event-100',
      lifecycle_status: 'draft',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-coadmin', role: 'co_admin' }]);
    repo.updateEventLifecycle.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);

    const service = new ServiceClass(repo as never);
    const result = await service.launchInstance(viewer, 'event-100');

    expect(result).toEqual({ lifecycleStatus: 'registration' });
    expect(repo.updateEventLifecycle).toHaveBeenCalledWith('event-100', 'registration');
  });

  it('blocks lifecycle transition when viewer is not an event admin', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-participant' });
    repo.getEventById.mockResolvedValue({
      id: 'event-101',
      lifecycle_status: 'registration',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'another-user', role: 'primary' }]);

    const service = new ServiceClass(repo as never);
    await expect(service.launchInstance(viewer, 'event-101')).rejects.toThrow(
      'Only event admins can launch an instance.'
    );

    expect(repo.updateEventLifecycle).not.toHaveBeenCalled();
  });

  it('enforces complete sync before moving lifecycle from results to completed', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-admin' });
    repo.getEventById.mockResolvedValue({
      id: 'event-102',
      lifecycle_status: 'results',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-admin', role: 'primary' }]);
    repo.getSyncState.mockResolvedValue({
      eventId: 'event-102',
      syncStatus: 'partial',
      lastError: null,
      lastAttemptAt: null,
      pushedCount: 0,
      skippedCount: 1,
    });

    const service = new ServiceClass(repo as never);
    await expect(service.launchInstance(viewer, 'event-102')).rejects.toThrow(
      'Cannot move to completed until sync status is complete.'
    );
    expect(repo.updateEventLifecycle).not.toHaveBeenCalled();
  });

  it('moves lifecycle from results to completed when sync status is complete', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-admin' });
    repo.getEventById.mockResolvedValue({
      id: 'event-103',
      lifecycle_status: 'results',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-admin', role: 'primary' }]);
    repo.getSyncState.mockResolvedValue({
      eventId: 'event-103',
      syncStatus: 'complete',
      lastError: null,
      lastAttemptAt: null,
      pushedCount: 1,
      skippedCount: 0,
    });
    repo.updateEventLifecycle.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);

    const service = new ServiceClass(repo as never);
    const result = await service.launchInstance(viewer, 'event-103');

    expect(result).toEqual({ lifecycleStatus: 'completed' });
    expect(repo.updateEventLifecycle).toHaveBeenCalledWith('event-103', 'completed');
  });
});
