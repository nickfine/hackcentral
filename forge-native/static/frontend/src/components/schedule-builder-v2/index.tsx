/**
 * ScheduleBuilderV2 Component
 *
 * Main component for the phase-based schedule builder.
 * Orchestrates ConfigStrip, PhaseTabBar, PhaseContent, and TimelineMinimap.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  EventDuration,
  EventState,
  EventSignal,
  PhaseKey,
  ScheduleBuilderState,
  ScheduleBuilderOutput,
  ScheduleBuilderV2Props,
  CustomEvent,
} from '../../types/scheduleBuilderV2';
import {
  buildPhaseDefinitions,
  initializeEventStates,
  ensureEventStatesForDuration,
  getEventStateKey,
  getEventsForPhase,
  EVENT_TO_OUTPUT_FIELD,
  PRE_EVENT_MILESTONES,
  HACK_DAY_EVENTS,
} from '../../schedule-builder-v2/scheduleEvents';
import { getSignalStyle, hasAccentBorder } from '../../schedule-builder-v2/signalStyles';
import { ConfigStrip } from './ConfigStrip';
import { PhaseTabBar } from './PhaseTabBar';
import { PhaseContent } from './PhaseContent';
import { TimelineMinimap } from './TimelineMinimap';
import './styles.css';

/** Default anchor date: 2 weeks from today */
function getDefaultAnchorDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
}

function parseHackPhaseDayIndex(phaseKey: PhaseKey): number | null {
  if (!phaseKey.startsWith('hack-')) {
    return null;
  }

  const parsed = parseInt(phaseKey.split('-')[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPhaseKeyWithinDuration(phaseKey: PhaseKey, duration: EventDuration): boolean {
  if (phaseKey === 'pre') {
    return true;
  }

  const dayIndex = parseHackPhaseDayIndex(phaseKey);
  return dayIndex !== null && dayIndex >= 0 && dayIndex < duration;
}

function createCustomEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build the output payload from the current state.
 */
function buildOutputPayload(
  duration: EventDuration,
  anchorDate: string,
  anchorTime: string,
  timezone: string,
  eventStates: Record<string, EventState>,
  customEvents: CustomEvent[]
): ScheduleBuilderOutput {
  // Helper to create ISO timestamp
  const toISOTimestamp = (date: string, time: string): string => {
    return new Date(`${date}T${time}:00`).toISOString();
  };

  // Helper to calculate date from anchor + offset
  const calculateDateFromOffset = (offsetDays: number): string => {
    const date = new Date(anchorDate);
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split('T')[0];
  };

  // Build output with dynamic fields
  const selectedEvents: string[] = [];
  const timestamps: Record<string, string> = {};

  // Process pre-event milestones
  PRE_EVENT_MILESTONES.forEach((event) => {
    const state = eventStates[event.id];
    if (state?.enabled) {
      const outputField = EVENT_TO_OUTPUT_FIELD[event.id];
      if (outputField && state.offsetDays !== undefined) {
        const eventDate = calculateDateFromOffset(state.offsetDays);
        // Pre-event milestones use 09:00 as default time
        timestamps[outputField] = toISOTimestamp(eventDate, '09:00');
        selectedEvents.push(event.id);
      }
    }
  });

  // Process hack day events - iterate through each day with composite keys
  for (let dayIndex = 0; dayIndex < duration; dayIndex++) {
    const isLastDay = dayIndex === duration - 1;
    const phaseKey = `hack-${dayIndex}`;

    HACK_DAY_EVENTS.forEach((event) => {
      // Skip lastDayOnly events on non-last days
      if (event.lastDayOnly && !isLastDay) return;

      // Try composite key first, fall back to flat key for backwards compatibility
      const compositeKey = `${phaseKey}:${event.id}`;
      const state = eventStates[compositeKey] ?? eventStates[event.id];

      // Use state if available, otherwise default to enabled with default time
      const enabled = state?.enabled ?? true;
      const time = state?.time ?? event.defaultTime;

      if (enabled && time) {
        const outputField = EVENT_TO_OUTPUT_FIELD[event.id];
        if (outputField) {
          const eventDate = calculateDateFromOffset(dayIndex);
          // For multi-day events, we use the event from its specific day
          // Opening ceremony: Day 1 time goes to openingCeremonyAt
          // Hacking begins: Day 1 time goes to hackingStartsAt
          // lastDayOnly events always use the last day
          if (event.lastDayOnly || dayIndex === 0) {
            // For first day (or lastDayOnly on last day), use standard field
            timestamps[outputField] = toISOTimestamp(eventDate, time);
          }
          // Note: For multi-day, we could add Day2/Day3 specific fields later if needed
          selectedEvents.push(event.id);
        }
      }
    });
  }

  // Process custom events
  let customEventOutput: ScheduleBuilderOutput['customEvents'];
  const activeCustomEvents = customEvents.filter((ce) => isPhaseKeyWithinDuration(ce.phase, duration));
  if (activeCustomEvents.length > 0) {
    customEventOutput = activeCustomEvents.map((ce) => {
      let timestamp: string;
      if (ce.phase === 'pre' && ce.offsetDays !== undefined) {
        const eventDate = calculateDateFromOffset(ce.offsetDays);
        timestamp = toISOTimestamp(eventDate, '09:00');
      } else if (ce.time) {
        // Extract day index from phase key (e.g., 'hack-1' -> 1)
        const dayIndex = parseHackPhaseDayIndex(ce.phase) ?? 0;
        const eventDate = calculateDateFromOffset(dayIndex);
        timestamp = toISOTimestamp(eventDate, ce.time);
      } else {
        timestamp = toISOTimestamp(anchorDate, '12:00');
      }

      return {
        name: ce.name,
        description: ce.description,
        timestamp,
        signal: ce.signal,
      };
    });
  }

  // Combine into final output
  return {
    timezone,
    duration,
    selectedEvents,
    ...timestamps,
    ...(customEventOutput && { customEvents: customEventOutput }),
  } as ScheduleBuilderOutput;
}

type PreviewSignal = EventSignal;

type PreviewEvent = {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  signal: PreviewSignal;
  section: 'pre' | 'hack';
};

type PreviewColumn = {
  id: string;
  label: string;
  dateLabel: string;
  events: PreviewEvent[];
};

function formatPreviewDate(value: string, timezone: string, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, ...options }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat('en-GB', options).format(new Date(value));
  }
}

function buildPreviewColumnsFromState(
  duration: EventDuration,
  anchorDate: string,
  timezone: string,
  eventStates: Record<string, EventState>,
  customEvents: CustomEvent[]
): PreviewColumn[] {
  const toISOTimestamp = (date: string, time: string): string => new Date(`${date}T${time}:00`).toISOString();
  const calculateDateFromOffset = (offsetDays: number): string => {
    const date = new Date(anchorDate);
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split('T')[0];
  };

  const events: PreviewEvent[] = [];
  const phases = buildPhaseDefinitions(duration);

  for (const phase of phases) {
    const phaseEvents = getEventsForPhase(phase, duration);

    for (const event of phaseEvents) {
      const stateKey = getEventStateKey(phase.key, event.id);
      const state = eventStates[stateKey];
      const enabled = state?.enabled ?? true;
      if (!enabled) continue;

      let timestamp: string | null = null;
      if (phase.type === 'pre-event') {
        const offsetDays = state?.offsetDays ?? event.defaultOffsetDays ?? 0;
        timestamp = toISOTimestamp(calculateDateFromOffset(offsetDays), '09:00');
      } else {
        const time = state?.time ?? event.defaultTime;
        if (!time) continue;
        const dayIndex = phase.dayIndex ?? 0;
        timestamp = toISOTimestamp(calculateDateFromOffset(dayIndex), time);
      }

      events.push({
        id: `${phase.key}:${event.id}`,
        title: event.name,
        description: event.description,
        timestamp,
        signal: event.signal,
        section: phase.type === 'pre-event' ? 'pre' : 'hack',
      });
    }
  }

  for (const customEvent of customEvents.filter((ce) => isPhaseKeyWithinDuration(ce.phase, duration))) {
    let timestamp: string;
    if (customEvent.phase === 'pre') {
      timestamp = toISOTimestamp(calculateDateFromOffset(customEvent.offsetDays ?? -3), '09:00');
    } else {
      const dayIndex = parseHackPhaseDayIndex(customEvent.phase) ?? 0;
      timestamp = toISOTimestamp(calculateDateFromOffset(dayIndex), customEvent.time ?? '12:00');
    }

    events.push({
      id: customEvent.id,
      title: customEvent.name,
      description: customEvent.description,
      timestamp,
      signal: customEvent.signal,
      section: customEvent.phase === 'pre' ? 'pre' : 'hack',
    });
  }

  events.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const preEventEvents = events.filter((event) => event.section === 'pre');
  const hackEvents = events.filter((event) => event.section === 'hack');
  const columns: PreviewColumn[] = [];
  if (preEventEvents.length > 0) {
    const first = preEventEvents[0].timestamp;
    const last = preEventEvents[preEventEvents.length - 1].timestamp;
    const firstLabel = formatPreviewDate(first, timezone, { month: 'short', day: 'numeric' });
    const lastLabel = formatPreviewDate(last, timezone, { month: 'short', day: 'numeric' });

    columns.push({
      id: 'pre',
      label: 'Pre-Event',
      dateLabel: firstLabel === lastLabel ? firstLabel : `${firstLabel} - ${lastLabel}`,
      events: preEventEvents,
    });
  }

  const groupedHackEvents = new Map<string, PreviewEvent[]>();
  for (const event of hackEvents) {
    const dayKey = event.timestamp.split('T')[0];
    const bucket = groupedHackEvents.get(dayKey) ?? [];
    bucket.push(event);
    groupedHackEvents.set(dayKey, bucket);
  }

  Array.from(groupedHackEvents.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([dayKey, dayEvents], index) => {
      columns.push({
        id: `day-${index + 1}`,
        label: groupedHackEvents.size === 1 ? 'Hack Day' : `Day ${index + 1}`,
        dateLabel: formatPreviewDate(dayKey, timezone, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        events: dayEvents.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
      });
    });

  return columns;
}

export function ScheduleBuilderV2Preview({
  duration,
  anchorDate,
  timezone,
  eventStates,
  customEvents,
  showHeaderText = true,
  surfaceVariant = 'card',
}: {
  duration: EventDuration;
  anchorDate: string;
  timezone: string;
  eventStates: Record<string, EventState>;
  customEvents: CustomEvent[];
  showHeaderText?: boolean;
  surfaceVariant?: 'card' | 'flat';
}) {
  const columns = useMemo(
    () => buildPreviewColumnsFromState(duration, anchorDate, timezone, eventStates, customEvents),
    [duration, anchorDate, timezone, eventStates, customEvents]
  );
  const previewTimezone = timezone || 'UTC';
  const visibleCustomCount = useMemo(
    () => customEvents.filter((ce) => isPhaseKeyWithinDuration(ce.phase, duration)).length,
    [customEvents, duration]
  );

  return (
    <section
      className={`sb2-preview${surfaceVariant === 'flat' ? ' sb2-preview--flat' : ''}`}
      aria-label="Schedule preview"
    >
      <div className="sb2-preview-head">
        {showHeaderText ? (
          <div>
            <p className="sb2-preview-kicker">Preview</p>
            <h3 className="sb2-preview-title">Generated Schedule Timeline</h3>
            <p className="sb2-preview-subtitle">
              This is the timeline that will be created from the current builder settings ({previewTimezone}).
            </p>
          </div>
        ) : (
          <div>
            <p className="sb2-preview-subtitle">
              Timezone: {previewTimezone}
            </p>
          </div>
        )}
        <div className="sb2-preview-stats" aria-label="Preview summary">
          <span>{columns.reduce((sum, column) => sum + column.events.length, 0)} events</span>
          <span>{visibleCustomCount} custom</span>
          <span>{duration} day{duration === 1 ? '' : 's'}</span>
        </div>
      </div>

      {columns.length === 0 ? (
        <div className="sb2-preview-empty">No events enabled yet. Toggle events on to preview the generated schedule.</div>
      ) : (
        <div className="sb2-preview-columns">
          {columns.map((column) => (
            <div key={column.id} className="sb2-preview-column">
              <div className="sb2-preview-column-head">
                <p className="sb2-preview-column-label">{column.label}</p>
                <p className="sb2-preview-column-date">{column.dateLabel}</p>
              </div>
              <div className="sb2-preview-event-list">
                {column.events.map((event) => {
                  const signalStyle = getSignalStyle(event.signal);
                  const showAccent = hasAccentBorder(event.signal);
                  const cardStyle = {
                    '--signal-bg': signalStyle.bg,
                    '--signal-border': signalStyle.border,
                    '--signal-accent': signalStyle.accent,
                    '--signal-text': signalStyle.text,
                    '--signal-icon-bg': signalStyle.iconBg,
                  } as React.CSSProperties;

                  return (
                    <div
                      key={event.id}
                      className={`sb2-preview-event ${showAccent ? '' : 'sb2-preview-event--neutral'}`}
                      style={cardStyle}
                    >
                        <div className="sb2-preview-event-time">
                        {formatPreviewDate(event.timestamp, previewTimezone, {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                      <div className="sb2-preview-event-content">
                        <p className="sb2-preview-event-title">{event.title}</p>
                        {event.description ? (
                          <p className="sb2-preview-event-description">{event.description}</p>
                        ) : null}
                      </div>
                      <span className="sb2-preview-event-signal">{signalStyle.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ScheduleBuilderV2({
  timezone: initialTimezone,
  onChange,
  onStateChange,
  initialState,
  showInlinePreview = true,
}: ScheduleBuilderV2Props) {
  // Core state
  const [duration, setDuration] = useState<EventDuration>(initialState?.duration ?? 2);
  const [anchorDate, setAnchorDate] = useState(initialState?.anchorDate ?? getDefaultAnchorDate());
  const [anchorTime, setAnchorTime] = useState(initialState?.anchorTime ?? '09:00');
  const [timezone, setTimezone] = useState(initialState?.timezone ?? initialTimezone);
  const [activePhase, setActivePhase] = useState<PhaseKey>(initialState?.activePhase ?? 'pre');
  const [eventStates, setEventStates] = useState<Record<string, EventState>>(
    initialState?.eventStates ?? initializeEventStates(initialState?.duration ?? 2)
  );
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(initialState?.customEvents ?? []);
  const [pendingCustomEventFocusId, setPendingCustomEventFocusId] = useState<string | null>(null);
  const [pendingCustomEventConfirmIds, setPendingCustomEventConfirmIds] = useState<Record<string, true>>(
    {}
  );

  const outputPreview = useMemo(
    () => buildOutputPayload(duration, anchorDate, anchorTime, timezone, eventStates, customEvents),
    [duration, anchorDate, anchorTime, timezone, eventStates, customEvents]
  );

  // Build phase definitions based on duration
  const phases = useMemo(() => buildPhaseDefinitions(duration), [duration]);

  // Find current phase
  const currentPhase = useMemo(
    () => phases.find((p) => p.key === activePhase) ?? phases[0],
    [phases, activePhase]
  );

  // Navigation state
  const currentIndex = phases.findIndex((p) => p.key === activePhase);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < phases.length - 1;
  const prevPhaseLabel = canGoPrev ? phases[currentIndex - 1].label : null;
  const nextPhaseLabel = canGoNext ? phases[currentIndex + 1].label : null;

  // Count enabled events
  const enabledEventCount = useMemo(() => {
    const validCustomEventCount = customEvents.filter((ce) => isPhaseKeyWithinDuration(ce.phase, duration)).length;
    return Object.values(eventStates).filter((s) => s.enabled).length + validCustomEventCount;
  }, [eventStates, customEvents, duration]);

  // Check if a phase has any enabled events
  const phaseHasEvents = useCallback(
    (phaseKey: PhaseKey): boolean => {
      if (phaseKey === 'pre') {
        return (
          PRE_EVENT_MILESTONES.some((e) => eventStates[e.id]?.enabled) ||
          customEvents.some((ce) => ce.phase === 'pre')
        );
      }
      // For hack days, check events using composite keys (e.g., "hack-0:opening")
      return (
        HACK_DAY_EVENTS.some((e) => {
          const stateKey = getEventStateKey(phaseKey, e.id);
          return eventStates[stateKey]?.enabled;
        }) || customEvents.some((ce) => ce.phase === phaseKey)
      );
    },
    [eventStates, customEvents]
  );

  // Event handlers
  const handleDurationChange = useCallback(
    (newDuration: EventDuration) => {
      setDuration(newDuration);
      // Ensure event states exist for the new duration (adds missing day states)
      setEventStates((prev) => ensureEventStatesForDuration(prev, newDuration));
      // If current phase is beyond new duration, reset to last valid hack day
      if (activePhase.startsWith('hack-')) {
        const dayIndex = parseInt(activePhase.split('-')[1], 10);
        if (dayIndex >= newDuration) {
          setActivePhase(`hack-${newDuration - 1}` as PhaseKey);
        }
      }
    },
    [activePhase]
  );

  const handleEventToggle = useCallback((eventId: string) => {
    setEventStates((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        enabled: !prev[eventId]?.enabled,
      },
    }));
  }, []);

  const handleEventOffsetChange = useCallback((eventId: string, offsetDays: number) => {
    setEventStates((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        offsetDays,
      },
    }));
  }, []);

  const handleEventTimeChange = useCallback((eventId: string, time: string) => {
    setEventStates((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        time,
      },
    }));
  }, []);

  const handlePrevPhase = useCallback(() => {
    if (canGoPrev) {
      setActivePhase(phases[currentIndex - 1].key);
    }
  }, [canGoPrev, phases, currentIndex]);

  const handleNextPhase = useCallback(() => {
    if (canGoNext) {
      setActivePhase(phases[currentIndex + 1].key);
    }
  }, [canGoNext, phases, currentIndex]);

  const handleAddCustomEvent = useCallback(() => {
    setCustomEvents((prev) => {
      const nextOrder =
        prev
          .filter((event) => event.phase === activePhase)
          .reduce((maxOrder, event) => Math.max(maxOrder, event.order), -1) + 1;

      const isPrePhase = activePhase === 'pre';
      const nextIndexForPhase = prev.filter((event) => event.phase === activePhase).length + 1;

      const newEvent: CustomEvent = {
        id: createCustomEventId(),
        name: `Custom Event ${nextIndexForPhase}`,
        description: '',
        signal: 'neutral',
        phase: activePhase,
        order: nextOrder,
        ...(isPrePhase ? { offsetDays: -3 } : { time: '12:00' }),
        isCustom: true,
      };

      setPendingCustomEventFocusId(newEvent.id);
      setPendingCustomEventConfirmIds((prev) => ({ ...prev, [newEvent.id]: true }));
      return [...prev, newEvent];
    });
  }, [activePhase]);

  const handleCustomEventUpdate = useCallback(
    (
      customEventId: string,
      updates: Partial<Pick<CustomEvent, 'name' | 'description' | 'signal' | 'offsetDays' | 'time'>>
    ) => {
      setCustomEvents((prev) =>
        prev.map((event) => (event.id === customEventId ? { ...event, ...updates } : event))
      );
    },
    []
  );

  const handleCustomEventDelete = useCallback((customEventId: string) => {
    setCustomEvents((prev) => prev.filter((event) => event.id !== customEventId));
    setPendingCustomEventConfirmIds((prev) => {
      if (!(customEventId in prev)) return prev;
      const next = { ...prev };
      delete next[customEventId];
      return next;
    });
    setPendingCustomEventFocusId((prev) => (prev === customEventId ? null : prev));
  }, []);

  const handleCustomEventConfirm = useCallback((customEventId: string) => {
    setPendingCustomEventConfirmIds((prev) => {
      if (!(customEventId in prev)) return prev;
      const next = { ...prev };
      delete next[customEventId];
      return next;
    });
  }, []);

  // Emit output on state changes
  useEffect(() => {
    onChange(outputPreview);
  }, [outputPreview, onChange]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      duration,
      anchorDate,
      anchorTime,
      timezone,
      activePhase,
      eventStates,
      customEvents,
    } satisfies ScheduleBuilderState);
  }, [duration, anchorDate, anchorTime, timezone, activePhase, eventStates, customEvents, onStateChange]);

  return (
    <div className="sb2-container">
      {/* Config strip */}
      <ConfigStrip
        duration={duration}
        onDurationChange={handleDurationChange}
        anchorDate={anchorDate}
        onAnchorDateChange={setAnchorDate}
        anchorTime={anchorTime}
        onAnchorTimeChange={setAnchorTime}
        timezone={timezone}
        onTimezoneChange={setTimezone}
      />

      {/* Phase tabs */}
      <PhaseTabBar
        phases={phases}
        activePhase={activePhase}
        onPhaseChange={setActivePhase}
        phaseHasEvents={phaseHasEvents}
      />

      {/* Phase content */}
      <div className="sb2-main">
        <PhaseContent
          phase={currentPhase}
          duration={duration}
          anchorDate={anchorDate}
          eventStates={eventStates}
          customEvents={customEvents}
          onEventToggle={handleEventToggle}
          onEventOffsetChange={handleEventOffsetChange}
          onEventTimeChange={handleEventTimeChange}
          onAddCustomEvent={handleAddCustomEvent}
          onCustomEventUpdate={handleCustomEventUpdate}
          onCustomEventDelete={handleCustomEventDelete}
          pendingCustomEventFocusId={pendingCustomEventFocusId}
          onCustomEventFocusHandled={setPendingCustomEventFocusId}
          pendingCustomEventConfirmIds={pendingCustomEventConfirmIds}
          onCustomEventConfirm={handleCustomEventConfirm}
        />
      </div>

      {showInlinePreview ? (
        <ScheduleBuilderV2Preview
          duration={duration}
          anchorDate={anchorDate}
          timezone={timezone}
          eventStates={eventStates}
          customEvents={customEvents}
        />
      ) : null}

      {/* Footer with timeline and navigation */}
      <TimelineMinimap
        phases={phases}
        activePhase={activePhase}
        onPhaseClick={setActivePhase}
        enabledEventCount={enabledEventCount}
        onPrevPhase={handlePrevPhase}
        onNextPhase={handleNextPhase}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        prevPhaseLabel={prevPhaseLabel}
        nextPhaseLabel={nextPhaseLabel}
      />
    </div>
  );
}

export default ScheduleBuilderV2;
