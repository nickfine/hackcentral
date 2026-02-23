/**
 * Dashed line between two phase cards + duration pill ("Same day", "X days", or "Overlap" in amber).
 * Warning slot for sequence order violations only (phase date after next phase date).
 */

export interface PhaseConnectorProps {
  /** ISO date-time of the phase above (previous in display order). */
  fromDate: string | undefined | null;
  /** ISO date-time of the phase below (next in display order). */
  toDate: string | undefined | null;
  /** Shown below the pill when dates are out of order (e.g. fromDate > toDate). */
  warning?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getDayGap(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

/**
 * Human-readable duration label: "Same day", "X days", or "Overlap" (amber).
 */
function getDurationLabel(fromDate: string | null, toDate: string | null): { label: string; isOverlap: boolean } {
  if (!fromDate || !toDate) return { label: '—', isOverlap: false };
  const fromMs = new Date(fromDate).getTime();
  const toMs = new Date(toDate).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return { label: '—', isOverlap: false };
  const days = getDayGap(fromMs, toMs);
  if (days < 0) return { label: 'Overlap', isOverlap: true };
  if (days === 0) return { label: 'Same day', isOverlap: false };
  return { label: days === 1 ? '1 day' : `${days} days`, isOverlap: false };
}

export function PhaseConnector({ fromDate, toDate, warning }: PhaseConnectorProps) {
  const from = fromDate ?? null;
  const to = toDate ?? null;
  const { label, isOverlap } = getDurationLabel(from, to);

  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <div
        className="w-px flex-1 min-h-[8px] border-l border-dashed border-gray-300 dark:border-gray-600"
        aria-hidden
      />
      <span
        className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${
          isOverlap
            ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        }`}
      >
        {label}
      </span>
      {warning && (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="alert">
          {warning}
        </p>
      )}
    </div>
  );
}
