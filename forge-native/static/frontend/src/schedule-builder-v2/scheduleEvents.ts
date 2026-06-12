/**
 * Schedule Event Definitions for Schedule Builder V2
 *
 * Defines the standard events for pre-event milestones and hack day activities.
 */

import type {
  EventDefinition,
  EventDuration,
  PhaseDefinition,
  PhaseKey,
} from '../types/scheduleBuilderV2';

/** IDs of events that belong to closing days when closingDays > 0 */
const CLOSING_DAY_EVENT_IDS = new Set(['judging', 'presentations', 'results']);

/**
 * Pre-event milestones - dates relative to the hack start anchor.
 */
export const PRE_EVENT_MILESTONES: EventDefinition[] = [
  {
    id: 'registration-opens',
    name: 'Registration Opens',
    description: 'Portal opens for sign-ups',
    signal: 'start',
    phase: 'pre-event',
    defaultOffsetDays: -14,
    offsetUnit: 'days before',
  },
  {
    id: 'team-formation',
    name: 'Team Formation Opens',
    description: 'Marketplace opens for team building',
    signal: 'start',
    phase: 'pre-event',
    defaultOffsetDays: -7,
    offsetUnit: 'days before',
  },
  {
    id: 'registration-closes',
    name: 'Registration Closes',
    description: 'Final deadline to register',
    signal: 'deadline',
    phase: 'pre-event',
    defaultOffsetDays: -1,
    offsetUnit: 'days before',
  },
];

/**
 * Closing day events - timed events during judging, voting, and presentation days.
 * These appear on closing-N phase tabs when closingDays > 0.
 */
export const CLOSING_DAY_EVENTS: EventDefinition[] = [
  {
    id: 'judging',
    name: 'Judging Period',
    description: 'Judges evaluate submissions',
    signal: 'judging',
    phase: 'closing-day',
    defaultTime: '10:00',
  },
  {
    id: 'voting-opens',
    name: 'Voting Opens',
    description: 'Participants cast their votes',
    signal: 'start',
    phase: 'closing-day',
    defaultTime: '10:00',
  },
  {
    id: 'voting-closes',
    name: 'Voting Closes',
    description: 'Voting deadline',
    signal: 'deadline',
    phase: 'closing-day',
    defaultTime: '17:00',
  },
  {
    id: 'presentations',
    name: 'Presentations',
    description: 'Teams present their projects',
    signal: 'presentation',
    phase: 'closing-day',
    defaultTime: '14:00',
  },
  {
    id: 'results',
    name: 'Results Announced',
    description: 'Winners announced and celebrated',
    signal: 'ceremony',
    phase: 'closing-day',
    defaultTime: '18:00',
  },
];

/**
 * Hack day events - timed events during the hackathon.
 */
export const HACK_DAY_EVENTS: EventDefinition[] = [
  {
    id: 'opening',
    name: 'Opening Ceremony',
    description: 'Kickoff and announcements',
    signal: 'ceremony',
    phase: 'hack-day',
    defaultTime: '09:00',
  },
  {
    id: 'hacking-begins',
    name: 'Hacking Begins',
    description: 'Teams start building',
    signal: 'start',
    phase: 'hack-day',
    defaultTime: '09:30',
    isAnchor: true,
  },
  {
    id: 'code-freeze',
    name: 'Code Freeze',
    description: 'Final submissions due',
    signal: 'deadline',
    phase: 'hack-day',
    defaultTime: '14:00',
    lastDayOnly: true,
  },
  {
    id: 'presentations',
    name: 'Presentations',
    description: 'Teams present their projects',
    signal: 'presentation',
    phase: 'hack-day',
    defaultTime: '15:00',
    lastDayOnly: true,
  },
  {
    id: 'judging',
    name: 'Judging Period',
    description: 'Judges evaluate submissions',
    signal: 'judging',
    phase: 'hack-day',
    defaultTime: '16:30',
    lastDayOnly: true,
  },
  {
    id: 'results',
    name: 'Results Announced',
    description: 'Winners announced and celebrated',
    signal: 'ceremony',
    phase: 'hack-day',
    defaultTime: '18:00',
    lastDayOnly: true,
  },
];

/**
 * Get events for a specific phase.
 *
 * For hack days, filters by lastDayOnly and suppresses closing-day events when
 * closingDays > 0. For closing days, returns CLOSING_DAY_EVENTS.
 */
export function getEventsForPhase(
  phase: PhaseDefinition,
  duration: EventDuration,
  closingDays = 0
): EventDefinition[] {
  if (phase.type === 'pre-event') {
    return PRE_EVENT_MILESTONES;
  }

  if (phase.type === 'closing-day') {
    return CLOSING_DAY_EVENTS;
  }

  const dayIndex = phase.dayIndex ?? 0;
  const isLastDay = dayIndex === duration - 1;

  return HACK_DAY_EVENTS
    .filter((event) => {
      if (!event.lastDayOnly) return true;
      if (!isLastDay) return false;
      // When closing days exist, judging/presentations/results move there
      if (closingDays > 0 && CLOSING_DAY_EVENT_IDS.has(event.id)) return false;
      return true;
    })
    .map((event) => {
      if (event.id === 'opening' && dayIndex > 0) {
        return {
          ...event,
          name: 'Morning Kickoff',
          description: 'Daily standup and updates',
        };
      }
      return event;
    });
}

/**
 * Build phase definitions based on duration and closing days.
 */
export function buildPhaseDefinitions(
  duration: EventDuration,
  closingDays = 0,
  closingDayLabels: Record<string, string> = {}
): PhaseDefinition[] {
  const phases: PhaseDefinition[] = [
    { key: 'pre', label: 'Pre-Event', type: 'pre-event' },
  ];

  for (let i = 0; i < duration; i++) {
    phases.push({
      key: `hack-${i}` as PhaseKey,
      label: duration > 1 ? `Hack Day ${i + 1}` : 'Hack Day',
      type: 'hack-day',
      dayIndex: i,
    });
  }

  for (let i = 0; i < closingDays; i++) {
    const key = `closing-${i}` as PhaseKey;
    const defaultLabel = `Day ${duration + i + 1}`;
    phases.push({
      key,
      label: closingDayLabels[key] ?? defaultLabel,
      type: 'closing-day',
      closingDayIndex: i,
    });
  }

  return phases;
}

/**
 * Build a composite key for hack day events.
 * Pre-event milestones use flat keys (e.g., "registration-opens").
 * Hack day events use composite keys (e.g., "hack-0:opening", "hack-1:opening").
 *
 * @param phaseKey - The phase key (e.g., "pre", "hack-0", "hack-1")
 * @param eventId - The event ID (e.g., "opening", "hacking-begins")
 * @returns The state key to use
 */
export function getEventStateKey(phaseKey: PhaseKey, eventId: string): string {
  if (phaseKey === 'pre') {
    return eventId;
  }
  return `${phaseKey}:${eventId}`;
}

/**
 * Initialize default event states for all events.
 */
export function initializeEventStates(
  duration: EventDuration = 2,
  closingDays = 0
): Record<string, { enabled: boolean; offsetDays?: number; time?: string }> {
  const states: Record<string, { enabled: boolean; offsetDays?: number; time?: string }> = {};

  PRE_EVENT_MILESTONES.forEach((event) => {
    states[event.id] = {
      enabled: true,
      offsetDays: event.defaultOffsetDays,
    };
  });

  for (let dayIndex = 0; dayIndex < duration; dayIndex++) {
    const isLastDay = dayIndex === duration - 1;
    const phaseKey = `hack-${dayIndex}` as PhaseKey;

    HACK_DAY_EVENTS.forEach((event) => {
      if (event.lastDayOnly && !isLastDay) return;
      // When closing days exist, skip events that move to closing days
      if (event.lastDayOnly && closingDays > 0 && CLOSING_DAY_EVENT_IDS.has(event.id)) return;

      const stateKey = getEventStateKey(phaseKey, event.id);
      states[stateKey] = {
        enabled: true,
        time: event.defaultTime,
      };
    });
  }

  for (let closingIndex = 0; closingIndex < closingDays; closingIndex++) {
    const phaseKey = `closing-${closingIndex}` as PhaseKey;
    CLOSING_DAY_EVENTS.forEach((event) => {
      const stateKey = getEventStateKey(phaseKey, event.id);
      states[stateKey] = {
        enabled: false,
        time: event.defaultTime,
      };
    });
  }

  return states;
}

/**
 * Ensure event states exist for a given duration and closing day count.
 * Called when duration or closingDays changes to add missing states for new days.
 */
export function ensureEventStatesForDuration(
  existingStates: Record<string, { enabled: boolean; offsetDays?: number; time?: string }>,
  duration: EventDuration,
  closingDays = 0
): Record<string, { enabled: boolean; offsetDays?: number; time?: string }> {
  const states = { ...existingStates };

  for (let dayIndex = 0; dayIndex < duration; dayIndex++) {
    const isLastDay = dayIndex === duration - 1;
    const phaseKey = `hack-${dayIndex}` as PhaseKey;

    HACK_DAY_EVENTS.forEach((event) => {
      if (event.lastDayOnly && !isLastDay) return;
      if (event.lastDayOnly && closingDays > 0 && CLOSING_DAY_EVENT_IDS.has(event.id)) return;

      const stateKey = getEventStateKey(phaseKey, event.id);
      if (!(stateKey in states)) {
        states[stateKey] = {
          enabled: true,
          time: event.defaultTime,
        };
      }
    });
  }

  for (let closingIndex = 0; closingIndex < closingDays; closingIndex++) {
    const phaseKey = `closing-${closingIndex}` as PhaseKey;
    CLOSING_DAY_EVENTS.forEach((event) => {
      const stateKey = getEventStateKey(phaseKey, event.id);
      if (!(stateKey in states)) {
        states[stateKey] = {
          enabled: false,
          time: event.defaultTime,
        };
      }
    });
  }

  return states;
}

/**
 * Map of event IDs to their corresponding output field names.
 * Used when building the ScheduleBuilderOutput payload.
 */
export const EVENT_TO_OUTPUT_FIELD: Record<string, string> = {
  'registration-opens': 'registrationOpensAt',
  'registration-closes': 'registrationClosesAt',
  'team-formation': 'teamFormationStartsAt',
  'opening': 'openingCeremonyAt',
  'hacking-begins': 'hackingStartsAt',
  'code-freeze': 'submissionDeadlineAt',
  'presentations': 'presentationsAt',
  'judging': 'judgingStartsAt',
  'results': 'resultsAnnounceAt',
  'voting-opens': 'votingStartsAt',
  'voting-closes': 'votingEndsAt',
};
