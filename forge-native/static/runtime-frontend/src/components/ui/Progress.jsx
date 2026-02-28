/**
 * Progress Component
 * Display progress indicators as bars or circular displays.
 */

import { forwardRef } from 'react';
import { cn } from '../../lib/design-system';

const SIZE_MAP = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const VARIANT_STYLES = {
  default: { color: 'bg-brand' },
  teal: { color: 'bg-teal-500' },
  success: { color: 'bg-success' },
  warning: { color: 'bg-warning' },
  error: { color: 'bg-error' },
};

const TRACK_COLORS = {
  default: 'bg-arena-elevated',
  teal: 'bg-gray-200 dark:bg-gray-700',
  success: 'bg-success/20',
  warning: 'bg-warning/20',
  error: 'bg-error/20',
};

const Progress = forwardRef(({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = true,
  glossy = true,
  className,
  ...props
}, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const trackColor = TRACK_COLORS[variant] || TRACK_COLORS.default;

  return (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      {/* Label Row */}
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-sm font-medium text-text-secondary">{label}</span>
          )}
          {showLabel && (
            <span className="text-sm font-mono text-text-muted">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Track */}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full',
          trackColor,
          sizeClass
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {/* Progress Bar with optional glossy shine */}
        <div
          className={cn(
            'h-full rounded-full relative overflow-hidden',
            variantStyle.color,
            animated && 'transition-all duration-500 ease-out'
          )}
          style={{ width: `${percentage}%` }}
        >
          {/* Glossy shine overlay */}
          {glossy && variant !== 'teal' && (
            <div 
              className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10 pointer-events-none"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>
  );
});

Progress.displayName = 'Progress';

/**
 * CircularProgress - Circular progress indicator
 */
export const CircularProgress = forwardRef(({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  strokeWidth,
  className,
  ...props
}, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeMap = {
    sm: { size: 32, stroke: 3 },
    md: { size: 48, stroke: 4 },
    lg: { size: 64, stroke: 5 },
    xl: { size: 80, stroke: 6 },
  };

  const config = sizeMap[size] || sizeMap.md;
  const actualStrokeWidth = strokeWidth || config.stroke;
  const radius = (config.size - actualStrokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const variantStrokeColors = {
    default: '#FF4500',
    success: '#00FF9D',
    warning: '#FF8A00',
    error: '#FF4500',
  };

  const strokeColor = variantStrokeColors[variant] || variantStrokeColors.default;

  return (
    <div
      ref={ref}
      className={cn('relative inline-flex items-center justify-center', className)}
      {...props}
    >
      <svg
        width={config.size}
        height={config.size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-arena-elevated, #1F1F1F)"
          strokeWidth={actualStrokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={actualStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Center Label */}
      {showLabel && (
        <span className="absolute text-sm font-bold text-text-primary font-mono">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
});

CircularProgress.displayName = 'CircularProgress';

/**
 * ProgressSteps - Step-based progress indicator
 */
export const ProgressSteps = ({
  steps = [],
  currentStep = 0,
  variant = 'default',
  className,
  ...props
}) => {
  const variantColors = {
    default: { 
      active: 'bg-brand text-white', 
      complete: 'bg-brand text-white', 
      pending: 'bg-arena-elevated text-text-muted border border-arena-border' 
    },
  };

  const colors = variantColors[variant] || variantColors.default;

  return (
    <div className={cn('flex items-center', className)} {...props}>
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isActive = index === currentStep;
        const isPending = index > currentStep;

        return (
          <div key={step.id || index} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200',
                  isComplete && colors.complete,
                  isActive && cn(colors.active, 'ring-4 ring-offset-2 ring-offset-arena-bg ring-brand/20'),
                  isPending && colors.pending
                )}
              >
                {isComplete ? '✓' : index + 1}
              </div>
              {step.label && (
                <span className={cn(
                  'mt-2 text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-text-primary' : 'text-text-muted'
                )}>
                  {step.label}
                </span>
              )}
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-12 h-0.5 mx-2 transition-colors duration-200',
                  isComplete ? colors.complete.split(' ')[0] : 'bg-arena-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

ProgressSteps.displayName = 'ProgressSteps';

export default Progress;
