import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateProblemResult,
  FlagProblemResult,
  ListProblemImportCandidatesResult,
  ListProblemsResult,
  ModerateProblemResult,
  ProblemExchangeCapabilitiesResult,
  UpdateProblemStatusResult,
  ViewerContext,
  VoteProblemResult,
} from '../forge-native/src/shared/types';

const mockRepo = {
  createProblem: vi.fn(),
  listProblems: vi.fn(),
  listProblemImportCandidates: vi.fn(),
  voteProblem: vi.fn(),
  updateProblemStatus: vi.fn(),
  flagProblem: vi.fn(),
  moderateProblem: vi.fn(),
  canUserModerateProblemExchange: vi.fn(),
};

vi.mock('../forge-native/src/backend/supabase/repositories', () => {
  class SupabaseRepository {
    createProblem = mockRepo.createProblem;
    listProblems = mockRepo.listProblems;
    listProblemImportCandidates = mockRepo.listProblemImportCandidates;
    voteProblem = mockRepo.voteProblem;
    updateProblemStatus = mockRepo.updateProblemStatus;
    flagProblem = mockRepo.flagProblem;
    moderateProblem = mockRepo.moderateProblem;
    canUserModerateProblemExchange = mockRepo.canUserModerateProblemExchange;
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

describe('forge-native problem exchange runtime mode behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.FORGE_DATA_BACKEND;
    delete process.env.CONVEX_URL;
  });

  it('uses supabase repository for problem exchange operations when FORGE_DATA_BACKEND=supabase', async () => {
    process.env.FORGE_DATA_BACKEND = 'supabase';

    const createResult: CreateProblemResult = {
      problemId: 'problem-1',
      status: 'open',
      moderationState: 'visible',
      createdAt: '2026-03-01T00:00:00.000Z',
    };
    const listResult: ListProblemsResult = {
      items: [
        {
          id: 'problem-1',
          title: 'Manual status updates',
          description: 'Teams manually update weekly status documents.',
          frequency: 'weekly',
          estimatedTimeWastedHours: 4,
          team: 'Delivery',
          domain: 'Operations',
          contactDetails: 'alice@adaptavist.com',
          status: 'open',
          moderationState: 'visible',
          voteCount: 3,
          flagCount: 0,
          linkedHackProjectId: undefined,
          linkedArtifactId: undefined,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
          createdByName: 'Alice',
        },
      ],
      nextCursor: null,
    };
    const importCandidates: ListProblemImportCandidatesResult = {
      items: [
        {
          problemId: 'problem-1',
          title: 'Manual status updates',
          description: 'Teams manually update weekly status documents.',
          status: 'open',
          voteCount: 3,
          estimatedTimeWastedHours: 4,
          team: 'Delivery',
          domain: 'Operations',
          updatedAt: '2026-03-01T00:00:00.000Z',
          createdByName: 'Alice',
        },
      ],
      criteria: {
        minVoteCount: 3,
        statuses: ['open'],
      },
    };
    const voteResult: VoteProblemResult = {
      problemId: 'problem-1',
      voteCount: 4,
      alreadyVoted: false,
    };
    const statusResult: UpdateProblemStatusResult = {
      problemId: 'problem-1',
      status: 'claimed',
      updatedAt: '2026-03-01T01:00:00.000Z',
      linkedHackProjectId: undefined,
      linkedArtifactId: undefined,
    };
    const flagResult: FlagProblemResult = {
      problemId: 'problem-1',
      flagCount: 1,
      alreadyFlagged: false,
      moderationState: 'visible',
      autoHidden: false,
    };
    const moderateResult: ModerateProblemResult = {
      problemId: 'problem-1',
      moderationState: 'removed',
      reviewedAt: '2026-03-01T02:00:00.000Z',
    };
    const capabilitiesResult: ProblemExchangeCapabilitiesResult = {
      canModerate: true,
      moderationMode: 'allowlist',
    };

    mockRepo.createProblem.mockResolvedValue(createResult);
    mockRepo.listProblems.mockResolvedValue(listResult);
    mockRepo.listProblemImportCandidates.mockResolvedValue(importCandidates);
    mockRepo.voteProblem.mockResolvedValue(voteResult);
    mockRepo.updateProblemStatus.mockResolvedValue(statusResult);
    mockRepo.flagProblem.mockResolvedValue(flagResult);
    mockRepo.moderateProblem.mockResolvedValue(moderateResult);
    mockRepo.canUserModerateProblemExchange.mockResolvedValue(capabilitiesResult.canModerate);

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(
      mod.createProblem(viewer, {
        title: 'Manual status updates',
        description: 'Teams manually update weekly status documents.',
        frequency: 'weekly',
        estimatedTimeWastedHours: 4,
        team: 'Delivery',
        domain: 'Operations',
        contactDetails: 'alice@adaptavist.com',
      })
    ).resolves.toEqual(createResult);
    await expect(mod.listProblems(viewer, { statuses: ['open'] })).resolves.toEqual(listResult);
    await expect(mod.listProblemImportCandidates(viewer, { minVoteCount: 3 })).resolves.toEqual(importCandidates);
    await expect(mod.voteProblem(viewer, 'problem-1')).resolves.toEqual(voteResult);
    await expect(
      mod.updateProblemStatus(viewer, { problemId: 'problem-1', status: 'claimed', note: 'Assigned for triage' })
    ).resolves.toEqual(statusResult);
    await expect(mod.flagProblem(viewer, { problemId: 'problem-1', reason: 'Spam' })).resolves.toEqual(flagResult);
    await expect(
      mod.moderateProblem(viewer, { problemId: 'problem-1', decision: 'remove', note: 'Policy breach' })
    ).resolves.toEqual(moderateResult);
    await expect(mod.getProblemExchangeCapabilities(viewer)).resolves.toEqual(capabilitiesResult);

    expect(mockRepo.createProblem).toHaveBeenCalledTimes(1);
    expect(mockRepo.listProblems).toHaveBeenCalledTimes(1);
    expect(mockRepo.listProblemImportCandidates).toHaveBeenCalledTimes(1);
    expect(mockRepo.voteProblem).toHaveBeenCalledTimes(1);
    expect(mockRepo.updateProblemStatus).toHaveBeenCalledTimes(1);
    expect(mockRepo.flagProblem).toHaveBeenCalledTimes(1);
    expect(mockRepo.moderateProblem).toHaveBeenCalledTimes(1);
    expect(mockRepo.canUserModerateProblemExchange).toHaveBeenCalledTimes(2);
  });

  it('blocks moderateProblem when viewer lacks moderation capability', async () => {
    process.env.FORGE_DATA_BACKEND = 'supabase';
    mockRepo.canUserModerateProblemExchange.mockResolvedValue(false);

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(
      mod.moderateProblem(viewer, { problemId: 'problem-1', decision: 'remove', note: 'Policy breach' })
    ).rejects.toThrow('[PROBLEM_MODERATION_FORBIDDEN]');

    expect(mockRepo.moderateProblem).not.toHaveBeenCalled();
  });

  it('rejects problem exchange operations in convex-only mode with explicit unsupported error', async () => {
    process.env.FORGE_DATA_BACKEND = 'convex';

    const mod = await import('../forge-native/src/backend/hackcentral');

    await expect(mod.listProblems(viewer, {})).rejects.toThrow('[PROBLEM_EXCHANGE_UNSUPPORTED_BACKEND]');
    await expect(mod.voteProblem(viewer, 'problem-1')).rejects.toThrow('[PROBLEM_EXCHANGE_UNSUPPORTED_BACKEND]');
    await expect(mod.flagProblem(viewer, { problemId: 'problem-1', reason: 'Spam' })).rejects.toThrow(
      '[PROBLEM_EXCHANGE_UNSUPPORTED_BACKEND]'
    );
  });
});
