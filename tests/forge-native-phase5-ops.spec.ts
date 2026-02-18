import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  repo: null as Record<string, unknown> | null,
}));

vi.mock('../forge-native/src/backend/supabase/repositories', () => ({
  SupabaseRepository: class {
    constructor() {
      return mockState.repo as object;
    }
  },
}));

function createRepoMock(): Record<string, ReturnType<typeof vi.fn>> {
  return {
    listMigrationEventCandidatesByName: vi.fn().mockResolvedValue([]),
    listEventAdmins: vi.fn().mockResolvedValue([]),
    getSyncState: vi.fn().mockResolvedValue(null),
    listEventHackProjects: vi.fn().mockResolvedValue([]),
    listProjectsByEventId: vi.fn().mockResolvedValue([]),
    countEventAuditLogs: vi.fn().mockResolvedValue(0),
    getEventById: vi.fn().mockResolvedValue({ id: 'event', lifecycle_status: 'draft' }),
    seedHackForEventAsUser: vi.fn().mockResolvedValue({ projectId: 'project-seeded' }),
    logAudit: vi.fn().mockResolvedValue(undefined),
  };
}

describe('phase5 ops webtrigger seed_hack', () => {
  beforeEach(() => {
    mockState.repo = createRepoMock();
  });

  it('returns validation error when eventId is missing', async () => {
    const { handler } = await import('../forge-native/src/ops');
    const response = await handler({
      method: 'POST',
      body: JSON.stringify({ action: 'seed_hack' }),
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('eventId is required');
  });

  it('blocks seed_hack when event has no admins', async () => {
    const repo = createRepoMock();
    repo.getEventById.mockResolvedValue({ id: 'event-1', lifecycle_status: 'draft' });
    repo.listEventAdmins.mockResolvedValue([]);
    mockState.repo = repo;
    const { handler } = await import('../forge-native/src/ops');

    const response = await handler({
      method: 'POST',
      body: JSON.stringify({ action: 'seed_hack', eventId: 'event-1' }),
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('target event has no admins');
  });

  it('is idempotent when seed title already exists for the event', async () => {
    const seedTitle = 'phase5-seed-existing';
    const repo = createRepoMock();
    repo.getEventById.mockResolvedValue({ id: 'event-2', lifecycle_status: 'draft' });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-1', role: 'primary' }]);
    repo.listEventHackProjects.mockResolvedValue([{ id: 'project-existing', title: seedTitle }]);
    mockState.repo = repo;
    const { handler } = await import('../forge-native/src/ops');

    const response = await handler({
      method: 'POST',
      body: JSON.stringify({ action: 'seed_hack', eventId: 'event-2', hackTitle: seedTitle }),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      seeded: boolean;
      skipped?: boolean;
      projectId: string;
    };
    expect(body.seeded).toBe(false);
    expect(body.skipped).toBe(true);
    expect(body.projectId).toBe('project-existing');
    expect(repo.seedHackForEventAsUser).not.toHaveBeenCalled();
  });

  it('retries on rate-limit errors and succeeds once write is accepted', async () => {
    const repo = createRepoMock();
    repo.getEventById.mockResolvedValue({ id: 'event-3', lifecycle_status: 'draft' });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-3', role: 'primary' }]);
    repo.listEventHackProjects.mockResolvedValue([]);
    repo.seedHackForEventAsUser
      .mockRejectedValueOnce(new Error('Supabase POST Project failed (429): Too Many Requests'))
      .mockRejectedValueOnce(new Error('Supabase POST Project failed (429): Too Many Requests'))
      .mockResolvedValueOnce({ projectId: 'project-seeded' });
    mockState.repo = repo;
    const { handler } = await import('../forge-native/src/ops');

    const response = await handler({
      method: 'POST',
      body: JSON.stringify({ action: 'seed_hack', eventId: 'event-3', retryNoDelay: true }),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { seeded: boolean; projectId: string };
    expect(body.seeded).toBe(true);
    expect(body.projectId).toBe('project-seeded');
    expect(repo.seedHackForEventAsUser).toHaveBeenCalledTimes(3);
  });
});

describe('phase5 ops webtrigger dry_run', () => {
  beforeEach(() => {
    mockState.repo = createRepoMock();
  });

  it('defaults to the HDC Auto query when eventNameQuery is omitted', async () => {
    const repo = createRepoMock();
    mockState.repo = repo;
    const { handler } = await import('../forge-native/src/ops');

    const response = await handler({
      method: 'POST',
      body: JSON.stringify({ action: 'dry_run' }),
    });

    expect(response.statusCode).toBe(200);
    expect(repo.listMigrationEventCandidatesByName).toHaveBeenCalledWith('HDC Auto');
    const body = JSON.parse(response.body) as { eventNameQuery: string; eventCount: number };
    expect(body.eventNameQuery).toBe('HDC Auto');
    expect(body.eventCount).toBe(0);
  });

  it('normalizes blank eventNameQuery to HDC Auto', async () => {
    const repo = createRepoMock();
    mockState.repo = repo;
    const { handler } = await import('../forge-native/src/ops');

    const response = await handler({
      method: 'POST',
      body: JSON.stringify({ action: 'dry_run', eventNameQuery: '   ' }),
    });

    expect(response.statusCode).toBe(200);
    expect(repo.listMigrationEventCandidatesByName).toHaveBeenCalledWith('HDC Auto');
  });
});
