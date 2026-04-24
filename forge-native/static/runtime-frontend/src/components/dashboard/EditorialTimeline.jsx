import { useState, useEffect } from 'react';
import { EVENT_PHASE_ORDER, EVENT_PHASES } from '../../data/constants';

function parseTs(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function phaseStatusLabel(startTime) {
  const target = parseTs(startTime);
  if (!target) return 'TBD';
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return 'Now';
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  if (days > 0) return `Opens in ${days}d`;
  if (hours > 0) return `Opens in ${hours}h`;
  return 'Opening soon';
}

function buildPhaseMilestoneMap(scheduleMilestones) {
  if (!scheduleMilestones?.length) return {};
  const map = {};
  for (const m of scheduleMilestones) {
    if (!m.phase) continue;
    const existing = map[m.phase];
    if (!existing) {
      map[m.phase] = m;
    } else {
      const a = parseTs(m.startTime);
      const b = parseTs(existing.startTime);
      if (a && b && a < b) map[m.phase] = m;
    }
  }
  return map;
}

/**
 * Editorial horizontal phase timeline - seven bordered cards, active step highlighted.
 *
 * @param {{
 *   eventPhase: string,
 *   scheduleMilestones?: any[],
 * }} props
 */
export default function EditorialTimeline({ eventPhase, scheduleMilestones }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const currentIndex = EVENT_PHASE_ORDER.indexOf(eventPhase);
  const milestoneMap = buildPhaseMilestoneMap(scheduleMilestones);

  return (
    <section
      className="rounded-[24px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.015)_100%)] px-5 py-[1.375rem]"
      aria-label="Event phases"
    >
      <div className="grid gap-4 md:grid-cols-7">
        {EVENT_PHASE_ORDER.map((phase, i) => {
          const isActive = phase === eventPhase;
          const isCompleted = EVENT_PHASE_ORDER.indexOf(phase) < currentIndex;
          const phaseLabel = EVENT_PHASES[phase]?.label || phase;
          const milestone = milestoneMap[phase];

          let statusText;
          if (isActive) statusText = 'Now';
          else if (isCompleted) statusText = 'Done';
          else if (milestone?.startTime) statusText = phaseStatusLabel(milestone.startTime);
          else statusText = 'TBD';

          return (
            <div key={phase} className="relative">
              <div
                className={`rounded-2xl border px-4 py-4 ${
                  isActive
                    ? 'border-cyan-400/55 bg-cyan-400/[0.18] shadow-[var(--cyan-electric-inner-edge-strong),inset_0_-2px_0_var(--cyan-electric-border),var(--timeline-active-glow),var(--card-depth-subtle)] ring-1 ring-cyan-400/20 ring-offset-1 ring-offset-transparent animate-[phase-beacon-pulse_3s_ease-in-out_infinite]'
                    : isCompleted
                      ? 'border-white/[0.05] bg-white/[0.01] opacity-40'
                      : 'border-white/[0.06] bg-white/[0.02] opacity-75'
                }`}
              >
                <div
                  className={`text-sm ${
                    isActive ? 'font-semibold text-cyan-100' : 'font-medium text-white/55'
                  }`}
                >
                  {phaseLabel}
                </div>
                <div className={`mt-1 text-xs ${
                  isActive
                    ? 'font-medium text-cyan-300/85'
                    : isCompleted
                      ? 'text-white/30'
                      : 'text-white/30'
                }`}>{statusText}</div>
              </div>
              {i < EVENT_PHASE_ORDER.length - 1 && (
                <div
                  className={`absolute -right-2 top-1/2 hidden h-px w-4 md:block ${isActive ? 'bg-cyan-400/50 shadow-[0_0_4px_rgba(0,245,255,0.3)]' : 'bg-white/10'}`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
