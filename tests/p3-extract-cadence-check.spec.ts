import { describe, expect, it } from 'vitest';
import { summarizeResultsEvents, summarizeScheduleOutlook } from '../scripts/p3-extract-cadence-check.mjs';

describe('p3 extraction cadence semantics', () => {
  it('reports pending semantics when no results lifecycle rows exist', () => {
    const events = [
      { id: 'event-1', lifecycle_status: 'draft', updatedAt: '2026-03-01T00:00:00.000Z' },
      { id: 'event-2', lifecycle_status: 'hacking', updatedAt: '2026-03-02T00:00:00.000Z' },
    ];

    const summary = summarizeResultsEvents(events);

    expect(summary.resultsEventCount).toBe(0);
    expect(summary.latestResultsEvents).toEqual([]);
  });

  it('counts all results lifecycle rows while sampling latest 5', () => {
    const events = Array.from({ length: 7 }, (_, index) => ({
      id: `result-${index + 1}`,
      name: `Result Event ${index + 1}`,
      slug: `result-${index + 1}`,
      lifecycle_status: 'results',
      updatedAt: `2026-03-0${index + 1}T12:00:00.000Z`,
    }));

    const summary = summarizeResultsEvents(events);

    expect(summary.resultsEventCount).toBe(7);
    expect(summary.latestResultsEvents).toHaveLength(5);
    expect(summary.latestResultsEvents[0].id).toBe('result-7');
    expect(summary.latestResultsEvents[4].id).toBe('result-3');
  });

  it('tracks schedule outlook for upcoming and past-due results announcements', () => {
    const checkedAt = '2026-03-04T12:00:00.000Z';
    const rows = [
      {
        id: 'event-upcoming',
        name: 'Upcoming Results Event',
        slug: 'upcoming-results',
        lifecycle_status: 'voting',
        updatedAt: '2026-03-04T10:00:00.000Z',
        event_schedule: { resultsAnnounceAt: '2026-03-05T09:00:00.000Z' },
      },
      {
        id: 'event-past-due',
        name: 'Past Due Results Event',
        slug: 'past-due-results',
        lifecycle_status: 'results',
        updatedAt: '2026-03-03T10:00:00.000Z',
        event_schedule: { resultsAnnounceAt: '2026-03-01T09:00:00.000Z' },
      },
    ];

    const outlook = summarizeScheduleOutlook(rows, checkedAt);

    expect(outlook.nextUpcomingResultsAnnounceAt).toBe('2026-03-05T09:00:00.000Z');
    expect(outlook.nextUpcomingEvent?.id).toBe('event-upcoming');
    expect(outlook.pastDueResultsAnnounceCount).toBe(1);
  });
});
