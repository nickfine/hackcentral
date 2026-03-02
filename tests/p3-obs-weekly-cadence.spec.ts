import { describe, expect, it } from 'vitest';
import { REQUIRED_METRICS, parseTelemetryEvents, summarizeEvents } from '../scripts/p3-obs-weekly-cadence.mjs';

describe('p3 observability weekly cadence decision policy', () => {
  it('returns FAIL when no telemetry events are parsed', () => {
    const summary = summarizeEvents([], 0);

    expect(summary.decision).toBe('FAIL');
    expect(summary.requiredMetrics).toEqual(REQUIRED_METRICS);
    expect(summary.missingRequiredMetrics).toEqual(REQUIRED_METRICS);
    expect(summary.decisionReasons.some((reason) => reason.includes('No telemetry events were parsed'))).toBe(true);
  });

  it('returns FAIL when one or more required metrics are missing', () => {
    const events = [
      {
        metric: 'feed_signal_health',
        healthy: true,
        alerts: [],
        warnings: [],
        loggedAt: '2026-03-02T09:00:00.000Z',
      },
      {
        metric: 'roi_signal_health',
        healthy: true,
        alerts: [],
        warnings: [],
        loggedAt: '2026-03-02T09:05:00.000Z',
      },
    ];

    const summary = summarizeEvents(events, events.length);

    expect(summary.decision).toBe('FAIL');
    expect(summary.missingRequiredMetrics).toEqual(['roi_export']);
  });

  it('returns WARN when required metrics exist but health/alerts/warnings are not clean', () => {
    const events = [
      {
        metric: 'feed_signal_health',
        healthy: false,
        alerts: ['feed_activity_source_missing'],
        warnings: [],
        loggedAt: '2026-03-02T10:00:00.000Z',
      },
      {
        metric: 'roi_signal_health',
        healthy: true,
        alerts: [],
        warnings: ['trend_points_below_threshold'],
        loggedAt: '2026-03-02T10:01:00.000Z',
      },
      {
        metric: 'roi_export',
        healthy: true,
        alerts: [],
        warnings: [],
        loggedAt: '2026-03-02T10:02:00.000Z',
      },
    ];

    const summary = summarizeEvents(events, events.length);

    expect(summary.decision).toBe('WARN');
    expect(summary.missingRequiredMetrics).toEqual([]);
    expect(summary.healthCounts.unhealthy).toBeGreaterThan(0);
    expect(Object.keys(summary.alertCounts)).toContain('feed_activity_source_missing');
  });

  it('returns GO when required metrics are present and fully healthy', () => {
    const events = [
      {
        metric: 'feed_signal_health',
        healthy: true,
        alerts: [],
        warnings: [],
        loggedAt: '2026-03-02T11:00:00.000Z',
      },
      {
        metric: 'roi_signal_health',
        healthy: true,
        alerts: [],
        warnings: [],
        loggedAt: '2026-03-02T11:01:00.000Z',
      },
      {
        metric: 'roi_export',
        healthy: true,
        alerts: [],
        warnings: [],
        loggedAt: '2026-03-02T11:02:00.000Z',
      },
    ];

    const summary = summarizeEvents(events, events.length);

    expect(summary.decision).toBe('GO');
    expect(summary.missingRequiredMetrics).toEqual([]);
    expect(summary.decisionReasons).toEqual([
      'Required metrics present with no unhealthy events, alerts, or warnings.',
    ]);
  });

  it('parses telemetry lines and ignores malformed payloads', () => {
    const lines = [
      'plain line without JSON',
      '[hdc-phase3-telemetry] {"metric":"feed_signal_health","healthy":true}',
      '[hdc-phase3-telemetry] {not-valid-json}',
      '[hdc-phase3-telemetry] {"metric":"roi_export","healthy":true}',
    ];

    expect(parseTelemetryEvents(lines)).toEqual([
      { metric: 'feed_signal_health', healthy: true },
      { metric: 'roi_export', healthy: true },
    ]);
  });
});
