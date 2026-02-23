/**
 * Visual cascade schedule builder — Forge-native vanilla CSS port of
 * src/components/create/{ScheduleStep, PhaseCard, PhaseConnector, ScheduleMiniTimeline}.
 *
 * User picks a "hacking start" anchor; all other 8 phases cascade automatically.
 * Each phase can be individually overridden with a "Reset to suggested" escape hatch.
 * Mini timeline bar at bottom shows the full schedule at a glance.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ANCHOR_INDEX,
  ANCHOR_PHASE_ID,
  CASCADE_RULES,
  type CascadeRule,
  type PhaseDateMap,
  type ScheduleStepPhaseId,
  computeSuggestedSchedule,
  datetimeLocalToIso,
  formatInZone,
  getDurationLabel,
  isoToDatetimeLocal,
  mergeWithOverrides,
} from '../../utils/cascadeSchedule';

const PHASE_ICONS: Record<ScheduleStepPhaseId, string> = {
  registrationOpensAt: '📋',
  registrationClosesAt: '📋',
  teamFormationStartsAt: '👥',
  teamFormationEndsAt: '👥',
  hackingStartsAt: '⚡',
  submissionDeadlineAt: '🏁',
  votingStartsAt: '🗳️',
  votingEndsAt: '🗳️',
  resultsAnnounceAt: '🏆',
};

const TIMELINE_SHORT: Record<ScheduleStepPhaseId, string> = {
  registrationOpensAt: 'Reg. Open',
  registrationClosesAt: 'Reg. Close',
  teamFormationStartsAt: 'Team Form.',
  teamFormationEndsAt: 'Team End',
  hackingStartsAt: 'Hacking',
  submissionDeadlineAt: 'Submit',
  votingStartsAt: 'Voting',
  votingEndsAt: 'Vote End',
  resultsAnnounceAt: 'Results',
};

export interface ScheduleBuilderOutput {
  timezone: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  teamFormationStartsAt?: string;
  teamFormationEndsAt?: string;
  hackingStartsAt?: string;
  submissionDeadlineAt?: string;
  votingStartsAt?: string;
  votingEndsAt?: string;
  resultsAnnounceAt?: string;
}

export interface ScheduleBuilderProps {
  timezone: string;
  onChange: (schedule: ScheduleBuilderOutput) => void;
}

interface PhaseRowProps {
  rule: CascadeRule;
  isAnchor: boolean;
  resolvedIso: string | undefined;
  suggestedIso: string | undefined;
  isOverridden: boolean;
  timezone: string;
  onOverride: (phaseId: ScheduleStepPhaseId, value: string) => void;
  onReset: (phaseId: ScheduleStepPhaseId) => void;
}

function PhaseRow({
  rule,
  isAnchor,
  resolvedIso,
  suggestedIso,
  isOverridden,
  timezone,
  onOverride,
  onReset,
}: PhaseRowProps) {
  const [flashing, setFlashing] = useState(false);
  const prevSuggestedRef = useRef<string | undefined>(undefined);

  // Cascade flash: when suggested changes and we're not overriding, flash the date
  useEffect(() => {
    if (isOverridden || isAnchor) return;
    const prev = prevSuggestedRef.current;
    prevSuggestedRef.current = suggestedIso;
    if (prev !== undefined && suggestedIso !== undefined && prev !== suggestedIso) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 200);
      return () => clearTimeout(t);
    }
  }, [suggestedIso, isOverridden, isAnchor]);

  return (
    <div className={`phase-card${isAnchor ? ' phase-card-anchor' : ''}${isOverridden ? ' phase-card-overridden' : ''}`}>
      <div className="phase-card-row">
        <span className="phase-icon" aria-hidden>{PHASE_ICONS[rule.phaseId]}</span>
        <div className="phase-body">
          <p className="phase-label">{rule.label}</p>

          <div className={`phase-date-wrap${flashing ? ' phase-date-flash' : ''}`}>
            {resolvedIso ? (
              <p className="phase-date">{formatInZone(resolvedIso, timezone)}</p>
            ) : (
              <p className="phase-date phase-date-empty">—</p>
            )}
          </div>

          {!isAnchor ? (
            <div className="phase-override-row">
              <input
                type="datetime-local"
                className="phase-input"
                value={resolvedIso ? isoToDatetimeLocal(resolvedIso) : ''}
                onChange={(e) => onOverride(rule.phaseId, e.target.value)}
                aria-label={`Override ${rule.label}`}
              />
              {isOverridden ? (
                <button
                  type="button"
                  className="link-btn phase-reset-btn"
                  onClick={() => onReset(rule.phaseId)}
                >
                  ↩ Reset to suggested
                  {suggestedIso ? ` (${formatInZone(suggestedIso, timezone)})` : ''}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ScheduleBuilder({ timezone, onChange }: ScheduleBuilderProps) {
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [overrides, setOverrides] = useState<PhaseDateMap>(new Map());
  const tz = timezone || 'UTC';

  const suggested = useMemo<PhaseDateMap>(
    () => (anchor ? computeSuggestedSchedule(anchor, tz) : new Map()),
    [anchor, tz],
  );

  const resolved = useMemo<PhaseDateMap>(
    () => mergeWithOverrides(suggested, overrides),
    [suggested, overrides],
  );

  // Emit the full schedule upward whenever resolved changes
  useEffect(() => {
    const out: ScheduleBuilderOutput = { timezone: tz };
    for (const [phaseId, iso] of resolved.entries()) {
      (out as unknown as Record<string, string>)[phaseId] = iso;
    }
    onChange(out);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, tz]);

  const handleAnchorChange = useCallback((value: string) => {
    if (!value) { setAnchor(null); return; }
    setAnchor(new Date(datetimeLocalToIso(value)));
    setOverrides((prev) => {
      const next = new Map(prev);
      next.delete(ANCHOR_PHASE_ID);
      return next;
    });
  }, []);

  const handleOverride = useCallback((phaseId: ScheduleStepPhaseId, value: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      if (value) next.set(phaseId, datetimeLocalToIso(value));
      else next.delete(phaseId);
      return next;
    });
  }, []);

  const handleReset = useCallback((phaseId: ScheduleStepPhaseId) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.delete(phaseId);
      return next;
    });
  }, []);

  const anchorValue = anchor ? isoToDatetimeLocal(anchor.toISOString()) : '';

  return (
    <div className="schedule-builder">

      {/* Anchor picker */}
      <section className="schedule-anchor-section">
        <h3 className="schedule-anchor-title">When does hacking start?</h3>
        <p className="schedule-anchor-sub">All other dates are calculated from this</p>
        <input
          type="datetime-local"
          className="schedule-anchor-input"
          value={anchorValue}
          onChange={(e) => handleAnchorChange(e.target.value)}
          aria-label="Hacking start date and time"
        />
        <p className="schedule-tz-note">
          Timezone: <strong>{tz}</strong> — dates shown in this zone
        </p>
      </section>

      {/* Phase cards + connectors */}
      {anchor ? (
        <div className="phase-list">
          {CASCADE_RULES.map((rule, index) => {
            const isAnchor = rule.phaseId === ANCHOR_PHASE_ID;
            const isOverridden = overrides.has(rule.phaseId) && !isAnchor;
            const resolvedIso = resolved.get(rule.phaseId);
            const suggestedIso = suggested.get(rule.phaseId);
            const nextIso = index < CASCADE_RULES.length - 1
              ? resolved.get(CASCADE_RULES[index + 1].phaseId)
              : undefined;
            const { label: durLabel, isOverlap } = getDurationLabel(resolvedIso, nextIso);

            return (
              <div key={rule.phaseId} className="phase-item">
                <PhaseRow
                  rule={rule}
                  isAnchor={isAnchor}
                  resolvedIso={resolvedIso}
                  suggestedIso={suggestedIso}
                  isOverridden={isOverridden}
                  timezone={tz}
                  onOverride={handleOverride}
                  onReset={handleReset}
                />
                {index < CASCADE_RULES.length - 1 ? (
                  <div className="phase-connector">
                    <div className="phase-connector-line" aria-hidden />
                    <span className={`phase-connector-pill${isOverlap ? ' phase-connector-overlap' : ''}`}>
                      {durLabel}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="schedule-hint">Enter a hacking start date above to generate the full schedule automatically.</p>
      )}

      {/* Mini timeline bar */}
      {resolved.size > 0 ? (
        <div className="schedule-timeline" role="img" aria-label="Schedule timeline">
          {CASCADE_RULES.map((rule, index) => {
            const iso = resolved.get(rule.phaseId);
            const isAnchor = rule.phaseId === ANCHOR_PHASE_ID;
            const isAdjacent = index === ANCHOR_INDEX - 1 || index === ANCHOR_INDEX + 1;
            return (
              <div
                key={rule.phaseId}
                className={`timeline-seg${isAnchor ? ' timeline-seg-anchor' : isAdjacent ? ' timeline-seg-adjacent' : ''}`}
                title={rule.label}
              >
                <span className="timeline-seg-label">{TIMELINE_SHORT[rule.phaseId]}</span>
                <span className="timeline-seg-date">
                  {iso
                    ? new Intl.DateTimeFormat('en-GB', {
                        timeZone: tz,
                        day: 'numeric',
                        month: 'short',
                      }).format(new Date(iso))
                    : '—'}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
