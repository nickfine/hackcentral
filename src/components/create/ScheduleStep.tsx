/**
 * Schedule step: anchor section, timezone, phase cards + connectors, validation.
 * Owns anchor and overrides; emits schedule via onScheduleChange.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CASCADE_PHASE_ORDER,
  CASCADE_RULES,
  computeSuggestedSchedule,
  getAnchorPhaseId,
  mergeWithOverrides,
  phaseDateMapToSchedule,
} from './CascadeScheduleEngine';
import { PhaseCard } from './PhaseCard';
import { PhaseConnector } from './PhaseConnector';
import { ScheduleMiniTimeline } from './ScheduleMiniTimeline';
import type { Schedule, ScheduleStepPhaseId } from './types';
import { DateTimePopover } from './DateTimePopover';

const ANCHOR_PHASE_ID = getAnchorPhaseId();

export interface ScheduleStepProps {
  timezone: string;
  schedule: Schedule;
  onScheduleChange: (schedule: Schedule) => void;
}

function getAnchorFromSchedule(schedule: Schedule): Date | null {
  const h = schedule.hackingStartsAt;
  return h != null && h !== '' ? new Date(h) : null;
}

function getOverridesFromSchedule(schedule: Schedule): Map<ScheduleStepPhaseId, string> {
  const map = new Map<ScheduleStepPhaseId, string>();
  const phaseIds: ScheduleStepPhaseId[] = [
    'registrationOpensAt',
    'registrationClosesAt',
    'teamFormationStartsAt',
    'teamFormationEndsAt',
    'hackingStartsAt',
    'submissionDeadlineAt',
    'votingStartsAt',
    'votingEndsAt',
    'resultsAnnounceAt',
  ];
  for (const id of phaseIds) {
    const v = schedule[id as keyof Schedule];
    if (typeof v === 'string' && v !== '') map.set(id, v);
  }
  return map;
}

export function ScheduleStep({ timezone, schedule, onScheduleChange }: ScheduleStepProps) {
  const [anchor, setAnchor] = useState<Date | null>(() => getAnchorFromSchedule(schedule));
  const [overrides, setOverrides] = useState<Map<ScheduleStepPhaseId, string>>(() =>
    getOverridesFromSchedule(schedule)
  );

  // When schedule first contains dates (e.g. loaded draft), sync anchor and overrides once.
  const [hasSyncedFromSchedule, setHasSyncedFromSchedule] = useState(false);
  useEffect(() => {
    if (hasSyncedFromSchedule || !schedule.hackingStartsAt) return;
    setAnchor(getAnchorFromSchedule(schedule));
    setOverrides(getOverridesFromSchedule(schedule));
    setHasSyncedFromSchedule(true);
  }, [schedule, hasSyncedFromSchedule]);

  const tz = timezone || 'UTC';

  const suggested = useMemo(
    () => (anchor ? computeSuggestedSchedule(anchor, tz) : new Map()),
    [anchor, tz]
  );

  const resolved = useMemo(
    () => mergeWithOverrides(suggested, overrides),
    [suggested, overrides]
  );

  const connectorWarnings = useMemo(() => {
    const warnings: string[] = [];
    for (let i = 0; i < CASCADE_PHASE_ORDER.length - 1; i++) {
      const a = resolved.get(CASCADE_PHASE_ORDER[i]);
      const b = resolved.get(CASCADE_PHASE_ORDER[i + 1]);
      if (a != null && b != null && new Date(a).getTime() > new Date(b).getTime()) {
        warnings[i] = 'Dates are out of order';
      }
    }
    return warnings;
  }, [resolved]);

  const emitSchedule = useCallback(() => {
    const out = phaseDateMapToSchedule(resolved, tz) as Schedule;
    onScheduleChange(out);
  }, [resolved, tz, onScheduleChange]);

  useEffect(() => {
    if (resolved.size === 0) return;
    emitSchedule();
  }, [resolved, emitSchedule]);

  const handleAnchorChange = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return;
      setAnchor(d);
      setOverrides((prev) => {
        const next = new Map(prev);
        next.delete(ANCHOR_PHASE_ID);
        return next;
      });
    },
    []
  );

  const handlePhaseChange = useCallback((phaseId: ScheduleStepPhaseId, iso: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(phaseId, iso);
      return next;
    });
  }, []);

  const handleResetToSuggested = useCallback((phaseId: ScheduleStepPhaseId) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.delete(phaseId);
      return next;
    });
  }, []);

  const anchorIso =
    anchor != null ? anchor.toISOString() : overrides.get(ANCHOR_PHASE_ID) ?? undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Dedicated anchor section: Tier 1/2 heading, Tier 4 subtitle, prominent date-time */}
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          When does hacking start?
        </h2>
        <p className="text-xs font-normal text-gray-700 dark:text-gray-400">
          All other dates will be calculated from this
        </p>
        <div className="mt-1">
          <DateTimePopover
            value={anchorIso}
            onChange={handleAnchorChange}
            aria-label="Hacking start date and time"
          />
        </div>
      </section>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        Timezone: <span className="font-medium text-gray-900 dark:text-gray-300">{tz}</span>
      </div>

      {/* Phase cards and connectors */}
      <div className="flex flex-col gap-0">
        {CASCADE_RULES.map((rule, index) => {
          const phaseId = rule.phaseId;
          const resolvedValue = resolved.get(phaseId);
          const suggestedValue = suggested.get(phaseId);
          const isOverridden = overrides.has(phaseId);

          return (
            <div key={phaseId} className="flex flex-col gap-0">
              <PhaseCard
                phaseId={phaseId}
                label={rule.label}
                value={resolvedValue ?? undefined}
                suggestedValue={suggestedValue ?? undefined}
                isOverridden={isOverridden}
                onValueChange={(iso) => handlePhaseChange(phaseId, iso)}
                onResetToSuggested={() => handleResetToSuggested(phaseId)}
              />
              {index < CASCADE_RULES.length - 1 && (
                <PhaseConnector
                  fromDate={resolvedValue ?? undefined}
                  toDate={resolved.get(CASCADE_PHASE_ORDER[index + 1]) ?? undefined}
                  warning={connectorWarnings[index]}
                />
              )}
            </div>
          );
        })}
      </div>

      <ScheduleMiniTimeline resolved={resolved} />
    </div>
  );
}
