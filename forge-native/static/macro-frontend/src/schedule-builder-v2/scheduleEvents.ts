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
 * For hack days, this filters events based on whether it's the last day
 * and transforms event names where needed (e.g., "Morning Kickoff" for day 2+).
 */
export function getEventsForPhase(
  phase: PhaseDefinition,
  duration: EventDuration
): EventDefinition[] {
  if (phase.type === 'pre-event') {
    return PRE_EVENT_MILESTONES;
  }

  const dayIndex = phase.dayIndex ?? 0;
  const isLastDay = dayIndex === duration - 1;

  return HACK_DAY_EVENTS
    .filter((event) => {
      // Always show non-lastDayOnly events
      if (!event.lastDayOnly) return true;
      // Only show lastDayOnly events on the final day
      return isLastDay;
    })
    .map((event) => {
      // Transform Opening Ceremony to Morning Kickoff on non-first days
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
 * Build phase definitions based on duration.
 *
 * @param duration - Number of hack days (1, 2, or 3)
 * @returns Array of phase definitions for the tab bar
 */
export function buildPhaseDefinitions(duration: EventDuration): PhaseDefinition[] {
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

  return phases;
}

/**
 * Initialize default event states for all events.
 *
 * @returns Record of event states with defaults
 */
export function initializeEventStates(): Record<string, { enabled: boolean; offsetDays?: number; time?: string }> {
  const states: Record<string, { enabled: boolean; offsetDays?: number; time?: string }> = {};

  // Pre-event milestones - enabled by default with default offsets
  PRE_EVENT_MILESTONES.forEach((event) => {
    states[event.id] = {
      enabled: true,
      offsetDays: event.defaultOffsetDays,
    };
  });

  // Hack day events - enabled by default with default times
  HACK_DAY_EVENTS.forEach((event) => {
    states[event.id] = {
      enabled: true,
      time: event.defaultTime,
    };
  });

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
};
