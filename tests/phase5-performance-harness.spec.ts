import { performance } from 'node:perf_hooks';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length)));
  return sorted[index];
}

function formatMs(value: number): string {
  return value.toFixed(2);
}

function buildRegistryRows(count: number): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < count; i += 1) {
    rows.push({
      id: `event-${i}`,
      name: `Event ${String(i).padStart(4, '0')}`,
      icon: '🚀',
      tagline: null,
      timezone: 'Europe/London',
      lifecycle_status: i % 5 === 0 ? 'completed' : 'registration',
      confluence_page_id: `child-${i}`,
      confluence_page_url: null,
      confluence_parent_page_id: 'parent-perf',
      hacking_starts_at: null,
      submission_deadline_at: null,
      creation_request_id: null,
      created_by_user_id: null,
      event_rules: null,
      event_branding: null,
      event_schedule: null,
    });
  }
  return rows;
}

function buildHackRows(count: number): Array<{ id: string; synced_to_library_at: string | null }> {
  const rows: Array<{ id: string; synced_to_library_at: string | null }> = [];
  for (let i = 0; i < count; i += 1) {
    rows.push({
      id: `hack-${i}`,
      synced_to_library_at: i % 7 === 0 ? '2026-02-18T00:00:00.000Z' : null,
    });
  }
  return rows;
}

describe('Phase 5 performance harness', () => {
  it('registry lookup handles scaled event counts within threshold', async () => {
    const eventCount = envNumber('HDC_PERF_REGISTRY_EVENTS', 2500);
    const iterations = envNumber('HDC_PERF_REGISTRY_ITERATIONS', 12);
    const p95BudgetMs = envNumber('HDC_PERF_REGISTRY_P95_MS', 120);
    const rows = buildRegistryRows(eventCount);
    const selectMany = vi.fn().mockResolvedValue(rows);
    const patchMany = vi.fn().mockResolvedValue([]);
    const telemetryPayloads: string[] = [];
    const originalInfo = console.info;
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation((...args: unknown[]) => {
      if (args[0] === '[hdc-performance-telemetry]') {
        telemetryPayloads.push(String(args[1] ?? ''));
        return;
      }
      originalInfo(...(args as Parameters<typeof console.info>));
    });
    const repo = new SupabaseRepository({ selectMany, patchMany } as never);

    const durations: number[] = [];
    for (let i = 0; i < iterations; i += 1) {
      const started = performance.now();
      const result = await repo.listAllEvents();
      durations.push(performance.now() - started);
      expect(result).toHaveLength(eventCount);
    }

    const p50 = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    console.info(
      '[hdc-phase5-perf]',
      JSON.stringify({ scenario: 'registry_lookup', eventCount, iterations, p50Ms: p50, p95Ms: p95, p95BudgetMs })
    );
    expect(p95).toBeLessThan(p95BudgetMs);
    expect(telemetryPayloads.some((payload) => payload.includes('"metric":"registry_lookup"'))).toBe(true);
    telemetrySpy.mockRestore();
  });

  it('completeAndSync handles high hack volume within threshold', async () => {
    const hackCount = envNumber('HDC_PERF_SYNC_HACKS', 3000);
    const iterations = envNumber('HDC_PERF_SYNC_ITERATIONS', 10);
    const p95BudgetMs = envNumber('HDC_PERF_SYNC_P95_MS', 220);
    const hacks = buildHackRows(hackCount);
    const markHackSynced = vi.fn().mockResolvedValue(undefined);

    const fakeRepo = {
      listEventHackProjects: vi.fn().mockImplementation(async () => hacks),
      markHackSynced,
      updateEventLifecycle: vi.fn().mockResolvedValue(undefined),
      upsertSyncState: vi.fn().mockResolvedValue(undefined),
    };

    const durations: number[] = [];
    for (let i = 0; i < iterations; i += 1) {
      const started = performance.now();
      const result = await SupabaseRepository.prototype.completeAndSync.call(fakeRepo, 'event-perf');
      durations.push(performance.now() - started);
      expect(result.syncStatus).toBe('complete');
      expect(result.pushedCount + result.skippedCount).toBe(hackCount);
    }

    const p50 = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    console.info(
      '[hdc-phase5-perf]',
      JSON.stringify({
        scenario: 'complete_and_sync',
        hackCount,
        iterations,
        p50Ms: formatMs(p50),
        p95Ms: formatMs(p95),
        p95BudgetMs,
      })
    );
    expect(p95).toBeLessThan(p95BudgetMs);
    expect(markHackSynced).toHaveBeenCalled();
  });
});
