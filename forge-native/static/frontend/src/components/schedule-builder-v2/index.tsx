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
  PhaseKey,
  ScheduleBuilderOutput,
  ScheduleBuilderV2Props,
  CustomEvent,
} from '../../types/scheduleBuilderV2';
import {
  buildPhaseDefinitions,
  initializeEventStates,
  EVENT_TO_OUTPUT_FIELD,
  PRE_EVENT_MILESTONES,
  HACK_DAY_EVENTS,
} from '../../schedule-builder-v2/scheduleEvents';
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

  // Process hack day events (using the anchor date + day index for multi-day)
  HACK_DAY_EVENTS.forEach((event) => {
    const state = eventStates[event.id];
    if (state?.enabled && state.time) {
      const outputField = EVENT_TO_OUTPUT_FIELD[event.id];
      if (outputField) {
        // For lastDayOnly events, use the last day; otherwise use first day
        // (This is simplified - in full implementation, we'd track per-day state)
        const dayOffset = event.lastDayOnly ? duration - 1 : 0;
        const eventDate = calculateDateFromOffset(dayOffset);
        timestamps[outputField] = toISOTimestamp(eventDate, state.time);
        selectedEvents.push(event.id);
      }
    }
  });

  // Process custom events
  let customEventOutput: ScheduleBuilderOutput['customEvents'];
  if (customEvents.length > 0) {
    customEventOutput = customEvents.map((ce) => {
      let timestamp: string;
      if (ce.phase === 'pre' && ce.offsetDays !== undefined) {
        const eventDate = calculateDateFromOffset(ce.offsetDays);
        timestamp = toISOTimestamp(eventDate, '09:00');
      } else if (ce.time) {
        // Extract day index from phase key (e.g., 'hack-1' -> 1)
        const dayIndex = ce.phase.startsWith('hack-')
          ? parseInt(ce.phase.split('-')[1], 10)
          : 0;
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

export function ScheduleBuilderV2({
  timezone: initialTimezone,
  onChange,
  initialState,
}: ScheduleBuilderV2Props) {
  // Core state
  const [duration, setDuration] = useState<EventDuration>(initialState?.duration ?? 2);
  const [anchorDate, setAnchorDate] = useState(initialState?.anchorDate ?? getDefaultAnchorDate());
  const [anchorTime, setAnchorTime] = useState(initialState?.anchorTime ?? '09:00');
  const [timezone, setTimezone] = useState(initialState?.timezone ?? initialTimezone);
  const [activePhase, setActivePhase] = useState<PhaseKey>(initialState?.activePhase ?? 'pre');
  const [eventStates, setEventStates] = useState<Record<string, EventState>>(
    initialState?.eventStates ?? initializeEventStates()
  );
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(initialState?.customEvents ?? []);

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
    return Object.values(eventStates).filter((s) => s.enabled).length + customEvents.length;
  }, [eventStates, customEvents]);

  // Check if a phase has any enabled events
  const phaseHasEvents = useCallback(
    (phaseKey: PhaseKey): boolean => {
      if (phaseKey === 'pre') {
        return PRE_EVENT_MILESTONES.some((e) => eventStates[e.id]?.enabled);
      }
      // For hack days, check the hack day events
      return HACK_DAY_EVENTS.some((e) => eventStates[e.id]?.enabled);
    },
    [eventStates]
  );

  // Event handlers
  const handleDurationChange = useCallback(
    (newDuration: EventDuration) => {
      setDuration(newDuration);
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
    // TODO: Implement custom event creation in Phase 2
    console.log('Add custom event - to be implemented in Phase 2');
  }, []);

  // Emit output on state changes
  useEffect(() => {
    const output = buildOutputPayload(
      duration,
      anchorDate,
      anchorTime,
      timezone,
      eventStates,
      customEvents
    );
    onChange(output);
  }, [duration, anchorDate, anchorTime, timezone, eventStates, customEvents, onChange]);

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
          onEventToggle={handleEventToggle}
          onEventOffsetChange={handleEventOffsetChange}
          onEventTimeChange={handleEventTimeChange}
          onAddCustomEvent={handleAddCustomEvent}
        />
      </div>

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
