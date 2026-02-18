import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';

describe('SupabaseRepository.completeAndSync status classification', () => {
  it('returns partial when some hacks sync and some fail, while preserving skipped count', async () => {
    const fakeRepo = {
      listEventHackProjects: vi.fn().mockResolvedValue([
        { id: 'h1', synced_to_library_at: null },
        { id: 'h2', synced_to_library_at: null },
        { id: 'h3', synced_to_library_at: '2026-02-16T00:00:00.000Z' },
      ]),
      markHackSynced: vi.fn(async (projectId: string) => {
        if (projectId === 'h2') {
          throw new Error('write failed');
        }
      }),
      updateEventLifecycle: vi.fn().mockResolvedValue(undefined),
      upsertSyncState: vi.fn().mockResolvedValue(undefined),
    };

    const result = await SupabaseRepository.prototype.completeAndSync.call(fakeRepo, 'event-1');

    expect(result).toEqual({
      syncStatus: 'partial',
      pushedCount: 1,
      skippedCount: 1,
    });
    expect(fakeRepo.updateEventLifecycle).toHaveBeenCalledWith('event-1', 'completed');
    expect(fakeRepo.upsertSyncState).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({
        syncStatus: 'partial',
        pushedCount: 1,
        skippedCount: 1,
      })
    );
  });

  it('returns failed when every unsynced hack fails and does not move lifecycle to completed', async () => {
    const fakeRepo = {
      listEventHackProjects: vi.fn().mockResolvedValue([
        { id: 'h10', synced_to_library_at: null },
        { id: 'h11', synced_to_library_at: null },
      ]),
      markHackSynced: vi.fn().mockRejectedValue(new Error('always fails')),
      updateEventLifecycle: vi.fn().mockResolvedValue(undefined),
      upsertSyncState: vi.fn().mockResolvedValue(undefined),
    };

    const result = await SupabaseRepository.prototype.completeAndSync.call(fakeRepo, 'event-2');

    expect(result).toEqual({
      syncStatus: 'failed',
      pushedCount: 0,
      skippedCount: 0,
    });
    expect(fakeRepo.updateEventLifecycle).not.toHaveBeenCalled();
    expect(fakeRepo.upsertSyncState).toHaveBeenCalledWith(
      'event-2',
      expect.objectContaining({
        syncStatus: 'failed',
        pushedCount: 0,
        skippedCount: 0,
      })
    );
  });

  it('is idempotent on retry when all hacks are already synced', async () => {
    const fakeRepo = {
      listEventHackProjects: vi
        .fn()
        .mockResolvedValueOnce([
          { id: 'h20', synced_to_library_at: null },
          { id: 'h21', synced_to_library_at: null },
        ])
        .mockResolvedValueOnce([
          { id: 'h20', synced_to_library_at: '2026-02-16T00:10:00.000Z' },
          { id: 'h21', synced_to_library_at: '2026-02-16T00:11:00.000Z' },
        ]),
      markHackSynced: vi.fn(async () => undefined),
      updateEventLifecycle: vi.fn().mockResolvedValue(undefined),
      upsertSyncState: vi.fn().mockResolvedValue(undefined),
    };

    const first = await SupabaseRepository.prototype.completeAndSync.call(fakeRepo, 'event-3');
    const second = await SupabaseRepository.prototype.completeAndSync.call(fakeRepo, 'event-3');

    expect(first).toEqual({
      syncStatus: 'complete',
      pushedCount: 2,
      skippedCount: 0,
    });
    expect(second).toEqual({
      syncStatus: 'complete',
      pushedCount: 0,
      skippedCount: 2,
    });
    expect(fakeRepo.markHackSynced).toHaveBeenCalledTimes(2);
  });
});

describe('SupabaseRepository.logAudit retention', () => {
  it('keeps existing rows when event audit log count is at or below retention limit', async () => {
    const insert = vi.fn().mockResolvedValue({ id: 'audit-new' });
    const base = Date.parse('2026-02-18T00:00:00.000Z');
    const selectMany = vi.fn().mockResolvedValue(
      Array.from({ length: 100 }, (_, index) => ({
        id: `audit-${index + 1}`,
        created_at: new Date(base + index * 1000).toISOString(),
      }))
    );
    const deleteMany = vi.fn().mockResolvedValue([]);

    const repo = new SupabaseRepository({ insert, selectMany, deleteMany } as never);
    await repo.logAudit({
      eventId: 'event-100',
      actorUserId: 'user-100',
      action: 'sync_complete',
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(selectMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('deletes oldest rows when event audit log count exceeds retention limit', async () => {
    const insert = vi.fn().mockResolvedValue({ id: 'audit-new' });
    const base = Date.parse('2026-02-18T00:00:00.000Z');
    const selectMany = vi.fn().mockResolvedValue(
      Array.from({ length: 103 }, (_, index) => ({
        id: `audit-${index + 1}`,
        created_at: new Date(base + index * 1000).toISOString(),
      }))
    );
    const deleteMany = vi.fn().mockResolvedValue([]);

    const repo = new SupabaseRepository({ insert, selectMany, deleteMany } as never);
    await repo.logAudit({
      eventId: 'event-101',
      actorUserId: 'user-101',
      action: 'sync_partial',
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(selectMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledTimes(3);
    expect(deleteMany).toHaveBeenNthCalledWith(1, 'EventAuditLog', [{ field: 'id', op: 'eq', value: 'audit-1' }]);
    expect(deleteMany).toHaveBeenNthCalledWith(2, 'EventAuditLog', [{ field: 'id', op: 'eq', value: 'audit-2' }]);
    expect(deleteMany).toHaveBeenNthCalledWith(3, 'EventAuditLog', [{ field: 'id', op: 'eq', value: 'audit-3' }]);
  });
});
