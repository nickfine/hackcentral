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
          { id: 'team-a', name: 'Alpha', business_unit: 'Operations' },
          { id: 'team-b', name: 'Beta', business_unit: 'Platform' },
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
                model: 'gpt-4o',
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
    expect(result.sources.costRateCard.status).toBe('available_partial');
    expect(result.sources.outputs.status).toBe('available');
    expect(result.sources.businessUnit.status).toBe('available');
    expect(result.totals.cost).toBeCloseTo(0.02, 2);
    expect(result.totals.outputs).toEqual({
      hacksCompleted: 2,
      artifactsPublished: 2,
      problemsSolved: 1,
      pipelineItemsProgressed: 2,
    });
    expect(result.totals.costPerOutput).toEqual({
      perHack: 0.01,
      perArtifact: 0.01,
      perProblemSolved: 0.02,
      perPipelineItemProgressed: 0.01,
    });
    expect(result.breakdowns.team[0]).toMatchObject({
      dimensionId: 'team-a',
      tokenVolume: 500,
      cost: 0.01,
    });
    expect(result.breakdowns.team[1]).toMatchObject({
      dimensionId: 'team-b',
      tokenVolume: 1000,
      cost: 0.01,
    });
    expect(result.breakdowns.businessUnit[0]).toMatchObject({
      dimensionId: 'Operations',
      tokenVolume: 500,
      cost: 0.01,
    });
    expect(result.trend.some((point) => point.tokenVolume > 0)).toBe(true);
    expect(result.trend.some((point) => (point.cost ?? 0) > 0)).toBe(true);
    expect(result.export.rows.length).toBeGreaterThan(5);
    expect(result.export.formattedSummary).toContain('Token volume=1500');
    expect(result.export.formattedSummary).toContain('Spend=£0.02');
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

  it('counts hack outputs from Project camelCase fields when explicit status is absent', async () => {
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
        ];
      }
      if (table === 'Project') {
        return [
          {
            id: 'p-camel-1',
            name: 'CamelCase Hack',
            source_type: 'hack_submission',
            teamId: 'team-a',
            ownerId: 'u-1',
            createdAt: '2026-03-01T11:52:58.023608+00:00',
          },
        ];
      }
      if (table === 'Team') {
        return [{ id: 'team-a', name: 'Alpha', business_unit: 'Operations' }];
      }
      if (table === 'TeamMember') {
        return [];
      }
      return [];
    });

    const repo = new SupabaseRepository({ selectOne, selectMany } as never);
    const result = await repo.getRoiDashboard(adminViewer, { window: 'monthly' });

    expect(result.totals.outputs.hacksCompleted).toBe(1);
    expect(result.breakdowns.team.length).toBe(1);
    expect(result.breakdowns.team[0]?.dimensionId).toBe('team-a');
    expect(result.breakdowns.businessUnit.length).toBe(1);
    expect(result.breakdowns.businessUnit[0]?.dimensionId).toBe('Operations');
  });

  it('accepts ACTIVE TeamMember status for ROI team attribution', async () => {
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
            id: 'u-active',
            email: 'active@example.com',
            full_name: 'Active User',
            atlassian_account_id: 'acc-active',
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      if (table === 'Project') {
        return [
          {
            id: 'p-active-1',
            name: 'Active Membership Hack',
            source_type: 'hack_submission',
            ownerId: 'u-active',
            createdAt: '2026-03-01T11:52:58.023608+00:00',
          },
        ];
      }
      if (table === 'Team') {
        return [{ id: 'team-active', name: 'Active Team', business_unit: 'Operations' }];
      }
      if (table === 'TeamMember') {
        return [
          {
            userId: 'u-active',
            teamId: 'team-active',
            role: 'MEMBER',
            status: 'ACTIVE',
            createdAt: '2026-01-02T00:00:00.000Z',
          },
        ];
      }
      return [];
    });

    const repo = new SupabaseRepository({ selectOne, selectMany } as never);
    const result = await repo.getRoiDashboard(adminViewer, { window: 'monthly' });

    expect(result.totals.outputs.hacksCompleted).toBe(1);
    expect(result.breakdowns.team.some((row) => row.dimensionId === 'team-active')).toBe(true);
    expect(result.breakdowns.businessUnit.some((row) => row.dimensionId === 'Operations')).toBe(true);
  });

  it('logs token-bearing ROI usage audit events for producer flow', async () => {
    const insert = vi.fn(async () => null);
    const selectOne = vi.fn(async () => ({
      id: 'u-admin',
      email: 'admin@example.com',
      full_name: 'Admin User',
      atlassian_account_id: 'acc-admin',
      role: 'ADMIN',
      capability_tags: [],
    }));
    const selectMany = vi.fn(async (table: string) => {
      if (table === 'EventAuditLog') return [];
      return [];
    });
    const deleteMany = vi.fn(async () => []);

    const repo = new SupabaseRepository({ selectOne, selectMany, insert, deleteMany } as never);
    const result = await repo.logRoiTokenUsage(adminViewer, {
      eventId: 'event-live',
      promptTokens: 600,
      completionTokens: 400,
      model: 'gpt-4o',
      source: 'unit-test',
      metadata: { requestId: 'req-1' },
    });

    expect(result.logged).toBe(true);
    expect(result.action).toBe('llm_usage_logged');
    expect(result.eventId).toBe('event-live');
    expect(result.actorUserId).toBe('u-admin');
    expect(result.tokenVolume).toBe(1000);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      'EventAuditLog',
      expect.objectContaining({
        event_id: 'event-live',
        actor_user_id: 'u-admin',
        action: 'llm_usage_logged',
        new_value: expect.objectContaining({
          tokenVolume: 1000,
          model: 'gpt-4o',
          source: 'unit-test',
          usage: expect.objectContaining({
            prompt_tokens: 600,
            completion_tokens: 400,
          }),
        }),
      })
    );
  });

  it('rejects non-admin ROI token producer writes', async () => {
    const repo = new SupabaseRepository({
      selectOne: vi.fn().mockResolvedValue({
        id: 'u-member',
        role: 'MEMBER',
        capability_tags: [],
      }),
      selectMany: vi.fn(),
      insert: vi.fn(),
      deleteMany: vi.fn(),
    } as never);

    await expect(
      repo.logRoiTokenUsage(adminViewer, {
        eventId: 'event-live',
        tokenVolume: 123,
      })
    ).rejects.toThrow('[ROI_USAGE_FORBIDDEN]');
  });
});
