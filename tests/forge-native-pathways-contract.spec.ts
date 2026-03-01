import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'acc-123',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('SupabaseRepository pathways contracts', () => {
  it('lists published pathways with progress snapshot', async () => {
    const selectMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'path-1',
          title: 'Finance Starter Pathway',
          summary: 'Learn reusable AI workflows for finance teams.',
          intro_text: 'Start with read, then try, then build.',
          domain: 'Finance',
          role: 'Analyst',
          tags: ['finance', 'starter'],
          published: true,
          recommended: true,
          created_by_user_id: 'user-1',
          updated_by_user_id: 'user-1',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T01:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'step-1',
          pathway_id: 'path-1',
          position: 1,
          step_type: 'read',
          title: 'Read the intro',
          description: 'Understand pathway goals',
          linked_hack_project_id: null,
          linked_artifact_id: null,
          external_url: 'https://example.com/readme',
          challenge_prompt: null,
          is_optional: false,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
        {
          id: 'step-2',
          pathway_id: 'path-1',
          position: 2,
          step_type: 'build',
          title: 'Build your first automation',
          description: 'Create a workflow using an existing artifact',
          linked_hack_project_id: null,
          linked_artifact_id: 'artifact-1',
          external_url: null,
          challenge_prompt: 'Automate month-end reporting',
          is_optional: false,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([{ id: 'user-1', full_name: 'Alice', email: 'alice@adaptavist.com' }])
      .mockResolvedValueOnce([
        {
          id: 'prog-1',
          pathway_id: 'path-1',
          step_id: 'step-1',
          user_id: 'viewer-user',
          completed_at: '2026-03-01T02:00:00.000Z',
          created_at: '2026-03-01T02:00:00.000Z',
        },
      ]);

    const repo = new SupabaseRepository({ selectMany } as never);
    (repo as any).canUserManagePathways = vi.fn().mockResolvedValue(false);
    (repo as any).getUserByAccountId = vi.fn().mockResolvedValue({
      id: 'viewer-user',
      capability_tags: ['domain:finance', 'role:analyst'],
    });

    const result = await repo.listPathways(viewer, { limit: 10 });

    expect(result.canManage).toBe(false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      pathwayId: 'path-1',
      title: 'Finance Starter Pathway',
      domain: 'Finance',
      role: 'Analyst',
      stepCount: 2,
      recommended: true,
      progress: {
        completedSteps: 1,
        totalSteps: 2,
        completionPercent: 50,
      },
    });
  });

  it('upserts pathway metadata and ordered steps', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'path-2' });
    const selectOne = vi.fn().mockResolvedValue(null);

    const repo = new SupabaseRepository({ upsert, selectOne } as never);
    (repo as any).canUserManagePathways = vi.fn().mockResolvedValue(true);
    (repo as any).ensureUser = vi.fn().mockResolvedValue({ id: 'user-1' });
    (repo as any).getPathway = vi.fn().mockResolvedValue({
      pathway: {
        pathwayId: 'path-2',
        title: 'Ops Pathway',
        summary: 'Ops intro',
        introText: 'Intro',
        domain: 'Operations',
        role: 'Engineer',
        tags: ['ops'],
        stepCount: 2,
        published: true,
        recommended: false,
        updatedAt: '2026-03-01T03:00:00.000Z',
        updatedByName: 'Alice',
        progress: {
          completedStepIds: [],
          completedSteps: 0,
          totalSteps: 2,
          completionPercent: 0,
        },
      },
      steps: [
        {
          stepId: 'step-a',
          position: 1,
          type: 'read',
          title: 'Read',
          description: '',
          isOptional: false,
        },
      ],
    });

    const result = await repo.upsertPathway(viewer, {
      pathwayId: 'path-2',
      title: 'Ops Pathway',
      summary: 'Ops intro',
      introText: 'Intro',
      domain: 'Operations',
      role: 'Engineer',
      tags: ['ops'],
      published: true,
      recommended: false,
      steps: [
        { type: 'read', title: 'Read onboarding material' },
        {
          type: 'try',
          title: 'Try one existing artifact',
          linkedArtifactId: '123e4567-e89b-12d3-a456-426614174000',
        },
      ],
    });

    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert).toHaveBeenNthCalledWith(1, 'Pathway', expect.objectContaining({ id: 'path-2' }), 'id');
    expect(upsert).toHaveBeenNthCalledWith(
      2,
      'PathwayStep',
      expect.objectContaining({ pathway_id: 'path-2', position: 1, title: 'Read onboarding material' }),
      'id'
    );
    expect(upsert).toHaveBeenNthCalledWith(
      3,
      'PathwayStep',
      expect.objectContaining({
        pathway_id: 'path-2',
        position: 2,
        title: 'Try one existing artifact',
        linked_artifact_id: '123e4567-e89b-12d3-a456-426614174000',
      }),
      'id'
    );
    expect(result.pathway.pathwayId).toBe('path-2');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('preserves existing step ids and only deletes removed steps on pathway edit', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'path-2' });
    const selectOne = vi.fn().mockResolvedValue({
      id: 'path-2',
      created_by_user_id: 'user-1',
      created_at: '2026-03-01T00:00:00.000Z',
    });
    const selectMany = vi.fn().mockResolvedValue([
      { id: 'step-keep', created_at: '2026-03-01T00:00:00.000Z' },
      { id: 'step-remove', created_at: '2026-03-01T00:00:00.000Z' },
    ]);
    const patchMany = vi.fn().mockResolvedValue([]);
    const deleteMany = vi.fn().mockResolvedValue([]);

    const repo = new SupabaseRepository({ upsert, selectOne, selectMany, patchMany, deleteMany } as never);
    (repo as any).canUserManagePathways = vi.fn().mockResolvedValue(true);
    (repo as any).ensureUser = vi.fn().mockResolvedValue({ id: 'user-1' });
    (repo as any).getPathway = vi.fn().mockResolvedValue({
      pathway: {
        pathwayId: 'path-2',
        title: 'Ops Pathway',
        summary: 'Ops intro',
        introText: 'Intro',
        domain: 'Operations',
        role: 'Engineer',
        tags: ['ops'],
        stepCount: 2,
        published: true,
        recommended: false,
        updatedAt: '2026-03-01T03:00:00.000Z',
        updatedByName: 'Alice',
        progress: {
          completedStepIds: ['step-keep'],
          completedSteps: 1,
          totalSteps: 2,
          completionPercent: 50,
        },
      },
      steps: [
        {
          stepId: 'step-keep',
          position: 1,
          type: 'read',
          title: 'Read',
          description: '',
          isOptional: false,
        },
      ],
    });

    await repo.upsertPathway(viewer, {
      pathwayId: 'path-2',
      title: 'Ops Pathway',
      steps: [
        { stepId: 'step-keep', type: 'read', title: 'Read onboarding material' },
        { type: 'build', title: 'Build your first workflow' },
      ],
    });

    expect(patchMany).toHaveBeenCalledWith(
      'PathwayStep',
      expect.objectContaining({ position: 1001 }),
      [{ field: 'id', op: 'eq', value: 'step-keep' }]
    );
    expect(deleteMany).toHaveBeenCalledWith('PathwayStep', [{ field: 'id', op: 'eq', value: 'step-remove' }]);
    expect(upsert).toHaveBeenCalledWith(
      'PathwayStep',
      expect.objectContaining({ id: 'step-keep', pathway_id: 'path-2', position: 1 }),
      'id'
    );
  });

  it('rejects invalid linkedArtifactId values before writing pathway steps', async () => {
    const upsert = vi.fn();
    const repo = new SupabaseRepository({ upsert } as never);
    (repo as any).canUserManagePathways = vi.fn().mockResolvedValue(true);
    (repo as any).ensureUser = vi.fn().mockResolvedValue({ id: 'user-1' });

    await expect(
      repo.upsertPathway(viewer, {
        title: 'Ops Pathway',
        steps: [{ type: 'read', title: 'Read onboarding material', linkedArtifactId: 'artifact-1' }],
      })
    ).rejects.toThrow('[PATHWAY_VALIDATION_FAILED] step 1: linkedArtifactId must be a valid UUID.');
    expect(upsert).not.toHaveBeenCalled();
  });
});
