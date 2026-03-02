import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'acc-123',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('SupabaseRepository problem exchange contracts', () => {
  it('creates validated problems and returns normalized creation response', async () => {
    const insert = vi.fn().mockResolvedValue({
      id: 'problem-1',
      created_at: '2026-03-01T00:00:00.000Z',
    });

    const fakeRepo = {
      client: { insert },
      ensureUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
    };

    const result = await SupabaseRepository.prototype.createProblem.call(fakeRepo, viewer, {
      title: 'Manual status updates',
      description: 'Teams manually update weekly status documents and weekly dashboards by hand.',
      frequency: 'weekly',
      estimatedTimeWastedHours: 5,
      team: 'Delivery',
      domain: 'Operations',
      contactDetails: 'alice@adaptavist.com',
    });

    expect(result).toEqual({
      problemId: 'problem-1',
      status: 'open',
      moderationState: 'visible',
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    expect(insert).toHaveBeenCalledWith(
      'Problem',
      expect.objectContaining({
        title: 'Manual status updates',
        status: 'open',
        moderation_state: 'visible',
        created_by_user_id: 'user-1',
      })
    );
  });

  it('lists import candidates using status/min-vote filters and deterministic ordering', async () => {
    const selectMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'problem-1',
          title: 'Status updates',
          description: 'Manual reporting burden.',
          frequency: 'weekly',
          estimated_time_wasted_hours: 3,
          team: 'Delivery',
          domain: 'Operations',
          contact_details: 'alice@adaptavist.com',
          status: 'open',
          moderation_state: 'visible',
          vote_count: 8,
          flag_count: 0,
          created_by_user_id: 'user-1',
          claimed_by_user_id: null,
          linked_hack_project_id: null,
          linked_artifact_id: null,
          auto_hidden_at: null,
          hidden_at: null,
          closed_at: null,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T01:00:00.000Z',
        },
        {
          id: 'problem-2',
          title: 'Legacy approvals',
          description: 'Approvals still happen in email threads.',
          frequency: 'daily',
          estimated_time_wasted_hours: 6,
          team: 'Delivery',
          domain: 'Operations',
          contact_details: 'bob@adaptavist.com',
          status: 'claimed',
          moderation_state: 'visible',
          vote_count: 6,
          flag_count: 0,
          created_by_user_id: 'user-2',
          claimed_by_user_id: 'user-3',
          linked_hack_project_id: null,
          linked_artifact_id: null,
          auto_hidden_at: null,
          hidden_at: null,
          closed_at: null,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T02:00:00.000Z',
        },
        {
          id: 'problem-3',
          title: 'Removed item',
          description: 'Should not appear.',
          frequency: 'monthly',
          estimated_time_wasted_hours: 9,
          team: 'Finance',
          domain: 'Governance',
          contact_details: 'ops@adaptavist.com',
          status: 'open',
          moderation_state: 'removed',
          vote_count: 50,
          flag_count: 2,
          created_by_user_id: 'user-2',
          claimed_by_user_id: null,
          linked_hack_project_id: null,
          linked_artifact_id: null,
          auto_hidden_at: null,
          hidden_at: null,
          closed_at: null,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T03:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        { id: 'user-1', full_name: 'Alice', email: 'alice@adaptavist.com' },
        { id: 'user-2', full_name: 'Bob', email: 'bob@adaptavist.com' },
      ]);

    const fakeRepo = {
      client: { selectMany },
    };

    const result = await SupabaseRepository.prototype.listProblemImportCandidates.call(fakeRepo, viewer, {
      minVoteCount: 6,
      statuses: ['open', 'claimed'],
      limit: 10,
    });

    expect(result.criteria).toEqual({
      minVoteCount: 6,
      statuses: ['open', 'claimed'],
    });
    expect(result.items.map((item) => item.problemId)).toEqual(['problem-1', 'problem-2']);
    expect(result.items[0]).toMatchObject({
      voteCount: 8,
      createdByName: 'Alice',
    });
  });

  it('auto-hides problems after third distinct flag and reports moderation state', async () => {
    const patchMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'problem-1',
          title: 'Status updates',
          description: 'Manual reporting burden.',
          frequency: 'weekly',
          estimated_time_wasted_hours: 3,
          team: 'Delivery',
          domain: 'Operations',
          contact_details: 'alice@adaptavist.com',
          status: 'open',
          moderation_state: 'visible',
          vote_count: 8,
          flag_count: 3,
          created_by_user_id: 'user-1',
          claimed_by_user_id: null,
          linked_hack_project_id: null,
          linked_artifact_id: null,
          auto_hidden_at: null,
          hidden_at: null,
          closed_at: null,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T03:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([]);
    const insert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'flag-1' })
      .mockResolvedValueOnce({ id: 'moderation-log-1' });

    const fakeRepo = {
      client: { insert, patchMany },
      ensureUser: vi.fn().mockResolvedValue({ id: 'user-2' }),
      getProblemById: vi.fn().mockResolvedValue({
        id: 'problem-1',
        title: 'Status updates',
        description: 'Manual reporting burden.',
        frequency: 'weekly',
        estimated_time_wasted_hours: 3,
        team: 'Delivery',
        domain: 'Operations',
        contact_details: 'alice@adaptavist.com',
        status: 'open',
        moderation_state: 'visible',
        vote_count: 8,
        flag_count: 2,
        created_by_user_id: 'user-1',
        claimed_by_user_id: null,
        linked_hack_project_id: null,
        linked_artifact_id: null,
        auto_hidden_at: null,
        hidden_at: null,
        closed_at: null,
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T02:00:00.000Z',
      }),
    };

    const result = await SupabaseRepository.prototype.flagProblem.call(fakeRepo, viewer, {
      problemId: 'problem-1',
      reason: 'Duplicate submission',
    });

    expect(result).toMatchObject({
      problemId: 'problem-1',
      flagCount: 3,
      alreadyFlagged: false,
      moderationState: 'hidden_pending_review',
      autoHidden: true,
    });
    expect(patchMany).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenCalledTimes(2);
  });
});
