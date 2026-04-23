import { useState, useEffect } from 'react';

function parseTs(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Countdown tiles - DAYS / HRS / MINS.
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
        <div key={l} className="rounded-2xl border border-cyan-400/[0.20] bg-cyan-400/[0.05] px-3 py-5">
          <div
            className="text-4xl font-semibold tracking-tight text-cyan-300 lg:text-5xl"
            style={{ filter: 'drop-shadow(0 0 10px rgba(0,245,255,0.2))' }}
          >
            {n}
          </div>
          <div className="mt-2 text-[0.6875rem] uppercase tracking-[0.16em] text-white/40">{l}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Editorial two-column hero section.
 *
 * Left column: rendered via `children` - editorial content (badge, title, subtitle, CTAs, meta).
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
      <div
        className="rounded-[28px] border border-cyan-400/35 p-8 shadow-[var(--cyan-electric-glow-subtle),var(--cyan-electric-inner-edge-strong),var(--card-inner-edge-bottom),var(--hero-depth),0_0_0_1px_rgba(0,255,255,0.08)]"
        style={{ background: 'radial-gradient(circle at top left, rgba(40,210,255,0.14), transparent 40%), radial-gradient(circle at top right, rgba(106,91,255,0.08), transparent 40%), linear-gradient(180deg,#0a1526,#0a1222)' }}
        data-testid="dashboard-hero-card"
      >
        {children}
      </div>

      {/* Right: countdown + what matters now */}
      <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(0,245,255,0.03)_0%,rgba(255,255,255,0.02)_100%)] p-8 shadow-[var(--card-inner-edge),var(--card-inner-edge-bottom),var(--card-depth-subtle)]">
        <div className="text-xs uppercase tracking-[0.22em] text-white/40">HackDay starts in</div>
        <EditorialCountdown scheduleMilestones={scheduleMilestones} />
        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm leading-relaxed text-white/60">
          <div className="font-semibold text-white/95">What matters now</div>
          <div className="mt-1">
            Get a pain point posted early and make your profile team-ready before registration opens.
          </div>
        </div>
      </div>
    </section>
  );
}
