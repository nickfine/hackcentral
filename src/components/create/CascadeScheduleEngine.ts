/**
 * Cascade schedule engine: rules table, computeSuggestedSchedule(anchor, timezone),
 * mergeWithOverrides(suggested, overrides). No UI.
 *
 * All derived times use the same clock time as the anchor in the given timezone.
 */

import type { CascadeRule, PhaseDateMap, ScheduleStepPhaseId } from './types';

/** Phase order and default offsets from anchor (Hacking Starts). Display order. */
export const CASCADE_RULES: CascadeRule[] = [
  { phaseId: 'registrationOpensAt', label: 'Registration Opens', offsetDays: -14 },
  { phaseId: 'registrationClosesAt', label: 'Registration Closes', offsetDays: -3 },
  { phaseId: 'teamFormationStartsAt', label: 'Team Formation Starts', offsetDays: -5 },
  { phaseId: 'teamFormationEndsAt', label: 'Team Formation Ends', offsetDays: -1 },
  { phaseId: 'hackingStartsAt', label: 'Hacking Starts', offsetDays: 0 },
  { phaseId: 'submissionDeadlineAt', label: 'Submission Deadline', offsetDays: 2 },
  { phaseId: 'votingStartsAt', label: 'Voting Starts', offsetDays: 2 },
  { phaseId: 'votingEndsAt', label: 'Voting Ends', offsetDays: 4 },
  { phaseId: 'resultsAnnounceAt', label: 'Results Announced', offsetDays: 5 },
];

/** Phase IDs in display order (for iteration). */
export const CASCADE_PHASE_ORDER: ScheduleStepPhaseId[] = CASCADE_RULES.map(
  (r) => r.phaseId
);

const ANCHOR_PHASE_ID: ScheduleStepPhaseId = 'hackingStartsAt';

/**
 * Get local date/time parts for a UTC Date in the given IANA timezone.
 */
function getLocalPartsInZone(date: Date, timezone: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (name: string) => {
    const p = parts.find((x) => x.type === name);
    return p ? parseInt(p.value, 10) : 0;
  };
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/**
 * Add offsetDays calendar days in the given timezone, keeping the same time-of-day.
 * Returns a Date (UTC) that represents that local moment.
 */
function addDaysInTimezone(anchor: Date, offsetDays: number, timezone: string): Date {
  const { year, month, day, hour, minute } = getLocalPartsInZone(anchor, timezone);
  // Calendar add days using UTC date math (month rollover is correct)
  const d = new Date(Date.UTC(year, month - 1, day + offsetDays, 0, 0, 0, 0));
  const Y2 = d.getUTCFullYear();
  const M2 = d.getUTCMonth() + 1;
  const D2 = d.getUTCDate();
  // Find UTC moment that formats to (Y2, M2, D2, hour, minute) in timezone.
  // Search in a ±48h window around anchor + offsetDays to handle DST.
  const guessMs = anchor.getTime() + offsetDays * 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  for (let i = -48; i <= 48; i++) {
    const candidate = new Date(guessMs + i * hourMs);
    const p = getLocalPartsInZone(candidate, timezone);
    if (p.year === Y2 && p.month === M2 && p.day === D2 && p.hour === hour && p.minute === minute) {
      return candidate;
    }
  }
  // Fallback: use guess (may be wrong by an hour at DST boundaries)
  return new Date(guessMs);
}

/**
 * Compute the suggested schedule from anchor and timezone.
 * Same time-of-day as anchor for all phases; offset in days per CASCADE_RULES.
 */
export function computeSuggestedSchedule(anchor: Date, timezone: string): PhaseDateMap {
  const result = new Map<ScheduleStepPhaseId, string>();
  const tz = timezone || 'UTC';
  for (const rule of CASCADE_RULES) {
    const d = addDaysInTimezone(anchor, rule.offsetDays, tz);
    result.set(rule.phaseId, d.toISOString());
  }
  return result;
}

/**
 * Merge suggested dates with overrides. For each phase, if an override exists use it; otherwise use suggested.
 */
export function mergeWithOverrides(
  suggested: PhaseDateMap,
  overrides: Map<ScheduleStepPhaseId, string>
): PhaseDateMap {
  const result = new Map<ScheduleStepPhaseId, string>();
  for (const phaseId of CASCADE_PHASE_ORDER) {
    const override = overrides.get(phaseId);
    const value = override !== undefined ? override : suggested.get(phaseId);
    if (value !== undefined) {
      result.set(phaseId, value);
    }
  }
  return result;
}

/**
 * Build the Schedule object (timezone + 9 ISO strings) from resolved PhaseDateMap and timezone.
 */
export function phaseDateMapToSchedule(
  map: PhaseDateMap,
  timezone: string
): { timezone: string; [key: string]: string } {
  const out: { timezone: string; [key: string]: string } = { timezone };
  for (const phaseId of CASCADE_PHASE_ORDER) {
    const v = map.get(phaseId);
    if (v !== undefined) {
      out[phaseId] = v;
    }
  }
  return out;
}

/** Phase ID of the anchor (Hacking Starts). */
export function getAnchorPhaseId(): ScheduleStepPhaseId {
  return ANCHOR_PHASE_ID;
}
