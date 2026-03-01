import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GetPathwayResult,
  ListPathwaysResult,
  SetPathwayStepCompletionResult,
  UpsertPathwayResult,
  ViewerContext,
} from '../forge-native/src/shared/types';

const mockRepo = {
  listPathways: vi.fn(),
  getPathway: vi.fn(),
  upsertPathway: vi.fn(),
  setPathwayStepCompletion: vi.fn(),
  canUserManagePathways: vi.fn(),
  listShowcaseHacks: vi.fn(),
  getShowcaseHackDetail: vi.fn(),
  setShowcaseFeatured: vi.fn(),
  canUserManagePipeline: vi.fn(),
  createProblem: vi.fn(),
  listProblems: vi.fn(),
  listProblemImportCandidates: vi.fn(),
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
    listPathways = mockRepo.listPathways;
    getPathway = mockRepo.getPathway;
    upsertPathway = mockRepo.upsertPathway;
    setPathwayStepCompletion = mockRepo.setPathwayStepCompletion;
    canUserManagePathways = mockRepo.canUserManagePathways;
    listShowcaseHacks = mockRepo.listShowcaseHacks;
    getShowcaseHackDetail = mockRepo.getShowcaseHackDetail;
    setShowcaseFeatured = mockRepo.setShowcaseFeatured;
    canUserManagePipeline = mockRepo.canUserManagePipeline;
    createProblem = mockRepo.createProblem;
    listProblems = mockRepo.listProblems;
    listProblemImportCandidates = mockRepo.listProblemImportCandidates;
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

describe('forge-native pathways runtime mode behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.FORGE_DATA_BACKEND;
    delete process.env.CONVEX_URL;
  });

  it('uses supabase repository for pathway operations when FORGE_DATA_BACKEND=supabase', async () => {
    process.env.FORGE_DATA_BACKEND = 'supabase';

    const listResult: ListPathwaysResult = {
      items: [],
      canManage: true,
    };
    const pathwayResult: GetPathwayResult = {
      pathway: {
        pathwayId: 'path-1',
        title: 'Finance Pathway',
        summary: 'Summary',
        introText: 'Intro',
        domain: 'Finance',
        role: 'Analyst',
        tags: ['finance'],
        stepCount: 1,
        published: true,
        recommended: true,
        updatedAt: '2026-03-01T00:00:00.000Z',
        updatedByName: 'Alice',
        progress: {
          completedStepIds: [],
          completedSteps: 0,
          totalSteps: 1,
          completionPercent: 0,
        },
      },
      steps: [
        {
          stepId: 'step-1',
          position: 1,
          type: 'read',
          title: 'Read',
          description: '',
          isOptional: false,
        },
      ],
      canManage: true,
    };
    const upsertResult: UpsertPathwayResult = {
      pathway: pathwayResult.pathway,
      steps: pathwayResult.steps,
    };
    const progressResult: SetPathwayStepCompletionResult = {
      pathwayId: 'path-1',
      stepId: 'step-1',
      completed: true,
      completedAt: '2026-03-01T00:05:00.000Z',
      progress: {
        completedStepIds: ['step-1'],
        completedSteps: 1,
        totalSteps: 1,
        completionPercent: 100,
      },
    };

    mockRepo.listPathways.mockResolvedValue(listResult);
    mockRepo.getPathway.mockResolvedValue(pathwayResult);
    mockRepo.upsertPathway.mockResolvedValue(upsertResult);
    mockRepo.setPathwayStepCompletion.mockResolvedValue(progressResult);
    mockRepo.canUserManagePathways.mockResolvedValue(true);

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(mod.listPathways(viewer, {})).resolves.toEqual(listResult);
    await expect(mod.getPathway(viewer, 'path-1')).resolves.toEqual(pathwayResult);
    await expect(
      mod.upsertPathway(viewer, {
        title: 'Finance Pathway',
        steps: [{ type: 'read', title: 'Read' }],
      })
    ).resolves.toEqual(upsertResult);
    await expect(
      mod.setPathwayStepCompletion(viewer, { pathwayId: 'path-1', stepId: 'step-1', completed: true })
    ).resolves.toEqual(progressResult);

    expect(mockRepo.listPathways).toHaveBeenCalledTimes(1);
    expect(mockRepo.getPathway).toHaveBeenCalledTimes(1);
    expect(mockRepo.canUserManagePathways).toHaveBeenCalledTimes(1);
    expect(mockRepo.upsertPathway).toHaveBeenCalledTimes(1);
    expect(mockRepo.setPathwayStepCompletion).toHaveBeenCalledTimes(1);
  });

  it('blocks upsertPathway when viewer lacks pathway editor capability', async () => {
    process.env.FORGE_DATA_BACKEND = 'supabase';
    mockRepo.canUserManagePathways.mockResolvedValue(false);

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(
      mod.upsertPathway(viewer, {
        title: 'Blocked Pathway',
        steps: [{ type: 'read', title: 'Read' }],
      })
    ).rejects.toThrow('[PATHWAY_FORBIDDEN]');

    expect(mockRepo.upsertPathway).not.toHaveBeenCalled();
  });

  it('rejects pathway operations in convex-only mode with explicit unsupported error', async () => {
    process.env.FORGE_DATA_BACKEND = 'convex';

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(mod.listPathways(viewer, {})).rejects.toThrow('[PATHWAYS_UNSUPPORTED_BACKEND]');
    await expect(mod.getPathway(viewer, 'path-1')).rejects.toThrow('[PATHWAYS_UNSUPPORTED_BACKEND]');
    await expect(
      mod.setPathwayStepCompletion(viewer, { pathwayId: 'path-1', stepId: 'step-1', completed: true })
    ).rejects.toThrow('[PATHWAYS_UNSUPPORTED_BACKEND]');
  });
});
