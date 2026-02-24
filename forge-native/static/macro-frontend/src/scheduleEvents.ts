import { ScheduleEventDefinition, ScheduleEventType } from './types';

export const SCHEDULE_EVENT_DEFINITIONS: ScheduleEventDefinition[] = [
  // PRE-EVENT
  {
    id: 'registrationOpens',
    label: 'Registration Opens',
    description: 'Registration portal opens for participants',
    category: 'pre-event',
    phase: 'REGISTRATION',
    icon: '📝',
    defaultIncluded: true,
  },
  {
    id: 'registrationCloses',
    label: 'Registration Closes',
    description: 'Final deadline to register',
    category: 'pre-event',
    phase: 'REGISTRATION',
    icon: '🔒',
    defaultIncluded: true,
  },
  {
    id: 'teamFormationStarts',
    label: 'Team Formation Opens',
    description: 'Start forming teams in the Marketplace',
    category: 'pre-event',
    phase: 'TEAM_FORMATION',
    icon: '👥',
    defaultIncluded: true,
  },
  {
    id: 'teamFormationEnds',
    label: 'Team Formation Closes',
    description: 'Final deadline to join a team',
    category: 'pre-event',
    phase: 'TEAM_FORMATION',
    icon: '⏰',
    defaultIncluded: true,
  },

  // CORE EVENT
  {
    id: 'openingCeremony',
    label: 'Opening Ceremony',
    description: 'Kickoff event and announcements',
    category: 'core',
    phase: 'HACKING',
    icon: '🎉',
    defaultIncluded: true,
  },
  {
    id: 'hackingStarts',
    label: 'Hacking Begins',
    description: 'Start building your projects',
    category: 'core',
    phase: 'HACKING',
    icon: '💻',
    defaultIncluded: true,
  },
  {
    id: 'submissionDeadline',
    label: 'Code Freeze & Submission Deadline',
    description: 'Final deadline for project submissions',
    category: 'core',
    phase: 'SUBMISSION',
    icon: '🏁',
    defaultIncluded: true,
  },

  // ACTIVITIES
  {
    id: 'lunchBreak',
    label: 'Lunch Break',
    description: 'Scheduled lunch break',
    category: 'activities',
    phase: 'HACKING',
    icon: '🍽️',
    defaultIncluded: false,
  },
  {
    id: 'afternoonCheckin',
    label: 'Afternoon Check-in',
    description: 'Mid-day standup or Q&A',
    category: 'activities',
    phase: 'HACKING',
    icon: '📢',
    defaultIncluded: false,
  },
  {
    id: 'dinnerBreak',
    label: 'Dinner Break',
    description: 'Scheduled dinner break',
    category: 'activities',
    phase: 'HACKING',
    icon: '🍕',
    defaultIncluded: false,
  },
  {
    id: 'eveningCheckin',
    label: 'Evening Check-in',
    description: 'End of day updates',
    category: 'activities',
    phase: 'HACKING',
    icon: '🌙',
    defaultIncluded: false,
  },

  // CLOSING
  {
    id: 'presentations',
    label: 'Project Presentations',
    description: 'Teams present their projects',
    category: 'closing',
    phase: 'SUBMISSION',
    icon: '🎤',
    defaultIncluded: true,
  },
  {
    id: 'votingStarts',
    label: 'Voting Opens',
    description: 'Community voting begins',
    category: 'closing',
    phase: 'VOTING',
    icon: '🗳️',
    defaultIncluded: true,
  },
  {
    id: 'votingEnds',
    label: 'Voting Closes',
    description: 'Voting period ends',
    category: 'closing',
    phase: 'VOTING',
    icon: '⏱️',
    defaultIncluded: false,
  },
  {
    id: 'judgingStarts',
    label: 'Judging Period',
    description: 'Judges evaluate submissions',
    category: 'closing',
    phase: 'JUDGING',
    icon: '⚖️',
    defaultIncluded: true,
  },
  {
    id: 'resultsAnnounce',
    label: 'Awards Ceremony',
    description: 'Results announcement and celebration',
    category: 'closing',
    phase: 'RESULTS',
    icon: '🏆',
    defaultIncluded: true,
  },
];

/**
 * Helper to get events by category
 */
export function getEventsByCategory(category: string): ScheduleEventDefinition[] {
  return SCHEDULE_EVENT_DEFINITIONS.filter(e => e.category === category);
}

/**
 * Helper to get default selections
 */
export function getDefaultSelections(): ScheduleEventType[] {
  return SCHEDULE_EVENT_DEFINITIONS
    .filter(e => e.defaultIncluded)
    .map(e => e.id);
}
