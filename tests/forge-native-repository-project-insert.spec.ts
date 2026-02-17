import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';

describe('SupabaseRepository.insertProject legacy teamId compatibility', () => {
  it('retries with a fresh teamId when Project.teamId unique constraint is hit', async () => {
    const selectOne = vi.fn().mockResolvedValue({ id: 'confluence-team-1' });
    const insert = vi.fn(async (_table: string, payload: Record<string, unknown>) => {
      if (payload.teamId === 'confluence-team-1') {
        throw new Error(
          'Supabase POST Project failed (409): {"code":"23505","details":"Key (\\\\\\"teamId\\\\\\")=(confluence-team-1) already exists.","message":"duplicate key value violates unique constraint \\\\\\"Project_teamId_key\\\\\\""}'
        );
      }

      if (!payload.teamId) {
        throw new Error(
          'Supabase POST Project failed (400): {"code":"23502","message":"null value in column \\\\\\"teamId\\\\\\" of relation \\\\\\"Project\\\\\\" violates not-null constraint"}'
        );
      }
      if (!payload.name) {
        throw new Error(
          'Supabase POST Project failed (400): {"code":"23502","message":"null value in column \\\\\\"name\\\\\\" of relation \\\\\\"Project\\\\\\" violates not-null constraint"}'
        );
      }

      return {
        id: String(payload.id),
        title: String(payload.title ?? payload.name ?? 'Untitled'),
      };
    });

    const fakeRepo = {
      client: {
        selectOne,
        insert,
      },
      getAnyTeamId: SupabaseRepository.prototype['getAnyTeamId'],
    };

    const result = await (SupabaseRepository.prototype as any).insertProject.call(fakeRepo, {
      title: 'Smoke project',
      status: 'idea',
    });

    expect(result.id).toBeTruthy();
    expect(insert).toHaveBeenCalled();
    const insertedPayloads = insert.mock.calls.map((call) => call[1] as Record<string, unknown>);
    const hasFreshTeamId = insertedPayloads.some(
      (payload) => typeof payload.teamId === 'string' && payload.teamId !== 'confluence-team-1'
    );
    expect(hasFreshTeamId).toBe(true);
    const hasName = insertedPayloads.some((payload) => typeof payload.name === 'string' && payload.name.length > 0);
    expect(hasName).toBe(true);
  });
});
