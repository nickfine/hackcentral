/**
 * Schedule Builder V2 Type Definitions
 *
 * Phase-based schedule builder with signal colors and custom events.
 */

/** Event duration in days (1, 2, or 3 day hackathons) */
export type EventDuration = 1 | 2 | 3;

/**
 * Signal types for visual categorization of events.
 * - start: Teal - openings, begins (Registration Opens, Hacking Begins)
 * - deadline: Red - closings, due dates (Registration Closes, Code Freeze)
 * - ceremony: Orange/Amber - kickoffs, awards (Opening Ceremony, Results)
 * - presentation: Pink - presentations
 * - judging: Blue - judging period
 * - neutral: Gray - everything else
 */
export type EventSignal =
  | 'start'
  | 'deadline'
  | 'ceremony'
  | 'presentation'
  | 'judging'
  | 'neutral';

/** Phase type - either pre-event milestones or hack day events */
export type PhaseType = 'pre-event' | 'hack-day';

/** Phase key - 'pre' for pre-event, 'hack-0', 'hack-1', 'hack-2' for hack days */
export type PhaseKey = 'pre' | `hack-${number}`;

/**
 * Definition for a standard event in the schedule.
 */
export interface EventDefinition {
  /** Unique identifier for the event */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Visual signal category */
  signal: EventSignal;
  /** Whether this is a pre-event milestone or hack day event */
  phase: PhaseType;

  // Pre-event specific fields
  /** Default offset in days from anchor (negative = before, e.g. -14 = 14 days before) */
  defaultOffsetDays?: number;
  /** Unit label for the offset (e.g. "days before") */
  offsetUnit?: string;

  // Hack day specific fields
  /** Default time in HH:MM format */
  defaultTime?: string;
  /** Only show on the final hack day (e.g. Code Freeze, Results) */
  lastDayOnly?: boolean;
  /** Whether this event is the anchor (Hacking Begins) */
  isAnchor?: boolean;
}

/**
 * A user-created custom event.
 */
export interface CustomEvent {
  /** Unique identifier (UUID) */
  id: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Visual signal category */
  signal: EventSignal;
  /** Which phase this belongs to */
  phase: PhaseKey;
  /** Position within phase for ordering */
  order: number;

  // Pre-event specific
  /** Offset in days from anchor */
  offsetDays?: number;

  // Hack day specific
  /** Time in HH:MM format */
  time?: string;

  /** Marker to identify custom events */
  isCustom: true;
}

/**
 * State for a single event (enabled status and configured values).
 */
export interface EventState {
  /** Whether this event is included in the schedule */
  enabled: boolean;
  /** Offset in days for pre-event milestones */
  offsetDays?: number;
  /** Time in HH:MM format for hack day events */
  time?: string;
}

/**
 * Phase definition for the tab bar.
 */
export interface PhaseDefinition {
  /** Unique key for the phase */
  key: PhaseKey;
  /** Display label */
  label: string;
  /** Phase type */
  type: PhaseType;
  /** Day index for hack days (0, 1, 2) */
  dayIndex?: number;
}

/**
 * Complete state for the Schedule Builder V2.
 */
export interface ScheduleBuilderState {
  /** Event duration (1, 2, or 3 days) */
  duration: EventDuration;
  /** Anchor date (ISO date string YYYY-MM-DD) */
  anchorDate: string;
  /** Anchor time (HH:MM format) */
  anchorTime: string;
  /** Event timezone */
  timezone: string;
  /** Currently active phase tab */
  activePhase: PhaseKey;
  /** Event states keyed by event ID - using plain object for serialization */
  eventStates: Record<string, EventState>;
  /** User-created custom events */
  customEvents: CustomEvent[];
}

/**
 * Output payload from Schedule Builder V2.
 * Matches the existing EventSchedule interface for backward compatibility.
 */
export interface ScheduleBuilderOutput {
  /** Event timezone */
  timezone: string;
  /** Event duration */
  duration: EventDuration;
  /** Selected event types for compatibility */
  selectedEvents?: string[];

  // Standard timestamps (ISO format)
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  teamFormationStartsAt?: string;
  teamFormationEndsAt?: string;
  openingCeremonyAt?: string;
  hackingStartsAt?: string;
  submissionDeadlineAt?: string;
  presentationsAt?: string;
  judgingStartsAt?: string;
  votingStartsAt?: string;
  votingEndsAt?: string;
  resultsAnnounceAt?: string;

  // Custom events (new field)
  customEvents?: Array<{
    name: string;
    description?: string;
    timestamp: string;
    signal: EventSignal;
  }>;
}

/**
 * Props for the main ScheduleBuilderV2 component.
 */
export interface ScheduleBuilderV2Props {
  /** Initial timezone */
  timezone: string;
  /** Callback when schedule changes */
  onChange: (output: ScheduleBuilderOutput) => void;
  /** Initial state for hydration (e.g., from draft) */
  initialState?: Partial<ScheduleBuilderState>;
}
