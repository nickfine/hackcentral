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
  ensureUserByEmail: ReturnType<typeof vi.fn>;
  createEvent: ReturnType<typeof vi.fn>;
  addEventAdmin: ReturnType<typeof vi.fn>;
  upsertSyncState: ReturnType<typeof vi.fn>;
  logAudit: ReturnType<typeof vi.fn>;
  listEventAdmins: ReturnType<typeof vi.fn>;
  listEventHackProjects: ReturnType<typeof vi.fn>;
  getSyncState: ReturnType<typeof vi.fn>;
  completeAndSync: ReturnType<typeof vi.fn>;
};

function createRepoMock(): RepoMock {
  return {
    ensureUser: vi.fn(),
    getEventByCreationRequestId: vi.fn(),
    getUserByAccountId: vi.fn(),
    getEventNameConflicts: vi.fn(),
    ensureUserByEmail: vi.fn(),
    createEvent: vi.fn(),
    addEventAdmin: vi.fn(),
    upsertSyncState: vi.fn(),
    logAudit: vi.fn(),
    listEventAdmins: vi.fn(),
    listEventHackProjects: vi.fn(),
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
});
