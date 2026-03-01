import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'u-a',
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
      if (table === 'Artifact') {
        return [
          {
            id: 'artifact-a1',
            title: 'Artifact A1',
            description: '',
            artifact_type: 'prompt',
            tags: [],
            source_url: 'https://example.com/a1',
            source_label: null,
            source_hack_project_id: 'p-a1',
            source_hackday_event_id: null,
            created_by_user_id: 'u-a',
            visibility: 'org',
            reuse_count: 4,
            created_at: '2026-01-02T00:00:00.000Z',
            updated_at: '2026-01-02T00:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'artifact-a2',
            title: 'Artifact A2',
            description: '',
            artifact_type: 'prompt',
            tags: [],
            source_url: 'https://example.com/a2',
            source_label: null,
            source_hack_project_id: 'p-a2',
            source_hackday_event_id: null,
            created_by_user_id: 'u-a',
            visibility: 'org',
            reuse_count: 1,
            created_at: '2026-01-03T00:00:00.000Z',
            updated_at: '2026-01-03T00:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'artifact-b1',
            title: 'Artifact B1',
            description: '',
            artifact_type: 'prompt',
            tags: [],
            source_url: 'https://example.com/b1',
            source_label: null,
            source_hack_project_id: 'p-b1',
            source_hackday_event_id: null,
            created_by_user_id: 'u-b',
            visibility: 'org',
            reuse_count: 2,
            created_at: '2026-01-04T00:00:00.000Z',
            updated_at: '2026-01-04T00:00:00.000Z',
            archived_at: null,
          },
        ];
      }
      if (table === 'ArtifactReuse') return [];
      if (table === 'Problem') {
        return [
          {
            id: 'pr-a',
            title: 'Problem A',
            description: '',
            frequency: 'weekly',
            estimated_time_wasted_hours: 0,
            team: 'alpha',
            domain: 'ops',
            contact_details: '',
            status: 'solved',
            moderation_state: 'visible',
            vote_count: 0,
            flag_count: 0,
            created_by_user_id: 'u-e',
            claimed_by_user_id: 'u-a',
            linked_hack_project_id: 'p-a1',
            linked_artifact_id: null,
            auto_hidden_at: null,
            hidden_at: null,
            closed_at: null,
            created_at: '2026-01-08T00:00:00.000Z',
            updated_at: '2026-01-08T00:00:00.000Z',
          },
          {
            id: 'pr-b',
            title: 'Problem B',
            description: '',
            frequency: 'weekly',
            estimated_time_wasted_hours: 0,
            team: 'beta',
            domain: 'ops',
            contact_details: '',
            status: 'solved',
            moderation_state: 'visible',
            vote_count: 0,
            flag_count: 0,
            created_by_user_id: 'u-e',
            claimed_by_user_id: 'u-b',
            linked_hack_project_id: 'p-b1',
            linked_artifact_id: null,
            auto_hidden_at: null,
            hidden_at: null,
            closed_at: null,
            created_at: '2026-01-09T00:00:00.000Z',
            updated_at: '2026-01-09T00:00:00.000Z',
          },
          {
            id: 'pr-c',
            title: 'Problem C',
            description: '',
            frequency: 'weekly',
            estimated_time_wasted_hours: 0,
            team: 'beta',
            domain: 'ops',
            contact_details: '',
            status: 'open',
            moderation_state: 'visible',
            vote_count: 0,
            flag_count: 0,
            created_by_user_id: 'u-e',
            claimed_by_user_id: null,
            linked_hack_project_id: null,
            linked_artifact_id: null,
            auto_hidden_at: null,
            hidden_at: null,
            closed_at: null,
            created_at: '2026-01-10T00:00:00.000Z',
            updated_at: '2026-01-10T00:00:00.000Z',
          },
        ];
      }
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
    (repo as any).listProjects = vi.fn().mockResolvedValue([
      {
        id: 'p-a1',
        title: 'Hack A1',
        description: '',
        status: 'completed',
        hack_type: 'prompt',
        visibility: 'org',
        owner_id: 'u-a',
        workflow_transformed: false,
        ai_impact_hypothesis: null,
        ai_tools_used: [],
        time_saved_estimate: null,
        failures_and_lessons: null,
        source_type: 'hack_submission',
        team_id: 'team-a',
        synced_to_library_at: null,
        event_id: null,
        pipeline_stage: 'hack',
        pipeline_stage_entered_at: '2026-01-05T00:00:00.000Z',
        created_at: '2026-01-05T00:00:00.000Z',
      },
      {
        id: 'p-a2',
        title: 'Hack A2',
        description: '',
        status: 'completed',
        hack_type: 'prompt',
        visibility: 'org',
        owner_id: 'u-a',
        workflow_transformed: false,
        ai_impact_hypothesis: null,
        ai_tools_used: [],
        time_saved_estimate: null,
        failures_and_lessons: null,
        source_type: 'hack_submission',
        team_id: 'team-a',
        synced_to_library_at: null,
        event_id: null,
        pipeline_stage: 'hack',
        pipeline_stage_entered_at: '2026-01-06T00:00:00.000Z',
        created_at: '2026-01-06T00:00:00.000Z',
      },
      {
        id: 'p-b1',
        title: 'Hack B1',
        description: '',
        status: 'completed',
        hack_type: 'prompt',
        visibility: 'org',
        owner_id: 'u-b',
        workflow_transformed: false,
        ai_impact_hypothesis: null,
        ai_tools_used: [],
        time_saved_estimate: null,
        failures_and_lessons: null,
        source_type: 'hack_submission',
        team_id: 'team-b',
        synced_to_library_at: null,
        event_id: null,
        pipeline_stage: 'hack',
        pipeline_stage_entered_at: '2026-01-07T00:00:00.000Z',
        created_at: '2026-01-07T00:00:00.000Z',
      },
    ]);
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
    expect(result.recognition?.leaderboards.builders).toEqual([
      { userId: 'u-a', userName: 'Alpha', count: 2, rank: 1 },
      { userId: 'u-b', userName: 'Bravo', count: 1, rank: 2 },
    ]);
    expect(result.recognition?.leaderboards.sharers).toEqual([
      { userId: 'u-a', userName: 'Alpha', count: 2, rank: 1 },
      { userId: 'u-b', userName: 'Bravo', count: 1, rank: 2 },
    ]);
    expect(result.recognition?.leaderboards.solvers).toEqual([
      { userId: 'u-a', userName: 'Alpha', count: 1, rank: 1 },
      { userId: 'u-b', userName: 'Bravo', count: 1, rank: 2 },
    ]);
    expect(result.recognition?.leaderboards.mentors).toEqual([
      { userId: 'u-b', userName: 'Bravo', count: 5, rank: 1 },
      { userId: 'u-c', userName: 'Charlie', count: 5, rank: 2 },
      { userId: 'u-a', userName: 'Alpha', count: 3, rank: 3 },
      { userId: 'u-d', userName: 'Delta', count: 1, rank: 4 },
    ]);
    expect(result.recognition?.viewerBadges).toEqual({
      firstArtifactPublished: true,
      firstProblemSolved: true,
      fiveArtifactsReused: true,
      mentoredThreePeople: true,
      contributedToPathway: true,
    });
  });
});
