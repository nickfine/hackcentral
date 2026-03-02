import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type {
  TrackRoiExportInput,
  ViewerContext,
} from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'acc-telemetry',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('Phase 3 telemetry contracts', () => {
  it('emits feed_signal_health payload from home feed reads', async () => {
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const selectMany = vi.fn(async (table: string) => {
      if (table === 'User') {
        return [
          {
            id: 'u-viewer',
            email: 'viewer@example.com',
            full_name: 'Viewer User',
            atlassian_account_id: 'acc-telemetry',
            experience_level: 'power_user',
            capability_tags: ['ops_automation'],
          },
          {
            id: 'u-teammate',
            email: 'teammate@example.com',
            full_name: 'Teammate User',
            atlassian_account_id: 'acc-teammate',
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
    (repo as any).listProjects = vi.fn().mockResolvedValue([
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
    ]);
    (repo as any).listAllEvents = vi.fn().mockResolvedValue([
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
    ]);

    await repo.getHomeFeed(viewer, {
      limit: 20,
      recommendationLimit: 6,
      includeRecommendations: true,
    });

    const payload = telemetrySpy.mock.calls
      .filter((call) => call[0] === '[hdc-phase3-telemetry]')
      .map((call) => JSON.parse(String(call[1] ?? '{}')) as Record<string, unknown>)
      .find((item) => item.metric === 'feed_signal_health');

    expect(payload).toMatchObject({
      metric: 'feed_signal_health',
      source: 'supabase_repository',
      provider: 'supabase',
      activityStatus: 'available',
      recommendationStatus: 'available',
      activityCoverageThresholdPct: 80,
      recommendationCoverageThresholdPct: 67,
      healthy: true,
      alerts: [],
      reportingCadence: 'daily_sample_weekly_checkpoint',
      viewerTimezone: 'Europe/London',
      viewerSiteUrl: 'https://example.atlassian.net',
    });

    telemetrySpy.mockRestore();
  });

  it('emits roi_signal_health payload with spend-without-output alert when outputs are zero', async () => {
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
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
            atlassian_account_id: 'acc-telemetry',
            capability_tags: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      if (table === 'EventAuditLog') {
        return [
          {
            id: 'audit-1',
            event_id: 'event-1',
            actor_user_id: 'u-admin',
            action: 'llm_usage_logged',
            new_value: {
              tokenVolume: 1200,
              model: 'gpt-4o',
            },
            created_at: '2026-03-01T10:00:00.000Z',
          },
        ];
      }
      return [];
    });

    const repo = new SupabaseRepository({ selectOne, selectMany } as never);
    (repo as any).listProjects = vi.fn().mockResolvedValue([]);

    await repo.getRoiDashboard(viewer, { window: 'monthly' });

    const payload = telemetrySpy.mock.calls
      .filter((call) => call[0] === '[hdc-phase3-telemetry]')
      .map((call) => JSON.parse(String(call[1] ?? '{}')) as Record<string, unknown>)
      .find((item) => item.metric === 'roi_signal_health');

    expect(payload).toMatchObject({
      metric: 'roi_signal_health',
      source: 'supabase_repository',
      provider: 'supabase',
      window: 'monthly',
      totalOutputs: 0,
      tokenSignalRowCount: 1,
      tokenAttributedRowCount: 1,
      tokenAttributionThresholdPct: 60,
      highCostPerHackThresholdGbp: 0.25,
      minimumTrendPoints: 2,
      reportingCadence: 'daily_sample_weekly_checkpoint',
      healthy: false,
      viewerTimezone: 'Europe/London',
      viewerSiteUrl: 'https://example.atlassian.net',
    });
    expect(Array.isArray(payload?.alerts)).toBe(true);
    expect(payload?.alerts).toContain('spend_without_outputs');

    telemetrySpy.mockRestore();
  });

  it('emits roi_export payload for CSV export logging', async () => {
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const repo = new SupabaseRepository({} as never);

    const payload: TrackRoiExportInput = {
      format: 'csv',
      exportedAt: '2026-03-02T09:00:00.000Z',
      window: 'monthly',
      tokenSourceStatus: 'available_partial',
      costRateCardStatus: 'available',
      outputSourceStatus: 'available_partial',
      businessUnitSourceStatus: 'available_partial',
      totalTokenVolume: 14400,
      totalCost: 0.14,
      totalOutputs: 9,
      rowCount: 41,
    };

    const result = await repo.trackRoiExport(viewer, payload);

    expect(result.logged).toBe(true);
    expect(result.metric).toBe('roi_export');

    const loggedPayload = telemetrySpy.mock.calls
      .filter((call) => call[0] === '[hdc-phase3-telemetry]')
      .map((call) => JSON.parse(String(call[1] ?? '{}')) as Record<string, unknown>)
      .find((item) => item.metric === 'roi_export');

    expect(loggedPayload).toMatchObject({
      metric: 'roi_export',
      source: 'supabase_repository',
      provider: 'supabase',
      format: 'csv',
      window: 'monthly',
      tokenSourceStatus: 'available_partial',
      totalTokenVolume: 14400,
      totalCost: 0.14,
      totalOutputs: 9,
      rowCount: 41,
      summaryLineCount: null,
      reportingCadence: 'daily_sample_weekly_checkpoint',
      viewerTimezone: 'Europe/London',
      viewerSiteUrl: 'https://example.atlassian.net',
    });

    telemetrySpy.mockRestore();
  });
});
