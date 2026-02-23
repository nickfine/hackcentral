/**
 * Date-time popover: value/onChange as ISO string; design system classes.
 * Uses react-aria-components DatePicker (CalendarDateTime + granularity minute).
 */

import { CalendarDateTime } from '@internationalized/date';
import { useMemo, useRef } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DatePicker,
  DateInput,
  DateSegment,
  Group,
  Heading,
  Popover,
} from 'react-aria-components';
import { calendarDateTimeToIso, isoToCalendarDateTime } from './dateTimeUtils';

/** Default placeholder when value is empty (today noon UTC) so the picker always has a displayable state. */
function defaultPlaceholder(): CalendarDateTime {
  const now = new Date();
  return new CalendarDateTime(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate(),
    12,
    0,
    0,
    0
  );
}

export interface DateTimePopoverProps {
  /** Current value as ISO date-time string (e.g. "2026-03-15T09:00:00.000Z"). */
  value: string | undefined | null;
  /** Called with ISO string when user changes date or time. */
  onChange: (iso: string) => void;
  /** Optional aria-label for the trigger. */
  'aria-label'?: string;
  /** Disabled state. */
  isDisabled?: boolean;
}

/**
 * Converts ISO string to CalendarDateTime for the picker; on change converts back to ISO.
 * Design system: rounded-lg, border, teal focus; popover rounded-xl, p-5.
 */
export function DateTimePopover({
  value,
  onChange,
  'aria-label': ariaLabel,
  isDisabled,
}: DateTimePopoverProps) {
  const dateTime = useMemo(
    () => isoToCalendarDateTime(value ?? undefined),
    [value]
  );
  const placeholder = useMemo(() => defaultPlaceholder(), []);

  const handleChange = (v: CalendarDateTime | null) => {
    if (v) onChange(calendarDateTimeToIso(v));
  };

  const popoverRef = useRef<HTMLDivElement>(null);

  return (
    <DatePicker
      value={dateTime ?? undefined}
      onChange={handleChange}
      placeholderValue={placeholder}
      granularity="minute"
      hourCycle={24}
      aria-label={ariaLabel ?? 'Date and time'}
      isDisabled={isDisabled}
      className="flex flex-col gap-1 min-w-0"
    >
      <Group
        className="flex w-full min-w-0 items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20"
        style={{
          backgroundColor: 'var(--color-card)',
          color: 'var(--color-card-foreground)',
          borderColor: 'var(--color-input)',
        }}
      >
        <DateInput className="flex flex-1 min-w-0 items-center gap-0.5 overflow-x-auto [&_.react-aria-DateSegment]:rounded [&_.react-aria-DateSegment]:px-0.5 [&_.react-aria-DateSegment]:outline-none [&_.react-aria-DateSegment]:text-inherit [&_.react-aria-DateSegment]:focus:bg-teal-100 [&_.react-aria-DateSegment]:dark:focus:bg-teal-900/30 [&_.react-aria-DateSegment][data-placeholder]:opacity-60">
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <Button
          type="button"
          className="rounded p-1 outline-none focus:ring-2 focus:ring-teal-500/20"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <CalendarIcon className="h-4 w-4" aria-hidden />
        </Button>
      </Group>
      <Popover
        ref={popoverRef}
        className="min-w-[280px] w-max overflow-auto rounded-xl border p-3 shadow-lg"
        style={{
          backgroundColor: 'var(--color-card)',
          color: 'var(--color-card-foreground)',
          borderColor: 'var(--color-border)',
        }}
      >
        <Calendar className="min-w-[256px] rounded-lg [&_button]:rounded [&_button]:outline-none [&_button[data-selected]]:bg-teal-500 [&_button[data-selected]]:text-white [&_button[data-focus-visible]]:ring-2 [&_button[data-focus-visible]]:ring-teal-500 [&_button[data-hovered]]:bg-teal-100 [&_button[data-hovered][data-selected]]:bg-teal-600 dark:[&_button[data-hovered]]:bg-teal-900/30">
          <header className="mb-3 flex items-center gap-1">
            <Button slot="previous" className="rounded p-1 outline-none hover:bg-gray-100 focus:ring-2 focus:ring-teal-500 dark:hover:bg-gray-700" aria-label="Previous month">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Button>
            <Heading className="flex-1 text-center text-sm font-medium" />
            <Button slot="next" className="rounded p-1 outline-none hover:bg-gray-100 focus:ring-2 focus:ring-teal-500 dark:hover:bg-gray-700" aria-label="Next month">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Button>
          </header>
          <CalendarGrid className="w-full border-separate border-spacing-0">
            {(date) => <CalendarCell date={date} className="rounded p-1 text-center text-sm outline-none [&[data-selected]]:bg-teal-500 [&[data-selected]]:text-white [&[data-focus-visible]]:ring-2 [&[data-focus-visible]]:ring-teal-500 [&[data-hovered]]:bg-gray-100 [&[data-outside-month]]:opacity-40 dark:[&[data-hovered]]:bg-gray-700" />}
          </CalendarGrid>
        </Calendar>
      </Popover>
    </DatePicker>
  );
}
