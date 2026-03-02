import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'acc-123',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('SupabaseRepository pipeline contracts', () => {
  it('builds pipeline board with ordered stages, metrics, and manage capability', async () => {
    const selectMany = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'user-1', full_name: 'Alice', email: 'alice@adaptavist.com' }])
      .mockResolvedValueOnce([]);

    const fakeRepo = {
      client: { selectMany },
      canUserManagePipeline: vi.fn().mockResolvedValue(true),
      listProjects: vi.fn().mockResolvedValue([
        {
          id: 'project-hack',
          title: 'Hack Stage Item',
          description: 'Still early stage.',
          owner_id: 'user-1',
          status: 'idea',
          visibility: 'org',
          time_saved_estimate: 2,
          pipeline_stage: 'hack',
          pipeline_stage_entered_at: '2026-02-27T00:00:00.000Z',
          created_at: '2026-02-27T00:00:00.000Z',
        },
        {
          id: 'project-candidate',
          title: 'Candidate Item',
          description: 'Ready for candidate review.',
          owner_id: 'user-1',
          status: 'completed',
          visibility: 'org',
          time_saved_estimate: 8,
          pipeline_stage: 'product_candidate',
          pipeline_stage_entered_at: '2026-02-28T00:00:00.000Z',
          created_at: '2026-02-28T00:00:00.000Z',
        },
      ]),
    };

    const result = await SupabaseRepository.prototype.getPipelineBoard.call(fakeRepo, viewer, {
      limit: 20,
    });

    expect(result.canManage).toBe(true);
    expect(result.items.map((item) => item.projectId)).toEqual(['project-hack', 'project-candidate']);
    expect(result.itemsPerStage).toBeUndefined();
    expect(result.metrics.itemsPerStage).toEqual([
      { stage: 'hack', count: 1 },
      { stage: 'validated_prototype', count: 0 },
      { stage: 'incubating_project', count: 0 },
      { stage: 'product_candidate', count: 1 },
    ]);
    expect(result.stageCriteria.length).toBe(4);
  });

  it('moves pipeline items with audit note and transition telemetry payload contract', async () => {
    const patchMany = vi.fn().mockResolvedValue([]);
    const insert = vi.fn().mockResolvedValue({ id: 'transition-1' });

    const fakeRepo = {
      client: { patchMany, insert },
      ensureUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
      getProjectById: vi.fn().mockResolvedValue({
        id: 'project-1',
        title: 'Ops Assistant',
        description: 'Automates status summaries.',
        owner_id: 'user-1',
        status: 'in_progress',
        visibility: 'org',
        time_saved_estimate: 4,
        pipeline_stage: 'hack',
        pipeline_stage_entered_at: '2026-03-01T00:00:00.000Z',
        created_at: '2026-03-01T00:00:00.000Z',
      }),
    };

    const result = await SupabaseRepository.prototype.movePipelineItem.call(fakeRepo, viewer, {
      projectId: 'project-1',
      toStage: 'validated_prototype',
      note: 'Validated with pilot users',
    });

    expect(result).toMatchObject({
      projectId: 'project-1',
      fromStage: 'hack',
      toStage: 'validated_prototype',
      note: 'Validated with pilot users',
    });
    expect(patchMany).toHaveBeenCalledWith(
      'Project',
      expect.objectContaining({ pipeline_stage: 'validated_prototype' }),
      [{ field: 'id', op: 'eq', value: 'project-1' }]
    );
    expect(insert).toHaveBeenCalledWith(
      'PipelineTransitionLog',
      expect.objectContaining({
        project_id: 'project-1',
        from_stage: 'hack',
        to_stage: 'validated_prototype',
      })
    );
  });

  it('updates stage criteria with validation and persisted row contract', async () => {
    const selectOne = vi.fn().mockResolvedValue({
      stage: 'validated_prototype',
      label: 'Validated Prototype',
      description: 'Existing description',
      criteria: ['Existing criteria'],
      updated_at: '2026-03-01T00:00:00.000Z',
    });
    const upsert = vi.fn().mockResolvedValue({
      stage: 'validated_prototype',
      label: 'Validated',
      description: 'Validated with user feedback',
      criteria: ['Pilot evidence', 'Documented outcomes'],
      updated_at: '2026-03-02T00:00:00.000Z',
    });

    const fakeRepo = {
      client: { selectOne, upsert },
      ensureUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
    };

    const result = await SupabaseRepository.prototype.updatePipelineStageCriteria.call(fakeRepo, viewer, {
      stage: 'validated_prototype',
      label: 'Validated',
      description: 'Validated with user feedback',
      criteria: ['Pilot evidence', 'Documented outcomes'],
    });

    expect(result.stageCriteria).toEqual({
      stage: 'validated_prototype',
      label: 'Validated',
      description: 'Validated with user feedback',
      criteria: ['Pilot evidence', 'Documented outcomes'],
      updatedAt: '2026-03-02T00:00:00.000Z',
    });
    expect(upsert).toHaveBeenCalledWith(
      'PipelineStageCriteria',
      expect.objectContaining({
        stage: 'validated_prototype',
        updated_by_user_id: 'user-1',
      }),
      'stage'
    );
  });
});
