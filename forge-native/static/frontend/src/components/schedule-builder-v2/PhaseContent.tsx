/**
 * PhaseContent Component
 *
 * Renders the content for the active phase:
 * - Phase header with title and description
 * - List of event cards
 * - Add custom event button
 */

import { useEffect, useRef, useState } from 'react';
import type {
  CustomEvent,
  EventDuration,
  EventSignal,
  EventState,
  PhaseDefinition,
} from '../../types/scheduleBuilderV2';
import { getEventsForPhase, getEventStateKey } from '../../schedule-builder-v2/scheduleEvents';
import { getSignalStyle, hasAccentBorder } from '../../schedule-builder-v2/signalStyles';
import { EventCard } from './EventCard';

interface PhaseContentProps {
  phase: PhaseDefinition;
  duration: EventDuration;
  anchorDate: string;
  eventStates: Record<string, EventState>;
  customEvents: CustomEvent[];
  onEventToggle: (eventId: string) => void;
  onEventOffsetChange: (eventId: string, offsetDays: number) => void;
  onEventTimeChange: (eventId: string, time: string) => void;
  onAddCustomEvent: () => void;
  onCustomEventUpdate: (
    eventId: string,
    updates: Partial<Pick<CustomEvent, 'name' | 'description' | 'signal' | 'offsetDays' | 'time'>>
  ) => void;
  onCustomEventDelete: (eventId: string) => void;
  pendingCustomEventFocusId: string | null;
  onCustomEventFocusHandled: (eventId: string | null) => void;
  pendingCustomEventConfirmIds: Record<string, true>;
  onCustomEventConfirm: (eventId: string) => void;
}

const CUSTOM_SIGNAL_OPTIONS: Array<{ value: EventSignal; label: string }> = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'start', label: 'Start' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'judging', label: 'Judging' },
];

function parseTimeToMinutes(time?: string): number {
  if (!time) return Number.MAX_SAFE_INTEGER;

  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number.parseInt(hoursRaw ?? '', 10);
  const minutes = Number.parseInt(minutesRaw ?? '', 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hours * 60 + minutes;
}

function formatPreEventTiming(anchorDate: string, offsetDays: number): { dateText: string; labelText: string } {
  if (!anchorDate) {
    return { dateText: '—', labelText: `${Math.abs(offsetDays)} days before` };
  }

  const date = new Date(anchorDate);
  date.setDate(date.getDate() + offsetDays);

  const dateText = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  let labelText: string;
  if (offsetDays === 0) {
    labelText = 'Hack day';
  } else if (Math.abs(offsetDays) === 1) {
    labelText = `1 day ${offsetDays < 0 ? 'before' : 'after'}`;
  } else {
    labelText = `${Math.abs(offsetDays)} days ${offsetDays < 0 ? 'before' : 'after'}`;
  }

  return { dateText, labelText };
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
  customEvents,
  onEventToggle,
  onEventOffsetChange,
  onEventTimeChange,
  onAddCustomEvent,
  onCustomEventUpdate,
  onCustomEventDelete,
  pendingCustomEventFocusId,
  onCustomEventFocusHandled,
  pendingCustomEventConfirmIds,
  onCustomEventConfirm,
}: PhaseContentProps) {
  const events = getEventsForPhase(phase, duration);
  const phaseType = phase.type === 'pre-event' ? 'milestone' : 'timed';
  const description = getPhaseDescription(phase, duration);
  const phaseCustomEvents = customEvents
    .filter((event) => event.phase === phase.key)
    .sort((a, b) => a.order - b.order);
  const pendingFocusInputRef = useRef<HTMLInputElement | null>(null);
  const customEventIndexById = new Map(phaseCustomEvents.map((event, index) => [event.id, index + 1]));
  const [editingCustomEventIds, setEditingCustomEventIds] = useState<Record<string, true>>({});

  useEffect(() => {
    if (!pendingCustomEventFocusId || !pendingFocusInputRef.current) {
      return;
    }

    pendingFocusInputRef.current.focus();
    pendingFocusInputRef.current.select();
    pendingFocusInputRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    onCustomEventFocusHandled(null);
  }, [pendingCustomEventFocusId, phase.key, onCustomEventFocusHandled]);

  // Get the formatted date for hack days
  const hackDayDate =
    phase.type === 'hack-day' && phase.dayIndex !== undefined
      ? formatHackDayDate(anchorDate, phase.dayIndex)
      : null;

  const orderedRows = [
    ...events.map((event, eventIndex) => {
      const stateKey = getEventStateKey(phase.key, event.id);
      const state = eventStates[stateKey] || {
        enabled: true,
        offsetDays: event.defaultOffsetDays,
        time: event.defaultTime,
      };

      const sortValue =
        phase.type === 'pre-event'
          ? state.offsetDays ?? event.defaultOffsetDays ?? 0
          : parseTimeToMinutes(state.time ?? event.defaultTime);

      return {
        kind: 'standard' as const,
        rowId: stateKey,
        sortValue,
        tieBreaker: eventIndex,
        event,
        state,
        stateKey,
      };
    }),
    ...phaseCustomEvents.map((customEvent, customIndex) => {
      const sortValue =
        phase.type === 'pre-event'
          ? customEvent.offsetDays ?? 0
          : parseTimeToMinutes(customEvent.time ?? '12:00');

      return {
        kind: 'custom' as const,
        rowId: customEvent.id,
        sortValue,
        tieBreaker: 1000 + customIndex,
        customEvent,
      };
    }),
  ].sort((a, b) => {
    if (a.sortValue !== b.sortValue) {
      return a.sortValue - b.sortValue;
    }
    return a.tieBreaker - b.tieBreaker;
  });

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
        {orderedRows.map((row) => {
          if (row.kind === 'standard') {
            return (
              <EventCard
                key={row.rowId}
                event={row.event}
                enabled={row.state.enabled}
                onToggle={() => onEventToggle(row.stateKey)}
                phaseType={phaseType}
                anchorDate={anchorDate}
                offsetDays={row.state.offsetDays}
                onOffsetChange={(days) => onEventOffsetChange(row.stateKey, days)}
                time={row.state.time}
                onTimeChange={(time) => onEventTimeChange(row.stateKey, time)}
              />
            );
          }

          const { customEvent } = row;
          const needsConfirmation = Boolean(pendingCustomEventConfirmIds[customEvent.id]);
          const isEditing = Boolean(editingCustomEventIds[customEvent.id]);
          const showEditor = needsConfirmation || isEditing;
          const signalStyle = getSignalStyle(customEvent.signal);
          const showAccent = hasAccentBorder(customEvent.signal);
          const cardStyle: React.CSSProperties = {
            '--signal-bg': signalStyle.bg,
            '--signal-border': signalStyle.border,
            '--signal-accent': signalStyle.accent,
          } as React.CSSProperties;
          const indexLabel = customEventIndexById.get(customEvent.id) ?? 1;

          if (!showEditor) {
            const summaryClasses = [
              'sb2-event-card',
              'sb2-custom-event-summary',
              !showAccent && 'sb2-event-card--neutral',
            ]
              .filter(Boolean)
              .join(' ');

            const preEventTiming =
              phase.type === 'pre-event'
                ? formatPreEventTiming(anchorDate, customEvent.offsetDays ?? 0)
                : null;

            return (
              <div key={customEvent.id} className={summaryClasses} style={cardStyle}>
                <div className="sb2-custom-event-marker" aria-hidden="true">
                  +
                </div>

                <div className="sb2-event-info">
                  <p className="sb2-event-name">{customEvent.name || `Custom Event ${indexLabel}`}</p>
                  <p className="sb2-event-description">
                    {customEvent.description?.trim() ||
                      (phase.type === 'pre-event' ? 'Custom milestone' : 'Custom timed event')}
                  </p>
                </div>

                <div className="sb2-event-controls">
                  <div className="sb2-custom-event-summary-meta">
                    <span className="sb2-custom-event-badge">Custom</span>
                    <span className="sb2-custom-event-index">#{indexLabel}</span>
                    {phase.type === 'pre-event' && preEventTiming ? (
                      <div className="sb2-calculated-date">
                        <span className="sb2-calculated-date-value">{preEventTiming.dateText}</span>
                        <span className="sb2-calculated-date-label">{preEventTiming.labelText}</span>
                      </div>
                    ) : (
                      <span className="sb2-custom-event-time-pill">{customEvent.time ?? '12:00'}</span>
                    )}
                  </div>

                  <div className="sb2-custom-event-actions">
                    <button
                      type="button"
                      className="sb2-custom-event-edit"
                      onClick={() =>
                        setEditingCustomEventIds((prev) => ({
                          ...prev,
                          [customEvent.id]: true,
                        }))
                      }
                      aria-label={`Edit custom event ${customEvent.name || indexLabel}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="sb2-custom-event-delete"
                      onClick={() => {
                        setEditingCustomEventIds((prev) => {
                          if (!(customEvent.id in prev)) return prev;
                          const next = { ...prev };
                          delete next[customEvent.id];
                          return next;
                        });
                        onCustomEventDelete(customEvent.id);
                      }}
                      aria-label={`Delete custom event ${customEvent.name || indexLabel}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          const cardClasses = [
            'sb2-custom-event-card',
            !showAccent && 'sb2-custom-event-card--neutral',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={customEvent.id} className={cardClasses} style={cardStyle}>
              <div className="sb2-custom-event-card-header">
                <div className="sb2-custom-event-card-badges">
                  <span className="sb2-custom-event-badge">Custom</span>
                  {needsConfirmation && (
                    <span className="sb2-custom-event-badge sb2-custom-event-badge--pending">
                      Needs confirmation
                    </span>
                  )}
                  <span className="sb2-custom-event-index">#{indexLabel}</span>
                </div>
                <div className="sb2-custom-event-actions">
                  {needsConfirmation ? (
                    <button
                      type="button"
                      className="sb2-custom-event-confirm"
                      onClick={() => {
                        onCustomEventConfirm(customEvent.id);
                        setEditingCustomEventIds((prev) => {
                          if (!(customEvent.id in prev)) return prev;
                          const next = { ...prev };
                          delete next[customEvent.id];
                          return next;
                        });
                      }}
                      aria-label={`Confirm custom event ${customEvent.name || indexLabel}`}
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="sb2-custom-event-edit"
                      onClick={() =>
                        setEditingCustomEventIds((prev) => {
                          if (!(customEvent.id in prev)) return prev;
                          const next = { ...prev };
                          delete next[customEvent.id];
                          return next;
                        })
                      }
                      aria-label={`Done editing custom event ${customEvent.name || indexLabel}`}
                    >
                      Done
                    </button>
                  )}
                  <button
                    type="button"
                    className="sb2-custom-event-delete"
                    onClick={() => {
                      setEditingCustomEventIds((prev) => {
                        if (!(customEvent.id in prev)) return prev;
                        const next = { ...prev };
                        delete next[customEvent.id];
                        return next;
                      });
                      onCustomEventDelete(customEvent.id);
                    }}
                    aria-label={`Delete custom event ${customEvent.name || indexLabel}`}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="sb2-custom-event-grid">
                <label className="sb2-custom-field">
                  <span className="sb2-custom-field-label">Name</span>
                  <input
                    type="text"
                    className="sb2-custom-input"
                    ref={customEvent.id === pendingCustomEventFocusId ? pendingFocusInputRef : undefined}
                    value={customEvent.name}
                    onChange={(e) => onCustomEventUpdate(customEvent.id, { name: e.target.value })}
                    placeholder="Custom event"
                  />
                </label>

                <label className="sb2-custom-field">
                  <span className="sb2-custom-field-label">Signal</span>
                  <select
                    className="sb2-custom-select"
                    value={customEvent.signal}
                    onChange={(e) =>
                      onCustomEventUpdate(customEvent.id, {
                        signal: e.target.value as EventSignal,
                      })
                    }
                  >
                    {CUSTOM_SIGNAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {phase.type === 'pre-event' ? (
                  <label className="sb2-custom-field">
                    <span className="sb2-custom-field-label">Days before</span>
                    <input
                      type="number"
                      className="sb2-custom-input sb2-custom-input--mono"
                      value={Math.abs(customEvent.offsetDays ?? 0)}
                      min={0}
                      onChange={(e) => {
                        const absValue = Math.abs(parseInt(e.target.value, 10) || 0);
                        onCustomEventUpdate(customEvent.id, { offsetDays: -absValue });
                      }}
                    />
                  </label>
                ) : (
                  <label className="sb2-custom-field">
                    <span className="sb2-custom-field-label">Time</span>
                    <input
                      type="time"
                      className="sb2-custom-input sb2-custom-input--mono"
                      value={customEvent.time ?? '12:00'}
                      onChange={(e) => onCustomEventUpdate(customEvent.id, { time: e.target.value })}
                    />
                  </label>
                )}

                <label className="sb2-custom-field sb2-custom-field--full">
                  <span className="sb2-custom-field-label">Description (optional)</span>
                  <input
                    type="text"
                    className="sb2-custom-input"
                    value={customEvent.description ?? ''}
                    onChange={(e) =>
                      onCustomEventUpdate(customEvent.id, {
                        description: e.target.value,
                      })
                    }
                    placeholder="What happens at this event?"
                  />
                </label>
              </div>
            </div>
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
        {phaseCustomEvents.length > 0 ? 'Add another custom event' : 'Add custom event'}
      </button>
    </div>
  );
}
