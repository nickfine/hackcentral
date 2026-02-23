/**
 * Cascade schedule engine — ported from src/components/create/CascadeScheduleEngine.ts.
 * Pure TS, no external deps. Works with browser Intl API.
 */

export type ScheduleStepPhaseId =
  | 'registrationOpensAt'
  | 'registrationClosesAt'
  | 'teamFormationStartsAt'
  | 'teamFormationEndsAt'
  | 'hackingStartsAt'
  | 'submissionDeadlineAt'
  | 'votingStartsAt'
  | 'votingEndsAt'
  | 'resultsAnnounceAt';

export type CascadeRule = {
  phaseId: ScheduleStepPhaseId;
  label: string;
  offsetDays: number;
};

export type PhaseDateMap = Map<ScheduleStepPhaseId, string>;

/** Phase order and default offsets from anchor (Hacking Starts). */
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

export const CASCADE_PHASE_ORDER: ScheduleStepPhaseId[] = CASCADE_RULES.map((r) => r.phaseId);

export const ANCHOR_PHASE_ID: ScheduleStepPhaseId = 'hackingStartsAt';

/** Index of the anchor phase in CASCADE_RULES (4). */
export const ANCHOR_INDEX = CASCADE_RULES.findIndex((r) => r.phaseId === ANCHOR_PHASE_ID);

function getLocalPartsInZone(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
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
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

function addDaysInTimezone(anchor: Date, offsetDays: number, timezone: string): Date {
  const { year, month, day, hour, minute } = getLocalPartsInZone(anchor, timezone);
  const d = new Date(Date.UTC(year, month - 1, day + offsetDays, 0, 0, 0, 0));
  const Y2 = d.getUTCFullYear();
  const M2 = d.getUTCMonth() + 1;
  const D2 = d.getUTCDate();
  const guessMs = anchor.getTime() + offsetDays * 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  for (let i = -48; i <= 48; i++) {
    const candidate = new Date(guessMs + i * hourMs);
    const p = getLocalPartsInZone(candidate, timezone);
    if (p.year === Y2 && p.month === M2 && p.day === D2 && p.hour === hour && p.minute === minute) {
      return candidate;
    }
  }
  return new Date(guessMs);
}

export function computeSuggestedSchedule(anchor: Date, timezone: string): PhaseDateMap {
  const result = new Map<ScheduleStepPhaseId, string>();
  const tz = timezone || 'UTC';
  for (const rule of CASCADE_RULES) {
    const d = addDaysInTimezone(anchor, rule.offsetDays, tz);
    result.set(rule.phaseId, d.toISOString());
  }
  return result;
}

export function mergeWithOverrides(suggested: PhaseDateMap, overrides: PhaseDateMap): PhaseDateMap {
  const result = new Map<ScheduleStepPhaseId, string>();
  for (const phaseId of CASCADE_PHASE_ORDER) {
    const override = overrides.get(phaseId);
    const value = override !== undefined ? override : suggested.get(phaseId);
    if (value !== undefined) result.set(phaseId, value);
  }
  return result;
}

/** Format an ISO string for display in a timezone. */
export function formatInZone(iso: string, timezone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/** Convert datetime-local value ("YYYY-MM-DDTHH:mm") to ISO UTC string. */
export function datetimeLocalToIso(v: string): string {
  if (!v) return '';
  return new Date(v + ':00Z').toISOString();
}

/** Convert ISO UTC string to datetime-local value. */
export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDurationLabel(
  from: string | undefined,
  to: string | undefined,
): { label: string; isOverlap: boolean } {
  if (!from || !to) return { label: '—', isOverlap: false };
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return { label: '—', isOverlap: false };
  const days = Math.round((toMs - fromMs) / MS_PER_DAY);
  if (days < 0) return { label: 'Overlap', isOverlap: true };
  if (days === 0) return { label: 'Same day', isOverlap: false };
  return { label: days === 1 ? '1 day' : `${days} days`, isOverlap: false };
}
