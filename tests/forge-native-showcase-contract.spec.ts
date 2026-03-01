import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'acc-123',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('SupabaseRepository showcase contracts', () => {
  it('lists showcase hacks with status/featured filters', async () => {
    const selectMany = vi
      .fn()
      .mockResolvedValueOnce([
        { id: 'user-1', full_name: 'Alice', email: 'alice@adaptavist.com' },
        { id: 'user-2', full_name: 'Bob', email: 'bob@adaptavist.com' },
      ])
      .mockResolvedValueOnce([
        {
          project_id: 'project-1',
          featured: true,
          demo_url: 'https://demo.example.com/hack-1',
          team_members: ['Alice', 'Ben'],
          source_event_id: 'event-1',
          tags: ['ops-automation'],
          linked_artifact_ids: ['artifact-1'],
          context: null,
          limitations: null,
          risk_notes: null,
          source_repo_url: null,
          created_by_user_id: 'user-1',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:10:00.000Z',
        },
        {
          project_id: 'project-2',
          featured: false,
          demo_url: null,
          team_members: ['Bob'],
          source_event_id: 'event-2',
          tags: ['customer-support'],
          linked_artifact_ids: [],
          context: null,
          limitations: null,
          risk_notes: null,
          source_repo_url: null,
          created_by_user_id: 'user-2',
          created_at: '2026-03-01T01:00:00.000Z',
          updated_at: '2026-03-01T01:10:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        { id: 'artifact-1', source_hack_project_id: 'project-1', reuse_count: 7, archived_at: null },
        { id: 'artifact-2', source_hack_project_id: 'project-2', reuse_count: 3, archived_at: null },
      ]);

    const repo = new SupabaseRepository({ selectMany } as never);
    (repo as any).listProjects = vi.fn().mockResolvedValue([
      {
        id: 'project-1',
        title: 'Ops Assistant',
        description: 'Improves Ops throughput.',
        status: 'completed',
        hack_type: 'prompt',
        visibility: 'org',
        owner_id: 'user-1',
        workflow_transformed: false,
        ai_impact_hypothesis: null,
        ai_tools_used: [],
        time_saved_estimate: null,
        failures_and_lessons: null,
        source_type: 'hack_submission',
        synced_to_library_at: null,
        event_id: 'event-1',
        pipeline_stage: 'product_candidate',
        pipeline_stage_entered_at: '2026-03-01T00:00:00.000Z',
        created_at: '2026-03-01T00:00:00.000Z',
      },
      {
        id: 'project-2',
        title: 'Support Copilot',
        description: 'Helps support routing.',
        status: 'building',
        hack_type: 'app',
        visibility: 'org',
        owner_id: 'user-2',
        workflow_transformed: false,
        ai_impact_hypothesis: null,
        ai_tools_used: [],
        time_saved_estimate: null,
        failures_and_lessons: null,
        source_type: 'hack_submission',
        synced_to_library_at: null,
        event_id: 'event-2',
        pipeline_stage: 'validated_prototype',
        pipeline_stage_entered_at: '2026-03-01T01:00:00.000Z',
        created_at: '2026-03-01T01:00:00.000Z',
      },
    ]);
    (repo as any).canUserManagePipeline = vi.fn().mockResolvedValue(true);

    const result = await repo.listShowcaseHacks(viewer, {
      statuses: ['completed'],
      featuredOnly: true,
      sortBy: 'featured',
    });

    expect(result.canManage).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      projectId: 'project-1',
      title: 'Ops Assistant',
      status: 'completed',
      featured: true,
      tags: ['ops-automation'],
      reuseCount: 7,
      teamMembersCount: 2,
    });
  });

  it('returns showcase hack detail with produced artifacts and solved problems', async () => {
    const selectOne = vi.fn().mockResolvedValue({
      project_id: 'project-1',
      featured: true,
      demo_url: 'https://demo.example.com/hack-1',
      team_members: ['Alice', 'Ben'],
      source_event_id: 'event-1',
      tags: ['ops-automation'],
      linked_artifact_ids: ['artifact-1'],
      context: 'Ops workflow acceleration',
      limitations: 'Needs Jira access',
      risk_notes: 'Review generated summaries',
      source_repo_url: 'https://github.com/adaptavist/hack-1',
      created_by_user_id: 'user-1',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:10:00.000Z',
    });
    const selectMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'artifact-1',
          title: 'Ops Prompt Pack',
          artifact_type: 'prompt',
          visibility: 'org',
          reuse_count: 5,
          source_hack_project_id: 'project-1',
          archived_at: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'problem-1',
          title: 'Status reporting bottleneck',
          status: 'solved',
          updated_at: '2026-03-01T02:00:00.000Z',
          linked_hack_project_id: 'project-1',
        },
        {
          id: 'problem-2',
          title: 'Open queue issue',
          status: 'open',
          updated_at: '2026-03-01T01:00:00.000Z',
          linked_hack_project_id: 'project-1',
        },
      ]);

    const repo = new SupabaseRepository({ selectOne, selectMany } as never);
    (repo as any).getProjectById = vi.fn().mockResolvedValue({
      id: 'project-1',
      title: 'Ops Assistant',
      description: 'Improves Ops throughput.',
      status: 'completed',
      hack_type: 'prompt',
      visibility: 'org',
      owner_id: 'user-1',
      workflow_transformed: false,
      ai_impact_hypothesis: null,
      ai_tools_used: [],
      time_saved_estimate: null,
      failures_and_lessons: null,
      source_type: 'hack_submission',
      synced_to_library_at: null,
      event_id: 'event-1',
      pipeline_stage: 'product_candidate',
      pipeline_stage_entered_at: '2026-03-01T00:00:00.000Z',
      created_at: '2026-03-01T00:00:00.000Z',
    });
    (repo as any).getUserById = vi.fn().mockResolvedValue({
      id: 'user-1',
      full_name: 'Alice',
      email: 'alice@adaptavist.com',
    });

    const result = await repo.getShowcaseHackDetail(viewer, 'project-1');

    expect(result.hack).toMatchObject({
      projectId: 'project-1',
      featured: true,
      status: 'completed',
      teamMembers: ['Alice', 'Ben'],
      linkedArtifactIds: ['artifact-1'],
      context: 'Ops workflow acceleration',
    });
    expect(result.artifactsProduced).toEqual([
      {
        artifactId: 'artifact-1',
        title: 'Ops Prompt Pack',
        artifactType: 'prompt',
        visibility: 'org',
        reuseCount: 5,
      },
    ]);
    expect(result.problemsSolved).toEqual([
      {
        problemId: 'problem-1',
        title: 'Status reporting bottleneck',
        status: 'solved',
        updatedAt: '2026-03-01T02:00:00.000Z',
      },
    ]);
  });

  it('sets showcase featured flag through upsert', async () => {
    const upsert = vi.fn().mockResolvedValue({
      project_id: 'project-1',
      featured: true,
      updated_at: '2026-03-01T03:00:00.000Z',
    });

    const repo = new SupabaseRepository({ upsert } as never);
    (repo as any).getProjectById = vi.fn().mockResolvedValue({
      id: 'project-1',
      event_id: 'event-1',
    });
    (repo as any).ensureUser = vi.fn().mockResolvedValue({ id: 'user-1' });

    const result = await repo.setShowcaseFeatured(viewer, {
      projectId: 'project-1',
      featured: true,
    });

    expect(result).toEqual({
      projectId: 'project-1',
      featured: true,
      updatedAt: '2026-03-01T03:00:00.000Z',
    });
    expect(upsert).toHaveBeenCalledWith(
      'ShowcaseHack',
      expect.objectContaining({
        project_id: 'project-1',
        featured: true,
        created_by_user_id: 'user-1',
      }),
      'project_id'
    );
  });

  it('creates hack with required demoUrl and persists showcase metadata', async () => {
    const upsert = vi.fn().mockResolvedValue({
      project_id: 'project-1',
      updated_at: '2026-03-01T04:00:00.000Z',
    });
    const deleteMany = vi.fn().mockResolvedValue([]);

    const repo = new SupabaseRepository({ upsert, deleteMany } as never);
    (repo as any).ensureUser = vi.fn().mockResolvedValue({ id: 'user-1' });
    (repo as any).insertProject = vi.fn().mockResolvedValue({
      id: 'project-1',
      title: 'Ops Assistant',
    });
    (repo as any).getArtifactRowById = vi.fn().mockResolvedValue({
      id: 'artifact-1',
      archived_at: null,
    });

    const result = await repo.createHack(viewer, {
      title: 'Ops Assistant',
      description: 'Improves Ops throughput.',
      assetType: 'prompt',
      visibility: 'org',
      demoUrl: 'https://demo.example.com/ops-assistant',
      teamMembers: ['Alice', 'Ben'],
      sourceEventId: 'event-1',
      tags: ['Ops Automation'],
      linkedArtifactIds: ['artifact-1'],
    });

    expect(result).toEqual({
      assetId: 'project-1',
      title: 'Ops Assistant',
    });
    expect(upsert).toHaveBeenCalledWith(
      'ShowcaseHack',
      expect.objectContaining({
        project_id: 'project-1',
        demo_url: 'https://demo.example.com/ops-assistant',
        tags: ['ops-automation'],
        team_members: ['Alice', 'Ben'],
      }),
      'project_id'
    );
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('rejects hack creation when demoUrl is missing', async () => {
    const repo = new SupabaseRepository({} as never);
    (repo as any).ensureUser = vi.fn().mockResolvedValue({ id: 'user-1' });

    await expect(
      repo.createHack(viewer, {
        title: 'Ops Assistant',
        description: 'Improves Ops throughput.',
        assetType: 'prompt',
      })
    ).rejects.toThrow('[SHOWCASE_VALIDATION_FAILED] demoUrl is required.');
  });
});
