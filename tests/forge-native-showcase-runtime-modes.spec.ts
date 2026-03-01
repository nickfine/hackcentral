import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GetShowcaseHackDetailResult,
  ListShowcaseHacksResult,
  SetShowcaseFeaturedResult,
  ViewerContext,
} from '../forge-native/src/shared/types';

const mockRepo = {
  listShowcaseHacks: vi.fn(),
  getShowcaseHackDetail: vi.fn(),
  setShowcaseFeatured: vi.fn(),
  canUserManagePipeline: vi.fn(),
  createProblem: vi.fn(),
  listProblems: vi.fn(),
  voteProblem: vi.fn(),
  updateProblemStatus: vi.fn(),
  flagProblem: vi.fn(),
  moderateProblem: vi.fn(),
  canUserModerateProblemExchange: vi.fn(),
  createArtifact: vi.fn(),
  listArtifacts: vi.fn(),
  getArtifact: vi.fn(),
  markArtifactReuse: vi.fn(),
  getBootstrapData: vi.fn(),
  createHack: vi.fn(),
  createProject: vi.fn(),
  updateMentorProfile: vi.fn(),
  getPipelineBoard: vi.fn(),
  movePipelineItem: vi.fn(),
  updatePipelineStageCriteria: vi.fn(),
};

vi.mock('../forge-native/src/backend/supabase/repositories', () => {
  class SupabaseRepository {
    listShowcaseHacks = mockRepo.listShowcaseHacks;
    getShowcaseHackDetail = mockRepo.getShowcaseHackDetail;
    setShowcaseFeatured = mockRepo.setShowcaseFeatured;
    canUserManagePipeline = mockRepo.canUserManagePipeline;
    createProblem = mockRepo.createProblem;
    listProblems = mockRepo.listProblems;
    voteProblem = mockRepo.voteProblem;
    updateProblemStatus = mockRepo.updateProblemStatus;
    flagProblem = mockRepo.flagProblem;
    moderateProblem = mockRepo.moderateProblem;
    canUserModerateProblemExchange = mockRepo.canUserModerateProblemExchange;
    createArtifact = mockRepo.createArtifact;
    listArtifacts = mockRepo.listArtifacts;
    getArtifact = mockRepo.getArtifact;
    markArtifactReuse = mockRepo.markArtifactReuse;
    getBootstrapData = mockRepo.getBootstrapData;
    createHack = mockRepo.createHack;
    createProject = mockRepo.createProject;
    updateMentorProfile = mockRepo.updateMentorProfile;
    getPipelineBoard = mockRepo.getPipelineBoard;
    movePipelineItem = mockRepo.movePipelineItem;
    updatePipelineStageCriteria = mockRepo.updatePipelineStageCriteria;
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

describe('forge-native showcase runtime mode behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.FORGE_DATA_BACKEND;
    delete process.env.CONVEX_URL;
  });

  it('uses supabase repository for showcase operations when FORGE_DATA_BACKEND=supabase', async () => {
    process.env.FORGE_DATA_BACKEND = 'supabase';

    const listResult: ListShowcaseHacksResult = {
      items: [
        {
          projectId: 'project-1',
          title: 'Ops Assistant',
          description: 'Improves Ops throughput.',
          assetType: 'prompt',
          status: 'completed',
          featured: true,
          authorName: 'Alice',
          visibility: 'org',
          tags: ['ops'],
          sourceEventId: 'event-1',
          demoUrl: 'https://demo.example.com/ops-assistant',
          pipelineStage: 'product_candidate',
          reuseCount: 5,
          teamMembersCount: 2,
          linkedArtifactsCount: 1,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:10:00.000Z',
        },
      ],
      canManage: true,
    };
    const detailResult: GetShowcaseHackDetailResult = {
      hack: {
        ...listResult.items[0],
        teamMembers: ['Alice', 'Ben'],
        linkedArtifactIds: ['artifact-1'],
        context: 'Ops workflow acceleration',
        limitations: null,
        riskNotes: null,
        sourceRepoUrl: null,
      },
      artifactsProduced: [],
      problemsSolved: [],
    };
    const setFeaturedResult: SetShowcaseFeaturedResult = {
      projectId: 'project-1',
      featured: false,
      updatedAt: '2026-03-01T03:00:00.000Z',
    };

    mockRepo.listShowcaseHacks.mockResolvedValue(listResult);
    mockRepo.getShowcaseHackDetail.mockResolvedValue(detailResult);
    mockRepo.setShowcaseFeatured.mockResolvedValue(setFeaturedResult);
    mockRepo.canUserManagePipeline.mockResolvedValue(true);

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(mod.listShowcaseHacks(viewer, { statuses: ['completed'] })).resolves.toEqual(listResult);
    await expect(mod.getShowcaseHackDetail(viewer, 'project-1')).resolves.toEqual(detailResult);
    await expect(
      mod.setShowcaseFeatured(viewer, { projectId: 'project-1', featured: false })
    ).resolves.toEqual(setFeaturedResult);

    expect(mockRepo.listShowcaseHacks).toHaveBeenCalledTimes(1);
    expect(mockRepo.getShowcaseHackDetail).toHaveBeenCalledTimes(1);
    expect(mockRepo.canUserManagePipeline).toHaveBeenCalledTimes(1);
    expect(mockRepo.setShowcaseFeatured).toHaveBeenCalledTimes(1);
  });

  it('blocks setShowcaseFeatured when viewer lacks pipeline/showcase admin capability', async () => {
    process.env.FORGE_DATA_BACKEND = 'supabase';
    mockRepo.canUserManagePipeline.mockResolvedValue(false);

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(
      mod.setShowcaseFeatured(viewer, { projectId: 'project-1', featured: true })
    ).rejects.toThrow('[SHOWCASE_FORBIDDEN]');

    expect(mockRepo.setShowcaseFeatured).not.toHaveBeenCalled();
  });

  it('rejects showcase operations in convex-only mode with explicit unsupported error', async () => {
    process.env.FORGE_DATA_BACKEND = 'convex';

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(mod.listShowcaseHacks(viewer, {})).rejects.toThrow('[SHOWCASE_UNSUPPORTED_BACKEND]');
    await expect(mod.getShowcaseHackDetail(viewer, 'project-1')).rejects.toThrow('[SHOWCASE_UNSUPPORTED_BACKEND]');
  });

  it('falls back to explicit unsupported error in auto mode after supabase permission failure', async () => {
    process.env.FORGE_DATA_BACKEND = 'auto';
    process.env.CONVEX_URL = 'https://convex.example.com';
    mockRepo.listShowcaseHacks.mockRejectedValue(new Error('Supabase permission error (403)'));

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(mod.listShowcaseHacks(viewer, {})).rejects.toThrow('[SHOWCASE_UNSUPPORTED_BACKEND]');
  });
});
