import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GetPipelineBoardResult,
  MovePipelineItemResult,
  UpdatePipelineStageCriteriaResult,
  ViewerContext,
} from '../forge-native/src/shared/types';

const mockRepo = {
  getPipelineBoard: vi.fn(),
  movePipelineItem: vi.fn(),
  updatePipelineStageCriteria: vi.fn(),
  canUserManagePipeline: vi.fn(),
};

vi.mock('../forge-native/src/backend/supabase/repositories', () => {
  class SupabaseRepository {
    getPipelineBoard = mockRepo.getPipelineBoard;
    movePipelineItem = mockRepo.movePipelineItem;
    updatePipelineStageCriteria = mockRepo.updatePipelineStageCriteria;
    canUserManagePipeline = mockRepo.canUserManagePipeline;
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

describe('forge-native pipeline runtime mode behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.FORGE_DATA_BACKEND;
    delete process.env.CONVEX_URL;
  });

  it('uses supabase repository for pipeline operations when FORGE_DATA_BACKEND=supabase', async () => {
    process.env.FORGE_DATA_BACKEND = 'supabase';

    const boardResult: GetPipelineBoardResult = {
      items: [
        {
          projectId: 'project-1',
          title: 'Ops Assistant',
          description: 'Automates status summaries.',
          ownerName: 'Alice',
          stage: 'hack',
          status: 'in_progress',
          statusLabel: 'In Progress',
          daysInStage: 2,
          attachedHacksCount: 0,
          commentCount: 0,
          timeSavedEstimate: 4,
          visibility: 'org',
          enteredStageAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      stageCriteria: [
        {
          stage: 'hack',
          label: 'Hack',
          description: 'Initial concept stage',
          criteria: ['Clear user problem'],
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      metrics: {
        itemsPerStage: [{ stage: 'hack', count: 1 }],
        averageDaysInStage: [{ stage: 'hack', averageDays: 2 }],
        conversionHackToValidated: 0,
        conversionValidatedToIncubating: 0,
        conversionIncubatingToCandidate: 0,
        totalEntered: 1,
        totalGraduated: 0,
      },
      canManage: true,
    };
    const moveResult: MovePipelineItemResult = {
      projectId: 'project-1',
      fromStage: 'hack',
      toStage: 'validated_prototype',
      movedAt: '2026-03-01T02:00:00.000Z',
      note: 'Validated with pilot users',
    };
    const criteriaResult: UpdatePipelineStageCriteriaResult = {
      stageCriteria: {
        stage: 'validated_prototype',
        label: 'Validated',
        description: 'Validated with user feedback',
        criteria: ['Pilot evidence', 'Documented outcomes'],
        updatedAt: '2026-03-01T03:00:00.000Z',
      },
    };

    mockRepo.getPipelineBoard.mockResolvedValue(boardResult);
    mockRepo.canUserManagePipeline.mockResolvedValue(true);
    mockRepo.movePipelineItem.mockResolvedValue(moveResult);
    mockRepo.updatePipelineStageCriteria.mockResolvedValue(criteriaResult);

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(mod.getPipelineBoard(viewer, { stages: ['hack'] })).resolves.toEqual(boardResult);
    await expect(
      mod.movePipelineItem(viewer, {
        projectId: 'project-1',
        toStage: 'validated_prototype',
        note: 'Validated with pilot users',
      })
    ).resolves.toEqual(moveResult);
    await expect(
      mod.updatePipelineStageCriteria(viewer, {
        stage: 'validated_prototype',
        label: 'Validated',
        description: 'Validated with user feedback',
        criteria: ['Pilot evidence', 'Documented outcomes'],
      })
    ).resolves.toEqual(criteriaResult);

    expect(mockRepo.getPipelineBoard).toHaveBeenCalledTimes(1);
    expect(mockRepo.canUserManagePipeline).toHaveBeenCalledTimes(2);
    expect(mockRepo.movePipelineItem).toHaveBeenCalledTimes(1);
    expect(mockRepo.updatePipelineStageCriteria).toHaveBeenCalledTimes(1);
  });

  it('blocks pipeline mutations when viewer lacks pipeline admin capability', async () => {
    process.env.FORGE_DATA_BACKEND = 'supabase';
    mockRepo.canUserManagePipeline.mockResolvedValue(false);

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(
      mod.movePipelineItem(viewer, {
        projectId: 'project-1',
        toStage: 'validated_prototype',
        note: 'Validated with pilot users',
      })
    ).rejects.toThrow('[PIPELINE_FORBIDDEN]');

    expect(mockRepo.movePipelineItem).not.toHaveBeenCalled();
  });

  it('rejects pipeline operations in convex-only mode with explicit unsupported error', async () => {
    process.env.FORGE_DATA_BACKEND = 'convex';

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(mod.getPipelineBoard(viewer, {})).rejects.toThrow('[PIPELINE_UNSUPPORTED_BACKEND]');
    await expect(
      mod.movePipelineItem(viewer, {
        projectId: 'project-1',
        toStage: 'validated_prototype',
        note: 'Validated with pilot users',
      })
    ).rejects.toThrow('[PIPELINE_UNSUPPORTED_BACKEND]');
  });
});
