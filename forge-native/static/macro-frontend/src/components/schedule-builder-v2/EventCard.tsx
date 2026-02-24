/**
 * EventCard Component
 *
 * Individual event row with:
 * - Toggle checkbox
 * - Event name and description
 * - Signal-colored styling
 * - Offset input (pre-event) or time picker (hack day)
 */

import type { EventDefinition, EventSignal } from '../../types/scheduleBuilderV2';
import { getSignalStyle, hasAccentBorder } from '../../schedule-builder-v2/signalStyles';

interface EventCardProps {
  event: EventDefinition;
  enabled: boolean;
  onToggle: () => void;

  // Pre-event milestone props
  offsetDays?: number;
  onOffsetChange?: (days: number) => void;
  anchorDate?: string;

  // Hack day event props
  time?: string;
  onTimeChange?: (time: string) => void;

  /** 'milestone' for pre-event, 'timed' for hack day */
  phaseType: 'milestone' | 'timed';
}

/**
 * Calculate and format the resulting date from anchor + offset.
 */
function formatCalculatedDate(anchorDate: string, offsetDays: number): { formatted: string; label: string } {
  if (!anchorDate) {
    return { formatted: '—', label: '' };
  }

  const date = new Date(anchorDate);
  date.setDate(date.getDate() + offsetDays);

  const formatted = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  let label: string;
  if (offsetDays === 0) {
    label = 'Hack day';
  } else if (Math.abs(offsetDays) === 1) {
    label = `1 day ${offsetDays < 0 ? 'before' : 'after'}`;
  } else {
    label = `${Math.abs(offsetDays)} days ${offsetDays < 0 ? 'before' : 'after'}`;
  }

  return { formatted, label };
}

export function EventCard({
  event,
  enabled,
  onToggle,
  offsetDays,
  onOffsetChange,
  anchorDate,
  time,
  onTimeChange,
  phaseType,
}: EventCardProps) {
  const signalStyle = getSignalStyle(event.signal);
  const showAccent = hasAccentBorder(event.signal);

  // Build inline styles for signal colors
  const cardStyle: React.CSSProperties = enabled
    ? {
        '--signal-bg': signalStyle.bg,
        '--signal-border': signalStyle.border,
        '--signal-accent': signalStyle.accent,
        '--signal-text': signalStyle.text,
      } as React.CSSProperties
    : {};

  const cardClasses = [
    'sb2-event-card',
    !enabled && 'sb2-event-card--disabled',
    !showAccent && 'sb2-event-card--neutral',
  ]
    .filter(Boolean)
    .join(' ');

  // Calculate the preview date for pre-event milestones
  const calculatedDate =
    phaseType === 'milestone' && anchorDate && offsetDays !== undefined
      ? formatCalculatedDate(anchorDate, offsetDays)
      : null;

  return (
    <div className={cardClasses} style={cardStyle}>
      {/* Toggle checkbox */}
      <button
        type="button"
        className={`sb2-event-toggle ${enabled ? 'sb2-event-toggle--checked' : ''}`}
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={`${enabled ? 'Disable' : 'Enable'} ${event.name}`}
      >
        {enabled && <span className="sb2-event-toggle-check">✓</span>}
      </button>

      {/* Event info */}
      <div className="sb2-event-info">
        <p className="sb2-event-name">{event.name}</p>
        <p className="sb2-event-description">{event.description}</p>
      </div>

      {/* Controls - only show when enabled */}
      {enabled && (
        <div className="sb2-event-controls">
          {/* Pre-event: offset input + calculated date */}
          {phaseType === 'milestone' && onOffsetChange && (
            <>
              <div className="sb2-offset-control">
                <input
                  type="number"
                  className="sb2-offset-input"
                  value={Math.abs(offsetDays ?? 0)}
                  onChange={(e) => {
                    const absValue = Math.abs(parseInt(e.target.value, 10) || 0);
                    // Keep the sign based on offsetUnit (days before = negative)
                    const newOffset = event.offsetUnit === 'days before' ? -absValue : absValue;
                    onOffsetChange(newOffset);
                  }}
                  min={0}
                  aria-label={`Days offset for ${event.name}`}
                />
                <span className="sb2-offset-unit">{event.offsetUnit || 'days before'}</span>
              </div>
              {calculatedDate && (
                <div className="sb2-calculated-date">
                  <span className="sb2-calculated-date-value">{calculatedDate.formatted}</span>
                  <span className="sb2-calculated-date-label">{calculatedDate.label}</span>
                </div>
              )}
            </>
          )}

          {/* Hack day: time picker */}
          {phaseType === 'timed' && onTimeChange && (
            <input
              type="time"
              className="sb2-time-input"
              value={time ?? ''}
              onChange={(e) => onTimeChange(e.target.value)}
              style={{ color: signalStyle.accent }}
              aria-label={`Time for ${event.name}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
