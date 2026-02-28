/**
 * PhaseIndicator Component
 * Enhanced event phase timeline with clear active/completed/future hierarchy.
 */

import { memo, useState } from 'react';
import {
  UserPlus,
  Users,
  Code2,
  Send,
  Vote,
  Gavel,
  Trophy,
} from 'lucide-react';
import { cn } from '../../lib/design-system';

const PHASE_ICONS = {
  signup: UserPlus,
  team_formation: Users,
  hacking: Code2,
  submission: Send,
  voting: Vote,
  judging: Gavel,
  results: Trophy,
};

const PhaseStep = memo(({
  phase,
  index,
  isActive,
  isComplete,
  slim = false,
  showTooltip = true,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = PHASE_ICONS[phase.id] || Users;

  return (
    <div
      data-testid={`phase-step-${phase.id}`}
      className="relative flex flex-col items-center group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Set phase: ${phase.label}` : undefined}
    >
      <div
        data-testid={`phase-dot-${phase.id}`}
        className={cn(
          'rounded-full flex items-center justify-center relative z-10 transition-all duration-300',
          slim
            ? (isActive ? 'w-8 h-8' : 'w-7 h-7')
            : (isActive ? 'w-10 h-10' : 'w-8 h-8'),
          isActive && 'phase-active-beacon bg-teal-500 text-white shadow-[0_10px_20px_-10px_rgba(20,184,166,0.9)] ring-2 ring-teal-400/50',
          isComplete && !isActive && 'bg-gray-400 text-white',
          !isActive && !isComplete && 'bg-arena-card border border-arena-border text-text-muted',
          onClick && 'cursor-pointer hover:scale-105 focus-ring-control rounded-md'
        )}
      >
        {isActive ? (
          <Icon className={cn(slim ? 'w-4 h-4' : 'w-5 h-5')} />
        ) : (
          <span className={cn(slim ? 'text-[10px] font-medium' : 'text-xs font-medium')}>
            {index + 1}
          </span>
        )}
      </div>

      <span
        data-testid={`phase-label-${phase.id}`}
        className={cn(
          slim ? 'mt-1 text-xs text-center whitespace-nowrap' : 'mt-2 text-xs text-center whitespace-nowrap',
          isActive && 'text-teal-500 font-semibold',
          isComplete && !isActive && 'phase-step-label-complete font-normal',
          !isActive && !isComplete && 'phase-step-label-future font-normal'
        )}
      >
        {phase.label}
      </span>

      {showTooltip && phase.description && (
        <div className={cn(
          'absolute -bottom-16 left-1/2 -translate-x-1/2',
          'px-3 py-2 rounded-lg shadow-lg',
          'bg-arena-elevated border border-arena-border',
          'text-xs text-text-secondary whitespace-nowrap',
          'transition-all duration-200 pointer-events-none z-20',
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        )}>
          {phase.description}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-arena-elevated border-l border-t border-arena-border rotate-45" />
        </div>
      )}
    </div>
  );
});

PhaseStep.displayName = 'PhaseStep';

const ConnectingLine = memo(({ isComplete, slim = false }) => (
  <div className={cn(
    'flex-1 h-px relative overflow-hidden',
    slim
      ? 'mx-1.5 sm:mx-2 min-w-[18px] sm:min-w-[24px]'
      : 'mx-2 sm:mx-3 min-w-[24px] sm:min-w-[32px]'
  )}>
    {isComplete ? (
      <div className="absolute inset-0 bg-teal-500 transition-colors duration-300" />
    ) : (
      <div className="phase-connector-muted absolute inset-0 transition-colors duration-300" />
    )}
  </div>
));

ConnectingLine.displayName = 'ConnectingLine';

const PhaseIndicator = memo(({
  phases,
  currentPhase,
  onPhaseClick,
  className,
  compact = false,
  slim = false,
  ultraCompact = false,
}) => {
  const [hoveredPhaseKey, setHoveredPhaseKey] = useState(null);
  const phaseKeys = Object.keys(phases);
  const currentIndex = phaseKeys.indexOf(currentPhase);

  if (compact) {
    const currentPhaseData = phases[currentPhase];
    const currentPhaseNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
    const totalPhases = phaseKeys.length || 1;
    const nextPhaseKey = currentIndex >= 0 && currentIndex < totalPhases - 1
      ? phaseKeys[currentIndex + 1]
      : null;
    const nextPhaseLabel = nextPhaseKey ? phases[nextPhaseKey]?.label : null;
    const progressPercent = Math.max(0, Math.min(100, (currentPhaseNumber / totalPhases) * 100));

    return (
      <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1.5 w-full', className)}>
        <span className="min-w-0 text-sm font-semibold text-text-primary truncate">
          {currentPhaseData?.label || 'Current phase'}
        </span>
        <span className="shrink-0 text-xs font-semibold text-text-secondary tabular-nums">
          {currentPhaseNumber}/{totalPhases}
        </span>

        <div className="col-span-2 space-y-1">
          <div
            className="h-1.5 rounded-full bg-arena-elevated border border-arena-border overflow-hidden"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={totalPhases}
            aria-valuenow={currentPhaseNumber}
            aria-label={`Phase ${currentPhaseNumber} of ${totalPhases}`}
          >
            <div
              className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.06em] truncate">
            {nextPhaseLabel ? `Next: ${nextPhaseLabel}` : 'Final phase active'}
          </p>
        </div>
      </div>
    );
  }

  if (ultraCompact) {
    const isInteractive = Boolean(onPhaseClick);
    const chevronWidth = 12;
    const chevronBodyOverlap = 2;
    const chevronVisibleTip = chevronWidth - chevronBodyOverlap;
    const chevronCenterOffset = chevronVisibleTip / 2;

    return (
      <div className={cn('flex items-stretch w-full h-8 sm:h-9 overflow-hidden', className)}>
        {phaseKeys.map((phaseKey, index) => {
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;
          const isFirst = index === 0;
          const isLast = index === phaseKeys.length - 1;
          const isHovered = hoveredPhaseKey === phaseKey;

          const segmentFill = isActive
            ? 'rgba(20, 184, 166, 0.12)'
            : isComplete
              ? 'var(--surface-elevated)'
              : 'var(--surface-primary)';

          const segmentText = isActive
            ? 'phase-segment-label-active font-semibold'
            : isComplete
              ? 'phase-segment-label-complete font-normal'
              : 'phase-segment-label-future font-normal';

          const connectorClasses = isActive || isComplete
            ? 'h-px w-3.5 sm:w-4 bg-teal-500'
            : 'phase-segment-connector-muted h-px w-3.5 sm:w-4';

          return (
            <div
              key={phaseKey}
              data-testid={`phase-segment-${phaseKey}`}
              className="relative flex-1 min-w-0"
              style={{
                zIndex: phaseKeys.length - index,
                marginLeft: isFirst ? 0 : `-${chevronWidth - chevronBodyOverlap}px`,
              }}
              onMouseEnter={isInteractive ? () => setHoveredPhaseKey(phaseKey) : undefined}
              onMouseLeave={isInteractive ? () => setHoveredPhaseKey(null) : undefined}
            >
              {isInteractive ? (
                <button
                  type="button"
                  onClick={() => onPhaseClick(phaseKey)}
                  className={cn(
                    'w-full h-8 sm:h-9 min-w-0 inline-flex items-center justify-center gap-1 px-2.5 overflow-hidden transition-[filter,background-color,color] duration-200 ease-out border-y',
                    !isLast && 'pr-3.5 sm:pr-4',
                    segmentText,
                    'focus-ring-control cursor-pointer hover:brightness-98',
                    isActive && 'border-teal-500',
                    !isActive && 'border-arena-border',
                    isActive && 'phase-segment-active',
                    isComplete && !isActive && 'phase-segment-complete',
                    !isActive && !isComplete && 'phase-segment-future'
                  )}
                >
                  <span
                    className="w-full min-w-0 inline-flex items-center justify-center gap-1 overflow-hidden"
                    style={{ transform: isLast ? undefined : `translateX(${chevronCenterOffset}px)` }}
                  >
                    <span data-testid={`phase-segment-dot-${phaseKey}`} className={cn('inline-flex rounded-full', connectorClasses)} />
                    <span className="min-w-0 flex-1 text-center text-xs truncate">
                      {phases[phaseKey].label}
                    </span>
                  </span>
                </button>
              ) : (
                <div
                  className={cn(
                    'w-full h-8 sm:h-9 min-w-0 inline-flex items-center justify-center gap-1 px-2.5 overflow-hidden border-y',
                    !isLast && 'pr-3.5 sm:pr-4',
                    segmentText,
                    isActive && 'border-teal-500 phase-segment-active',
                    isComplete && !isActive && 'border-arena-border phase-segment-complete',
                    !isActive && !isComplete && 'border-arena-border phase-segment-future'
                  )}
                >
                  <span
                    className="w-full min-w-0 inline-flex items-center justify-center gap-1 overflow-hidden"
                    style={{ transform: isLast ? undefined : `translateX(${chevronCenterOffset}px)` }}
                  >
                    <span data-testid={`phase-segment-dot-${phaseKey}`} className={cn('inline-flex rounded-full', connectorClasses)} />
                    <span className="min-w-0 flex-1 text-center text-xs truncate">
                      {phases[phaseKey].label}
                    </span>
                  </span>
                </div>
              )}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 transition-[filter,background-color] duration-200 ease-out"
                  style={{
                    width: `${chevronWidth}px`,
                    right: `-${chevronWidth - chevronBodyOverlap}px`,
                    backgroundColor: segmentFill,
                    clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                    filter: isHovered ? 'brightness(0.98)' : 'brightness(1)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-start justify-between w-full mx-auto',
      slim ? 'max-w-5xl' : 'max-w-4xl',
      className
    )}>
      {phaseKeys.map((phaseKey, index) => {
        const phase = phases[phaseKey];
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;

        return (
          <div key={phaseKey} className="flex items-center">
            <PhaseStep
              phase={phase}
              index={index}
              isActive={isActive}
              isComplete={isComplete}
              slim={slim}
              onClick={onPhaseClick ? () => onPhaseClick(phaseKey) : undefined}
            />

            {index < phaseKeys.length - 1 && (
              <ConnectingLine isComplete={isComplete} slim={slim} />
            )}
          </div>
        );
      })}
    </div>
  );
});

PhaseIndicator.displayName = 'PhaseIndicator';

export default PhaseIndicator;
export { PhaseStep, ConnectingLine };
