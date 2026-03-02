import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'acc-feed-viewer',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('SupabaseRepository home feed contracts', () => {
  it('returns R12 activity feed and personalized recommendation categories', async () => {
    const selectMany = vi.fn(async (table: string) => {
      if (table === 'User') {
        return [
          {
            id: 'u-viewer',
            email: 'viewer@example.com',
            full_name: 'Viewer User',
            atlassian_account_id: 'acc-feed-viewer',
            experience_level: 'power_user',
            capability_tags: ['ops_automation'],
          },
          {
            id: 'u-teammate',
            email: 'teammate@example.com',
            full_name: 'Teammate User',
            atlassian_account_id: 'acc-feed-teammate',
            experience_level: 'comfortable',
            capability_tags: [],
          },
        ];
      }
      if (table === 'Artifact') {
        return [
          {
            id: 'artifact-1',
            title: 'Incident triage prompt',
            created_by_user_id: 'u-teammate',
            reuse_count: 5,
            source_hack_project_id: 'hack-1',
            created_at: '2026-03-01T10:00:00.000Z',
            updated_at: '2026-03-01T10:00:00.000Z',
            archived_at: null,
          },
        ];
      }
      if (table === 'Problem') {
        return [
          {
            id: 'problem-1',
            title: 'Manual triage handoffs',
            domain: 'Operations',
            team: 'Alpha Team',
            status: 'open',
            moderation_state: 'visible',
            vote_count: 11,
            created_by_user_id: 'u-viewer',
            claimed_by_user_id: null,
            created_at: '2026-03-01T09:00:00.000Z',
            updated_at: '2026-03-01T11:00:00.000Z',
          },
        ];
      }
      if (table === 'PipelineTransitionLog') {
        return [
          {
            id: 'move-1',
            project_id: 'hack-1',
            from_stage: 'hack',
            to_stage: 'validated_prototype',
            note: 'Validated in user interviews',
            changed_by_user_id: 'u-teammate',
            changed_at: '2026-03-01T12:00:00.000Z',
          },
        ];
      }
      if (table === 'Team') {
        return [{ id: 'team-alpha', name: 'Alpha Team' }];
      }
      if (table === 'TeamMember') {
        return [
          {
            user_id: 'u-viewer',
            team_id: 'team-alpha',
            role: 'OWNER',
            status: 'ACCEPTED',
            created_at: '2025-02-01T00:00:00.000Z',
          },
          {
            user_id: 'u-teammate',
            team_id: 'team-alpha',
            role: 'MEMBER',
            status: 'ACCEPTED',
            created_at: '2025-02-01T00:00:00.000Z',
          },
        ];
      }
      if (table === 'ArtifactReuse') {
        return [{ artifact_id: 'artifact-1', user_id: 'u-teammate' }];
      }
      if (table === 'Pathway') {
        return [
          {
            id: 'path-1',
            title: 'Power User Ops Pathway',
            summary: 'Workflow for scaling ops automation',
            domain: 'Operations',
            role: 'power user',
            tags: ['ops', 'automation'],
            published: true,
            recommended: true,
            updated_at: '2026-03-01T08:00:00.000Z',
          },
        ];
      }
      return [];
    });

    const repo = new SupabaseRepository({ selectMany } as never);
    Reflect.set(repo, 'listProjects', vi.fn().mockResolvedValue([
      {
        id: 'hack-1',
        title: 'Ops copilot',
        description: 'Reduce incident response cycles',
        status: 'completed',
        hack_type: 'app',
        visibility: 'org',
        owner_id: 'u-viewer',
        workflow_transformed: true,
        ai_impact_hypothesis: null,
        ai_tools_used: [],
        time_saved_estimate: null,
        failures_and_lessons: null,
        source_type: 'hack_submission',
        team_id: 'team-alpha',
        synced_to_library_at: null,
        event_id: null,
        pipeline_stage: 'hack',
        pipeline_stage_entered_at: '2026-03-01T09:00:00.000Z',
        created_at: '2026-03-01T09:00:00.000Z',
      },
    ]));
    Reflect.set(repo, 'listAllEvents', vi.fn().mockResolvedValue([
      {
        id: 'event-upcoming',
        eventName: 'AI Sprint April',
        icon: '🚀',
        tagline: 'Two-day focused delivery sprint',
        runtimeType: 'hdc_native',
        templateTarget: null,
        lifecycleStatus: 'registration_open',
        confluencePageId: '12345',
        isNavigable: true,
        confluenceParentPageId: null,
        schedule: { timezone: 'Europe/London' },
        hackingStartsAt: '2026-04-10T09:00:00.000Z',
        submissionDeadlineAt: '2026-04-11T17:00:00.000Z',
        rules: {
          allowCrossTeamMentoring: true,
          maxTeamSize: 6,
          requireDemoLink: false,
          judgingModel: 'hybrid',
        },
        branding: {
          accentColor: '#14b8a6',
        },
      },
    ]));

    const result = await repo.getHomeFeed(viewer, {
      limit: 20,
      recommendationLimit: 6,
      includeRecommendations: true,
    });

    expect(result.policyVersion).toBe('r12-home-feed-v1');
    expect(result.items.length).toBeGreaterThanOrEqual(5);
    expect(Array.from(new Set(result.items.map((item) => item.type)))).toEqual(
      expect.arrayContaining([
        'new_hack',
        'trending_problem',
        'new_artifact',
        'pipeline_movement',
        'upcoming_hackday',
      ])
    );

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(Array.from(new Set(result.recommendations.map((item) => item.type)))).toEqual(
      expect.arrayContaining(['problem_domain', 'team_artifact', 'pathway_role'])
    );

    expect(result.sources.activities.status).toBe('available');
    expect(result.sources.recommendations.status).toBe('available');
  });
});
