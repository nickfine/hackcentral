import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const adminViewer: ViewerContext = {
  accountId: 'acc-admin',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('SupabaseRepository ROI scaffold contracts', () => {
  it('returns R9 scaffold payload with token-volume source mapping and unresolved cost source', async () => {
    const selectOne = vi.fn(async (table: string) => {
      if (table === 'User') {
        return {
          id: 'u-admin',
          role: 'ADMIN',
          capability_tags: [],
        };
      }
      return null;
    });

    const selectMany = vi.fn(async (table: string) => {
      if (table === 'User') {
        return [
          {
            id: 'u-admin',
            email: 'admin@example.com',
            full_name: 'Admin User',
            atlassian_account_id: 'acc-admin',
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'u-1',
            email: 'u1@example.com',
            full_name: 'User One',
            atlassian_account_id: 'acc-u1',
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'u-2',
            email: 'u2@example.com',
            full_name: 'User Two',
            atlassian_account_id: 'acc-u2',
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
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
            reuse_count: 0,
            created_at: '2026-01-06T00:00:00.000Z',
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
            created_at: '2026-02-08T00:00:00.000Z',
            updated_at: '2026-02-08T00:00:00.000Z',
            archived_at: null,
          },
        ];
      }
      if (table === 'Problem') {
        return [
          {
            id: 'pr-1',
            status: 'solved',
            moderation_state: 'visible',
            claimed_by_user_id: 'u-1',
            created_at: '2026-01-09T00:00:00.000Z',
            updated_at: '2026-01-10T00:00:00.000Z',
          },
          {
            id: 'pr-2',
            status: 'open',
            moderation_state: 'visible',
            claimed_by_user_id: null,
            created_at: '2026-02-09T00:00:00.000Z',
            updated_at: '2026-02-09T00:00:00.000Z',
          },
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
          { userId: 'u-1', teamId: 'team-a', role: 'OWNER', status: 'ACCEPTED', createdAt: '2025-01-01T00:00:00.000Z' },
          { userId: 'u-2', teamId: 'team-b', role: 'MEMBER', status: 'ACCEPTED', createdAt: '2025-01-01T00:00:00.000Z' },
          { userId: 'u-admin', teamId: 'team-a', role: 'ADMIN', status: 'ACCEPTED', createdAt: '2025-01-01T00:00:00.000Z' },
        ];
      }
      if (table === 'PipelineTransitionLog') {
        return [
          {
            id: 't-1',
            project_id: 'p-1',
            from_stage: 'hack',
            to_stage: 'validated_prototype',
            note: 'Promoted',
            changed_by_user_id: 'u-1',
            changed_at: '2026-01-11T00:00:00.000Z',
          },
          {
            id: 't-2',
            project_id: 'p-2',
            from_stage: 'hack',
            to_stage: 'validated_prototype',
            note: 'Promoted',
            changed_by_user_id: 'u-2',
            changed_at: '2026-02-12T00:00:00.000Z',
          },
        ];
      }
      if (table === 'EventAuditLog') {
        return [
          {
            id: 'audit-1',
            event_id: 'event-1',
            actor_user_id: 'u-1',
            action: 'llm_usage_logged',
            new_value: {
              usage: {
                prompt_tokens: 300,
                completion_tokens: 200,
              },
            },
            created_at: '2026-01-11T00:00:00.000Z',
          },
          {
            id: 'audit-2',
            event_id: 'event-2',
            actor_user_id: 'u-2',
            action: 'llm_usage_logged',
            new_value: {
              tokenVolume: 1000,
            },
            created_at: '2026-02-12T00:00:00.000Z',
          },
          {
            id: 'audit-3',
            event_id: 'event-3',
            actor_user_id: 'u-admin',
            action: 'event_created',
            new_value: {
              rules: {
                judgingModel: 'hybrid',
              },
            },
            created_at: '2026-02-20T00:00:00.000Z',
          },
        ];
      }
      return [];
    });

    const repo = new SupabaseRepository({ selectOne, selectMany } as never);
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
        pipeline_stage_entered_at: '2026-02-07T00:00:00.000Z',
        created_at: '2026-02-07T00:00:00.000Z',
      },
    ]);

    const result = await repo.getRoiDashboard(adminViewer, { window: 'monthly' });

    expect(result.policyVersion).toBe('r9-roi-scaffold-v1');
    expect(result.window).toBe('monthly');
    expect(result.sources.tokenVolume.status).toBe('available_partial');
    expect(result.totals.tokenVolume).toBe(1500);
    expect(result.sources.costRateCard.status).toBe('unavailable');
    expect(result.sources.outputs.status).toBe('available_partial');
    expect(result.totals.outputs).toEqual({
      hacksCompleted: 2,
      artifactsPublished: 2,
      problemsSolved: 1,
      pipelineItemsProgressed: 2,
    });
    expect(result.breakdowns.team[0]).toMatchObject({
      dimensionId: 'team-a',
      tokenVolume: 500,
    });
    expect(result.breakdowns.team[1]).toMatchObject({
      dimensionId: 'team-b',
      tokenVolume: 1000,
    });
    expect(result.trend.some((point) => point.tokenVolume > 0)).toBe(true);
    expect(result.export.rows.length).toBeGreaterThan(5);
    expect(result.export.formattedSummary).toContain('Token volume=1500');
    expect(result.export.formattedSummary).toContain('Cost metrics are pending rate-card sources.');
  });

  it('rejects non-admin viewers', async () => {
    const repo = new SupabaseRepository({
      selectOne: vi.fn().mockResolvedValue({
        id: 'u-member',
        role: 'MEMBER',
        capability_tags: [],
      }),
      selectMany: vi.fn(),
    } as never);

    await expect(repo.getRoiDashboard(adminViewer, {})).rejects.toThrow('[ROI_FORBIDDEN]');
  });
});
