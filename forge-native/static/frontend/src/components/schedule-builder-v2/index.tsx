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
  ScheduleBuilderV2Props,
  CustomEvent,
} from '../../types/scheduleBuilderV2';
import {
  buildPhaseDefinitions,
  initializeEventStates,
  ensureEventStatesForDuration,
  getEventStateKey,
  getEventsForPhase,
  PRE_EVENT_MILESTONES,
  HACK_DAY_EVENTS,
  CLOSING_DAY_EVENTS,
} from '../../schedule-builder-v2/scheduleEvents';
import { getSignalStyle, hasAccentBorder } from '../../schedule-builder-v2/signalStyles';
import { ConfigStrip } from './ConfigStrip';
import { PhaseTabBar } from './PhaseTabBar';
import { PhaseContent } from './PhaseContent';
import { TimelineMinimap } from './TimelineMinimap';
import { buildOutputPayload, isPhaseKeyWithinDuration, parseHackPhaseDayIndex, parseClosingPhaseDayIndex } from './buildOutputPayload';
import './styles.css';

/** Default anchor date: 2 weeks from today */
function getDefaultAnchorDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
}

function createCustomEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  customEvents: CustomEvent[],
  closingDays = 0,
  closingDayLabels: Record<string, string> = {}
): PreviewColumn[] {
  const toISOTimestamp = (date: string, time: string): string => new Date(`${date}T${time}:00`).toISOString();
  const calculateDateFromOffset = (offsetDays: number): string => {
    const date = new Date(anchorDate);
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split('T')[0];
  };

  const events: PreviewEvent[] = [];
  const phases = buildPhaseDefinitions(duration, closingDays, closingDayLabels);

  for (const phase of phases) {
    const phaseEvents = getEventsForPhase(phase, duration, closingDays);

    for (const event of phaseEvents) {
      const stateKey = getEventStateKey(phase.key, event.id);
      const state = eventStates[stateKey];
      const enabled = state?.enabled ?? (phase.type !== 'closing-day');
      if (!enabled) continue;

      let timestamp: string | null = null;
      if (phase.type === 'pre-event') {
        const offsetDays = state?.offsetDays ?? event.defaultOffsetDays ?? 0;
        timestamp = toISOTimestamp(calculateDateFromOffset(offsetDays), '09:00');
      } else if (phase.type === 'closing-day') {
        const time = state?.time ?? event.defaultTime;
        if (!time) continue;
        const dayOffset = duration + (phase.closingDayIndex ?? 0);
        timestamp = toISOTimestamp(calculateDateFromOffset(dayOffset), time);
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

  for (const customEvent of customEvents.filter((ce) =>
    isPhaseKeyWithinDuration(ce.phase, duration, closingDays)
  )) {
    let timestamp: string;
    if (customEvent.phase === 'pre') {
      timestamp = toISOTimestamp(calculateDateFromOffset(customEvent.offsetDays ?? -3), '09:00');
    } else {
      const hackIndex = parseHackPhaseDayIndex(customEvent.phase);
      const closingIndex = parseClosingPhaseDayIndex(customEvent.phase);
      const dayOffset =
        hackIndex !== null ? hackIndex
        : closingIndex !== null ? duration + closingIndex
        : 0;
      timestamp = toISOTimestamp(calculateDateFromOffset(dayOffset), customEvent.time ?? '12:00');
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

  // Build a map of date → closing day label for the preview column headers
  const closingDayDateToLabel = new Map<string, string>();
  for (let i = 0; i < closingDays; i++) {
    const phaseKey = `closing-${i}` as PhaseKey;
    const dayOffset = duration + i;
    const dateKey = calculateDateFromOffset(dayOffset);
    const defaultLabel = `Day ${duration + i + 1}`;
    closingDayDateToLabel.set(dateKey, closingDayLabels[phaseKey] ?? defaultLabel);
  }

  Array.from(groupedHackEvents.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([dayKey, dayEvents], index) => {
      const closingLabel = closingDayDateToLabel.get(dayKey);
      const label = closingLabel ?? (groupedHackEvents.size === 1 ? 'Hack Day' : `Day ${index + 1}`);
      columns.push({
        id: `day-${index + 1}`,
        label,
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
  closingDays = 0,
  closingDayLabels = {},
  showHeaderText = true,
  surfaceVariant = 'card',
}: {
  duration: EventDuration;
  anchorDate: string;
  timezone: string;
  eventStates: Record<string, EventState>;
  customEvents: CustomEvent[];
  closingDays?: number;
  closingDayLabels?: Record<string, string>;
  showHeaderText?: boolean;
  surfaceVariant?: 'card' | 'flat';
}) {
  const columns = useMemo(
    () => buildPreviewColumnsFromState(duration, anchorDate, timezone, eventStates, customEvents, closingDays, closingDayLabels),
    [duration, anchorDate, timezone, eventStates, customEvents, closingDays, closingDayLabels]
  );
  const previewTimezone = timezone || 'UTC';
  const visibleCustomCount = useMemo(
    () => customEvents.filter((ce) => isPhaseKeyWithinDuration(ce.phase, duration, closingDays)).length,
    [customEvents, duration, closingDays]
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
          <span>{duration + closingDays} day{duration + closingDays === 1 ? '' : 's'}</span>
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
  const [closingDays, setClosingDays] = useState<number>(initialState?.closingDays ?? 0);
  const [closingDayLabels, setClosingDayLabels] = useState<Record<string, string>>(
    initialState?.closingDayLabels ?? {}
  );
  const [anchorDate, setAnchorDate] = useState(initialState?.anchorDate ?? getDefaultAnchorDate());
  const [anchorTime, setAnchorTime] = useState(initialState?.anchorTime ?? '09:00');
  const [timezone, setTimezone] = useState(initialState?.timezone ?? initialTimezone);
  const [activePhase, setActivePhase] = useState<PhaseKey>(initialState?.activePhase ?? 'pre');
  const [eventStates, setEventStates] = useState<Record<string, EventState>>(
    initialState?.eventStates ?? initializeEventStates(initialState?.duration ?? 2, initialState?.closingDays ?? 0)
  );
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(initialState?.customEvents ?? []);
  const [pendingCustomEventFocusId, setPendingCustomEventFocusId] = useState<string | null>(null);
  const [pendingCustomEventConfirmIds, setPendingCustomEventConfirmIds] = useState<Record<string, true>>(
    {}
  );

  const outputPreview = useMemo(
    () => buildOutputPayload(duration, anchorDate, anchorTime, timezone, eventStates, customEvents, closingDays, closingDayLabels),
    [duration, anchorDate, anchorTime, timezone, eventStates, customEvents, closingDays, closingDayLabels]
  );

  // Build phase definitions based on duration and closing days
  const phases = useMemo(
    () => buildPhaseDefinitions(duration, closingDays, closingDayLabels),
    [duration, closingDays, closingDayLabels]
  );

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
      if (phaseKey.startsWith('closing-')) {
        return (
          CLOSING_DAY_EVENTS.some((e) => {
            const stateKey = getEventStateKey(phaseKey, e.id);
            return eventStates[stateKey]?.enabled;
          }) || customEvents.some((ce) => ce.phase === phaseKey)
        );
      }
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
      setEventStates((prev) => ensureEventStatesForDuration(prev, newDuration, closingDays));
      if (activePhase.startsWith('hack-')) {
        const dayIndex = parseInt(activePhase.split('-')[1], 10);
        if (dayIndex >= newDuration) {
          setActivePhase(`hack-${newDuration - 1}` as PhaseKey);
        }
      }
    },
    [activePhase, closingDays]
  );

  const handleClosingDaysChange = useCallback(
    (newClosingDays: number) => {
      setClosingDays(newClosingDays);
      setEventStates((prev) => ensureEventStatesForDuration(prev, duration, newClosingDays));
      if (activePhase.startsWith('closing-')) {
        const closingIndex = parseInt(activePhase.split('-')[1], 10);
        if (closingIndex >= newClosingDays) {
          setActivePhase(newClosingDays > 0 ? `closing-${newClosingDays - 1}` as PhaseKey : `hack-${duration - 1}` as PhaseKey);
        }
      }
    },
    [activePhase, duration]
  );

  const handleClosingDayLabelChange = useCallback((phaseKey: string, label: string) => {
    setClosingDayLabels((prev) => ({ ...prev, [phaseKey]: label }));
  }, []);

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
      closingDays,
      closingDayLabels,
    } satisfies ScheduleBuilderState);
  }, [duration, anchorDate, anchorTime, timezone, activePhase, eventStates, customEvents, closingDays, closingDayLabels, onStateChange]);

  return (
    <div className="sb2-container">
      {/* Config strip */}
      <ConfigStrip
        duration={duration}
        onDurationChange={handleDurationChange}
        closingDays={closingDays}
        onClosingDaysChange={handleClosingDaysChange}
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
          closingDays={closingDays}
          closingDayLabel={currentPhase.type === 'closing-day' ? closingDayLabels[currentPhase.key] : undefined}
          onClosingDayLabelChange={handleClosingDayLabelChange}
        />
      </div>

      {showInlinePreview ? (
        <ScheduleBuilderV2Preview
          duration={duration}
          anchorDate={anchorDate}
          timezone={timezone}
          eventStates={eventStates}
          customEvents={customEvents}
          closingDays={closingDays}
          closingDayLabels={closingDayLabels}
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
