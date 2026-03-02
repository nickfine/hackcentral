import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateArtifactResult,
  GetArtifactResult,
  ListArtifactsResult,
  MarkArtifactReuseResult,
  ViewerContext,
} from '../forge-native/src/shared/types';

const mockRepo = {
  createArtifact: vi.fn(),
  listArtifacts: vi.fn(),
  getArtifact: vi.fn(),
  markArtifactReuse: vi.fn(),
};

vi.mock('../forge-native/src/backend/supabase/repositories', () => {
  class SupabaseRepository {
    createArtifact = mockRepo.createArtifact;
    listArtifacts = mockRepo.listArtifacts;
    getArtifact = mockRepo.getArtifact;
    markArtifactReuse = mockRepo.markArtifactReuse;
  }

  return { SupabaseRepository };
});

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    mutation: vi.fn(),
  })),
}));

const viewer: ViewerContext = {
  accountId: 'acc-123',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('forge-native registry runtime mode behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.FORGE_DATA_BACKEND;
    delete process.env.CONVEX_URL;
  });

  it('uses supabase repository for registry operations when FORGE_DATA_BACKEND=supabase', async () => {
    process.env.FORGE_DATA_BACKEND = 'supabase';

    const createResult: CreateArtifactResult = {
      artifactId: 'artifact-1',
      createdAt: '2026-03-01T00:00:00.000Z',
    };
    const listResult: ListArtifactsResult = {
      items: [
        {
          id: 'artifact-1',
          title: 'Ops Prompt Pack',
          description: 'Reusable prompt set for operational handovers.',
          artifactType: 'prompt',
          tags: ['ops', 'prompt'],
          sourceUrl: 'https://example.com/prompts/ops-pack',
          sourceLabel: 'Prompt Library',
          sourceHackProjectId: 'project-1',
          sourceHackdayEventId: 'event-1',
          visibility: 'org',
          reuseCount: 3,
          forkCount: 1,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
          authorName: 'Alice',
        },
      ],
      nextCursor: null,
    };
    const detailResult: GetArtifactResult = {
      artifact: listResult.items[0],
      sourceHack: {
        projectId: 'project-1',
        title: 'Ops Assistant',
        status: 'completed',
        eventId: 'event-1',
      },
    };
    const reuseResult: MarkArtifactReuseResult = {
      artifactId: 'artifact-1',
      reuseCount: 4,
      alreadyMarked: false,
    };

    mockRepo.createArtifact.mockResolvedValue(createResult);
    mockRepo.listArtifacts.mockResolvedValue(listResult);
    mockRepo.getArtifact.mockResolvedValue(detailResult);
    mockRepo.markArtifactReuse.mockResolvedValue(reuseResult);

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(
      mod.createArtifact(viewer, {
        title: 'Ops Prompt Pack',
        description: 'Reusable prompt set for operational handovers.',
        artifactType: 'prompt',
        tags: ['ops', 'prompt'],
        sourceUrl: 'https://example.com/prompts/ops-pack',
      })
    ).resolves.toEqual(createResult);
    await expect(mod.listArtifacts(viewer, { artifactTypes: ['prompt'] })).resolves.toEqual(listResult);
    await expect(mod.getArtifact(viewer, 'artifact-1')).resolves.toEqual(detailResult);
    await expect(mod.markArtifactReuse(viewer, 'artifact-1')).resolves.toEqual(reuseResult);

    expect(mockRepo.createArtifact).toHaveBeenCalledTimes(1);
    expect(mockRepo.listArtifacts).toHaveBeenCalledTimes(1);
    expect(mockRepo.getArtifact).toHaveBeenCalledTimes(1);
    expect(mockRepo.markArtifactReuse).toHaveBeenCalledTimes(1);
  });

  it('rejects registry operations in convex-only mode with explicit unsupported error', async () => {
    process.env.FORGE_DATA_BACKEND = 'convex';

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(mod.listArtifacts(viewer, {})).rejects.toThrow('[REGISTRY_UNSUPPORTED_BACKEND]');
    await expect(mod.getArtifact(viewer, 'artifact-1')).rejects.toThrow('[REGISTRY_UNSUPPORTED_BACKEND]');
    await expect(mod.markArtifactReuse(viewer, 'artifact-1')).rejects.toThrow('[REGISTRY_UNSUPPORTED_BACKEND]');
  });
});
