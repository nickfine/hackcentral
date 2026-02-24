/**
 * PhaseContent Component
 *
 * Renders the content for the active phase:
 * - Phase header with title and description
 * - List of event cards
 * - Add custom event button
 */

import type {
  EventDefinition,
  EventDuration,
  EventState,
  PhaseDefinition,
} from '../../types/scheduleBuilderV2';
import { getEventsForPhase } from '../../schedule-builder-v2/scheduleEvents';
import { EventCard } from './EventCard';

interface PhaseContentProps {
  phase: PhaseDefinition;
  duration: EventDuration;
  anchorDate: string;
  eventStates: Record<string, EventState>;
  onEventToggle: (eventId: string) => void;
  onEventOffsetChange: (eventId: string, offsetDays: number) => void;
  onEventTimeChange: (eventId: string, time: string) => void;
  onAddCustomEvent: () => void;
}

/**
 * Get the description text for a phase.
 */
function getPhaseDescription(phase: PhaseDefinition, duration: EventDuration): string {
  if (phase.type === 'pre-event') {
    return 'Set the milestones leading up to your hack. Dates are relative to your hack start date.';
  }

  if (duration === 1) {
    return 'Define the schedule for your hack day. Set the times for each event.';
  }

  const dayIndex = phase.dayIndex ?? 0;
  const isLastDay = dayIndex === duration - 1;

  if (isLastDay) {
    return 'Final day — hacking wraps up, submissions close, and results are announced.';
  }

  return `Schedule for Day ${dayIndex + 1}. Set the times for each event.`;
}

/**
 * Format the date for a specific hack day.
 */
function formatHackDayDate(anchorDate: string, dayIndex: number): string {
  if (!anchorDate) return '';

  const date = new Date(anchorDate);
  date.setDate(date.getDate() + dayIndex);

  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function PhaseContent({
  phase,
  duration,
  anchorDate,
  eventStates,
  onEventToggle,
  onEventOffsetChange,
  onEventTimeChange,
  onAddCustomEvent,
}: PhaseContentProps) {
  const events = getEventsForPhase(phase, duration);
  const phaseType = phase.type === 'pre-event' ? 'milestone' : 'timed';
  const description = getPhaseDescription(phase, duration);

  // Get the formatted date for hack days
  const hackDayDate =
    phase.type === 'hack-day' && phase.dayIndex !== undefined
      ? formatHackDayDate(anchorDate, phase.dayIndex)
      : null;

  return (
    <div
      className="sb2-phase-content"
      role="tabpanel"
      id={`phase-panel-${phase.key}`}
      aria-labelledby={`phase-tab-${phase.key}`}
    >
      {/* Phase header */}
      <div className="sb2-phase-header">
        <div className="sb2-phase-title-row">
          <h2 className="sb2-phase-title">{phase.label}</h2>
          {hackDayDate && <span className="sb2-phase-date">{hackDayDate}</span>}
        </div>
        <p className="sb2-phase-description">{description}</p>
      </div>

      {/* Event list */}
      <div className="sb2-event-list">
        {events.map((event) => {
          const state = eventStates[event.id] || {
            enabled: true,
            offsetDays: event.defaultOffsetDays,
            time: event.defaultTime,
          };

          return (
            <EventCard
              key={event.id}
              event={event}
              enabled={state.enabled}
              onToggle={() => onEventToggle(event.id)}
              phaseType={phaseType}
              anchorDate={anchorDate}
              offsetDays={state.offsetDays}
              onOffsetChange={(days) => onEventOffsetChange(event.id, days)}
              time={state.time}
              onTimeChange={(time) => onEventTimeChange(event.id, time)}
            />
          );
        })}
      </div>

      {/* Add custom event button */}
      <button
        type="button"
        className="sb2-add-custom-btn"
        onClick={onAddCustomEvent}
      >
        <span className="sb2-add-custom-icon">+</span>
        Add custom event
      </button>
    </div>
  );
}
