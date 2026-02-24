/**
 * PhaseTabBar Component
 *
 * Horizontal tab bar for navigating between phases:
 * - Pre-Event
 * - Hack Day 1 (or just "Hack Day" for single-day events)
 * - Hack Day 2 (for 2-3 day events)
 * - Hack Day 3 (for 3 day events)
 */

import type { PhaseDefinition, PhaseKey } from '../../types/scheduleBuilderV2';

interface PhaseTabBarProps {
  phases: PhaseDefinition[];
  activePhase: PhaseKey;
  onPhaseChange: (phase: PhaseKey) => void;
  /** Check if a phase has any enabled events */
  phaseHasEvents: (phase: PhaseKey) => boolean;
}

export function PhaseTabBar({
  phases,
  activePhase,
  onPhaseChange,
  phaseHasEvents,
}: PhaseTabBarProps) {
  return (
    <div className="sb2-phase-tabs" role="tablist" aria-label="Schedule phases">
      {phases.map((phase) => {
        const isActive = phase.key === activePhase;
        const hasEvents = phaseHasEvents(phase.key);
        const isPreEvent = phase.type === 'pre-event';

        return (
          <button
            key={phase.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`phase-panel-${phase.key}`}
            className={`sb2-phase-tab ${isActive ? 'sb2-phase-tab--active' : ''} ${isPreEvent ? 'sb2-phase-tab--pre' : ''}`}
            onClick={() => onPhaseChange(phase.key)}
          >
            <span>{phase.label}</span>
            {/* Show dot indicator if phase has events and is not active */}
            {hasEvents && !isActive && (
              <span className="sb2-phase-tab-dot" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
