import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'acc-team-pulse',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('SupabaseRepository Team Pulse metrics contracts', () => {
  it('computes R7 baseline metrics from Supabase activity data', async () => {
    const selectMany = vi.fn(async (table: string) => {
      if (table === 'User') {
        return [
          {
            id: 'u-1',
            email: 'u1@example.com',
            full_name: 'User One',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 0,
            happy_to_mentor: false,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'u-2',
            email: 'u2@example.com',
            full_name: 'User Two',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 0,
            happy_to_mentor: false,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'u-3',
            email: 'u3@example.com',
            full_name: 'User Three',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 0,
            happy_to_mentor: false,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-10T00:00:00.000Z',
          },
        ];
      }
      if (table === 'ShowcaseHack') return [];
      if (table === 'Artifact') {
        return [
          {
            id: 'a-1',
            title: 'Artifact One',
            description: '',
            artifact_type: 'prompt',
            tags: [],
            source_url: 'https://example.com/a1',
            source_label: null,
            source_hack_project_id: 'p-1',
            source_hackday_event_id: null,
            created_by_user_id: 'u-1',
            visibility: 'org',
            reuse_count: 2,
            created_at: '2026-01-05T00:00:00.000Z',
            updated_at: '2026-01-06T00:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'a-2',
            title: 'Artifact Two',
            description: '',
            artifact_type: 'prompt',
            tags: [],
            source_url: 'https://example.com/a2',
            source_label: null,
            source_hack_project_id: 'p-2',
            source_hackday_event_id: null,
            created_by_user_id: 'u-2',
            visibility: 'org',
            reuse_count: 0,
            created_at: '2026-01-20T00:00:00.000Z',
            updated_at: '2026-01-21T00:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'a-3',
            title: 'Artifact Three',
            description: '',
            artifact_type: 'prompt',
            tags: [],
            source_url: 'https://example.com/a3',
            source_label: null,
            source_hack_project_id: null,
            source_hackday_event_id: null,
            created_by_user_id: 'u-3',
            visibility: 'org',
            reuse_count: 1,
            created_at: '2026-01-22T00:00:00.000Z',
            updated_at: '2026-01-22T00:00:00.000Z',
            archived_at: null,
          },
        ];
      }
      if (table === 'ArtifactReuse') {
        return [
          { artifact_id: 'a-1', user_id: 'u-2' },
          { artifact_id: 'a-1', user_id: 'u-3' },
          { artifact_id: 'a-1', user_id: 'u-1' },
        ];
      }
      if (table === 'Problem') {
        return [
          { id: 'pr-1', status: 'solved', moderation_state: 'visible' },
          { id: 'pr-2', status: 'open', moderation_state: 'visible' },
          { id: 'pr-3', status: 'solved', moderation_state: 'removed' },
        ];
      }
      if (table === 'Team') {
        return [
          { id: 'team-a', name: 'Alpha' },
          { id: 'team-b', name: 'Beta' },
        ];
      }
      if (table === 'TeamMember') {
        return [
          { user_id: 'u-1', team_id: 'team-a', status: 'ACCEPTED' },
          { user_id: 'u-2', team_id: 'team-b', status: 'ACCEPTED' },
          { user_id: 'u-3', team_id: 'team-b', status: 'ACCEPTED' },
        ];
      }
      return [];
    });

    const repo = new SupabaseRepository({ selectMany } as never);
    (repo as any).listProjects = vi.fn().mockResolvedValue([
      {
        id: 'p-1',
        title: 'Hack One',
        description: '',
        status: 'completed',
        hack_type: 'prompt',
        visibility: 'org',
        owner_id: 'u-1',
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
        id: 'p-2',
        title: 'Hack Two',
        description: '',
        status: 'completed',
        hack_type: 'prompt',
        visibility: 'org',
        owner_id: 'u-2',
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
        pipeline_stage_entered_at: '2026-01-20T00:00:00.000Z',
        created_at: '2026-01-20T00:00:00.000Z',
      },
    ]);
    (repo as any).listAllEvents = vi.fn().mockResolvedValue([]);

    const result = await repo.getBootstrapData(viewer);

    expect(result.teamPulse).toBeTruthy();
    expect(result.teamPulse).toMatchObject({
      reuseRatePct: 66.7,
      reusedArtifactCount: 2,
      totalArtifactCount: 3,
      crossTeamAdoptionCount: 2,
      timeToFirstHackMedianDays: 11.5,
      timeToFirstHackSampleSize: 2,
      problemConversionPct: 50,
      solvedProblemCount: 1,
      totalProblemCount: 2,
    });
    expect(result.teamPulse?.crossTeamAdoptionEdges).toEqual([
      {
        sourceTeamId: 'team-a',
        sourceTeamLabel: 'Alpha',
        targetTeamId: 'team-b',
        targetTeamLabel: 'Beta',
        reuseCount: 2,
      },
    ]);
    expect(result.teamPulse?.timeToFirstHackTrend).toEqual([
      {
        periodStart: '2026-01-01T00:00:00.000Z',
        periodLabel: '2026-01',
        medianDays: 11.5,
        sampleSize: 2,
      },
    ]);
  });

  it('uses deterministic primary-team selection for multi-team adopters', async () => {
    const selectMany = vi.fn(async (table: string) => {
      if (table === 'User') {
        return [
          {
            id: 'u-1',
            email: 'u1@example.com',
            full_name: 'User One',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 0,
            happy_to_mentor: false,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'u-2',
            email: 'u2@example.com',
            full_name: 'User Two',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 0,
            happy_to_mentor: false,
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
            id: 'a-1',
            title: 'Artifact One',
            description: '',
            artifact_type: 'prompt',
            tags: [],
            source_url: 'https://example.com/a1',
            source_label: null,
            source_hack_project_id: 'p-1',
            source_hackday_event_id: null,
            created_by_user_id: 'u-1',
            visibility: 'org',
            reuse_count: 1,
            created_at: '2026-01-05T00:00:00.000Z',
            updated_at: '2026-01-06T00:00:00.000Z',
            archived_at: null,
          },
        ];
      }
      if (table === 'ArtifactReuse') {
        return [{ artifact_id: 'a-1', user_id: 'u-2' }];
      }
      if (table === 'Problem') return [];
      if (table === 'Team') {
        return [
          { id: 'team-a', name: 'Alpha' },
          { id: 'team-b', name: 'Beta' },
          { id: 'team-c', name: 'Gamma' },
          { id: 'team-z', name: 'Zeta' },
        ];
      }
      if (table === 'TeamMember') {
        return [
          { userId: 'u-2', teamId: 'team-z', role: 'MEMBER', status: 'ACCEPTED', createdAt: '2025-01-01T00:00:00.000Z' },
          { userId: 'u-2', teamId: 'team-c', role: 'OWNER', status: 'ACCEPTED', createdAt: '2025-06-01T00:00:00.000Z' },
          { userId: 'u-2', teamId: 'team-b', role: 'OWNER', status: 'ACCEPTED', createdAt: '2025-06-01T00:00:00.000Z' },
          { userId: 'u-1', teamId: 'team-a', role: 'OWNER', status: 'ACCEPTED', createdAt: '2024-01-01T00:00:00.000Z' },
        ];
      }
      return [];
    });

    const repo = new SupabaseRepository({ selectMany } as never);
    (repo as any).listProjects = vi.fn().mockResolvedValue([
      {
        id: 'p-1',
        title: 'Hack One',
        description: '',
        status: 'completed',
        hack_type: 'prompt',
        visibility: 'org',
        owner_id: 'u-1',
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
    ]);
    (repo as any).listAllEvents = vi.fn().mockResolvedValue([]);

    const result = await repo.getBootstrapData(viewer);

    expect(result.teamPulse?.crossTeamAdoptionCount).toBe(1);
    expect(result.teamPulse?.crossTeamAdoptionEdges).toEqual([
      {
        sourceTeamId: 'team-a',
        sourceTeamLabel: 'Alpha',
        targetTeamId: 'team-b',
        targetTeamLabel: 'Beta',
        reuseCount: 1,
      },
    ]);
  });

  it('falls back to User.createdAt when User.created_at is unavailable', async () => {
    const selectMany = vi.fn(async (table: string, columns?: string) => {
      if (table === 'User') {
        if ((columns ?? '').includes('created_at')) {
          throw new Error('column User.created_at does not exist');
        }
        return [
          {
            id: 'u-legacy',
            email: 'legacy@example.com',
            full_name: 'Legacy User',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 0,
            happy_to_mentor: false,
            seeking_mentor: false,
            capability_tags: [],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      if (table === 'ShowcaseHack') return [];
      if (table === 'Artifact') return [];
      if (table === 'ArtifactReuse') return [];
      if (table === 'Problem') return [];
      if (table === 'Team') return [];
      if (table === 'TeamMember') return [];
      return [];
    });

    const repo = new SupabaseRepository({ selectMany } as never);
    (repo as any).listProjects = vi.fn().mockResolvedValue([
      {
        id: 'p-legacy',
        title: 'Legacy Hack',
        description: '',
        status: 'completed',
        hack_type: 'prompt',
        visibility: 'org',
        owner_id: 'u-legacy',
        workflow_transformed: false,
        ai_impact_hypothesis: null,
        ai_tools_used: [],
        time_saved_estimate: null,
        failures_and_lessons: null,
        source_type: 'hack_submission',
        team_id: null,
        synced_to_library_at: null,
        event_id: null,
        pipeline_stage: 'hack',
        pipeline_stage_entered_at: '2026-01-20T00:00:00.000Z',
        created_at: '2026-01-20T00:00:00.000Z',
      },
    ]);
    (repo as any).listAllEvents = vi.fn().mockResolvedValue([]);

    const result = await repo.getBootstrapData(viewer);

    expect(result.teamPulse?.timeToFirstHackSampleSize).toBe(1);
    expect(result.teamPulse?.timeToFirstHackMedianDays).toBe(19);
  });
});
