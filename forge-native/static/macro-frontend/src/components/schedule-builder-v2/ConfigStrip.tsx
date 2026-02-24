/**
 * ConfigStrip Component
 *
 * Top configuration panel containing:
 * - Duration selector (1d/2d/3d buttons)
 * - Anchor date + time pickers
 * - Timezone selector
 */

import type { EventDuration } from '../../types/scheduleBuilderV2';

/** Common timezones for the dropdown */
const TIMEZONE_OPTIONS = [
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZDT)' },
];

interface ConfigStripProps {
  duration: EventDuration;
  onDurationChange: (duration: EventDuration) => void;
  anchorDate: string;
  onAnchorDateChange: (date: string) => void;
  anchorTime: string;
  onAnchorTimeChange: (time: string) => void;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
}

export function ConfigStrip({
  duration,
  onDurationChange,
  anchorDate,
  onAnchorDateChange,
  anchorTime,
  onAnchorTimeChange,
  timezone,
  onTimezoneChange,
}: ConfigStripProps) {
  return (
    <div className="sb2-config-strip">
      {/* Duration selector */}
      <div className="sb2-config-section">
        <p className="sb2-config-label">Duration</p>
        <div className="sb2-duration-buttons">
          {([1, 2, 3] as EventDuration[]).map((d) => (
            <button
              key={d}
              type="button"
              className={`sb2-duration-btn ${duration === d ? 'sb2-duration-btn--active' : ''}`}
              onClick={() => onDurationChange(d)}
              aria-pressed={duration === d}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="sb2-config-divider" aria-hidden="true" />

      {/* Anchor date + time */}
      <div className="sb2-config-section">
        <p className="sb2-config-label">Hacking starts</p>
        <div className="sb2-anchor-inputs">
          <input
            type="date"
            className="sb2-anchor-input"
            value={anchorDate}
            onChange={(e) => onAnchorDateChange(e.target.value)}
            aria-label="Hack start date"
          />
          <input
            type="time"
            className="sb2-anchor-input"
            value={anchorTime}
            onChange={(e) => onAnchorTimeChange(e.target.value)}
            aria-label="Hack start time"
          />
        </div>
      </div>

      <div className="sb2-config-divider" aria-hidden="true" />

      {/* Timezone selector */}
      <div className="sb2-config-section">
        <p className="sb2-config-label">Timezone</p>
        <select
          className="sb2-timezone-select"
          value={timezone}
          onChange={(e) => onTimezoneChange(e.target.value)}
          aria-label="Event timezone"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
