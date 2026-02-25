import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';

const baseCreateEventInput = {
  eventName: 'HackDay Config Test',
  icon: '🚀',
  tagline: 'Test event',
  timezone: 'Europe/London',
  lifecycleStatus: 'draft',
  confluencePageId: 'child-200',
  confluencePageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-200',
  confluenceParentPageId: 'parent-200',
  hackingStartsAt: '2026-03-01T09:00:00.000Z',
  submissionDeadlineAt: '2026-03-02T17:00:00.000Z',
  eventSchedule: {
    timezone: 'Europe/London',
    registrationOpensAt: '2026-02-20T09:00:00.000Z',
    registrationClosesAt: '2026-02-28T17:00:00.000Z',
    hackingStartsAt: '2026-03-01T09:00:00.000Z',
    submissionDeadlineAt: '2026-03-02T17:00:00.000Z',
  },
  creationRequestId: 'req-200',
  createdByUserId: 'user-200',
  eventRules: {
    allowCrossTeamMentoring: false,
    minTeamSize: 2,
    maxTeamSize: 5,
    requireDemoLink: true,
    judgingModel: 'panel',
    submissionRequirements: ['video_demo', 'working_prototype'],
    categories: ['Innovation'],
    prizesText: 'Top 3 awards',
  },
  eventBranding: {
    bannerMessage: 'Build boldly',
    accentColor: '#123abc',
    bannerImageUrl: 'https://cdn.example.com/banner.png',
    themePreference: 'light',
  },
} as const;

describe('SupabaseRepository.createEvent event config persistence', () => {
  it('writes event_rules and event_branding when config columns are available', async () => {
    const insert = vi.fn().mockResolvedValue({
      id: 'event-200',
      name: baseCreateEventInput.eventName,
      icon: baseCreateEventInput.icon,
      tagline: baseCreateEventInput.tagline,
      timezone: baseCreateEventInput.timezone,
      lifecycle_status: baseCreateEventInput.lifecycleStatus,
      confluence_page_id: baseCreateEventInput.confluencePageId,
      confluence_page_url: baseCreateEventInput.confluencePageUrl,
      confluence_parent_page_id: baseCreateEventInput.confluenceParentPageId,
      hacking_starts_at: baseCreateEventInput.hackingStartsAt,
      submission_deadline_at: baseCreateEventInput.submissionDeadlineAt,
      creation_request_id: baseCreateEventInput.creationRequestId,
      created_by_user_id: baseCreateEventInput.createdByUserId,
      event_rules: baseCreateEventInput.eventRules,
      event_branding: baseCreateEventInput.eventBranding,
      event_schedule: baseCreateEventInput.eventSchedule,
    });

    const fakeRepo = { client: { insert } };
    const result = await SupabaseRepository.prototype.createEvent.call(fakeRepo, baseCreateEventInput);

    expect(result.event_rules).toEqual(baseCreateEventInput.eventRules);
    expect(result.event_branding).toEqual(baseCreateEventInput.eventBranding);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      'Event',
      expect.objectContaining({
        event_rules: baseCreateEventInput.eventRules,
        event_branding: baseCreateEventInput.eventBranding,
        event_schedule: baseCreateEventInput.eventSchedule,
      })
    );
  });

  it('falls back to legacy insert payload when event config columns are missing', async () => {
    const insert = vi
      .fn()
      .mockRejectedValueOnce(new Error('Supabase POST Event failed (400): {"message":"column Event.event_rules does not exist"}'))
      .mockResolvedValueOnce({
        id: 'event-201',
        name: baseCreateEventInput.eventName,
        icon: baseCreateEventInput.icon,
        tagline: baseCreateEventInput.tagline,
        timezone: baseCreateEventInput.timezone,
        lifecycle_status: baseCreateEventInput.lifecycleStatus,
        confluence_page_id: baseCreateEventInput.confluencePageId,
        confluence_page_url: baseCreateEventInput.confluencePageUrl,
        confluence_parent_page_id: baseCreateEventInput.confluenceParentPageId,
        hacking_starts_at: baseCreateEventInput.hackingStartsAt,
        submission_deadline_at: baseCreateEventInput.submissionDeadlineAt,
        creation_request_id: baseCreateEventInput.creationRequestId,
        created_by_user_id: baseCreateEventInput.createdByUserId,
      });

    const fakeRepo = { client: { insert } };
    const result = await SupabaseRepository.prototype.createEvent.call(fakeRepo, baseCreateEventInput);

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1][1]).not.toHaveProperty('event_rules');
    expect(insert.mock.calls[1][1]).not.toHaveProperty('event_branding');
    expect(insert.mock.calls[1][1]).not.toHaveProperty('event_schedule');
    expect(result.event_rules).toBeNull();
    expect(result.event_branding).toBeNull();
    expect(result.event_schedule).toBeNull();
  });

  it('retries with legacy required event fields when Event insert fails with 23502', async () => {
    const insert = vi
      .fn()
      .mockRejectedValueOnce(
        new Error(
          'Supabase POST Event failed (400): {"code":"23502","message":"null value in column \\"id\\" of relation \\"Event\\" violates not-null constraint"}'
        )
      )
      .mockRejectedValueOnce(
        new Error(
          "Supabase POST Event failed (400): {\"code\":\"PGRST204\",\"message\":\"Could not find the 'rubric_config' column of 'Event' in the schema cache\"}"
        )
      )
      .mockResolvedValueOnce({
        id: 'event-legacy-1',
        name: baseCreateEventInput.eventName,
        icon: baseCreateEventInput.icon,
        tagline: baseCreateEventInput.tagline,
        timezone: baseCreateEventInput.timezone,
        lifecycle_status: baseCreateEventInput.lifecycleStatus,
        confluence_page_id: baseCreateEventInput.confluencePageId,
        confluence_page_url: baseCreateEventInput.confluencePageUrl,
        confluence_parent_page_id: baseCreateEventInput.confluenceParentPageId,
        hacking_starts_at: baseCreateEventInput.hackingStartsAt,
        submission_deadline_at: baseCreateEventInput.submissionDeadlineAt,
        creation_request_id: baseCreateEventInput.creationRequestId,
        created_by_user_id: baseCreateEventInput.createdByUserId,
        event_rules: baseCreateEventInput.eventRules,
        event_branding: baseCreateEventInput.eventBranding,
        event_schedule: baseCreateEventInput.eventSchedule,
      });

    const fakeRepo = { client: { insert } };
    const result = await SupabaseRepository.prototype.createEvent.call(fakeRepo, baseCreateEventInput);

    expect(insert).toHaveBeenCalledTimes(3);
    expect(insert.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        slug: expect.stringMatching(/^hackday-config-test-/),
        year: expect.any(Number),
        phase: 'SETUP',
        rubric_config: {},
        updated_at: expect.any(String),
        updatedAt: expect.any(String),
        event_rules: baseCreateEventInput.eventRules,
        event_branding: baseCreateEventInput.eventBranding,
        event_schedule: baseCreateEventInput.eventSchedule,
      })
    );
    expect(insert.mock.calls[2][1]).not.toHaveProperty('rubric_config');
    expect(result.id).toBe('event-legacy-1');
  });

  it('normalizes listAllEvents page IDs into coherent navigability flags', async () => {
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const selectMany = vi.fn().mockResolvedValue([
      {
        id: 'event-a',
        name: 'Event A',
        icon: '🚀',
        tagline: null,
        timezone: 'Europe/London',
        lifecycle_status: 'draft',
        confluence_page_id: '   ',
        confluence_page_url: null,
        confluence_parent_page_id: 'parent-1',
        hacking_starts_at: null,
        submission_deadline_at: null,
        creation_request_id: null,
        created_by_user_id: null,
        event_rules: null,
        event_branding: null,
        event_schedule: null,
      },
      {
        id: 'event-b',
        name: 'Event B',
        icon: '🚀',
        tagline: null,
        timezone: 'Europe/London',
        lifecycle_status: 'registration',
        confluence_page_id: 'child-2',
        confluence_page_url: null,
        confluence_parent_page_id: 'parent-1',
        hacking_starts_at: null,
        submission_deadline_at: null,
        creation_request_id: null,
        created_by_user_id: null,
        event_rules: null,
        event_branding: null,
        event_schedule: null,
      },
    ]);
    const patchMany = vi.fn().mockResolvedValue([]);

    const repo = new SupabaseRepository({ selectMany, patchMany } as never);
    const result = await repo.listAllEvents();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'event-a',
      confluencePageId: null,
      isNavigable: false,
    });
    expect(result[1]).toMatchObject({
      id: 'event-b',
      confluencePageId: 'child-2',
      isNavigable: true,
    });
    expect(telemetrySpy).toHaveBeenCalledWith(
      '[hdc-performance-telemetry]',
      expect.stringContaining('"metric":"registry_lookup"')
    );
    telemetrySpy.mockRestore();
  });

  it('emits parent registry lookup telemetry with parent page id', async () => {
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const selectMany = vi.fn().mockResolvedValue([
      {
        id: 'event-parent-1',
        name: 'Event Parent 1',
        icon: '🚀',
        tagline: null,
        timezone: 'Europe/London',
        lifecycle_status: 'registration',
        confluence_page_id: 'child-parent-1',
        confluence_page_url: null,
        confluence_parent_page_id: 'parent-telemetry',
        hacking_starts_at: null,
        submission_deadline_at: null,
        creation_request_id: null,
        created_by_user_id: null,
        event_rules: null,
        event_branding: null,
        event_schedule: null,
      },
    ]);
    const patchMany = vi.fn().mockResolvedValue([]);

    const repo = new SupabaseRepository({ selectMany, patchMany } as never);
    await repo.listEventsByParentPageId('parent-telemetry');

    expect(telemetrySpy).toHaveBeenCalledWith(
      '[hdc-performance-telemetry]',
      expect.stringContaining('"source":"listEventsByParentPageId"')
    );
    expect(telemetrySpy).toHaveBeenCalledWith(
      '[hdc-performance-telemetry]',
      expect.stringContaining('"parentPageId":"parent-telemetry"')
    );
    telemetrySpy.mockRestore();
  });

  it('auto-archives completed events older than 90 days while listing registry', async () => {
    const selectMany = vi.fn().mockResolvedValue([
      {
        id: 'event-old-completed',
        name: 'Old Completed',
        icon: '🚀',
        tagline: null,
        timezone: 'Europe/London',
        lifecycle_status: 'completed',
        confluence_page_id: 'child-old',
        confluence_page_url: null,
        confluence_parent_page_id: 'parent-1',
        hacking_starts_at: '2025-07-01T09:00:00.000Z',
        submission_deadline_at: '2025-07-05T17:00:00.000Z',
        creation_request_id: null,
        created_by_user_id: null,
        event_rules: null,
        event_branding: null,
        event_schedule: {
          resultsAnnounceAt: '2025-07-10T12:00:00.000Z',
        },
      },
    ]);
    const patchMany = vi.fn().mockResolvedValue([
      {
        id: 'event-old-completed',
        name: 'Old Completed',
        icon: '🚀',
        tagline: null,
        timezone: 'Europe/London',
        lifecycle_status: 'archived',
        confluence_page_id: 'child-old',
        confluence_page_url: null,
        confluence_parent_page_id: 'parent-1',
        hacking_starts_at: '2025-07-01T09:00:00.000Z',
        submission_deadline_at: '2025-07-05T17:00:00.000Z',
        creation_request_id: null,
        created_by_user_id: null,
        event_rules: null,
        event_branding: null,
        event_schedule: {
          resultsAnnounceAt: '2025-07-10T12:00:00.000Z',
        },
      },
    ]);

    const repo = new SupabaseRepository({ selectMany, patchMany } as never);
    const result = await repo.listAllEvents();

    expect(patchMany).toHaveBeenCalledWith(
      'Event',
      { lifecycle_status: 'archived' },
      [{ field: 'id', op: 'eq', value: 'event-old-completed' }]
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'event-old-completed',
      lifecycleStatus: 'archived',
    });
  });

  it('does not fail listAllEvents when auto-archive patch fails', async () => {
    const selectMany = vi.fn().mockResolvedValue([
      {
        id: 'event-old-completed-2',
        name: 'Old Completed 2',
        icon: '🚀',
        tagline: null,
        timezone: 'Europe/London',
        lifecycle_status: 'completed',
        confluence_page_id: 'child-old-2',
        confluence_page_url: null,
        confluence_parent_page_id: 'parent-1',
        hacking_starts_at: '2025-06-01T09:00:00.000Z',
        submission_deadline_at: '2025-06-05T17:00:00.000Z',
        creation_request_id: null,
        created_by_user_id: null,
        event_rules: null,
        event_branding: null,
        event_schedule: {
          resultsAnnounceAt: '2025-06-10T12:00:00.000Z',
        },
      },
    ]);
    const patchMany = vi.fn().mockRejectedValue(new Error('transient write failure'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const repo = new SupabaseRepository({ selectMany, patchMany } as never);
    const result = await repo.listAllEvents();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'event-old-completed-2',
      lifecycleStatus: 'completed',
    });
    expect(warnSpy).toHaveBeenCalledWith(
      '[hdc-auto-archive]',
      expect.stringContaining('"warning":"transient write failure"')
    );
    warnSpy.mockRestore();
  });

  it('preserves modern schedule metadata when reading event_schedule JSON', async () => {
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const selectMany = vi.fn().mockResolvedValue([
      {
        id: 'event-schedule-v2',
        name: 'Event Schedule V2',
        icon: '🚀',
        tagline: 'Schedule metadata test',
        timezone: 'Europe/London',
        lifecycle_status: 'draft',
        confluence_page_id: 'child-schedule-v2',
        confluence_page_url: null,
        confluence_parent_page_id: 'parent-schedule-v2',
        hacking_starts_at: '2026-03-01T09:30:00.000Z',
        submission_deadline_at: '2026-03-03T14:00:00.000Z',
        creation_request_id: 'req-schedule-v2',
        created_by_user_id: 'user-schedule-v2',
        event_rules: null,
        event_branding: null,
        runtime_type: 'hackday_template',
        template_target: 'hackday',
        event_schedule: {
          timezone: 'Europe/London',
          duration: 3,
          selectedEvents: ['opening', 'presentations', 'judging', '   '],
          registrationOpensAt: '2026-02-20T09:00:00.000Z',
          openingCeremonyAt: '2026-03-01T09:00:00.000Z',
          lunchBreakDay1At: '2026-03-01T12:00:00.000Z',
          presentationsAt: '2026-03-03T15:00:00.000Z',
          judgingStartsAt: '2026-03-03T16:30:00.000Z',
          customEvents: [
            {
              name: ' Mentor Office Hours ',
              description: ' Optional coaching ',
              timestamp: '2026-03-02T10:00:00.000Z',
              signal: 'neutral',
            },
            {
              name: '',
              timestamp: '2026-03-02T11:00:00.000Z',
              signal: 'neutral',
            },
            {
              name: 'Bad Signal',
              timestamp: '2026-03-02T12:00:00.000Z',
              signal: 'not-a-signal',
            },
          ],
        },
      },
    ]);
    const patchMany = vi.fn().mockResolvedValue([]);

    const repo = new SupabaseRepository({ selectMany, patchMany } as never);
    const result = await repo.listEventsByParentPageId('parent-schedule-v2');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'event-schedule-v2',
      runtimeType: 'hackday_template',
      templateTarget: 'hackday',
    });
    expect(result[0]?.schedule).toEqual(
      expect.objectContaining({
        timezone: 'Europe/London',
        duration: 3,
        selectedEvents: ['opening', 'presentations', 'judging'],
        openingCeremonyAt: '2026-03-01T09:00:00.000Z',
        lunchBreakDay1At: '2026-03-01T12:00:00.000Z',
        presentationsAt: '2026-03-03T15:00:00.000Z',
        judgingStartsAt: '2026-03-03T16:30:00.000Z',
        customEvents: [
          {
            name: 'Mentor Office Hours',
            description: 'Optional coaching',
            timestamp: '2026-03-02T10:00:00.000Z',
            signal: 'neutral',
          },
        ],
      })
    );
    telemetrySpy.mockRestore();
  });
});
