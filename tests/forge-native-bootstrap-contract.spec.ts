import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type { ViewerContext } from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'unknown-atlassian-account',
  siteUrl: 'https://tag-hackday.atlassian.net',
  timezone: 'Europe/London',
};

describe('SupabaseRepository bootstrap contracts', () => {
  it('sorts featured hacks ahead of non-featured hacks and exposes the latest submission separately', async () => {
    const selectMany = vi.fn(async (table: string) => {
      if (table === 'User') {
        return [
          {
            id: 'u-featured',
            email: 'featured@example.com',
            full_name: 'Featured User',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 0,
            happy_to_mentor: false,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'u-latest',
            email: 'latest@example.com',
            full_name: 'Latest User',
            experience_level: null,
            mentor_capacity: 0,
            mentor_sessions_used: 0,
            happy_to_mentor: false,
            seeking_mentor: false,
            capability_tags: [],
            created_at: '2026-01-02T00:00:00.000Z',
          },
        ];
      }

      if (table === 'ShowcaseHack') {
        return [
          {
            project_id: 'hack-featured',
            featured: true,
            demo_url: null,
            context: null,
            limitations: null,
            risk_notes: null,
            source_repo_url: null,
          },
        ];
      }

      return [];
    });

    const repo = new SupabaseRepository({ selectMany } as never);
    Reflect.set(
      repo,
      'listProjects',
      vi.fn().mockResolvedValue([
        {
          id: 'hack-featured',
          title: 'Featured Copilot',
          description: 'Curated showcase hack',
          status: 'completed',
          hack_type: 'app',
          visibility: 'org',
          owner_id: 'u-featured',
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
          pipeline_stage_entered_at: '2026-03-01T10:00:00.000Z',
          created_at: '2026-03-01T10:00:00.000Z',
        },
        {
          id: 'hack-latest',
          title: 'Latest Submission',
          description: 'Newest non-featured hack',
          status: 'completed',
          hack_type: 'prompt',
          visibility: 'org',
          owner_id: 'u-latest',
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
          pipeline_stage_entered_at: '2026-03-15T12:00:00.000Z',
          created_at: '2026-03-15T12:00:00.000Z',
        },
      ])
    );
    Reflect.set(repo, 'listAllEvents', vi.fn().mockResolvedValue([]));

    const result = await repo.getBootstrapData(viewer);

    expect(result.featuredHacks.map((hack) => hack.id)).toEqual(['hack-featured', 'hack-latest']);
    expect(result.latestHackSubmission).toEqual({
      id: 'hack-latest',
      title: 'Latest Submission',
      authorName: 'Latest User',
      submittedAt: '2026-03-15T12:00:00.000Z',
    });
  });
});
