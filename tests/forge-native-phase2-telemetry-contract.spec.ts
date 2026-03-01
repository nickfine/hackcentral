import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';
import type {
  TrackTeamPulseExportInput,
  ViewerContext,
} from '../forge-native/src/shared/types';

const viewer: ViewerContext = {
  accountId: 'acc-telemetry',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'Europe/London',
};

describe('Phase 2 telemetry contracts', () => {
  it('emits team_pulse_export payload for CSV exports', async () => {
    const repo = new SupabaseRepository({} as never);
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const exportedAt = '2026-03-01T17:00:00.000Z';

    const payload: TrackTeamPulseExportInput = {
      format: 'csv',
      exportedAt,
      hasTeamPulseData: true,
      reuseRatePct: 37.5,
      crossTeamAdoptionCount: 12,
      crossTeamEdgeCount: 4,
      timeToFirstHackMedianDays: 11.2,
      timeToFirstHackSampleSize: 8,
      timeToFirstHackTrendPointCount: 6,
      problemConversionPct: 28.6,
      solvedProblemCount: 4,
      totalProblemCount: 14,
      csvRowCount: 19,
    };

    const result = await repo.trackTeamPulseExport(viewer, payload);

    expect(result.logged).toBe(true);
    expect(result.metric).toBe('team_pulse_export');

    const phase2TelemetryPayloads = telemetrySpy.mock.calls
      .filter((call) => call[0] === '[hdc-phase2-telemetry]')
      .map((call) => String(call[1] ?? ''));
    const exportTelemetry = phase2TelemetryPayloads
      .map((raw) => JSON.parse(raw) as Record<string, unknown>)
      .find((item) => item.metric === 'team_pulse_export');

    expect(exportTelemetry).toMatchObject({
      metric: 'team_pulse_export',
      source: 'supabase_repository',
      provider: 'supabase',
      format: 'csv',
      exportedAt,
      hasTeamPulseData: true,
      reuseRatePct: 37.5,
      crossTeamAdoptionCount: 12,
      crossTeamEdgeCount: 4,
      timeToFirstHackMedianDays: 11.2,
      timeToFirstHackSampleSize: 8,
      timeToFirstHackTrendPointCount: 6,
      problemConversionPct: 28.6,
      solvedProblemCount: 4,
      totalProblemCount: 14,
      csvRowCount: 19,
      viewerTimezone: 'Europe/London',
      viewerSiteUrl: 'https://example.atlassian.net',
    });

    telemetrySpy.mockRestore();
  });

  it('normalizes JSON exports to null csvRowCount in telemetry payload', async () => {
    const repo = new SupabaseRepository({} as never);
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const payload: TrackTeamPulseExportInput = {
      format: 'json',
      exportedAt: '2026-03-01T17:05:00.000Z',
      hasTeamPulseData: false,
      reuseRatePct: 0,
      crossTeamAdoptionCount: 0,
      crossTeamEdgeCount: 0,
      timeToFirstHackMedianDays: null,
      timeToFirstHackSampleSize: 0,
      timeToFirstHackTrendPointCount: 0,
      problemConversionPct: 0,
      solvedProblemCount: 0,
      totalProblemCount: 0,
      csvRowCount: 999,
    };

    await repo.trackTeamPulseExport(viewer, payload);

    const phase2TelemetryPayloads = telemetrySpy.mock.calls
      .filter((call) => call[0] === '[hdc-phase2-telemetry]')
      .map((call) => String(call[1] ?? ''));
    const exportTelemetry = phase2TelemetryPayloads
      .map((raw) => JSON.parse(raw) as Record<string, unknown>)
      .find((item) => item.metric === 'team_pulse_export');

    expect(exportTelemetry?.format).toBe('json');
    expect(exportTelemetry?.csvRowCount).toBeNull();

    telemetrySpy.mockRestore();
  });
});
