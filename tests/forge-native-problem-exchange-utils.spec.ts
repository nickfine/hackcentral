import { describe, expect, it } from 'vitest';
import type { ProblemListItem } from '../forge-native/static/frontend/src/types';
import {
  applyPreviewFlagMutation,
  applyPreviewVoteMutation,
  buildProblemAppliedFilters,
  parseProblemFilterTokens,
  resolveProblemIncludeHidden,
  validateProblemStatusDraft,
} from '../forge-native/static/frontend/src/utils/problemExchange';

function makeProblem(overrides: Partial<ProblemListItem> = {}): ProblemListItem {
  return {
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
    voteCount: 2,
    flagCount: 0,
    linkedHackProjectId: undefined,
    linkedArtifactId: undefined,
    canRemove: false,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    createdByName: 'Alice',
    ...overrides,
  };
}

describe('problem exchange utility helpers', () => {
  it('builds applied filters and enforces moderation visibility guardrails', () => {
    const applied = buildProblemAppliedFilters(
      {
        query: '  status ',
        teamsInput: 'Delivery, Engineering, delivery',
        domainsInput: 'Operations',
        status: 'open',
        sortBy: 'votes',
        includeHidden: true,
      },
      false
    );

    expect(applied).toEqual({
      query: 'status',
      teams: ['delivery', 'engineering'],
      domains: ['operations'],
      statuses: ['open'],
      sortBy: 'votes',
      includeHidden: false,
    });
    expect(resolveProblemIncludeHidden(true, true)).toBe(true);
    expect(resolveProblemIncludeHidden(true, false)).toBe(false);
  });

  it('validates solved status linkage and token parsing', () => {
    expect(validateProblemStatusDraft({ status: 'claimed' })).toBeNull();
    expect(validateProblemStatusDraft({ status: 'solved' })).toBe(
      'Solved status requires linked hack project ID or linked artifact ID.'
    );
    expect(
      validateProblemStatusDraft({ status: 'solved', linkedArtifactId: 'artifact-1' })
    ).toBeNull();

    expect(parseProblemFilterTokens(' Delivery, engineering,delivery, ,OPS ')).toEqual([
      'delivery',
      'engineering',
      'ops',
    ]);
  });

  it('applies preview vote mutation idempotently per user vote', () => {
    const items = [makeProblem()];

    const firstVote = applyPreviewVoteMutation(items, [], 'problem-1', '2026-03-02T12:00:00.000Z');
    expect(firstVote.alreadyVoted).toBe(false);
    expect(firstVote.nextItems[0].voteCount).toBe(3);

    const secondVote = applyPreviewVoteMutation(
      firstVote.nextItems,
      firstVote.nextVotedIds,
      'problem-1',
      '2026-03-02T12:05:00.000Z'
    );
    expect(secondVote.alreadyVoted).toBe(true);
    expect(secondVote.nextItems[0].voteCount).toBe(3);
  });

  it('auto-hides preview problems when flag threshold reaches three', () => {
    const items = [makeProblem({ flagCount: 2, moderationState: 'visible' })];

    const result = applyPreviewFlagMutation(items, [], 'problem-1', '2026-03-02T13:00:00.000Z');

    expect(result.alreadyFlagged).toBe(false);
    expect(result.autoHidden).toBe(true);
    expect(result.nextItems[0]).toMatchObject({
      flagCount: 3,
      moderationState: 'hidden_pending_review',
      updatedAt: '2026-03-02T13:00:00.000Z',
    });
  });
});
