/**
 * Single phase card: teal left border, rounded-xl, phase icon, label, date-time popover,
 * "Reset to suggested" when overridden, 150ms cascade flash on date display.
 */

import {
  CalendarCheck,
  CalendarClock,
  Flag,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ScheduleStepPhaseId } from './types';
import { DateTimePopover } from './DateTimePopover';

const PHASE_ICONS: Record<ScheduleStepPhaseId, LucideIcon> = {
  registrationOpensAt: CalendarCheck,
  registrationClosesAt: CalendarCheck,
  teamFormationStartsAt: Users,
  teamFormationEndsAt: Users,
  hackingStartsAt: CalendarClock,
  submissionDeadlineAt: Flag,
  votingStartsAt: Flag,
  votingEndsAt: Flag,
  resultsAnnounceAt: CalendarCheck,
};

export interface PhaseCardProps {
  phaseId: ScheduleStepPhaseId;
  label: string;
  /** Resolved value to show (suggested or override). */
  value: string | undefined | null;
  /** Suggested value from cascade (for "Reset to suggested" and cascade flash). */
  suggestedValue: string | undefined | null;
  isOverridden: boolean;
  onValueChange: (iso: string) => void;
  onResetToSuggested: () => void;
}

const CASCADE_FLASH_MS = 150;

/**
 * Phase card with design system: border-l-2 border-teal-500, rounded-xl, p-5.
 * Date display element gets 150ms bg-teal-50 → transparent when value updates from cascade.
 */
export function PhaseCard({
  phaseId,
  label,
  value,
  suggestedValue,
  isOverridden,
  onValueChange,
  onResetToSuggested,
}: PhaseCardProps) {
  const [flash, setFlash] = useState(false);
  const prevSuggestedRef = useRef<string | undefined | null>(undefined);

  // When suggestedValue changes and we're showing it (not overridden), flash the date display.
  useEffect(() => {
    if (isOverridden) return;
    const prev = prevSuggestedRef.current;
    prevSuggestedRef.current = suggestedValue ?? undefined;
    if (prev !== undefined && suggestedValue !== undefined && prev !== suggestedValue) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), CASCADE_FLASH_MS);
      return () => clearTimeout(t);
    }
  }, [suggestedValue, isOverridden]);

  const Icon = PHASE_ICONS[phaseId];

  return (
    <div className="rounded-xl border border-gray-200 border-l-2 border-l-teal-500 bg-white p-5 text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex shrink-0 text-teal-600 dark:text-teal-500" aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{label}</h3>
          <div
            className={`inline-block rounded-lg transition-[background-color] duration-150 ${
              flash ? 'bg-teal-50 dark:bg-teal-950/40' : 'bg-transparent'
            }`}
          >
            <DateTimePopover
              value={value ?? suggestedValue}
              onChange={onValueChange}
              aria-label={`${label} date and time`}
            />
          </div>
          {isOverridden && (
            <p className="text-xs font-normal text-gray-600 dark:text-gray-400">
              <button
                type="button"
                onClick={onResetToSuggested}
                className="underline hover:text-teal-600 dark:hover:text-teal-400"
              >
                Reset to suggested
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
