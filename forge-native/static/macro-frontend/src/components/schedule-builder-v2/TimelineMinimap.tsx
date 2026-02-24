/**
 * TimelineMinimap Component
 *
 * Sticky footer with:
 * - Visual timeline bar showing phases
 * - Phase navigation buttons (prev/next)
 * - Status text (event count, phase position)
 */

import type { PhaseDefinition, PhaseKey } from '../../types/scheduleBuilderV2';

interface TimelineMinimapProps {
  phases: PhaseDefinition[];
  activePhase: PhaseKey;
  onPhaseClick: (phase: PhaseKey) => void;
  enabledEventCount: number;
  onPrevPhase: () => void;
  onNextPhase: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  prevPhaseLabel: string | null;
  nextPhaseLabel: string | null;
}

export function TimelineMinimap({
  phases,
  activePhase,
  onPhaseClick,
  enabledEventCount,
  onPrevPhase,
  onNextPhase,
  canGoPrev,
  canGoNext,
  prevPhaseLabel,
  nextPhaseLabel,
}: TimelineMinimapProps) {
  const currentIndex = phases.findIndex((p) => p.key === activePhase);

  return (
    <div className="sb2-footer">
      <div className="sb2-footer-inner">
        {/* Timeline bar */}
        <div className="sb2-timeline-bar">
          {phases.map((phase, index) => {
            const isActive = phase.key === activePhase;
            const isHackDay = phase.type === 'hack-day';

            return (
              <div
                key={phase.key}
                className={`sb2-timeline-segment ${isHackDay ? 'sb2-timeline-segment--hack' : ''}`}
              >
                <div
                  className={`sb2-timeline-segment-bar ${isActive ? 'sb2-timeline-segment-bar--active' : ''} ${isHackDay ? 'sb2-timeline-segment-bar--hack' : ''}`}
                  onClick={() => onPhaseClick(phase.key)}
                  title={phase.label}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPhaseClick(phase.key);
                    }
                  }}
                  aria-label={`Go to ${phase.label}`}
                  aria-current={isActive ? 'step' : undefined}
                />
                {index < phases.length - 1 && (
                  <div className="sb2-timeline-segment-dot" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation row */}
        <div className="sb2-nav-row">
          {/* Prev button */}
          <button
            type="button"
            className="sb2-nav-btn"
            onClick={onPrevPhase}
            disabled={!canGoPrev}
          >
            ← {prevPhaseLabel || 'Back'}
          </button>

          {/* Status */}
          <span className="sb2-nav-status">
            {enabledEventCount} events · {currentIndex + 1} of {phases.length} phases
          </span>

          {/* Next phase button */}
          <button
            type="button"
            className={`sb2-nav-btn ${canGoNext ? 'sb2-nav-btn--primary' : ''}`}
            onClick={onNextPhase}
            disabled={!canGoNext}
          >
            {canGoNext ? `${nextPhaseLabel} →` : 'All phases configured'}
          </button>
        </div>
      </div>
    </div>
  );
}
