/**
 * Shared Constants for HD26Forge Custom UI
 * Event phases, user roles, and configuration
 */

// Bump this when deploying to help bust Atlassian CDN cache (see LEARNINGS_CURSOR.md)
export const APP_VERSION = '1.2.67';

// Demo event ID - shared with HD26AI for unified demo data
export const DEMO_EVENT_ID = 'demo-event-2026';

// ============================================================================
// USER ROLES
// ============================================================================

export const USER_ROLES = {
  participant: {
    id: 'participant',
    label: 'Participant',
    description: 'Regular hackday attendee',
    canVote: true,
    canJudge: false,
    canManage: false,
    canViewAnalytics: false,
  },
  ambassador: {
    id: 'ambassador',
    label: 'Ambassador',
    description: 'Side recruiter with voting power',
    canVote: true,
    canJudge: false,
    canManage: false,
    canViewAnalytics: false,
  },
  judge: {
    id: 'judge',
    label: 'Judge',
    description: 'Official project evaluator',
    canVote: false,
    canJudge: true,
    canManage: false,
    canViewAnalytics: true,
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    description: 'Event organizer with full access',
    canVote: false,
    canJudge: false,
    canManage: true,
    canViewAnalytics: true,
  },
};

// ============================================================================
// EVENT PHASES
// ============================================================================

export const EVENT_PHASES = {
  signup: {
    id: 'signup',
    label: 'Registration',
    description: 'Complete your profile and choose how you will participate',
    order: 1,
  },
  team_formation: {
    id: 'team_formation',
    label: 'Team Formation',
    description: 'Find teammates and form your squad',
    order: 2,
  },
  hacking: {
    id: 'hacking',
    label: 'Hacking',
    description: 'Build your project',
    order: 3,
  },
  submission: {
    id: 'submission',
    label: 'Submission',
    description: 'Submit your project for judging',
    order: 4,
  },
  voting: {
    id: 'voting',
    label: 'Voting',
    description: "Vote for People's Champion",
    order: 5,
  },
  judging: {
    id: 'judging',
    label: 'Judging',
    description: 'Judges evaluate submissions',
    order: 6,
  },
  results: {
    id: 'results',
    label: 'Results',
    description: 'Winners announced!',
    order: 7,
  },
};

export const EVENT_PHASE_ORDER = [
  'signup',
  'team_formation',
  'hacking',
  'submission',
  'voting',
  'judging',
  'results',
];

// ============================================================================
// SKILLS
// ============================================================================

export const MAX_SKILLS = 5;

export const SKILLS = [
  'Frontend Development',
  'Backend Development',
  'Machine Learning',
  'UI/UX Design',
  'Data Science',
  'DevOps',
  'Product Management',
  'Mobile Development',
  'Security',
  'Hardware/IoT',
];

// ============================================================================
// TIMEZONE HELPERS
// ============================================================================

export const EVENT_TIMEZONE = 'Europe/London';

/**
 * Get user's current locale
 */
export function getUserLocale() {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
}

/**
 * Create a date in UK timezone
 */
export function createUKDate(dateStr, timeStr) {
  const [year, month, day] = (dateStr || '').split('-').map(Number);
  const [hours, minutes] = (timeStr || '').split(':').map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return new Date(NaN);
  }

  // Interpret the provided date/time as Europe/London local time and convert
  // to an absolute JS Date (UTC instant). Handles GMT/BST automatically.
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  const offset1 = getTimeZoneOffsetMs(EVENT_TIMEZONE, utcGuess);
  const corrected = new Date(utcGuess.getTime() - offset1);

  // Recompute once in case DST boundary shifts after correction.
  const offset2 = getTimeZoneOffsetMs(EVENT_TIMEZONE, corrected);
  if (offset2 !== offset1) {
    return new Date(utcGuess.getTime() - offset2);
  }

  return corrected;
}

function getTimeZoneOffsetMs(timeZone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;

  const asUTC = Date.UTC(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second'))
  );

  return asUTC - date.getTime();
}

/**
 * Get user's current timezone
 */
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get timezone abbreviation for user's timezone
 */
export function getTimezoneAbbr() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat(getUserLocale(), {
    timeZoneName: 'short',
  });
  const parts = formatter.formatToParts(now);
  const tzPart = parts.find(p => p.type === 'timeZoneName');
  return tzPart?.value || '';
}

/**
 * Convert UK time to user's local time
 */
export function convertUKTimeToLocal(
  dateStr,
  timeStr,
  userTimezone = getUserTimezone(),
  userLocale = getUserLocale()
) {
  const ukDate = createUKDate(dateStr, timeStr);

  const formatter = new Intl.DateTimeFormat(userLocale, {
    timeZone: userTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const dateFormatter = new Intl.DateTimeFormat(userLocale, {
    timeZone: userTimezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return {
    date: ukDate,
    time: formatter.format(ukDate),
    dateLabel: dateFormatter.format(ukDate),
  };
}

/**
 * Format a UK-scheduled date/time in the user's locale/timezone
 */
export function formatUKDateTimeToLocal(
  dateStr,
  timeStr,
  options = {},
  userTimezone = getUserTimezone(),
  userLocale = getUserLocale()
) {
  const ukDate = createUKDate(dateStr, timeStr);
  return new Intl.DateTimeFormat(userLocale, {
    timeZone: userTimezone,
    ...options,
  }).format(ukDate);
}
