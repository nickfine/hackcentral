import { useState, useEffect } from 'react';

function parseTs(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Countdown tiles — DAYS / HRS / MINS.
 * Ticks every 60s normally; every 1s when under one hour.
 */
function EditorialCountdown({ scheduleMilestones }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const firstStart = (scheduleMilestones || [])
      .map((m) => parseTs(m.startTime))
      .filter(Boolean)
      .sort((a, b) => a - b)[0] || null;
    const diffMs = firstStart ? firstStart.getTime() - Date.now() : Infinity;
    const interval = diffMs < 3_600_000 ? 1000 : 60_000;
    const id = setInterval(() => setTick((n) => n + 1), interval);
    return () => clearInterval(id);
  }, [scheduleMilestones]);

  const firstMilestone = (scheduleMilestones || [])
    .map((m) => ({ ...m, _start: parseTs(m.startTime) }))
    .filter((m) => m._start)
    .sort((a, b) => a._start - b._start)[0] || null;

  const tiles = (() => {
    if (!firstMilestone) return null;
    const diffMs = firstMilestone._start.getTime() - Date.now();
    if (diffMs <= 0) return null;
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hrs = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const pad = (n) => String(n).padStart(2, '0');
    return [
      [String(days), 'Days'],
      [pad(hrs), 'Hrs'],
      [pad(mins), 'Mins'],
    ];
  })();

  if (!tiles) {
    return (
      <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4 text-center">
        <div className="text-sm font-medium text-cyan-300">
          {firstMilestone
            ? firstMilestone.title.replace(/\s+opens?$/i, ' is now open')
            : 'Loading schedule…'}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-3 gap-4 text-center">
      {tiles.map(([n, l]) => (
        <div key={l} className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] px-3 py-5">
          <div className="text-4xl font-semibold tracking-tight text-cyan-300 lg:text-5xl">
            {n}
          </div>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">{l}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Editorial two-column hero section.
 *
 * Left column: rendered via `children` — editorial content (badge, title, subtitle, CTAs, meta).
 * Right column: countdown tiles + "What matters now" hint card.
 *
 * @param {{
 *   scheduleMilestones?: any[],
 *   children: React.ReactNode,
 * }} props
 */
export default function EditorialHeroCard({ scheduleMilestones, children }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.55fr_0.75fr]" data-testid="dashboard-row1-status-card">
      {/* Left: editorial hero content */}
      <div className="rounded-[28px] border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(58,207,255,0.10),rgba(255,255,255,0.02))] p-8 shadow-[0_0_0_1px_rgba(0,255,255,0.03)]" data-testid="dashboard-hero-card">
        {children}
      </div>

      {/* Right: countdown + what matters now */}
      <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-white/45">HackDay starts in</div>
        <EditorialCountdown scheduleMilestones={scheduleMilestones} />
        <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-white/65">
          <div className="font-medium text-white">What matters now</div>
          <div className="mt-1">
            Get a pain point posted early and make your profile team-ready before registration opens.
          </div>
        </div>
      </div>
    </section>
  );
}
