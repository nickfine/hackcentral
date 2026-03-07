import { describe, expect, it } from 'vitest';
import { buildOutputPayload } from '../forge-native/static/frontend/src/components/schedule-builder-v2';
import { initializeEventStates } from '../forge-native/static/frontend/src/schedule-builder-v2/scheduleEvents';
import { buildBuilderInitialState } from '../forge-native/static/runtime-frontend/src/components/Schedule';

describe('ScheduleBuilderV2 persistence', () => {
  it('persists later-day standard events as custom schedule events', async () => {
    const latestOutput = buildOutputPayload(
      2,
      '2026-03-19',
      '09:30',
      'Europe/London',
      initializeEventStates(2),
      []
    );

    expect(latestOutput.customEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Morning Kickoff',
          timestamp: '2026-03-20T09:00:00.000Z',
          signal: 'ceremony',
          sourceEventId: 'opening',
          sourcePhaseKey: 'hack-1',
        }),
        expect.objectContaining({
          name: 'Hacking Begins',
          timestamp: '2026-03-20T09:30:00.000Z',
          signal: 'start',
          sourceEventId: 'hacking-begins',
          sourcePhaseKey: 'hack-1',
        }),
      ])
    );

    expect(latestOutput.selectedEvents?.filter((eventId) => eventId === 'opening')).toHaveLength(1);
    expect(latestOutput.selectedEvents?.filter((eventId) => eventId === 'hacking-begins')).toHaveLength(1);
  });

  it('rehydrates persisted later-day standard events back into builder state', () => {
    const initialState = buildBuilderInitialState({
      timezone: 'Europe/London',
      duration: 2,
      registrationOpensAt: '2026-03-05T09:00:00.000Z',
      registrationClosesAt: '2026-03-18T09:00:00.000Z',
      teamFormationStartsAt: '2026-03-12T09:00:00.000Z',
      openingCeremonyAt: '2026-03-19T09:00:00.000Z',
      hackingStartsAt: '2026-03-19T09:30:00.000Z',
      submissionDeadlineAt: '2026-03-20T14:00:00.000Z',
      presentationsAt: '2026-03-20T15:00:00.000Z',
      judgingStartsAt: '2026-03-20T16:30:00.000Z',
      resultsAnnounceAt: '2026-03-20T18:00:00.000Z',
      customEvents: [
        {
          name: 'Morning Kickoff',
          description: 'Daily standup and updates',
          timestamp: '2026-03-20T09:00:00.000Z',
          signal: 'ceremony',
          sourceEventId: 'opening',
          sourcePhaseKey: 'hack-1',
        },
        {
          name: 'Sponsor AMA',
          timestamp: '2026-03-20T11:00:00.000Z',
          signal: 'neutral',
        },
      ],
    });

    expect(initialState?.eventStates['hack-1:opening']).toMatchObject({
      enabled: true,
      time: '09:00',
    });
    expect(initialState?.customEvents).toEqual([
      expect.objectContaining({
        name: 'Sponsor AMA',
        signal: 'neutral',
      }),
    ]);
  });
});
