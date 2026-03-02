import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'acc-123',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('SupabaseRepository registry contracts', () => {
  it('creates artifacts with normalized payload and returns persisted identifiers', async () => {
    const insert = vi.fn().mockResolvedValue({
      id: 'artifact-1',
      created_at: '2026-03-01T00:00:00.000Z',
    });

    const fakeRepo = {
      client: { insert },
      ensureUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
      getProjectById: vi.fn().mockResolvedValue(null),
    };

    const result = await SupabaseRepository.prototype.createArtifact.call(fakeRepo, viewer, {
      title: 'Ops Prompt Pack',
      description: 'Reusable prompt set for operational handovers.',
      artifactType: 'prompt',
      tags: ['Ops', 'Prompt'],
      sourceUrl: 'https://example.com/prompts/ops-pack',
      sourceLabel: 'Prompt Library',
      visibility: 'org',
    });

    expect(result).toEqual({
      artifactId: 'artifact-1',
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    expect(insert).toHaveBeenCalledWith(
      'Artifact',
      expect.objectContaining({
        title: 'Ops Prompt Pack',
        artifact_type: 'prompt',
        tags: ['ops', 'prompt'],
        source_url: 'https://example.com/prompts/ops-pack',
        source_label: 'Prompt Library',
        created_by_user_id: 'user-1',
      })
    );
  });

  it('lists active artifacts with reuse/fork enrichment and requested sorting', async () => {
    const selectMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'artifact-1',
          title: 'Ops Prompt Pack',
          description: 'Reusable prompt set for operational handovers.',
          artifact_type: 'prompt',
          tags: ['ops', 'prompt'],
          source_url: 'https://example.com/prompts/ops-pack',
          source_label: 'Prompt Library',
          source_hack_project_id: 'project-1',
          source_hackday_event_id: 'event-1',
          created_by_user_id: 'user-1',
          visibility: 'org',
          reuse_count: 8,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
          archived_at: null,
        },
        {
          id: 'artifact-2',
          title: 'Support Prompt Pack',
          description: 'Reusable prompt set for support routing.',
          artifact_type: 'prompt',
          tags: ['support'],
          source_url: 'https://example.com/prompts/support-pack',
          source_label: 'Prompt Library',
          source_hack_project_id: 'project-2',
          source_hackday_event_id: 'event-2',
          created_by_user_id: 'user-2',
          visibility: 'org',
          reuse_count: 3,
          created_at: '2026-03-01T01:00:00.000Z',
          updated_at: '2026-03-01T01:00:00.000Z',
          archived_at: null,
        },
      ])
      .mockResolvedValueOnce([
        { id: 'user-1', full_name: 'Alice', email: 'alice@adaptavist.com' },
        { id: 'user-2', full_name: 'Bob', email: 'bob@adaptavist.com' },
      ]);

    const fakeRepo = {
      client: { selectMany },
      getSourceForkCounts: vi.fn().mockResolvedValue(new Map([['artifact-1', 2]])),
    };

    const result = await SupabaseRepository.prototype.listArtifacts.call(fakeRepo, viewer, {
      artifactTypes: ['prompt'],
      sortBy: 'reuse_count',
      limit: 10,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: 'artifact-1',
      reuseCount: 8,
      forkCount: 2,
      authorName: 'Alice',
    });
    expect(result.items[1]).toMatchObject({
      id: 'artifact-2',
      reuseCount: 3,
      forkCount: 0,
      authorName: 'Bob',
    });
  });

  it('returns alreadyMarked when duplicate artifact reuse rows are attempted', async () => {
    const selectOne = vi.fn().mockResolvedValue({ id: 'artifact-1', reuse_count: 2 });
    const insert = vi
      .fn()
      .mockRejectedValue(
        new Error('duplicate key value violates unique constraint "ArtifactReuse_artifact_id_user_id_key"')
      );
    const patchMany = vi.fn();

    const fakeRepo = {
      client: { selectOne, insert, patchMany },
      ensureUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
    };

    const result = await SupabaseRepository.prototype.markArtifactReuse.call(fakeRepo, viewer, 'artifact-1');

    expect(result).toEqual({
      artifactId: 'artifact-1',
      reuseCount: 2,
      alreadyMarked: true,
    });
    expect(patchMany).not.toHaveBeenCalled();
  });
});
