/**
 * Convert between ISO date-time strings (UTC) and @internationalized/date CalendarDateTime.
 * Used by DateTimePopover for react-aria DatePicker value/onChange.
 */

import { CalendarDateTime } from '@internationalized/date';

/**
 * Parse an ISO string (e.g. "2026-03-15T09:00:00.000Z") to CalendarDateTime using UTC parts.
 * Returns null if value is missing or invalid.
 */
export function isoToCalendarDateTime(value: string | undefined | null): CalendarDateTime | null {
  if (value == null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new CalendarDateTime(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );
}

/**
 * Convert CalendarDateTime to ISO string (UTC).
 * Treats the calendar date/time as UTC for storage.
 */
export function calendarDateTimeToIso(date: CalendarDateTime): string {
  const d = new Date(
    Date.UTC(
      date.year,
      date.month - 1,
      date.day,
      date.hour,
      date.minute,
      date.second,
      date.millisecond
    )
  );
  return d.toISOString();
}
