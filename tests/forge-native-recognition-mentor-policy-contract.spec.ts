import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'acc-recognition',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('SupabaseRepository recognition signal policy contracts', () => {
  it('applies mentor_sessions_used policy and pathway completion policy with deterministic ranking', async () => {
    const selectMany = vi.fn(async (table: string) => {
      if (table === 'User') {
        return [
          {
            id: 'u-a',
            email: 'a@example.com',
            full_name: 'Alpha',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 3,
            happy_to_mentor: true,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'u-b',
            email: 'b@example.com',
            full_name: 'Bravo',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 5,
            happy_to_mentor: true,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'u-c',
            email: 'c@example.com',
            full_name: 'Charlie',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 5,
            happy_to_mentor: true,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'u-d',
            email: 'd@example.com',
            full_name: 'Delta',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 1,
            happy_to_mentor: true,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'u-e',
            email: 'e@example.com',
            full_name: 'Echo',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: -2,
            happy_to_mentor: true,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      if (table === 'ShowcaseHack') return [];
      if (table === 'Artifact') return [];
      if (table === 'ArtifactReuse') return [];
      if (table === 'Problem') return [];
      if (table === 'Team') return [];
      if (table === 'TeamMember') return [];
      if (table === 'PathwayProgress') {
        return [
          { user_id: 'u-a', pathway_id: 'path-1', step_id: 'step-1', completed_at: '2026-01-12T00:00:00.000Z' },
          { user_id: 'u-a', pathway_id: 'path-1', step_id: 'step-2', completed_at: '2026-01-13T00:00:00.000Z' },
          { user_id: 'u-b', pathway_id: 'path-1', step_id: 'step-1', completed_at: '2026-01-15T00:00:00.000Z' },
          { user_id: 'u-b', pathway_id: 'path-2', step_id: 'step-7', completed_at: '2026-01-20T00:00:00.000Z' },
          { user_id: 'u-c', pathway_id: 'path-2', step_id: 'step-8', completed_at: '2026-01-21T00:00:00.000Z' },
          { user_id: 'u-c', pathway_id: 'path-3', step_id: 'step-1', completed_at: '2026-01-22T00:00:00.000Z' },
          { user_id: 'u-c', pathway_id: 'path-3', step_id: 'step-2', completed_at: '2026-01-23T00:00:00.000Z' },
          { user_id: 'u-d', pathway_id: 'path-1', step_id: 'step-4', completed_at: '2026-01-11T00:00:00.000Z' },
        ];
      }
      return [];
    });

    const repo = new SupabaseRepository({ selectMany } as never);
    (repo as any).listProjects = vi.fn().mockResolvedValue([]);
    (repo as any).listAllEvents = vi.fn().mockResolvedValue([]);

    const result = await repo.getBootstrapData(viewer);

    expect(result.recognition?.mentorSignal.policyVersion).toBe('r8-mentor-sessions-used-v1');
    expect(result.recognition?.mentorSignal.policySource).toBe('User.mentor_sessions_used');
    expect(result.recognition?.mentorSignal.badgeThreshold).toBe(3);
    expect(result.recognition?.mentorSignal.qualifiedMentorChampionCount).toBe(3);
    expect(result.recognition?.mentorSignal.leaderboard).toEqual([
      {
        userId: 'u-b',
        userName: 'Bravo',
        mentorSessionsUsed: 5,
        rank: 1,
        qualifiesMentorChampion: true,
      },
      {
        userId: 'u-c',
        userName: 'Charlie',
        mentorSessionsUsed: 5,
        rank: 2,
        qualifiesMentorChampion: true,
      },
      {
        userId: 'u-a',
        userName: 'Alpha',
        mentorSessionsUsed: 3,
        rank: 3,
        qualifiesMentorChampion: true,
      },
      {
        userId: 'u-d',
        userName: 'Delta',
        mentorSessionsUsed: 1,
        rank: 4,
        qualifiesMentorChampion: false,
      },
    ]);
    expect(result.recognition?.pathwaySignal.policyVersion).toBe('r8-pathway-completion-v1');
    expect(result.recognition?.pathwaySignal.policySource).toBe('PathwayProgress');
    expect(result.recognition?.pathwaySignal.badgeThresholdDistinctPathways).toBe(1);
    expect(result.recognition?.pathwaySignal.qualifiedPathwayContributorCount).toBe(4);
    expect(result.recognition?.pathwaySignal.leaderboard).toEqual([
      {
        userId: 'u-c',
        userName: 'Charlie',
        distinctPathwayCount: 2,
        completedStepCount: 3,
        lastCompletedAt: '2026-01-23T00:00:00.000Z',
        rank: 1,
        qualifiesPathwayContributor: true,
      },
      {
        userId: 'u-b',
        userName: 'Bravo',
        distinctPathwayCount: 2,
        completedStepCount: 2,
        lastCompletedAt: '2026-01-20T00:00:00.000Z',
        rank: 2,
        qualifiesPathwayContributor: true,
      },
      {
        userId: 'u-a',
        userName: 'Alpha',
        distinctPathwayCount: 1,
        completedStepCount: 2,
        lastCompletedAt: '2026-01-13T00:00:00.000Z',
        rank: 3,
        qualifiesPathwayContributor: true,
      },
      {
        userId: 'u-d',
        userName: 'Delta',
        distinctPathwayCount: 1,
        completedStepCount: 1,
        lastCompletedAt: '2026-01-11T00:00:00.000Z',
        rank: 4,
        qualifiesPathwayContributor: true,
      },
    ]);
  });
});
