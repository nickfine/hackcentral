/**
 * Read-only horizontal bar: equal-width segments, one per phase.
 * Each segment: phase name (Tier 4, truncated) + resolved date (Tier 4).
 * Teal-500 anchor, teal-100 either side, gray-100 others.
 */

import { CASCADE_RULES, getAnchorPhaseId } from './CascadeScheduleEngine';
import type { PhaseDateMap, ScheduleStepPhaseId } from './types';

const ANCHOR_PHASE_ID = getAnchorPhaseId();
const MAX_LABEL_LENGTH = 12;

function formatDateTier4(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateLabel(label: string, max: number): string {
  if (label.length <= max) return label;
  return label.slice(0, max - 1) + '…';
}

export interface ScheduleMiniTimelineProps {
  resolved: PhaseDateMap;
}

export function ScheduleMiniTimeline({ resolved }: ScheduleMiniTimelineProps) {
  const anchorIndex = CASCADE_RULES.findIndex((r) => r.phaseId === ANCHOR_PHASE_ID);

  return (
    <div
      className="flex w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
      role="img"
      aria-label="Schedule timeline"
    >
      {CASCADE_RULES.map((rule, index) => {
        const phaseId = rule.phaseId as ScheduleStepPhaseId;
        const iso = resolved.get(phaseId);
        const isAnchor = phaseId === ANCHOR_PHASE_ID;
        const isAdjacent =
          index === anchorIndex - 1 || index === anchorIndex + 1;
        const bgClass = isAnchor
          ? 'bg-teal-500 text-white dark:bg-teal-600 dark:text-white'
          : isAdjacent
            ? 'bg-teal-100 text-gray-900 dark:bg-teal-900/40 dark:text-gray-200'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-300';

        return (
          <div
            key={phaseId}
            className={`flex min-w-0 flex-1 flex-col gap-0.5 border-r border-gray-200 px-2 py-2 last:border-r-0 dark:border-gray-600 ${bgClass}`}
          >
            <span
              className="truncate text-xs font-normal"
              title={rule.label}
            >
              {truncateLabel(rule.label, MAX_LABEL_LENGTH)}
            </span>
            <span className="truncate text-xs font-normal opacity-90">
              {iso ? formatDateTier4(iso) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
