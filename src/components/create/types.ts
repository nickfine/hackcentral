/**
 * Schedule step types: phase IDs, cascade rules, and schedule shape.
 * Aligns with CreateHackDayWizardPayload.schedule (convex/hackdays.ts).
 */

/** Phase ID = schedule field name for that phase. Display order is CASCADE_PHASE_ORDER. */
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

/** Single cascade rule: offset in days from anchor (negative = before, positive = after). */
export type CascadeRule = {
  phaseId: ScheduleStepPhaseId;
  label: string;
  offsetDays: number;
};

/** Schedule shape passed to/from parent and backend (timezone + 9 optional ISO strings). */
export type Schedule = {
  timezone?: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  teamFormationStartsAt?: string;
  teamFormationEndsAt?: string;
  hackingStartsAt?: string;
  submissionDeadlineAt?: string;
  votingStartsAt?: string;
  votingEndsAt?: string;
  resultsAnnounceAt?: string;
};

/** Map of phase ID to ISO date-time string (resolved or suggested). */
export type PhaseDateMap = Map<ScheduleStepPhaseId, string>;
