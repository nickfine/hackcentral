import type {
  EventDuration,
  EventState,
  PhaseKey,
  ScheduleBuilderOutput,
  CustomEvent,
} from '../../types/scheduleBuilderV2';
import {
  EVENT_TO_OUTPUT_FIELD,
  HACK_DAY_EVENTS,
  PRE_EVENT_MILESTONES,
} from '../../schedule-builder-v2/scheduleEvents';

export function parseHackPhaseDayIndex(phaseKey: PhaseKey): number | null {
  if (!phaseKey.startsWith('hack-')) {
    return null;
  }

  const parsed = parseInt(phaseKey.split('-')[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getHackDayEventPresentation(
  event: (typeof HACK_DAY_EVENTS)[number],
  dayIndex: number
): { name: string; description: string } {
  if (event.id === 'opening' && dayIndex > 0) {
    return {
      name: 'Morning Kickoff',
      description: 'Daily standup and updates',
    };
  }

  return {
    name: event.name,
    description: event.description,
  };
}

export function isPhaseKeyWithinDuration(phaseKey: PhaseKey, duration: EventDuration): boolean {
  if (phaseKey === 'pre') {
    return true;
  }

  const dayIndex = parseHackPhaseDayIndex(phaseKey);
  return dayIndex !== null && dayIndex >= 0 && dayIndex < duration;
}

export function buildOutputPayload(
  duration: EventDuration,
  anchorDate: string,
  anchorTime: string,
  timezone: string,
  eventStates: Record<string, EventState>,
  customEvents: CustomEvent[]
): ScheduleBuilderOutput {
  const toISOTimestamp = (date: string, time: string): string => {
    return new Date(`${date}T${time}:00`).toISOString();
  };

  const calculateDateFromOffset = (offsetDays: number): string => {
    const date = new Date(anchorDate);
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split('T')[0];
  };

  const selectedEvents = new Set<string>();
  const timestamps: Record<string, string> = {};
  const syntheticCustomEvents: NonNullable<ScheduleBuilderOutput['customEvents']> = [];

  PRE_EVENT_MILESTONES.forEach((event) => {
    const state = eventStates[event.id];
    if (state?.enabled) {
      const outputField = EVENT_TO_OUTPUT_FIELD[event.id];
      if (outputField && state.offsetDays !== undefined) {
        const eventDate = calculateDateFromOffset(state.offsetDays);
        timestamps[outputField] = toISOTimestamp(eventDate, '09:00');
        selectedEvents.add(event.id);
      }
    }
  });

  for (let dayIndex = 0; dayIndex < duration; dayIndex++) {
    const isLastDay = dayIndex === duration - 1;
    const phaseKey = `hack-${dayIndex}`;

    HACK_DAY_EVENTS.forEach((event) => {
      if (event.lastDayOnly && !isLastDay) return;

      const compositeKey = `${phaseKey}:${event.id}`;
      const state = eventStates[compositeKey] ?? eventStates[event.id];
      const enabled = state?.enabled ?? true;
      const time = state?.time ?? event.defaultTime;

      if (enabled && time) {
        const outputField = EVENT_TO_OUTPUT_FIELD[event.id];
        if (outputField) {
          const eventDate = calculateDateFromOffset(dayIndex);
          if (event.lastDayOnly || dayIndex === 0) {
            timestamps[outputField] = toISOTimestamp(eventDate, time);
          } else {
            const presentation = getHackDayEventPresentation(event, dayIndex);
            syntheticCustomEvents.push({
              name: presentation.name,
              description: presentation.description,
              timestamp: toISOTimestamp(eventDate, time),
              signal: event.signal,
              sourceEventId: event.id,
              sourcePhaseKey: phaseKey,
            });
          }
          selectedEvents.add(event.id);
        }
      }
    });
  }

  let customEventOutput: ScheduleBuilderOutput['customEvents'];
  const activeCustomEvents = customEvents.filter((ce) => isPhaseKeyWithinDuration(ce.phase, duration));
  if (activeCustomEvents.length > 0 || syntheticCustomEvents.length > 0) {
    customEventOutput = [
      ...activeCustomEvents.map((ce) => {
        let timestamp: string;
        if (ce.phase === 'pre' && ce.offsetDays !== undefined) {
          const eventDate = calculateDateFromOffset(ce.offsetDays);
          timestamp = toISOTimestamp(eventDate, '09:00');
        } else if (ce.time) {
          const dayIndex = parseHackPhaseDayIndex(ce.phase) ?? 0;
          const eventDate = calculateDateFromOffset(dayIndex);
          timestamp = toISOTimestamp(eventDate, ce.time);
        } else {
          timestamp = toISOTimestamp(anchorDate, anchorTime || '12:00');
        }

        return {
          name: ce.name,
          description: ce.description,
          timestamp,
          signal: ce.signal,
        };
      }),
      ...syntheticCustomEvents,
    ];
  }

  return {
    timezone,
    duration,
    selectedEvents: Array.from(selectedEvents),
    ...timestamps,
    ...(customEventOutput && { customEvents: customEventOutput }),
  } as ScheduleBuilderOutput;
}
