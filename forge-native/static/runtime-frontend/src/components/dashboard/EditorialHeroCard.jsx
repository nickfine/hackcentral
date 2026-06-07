import { useState, useEffect } from 'react';

function parseTs(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Countdown tiles - DAYS / HRS / MINS.
 * Ticks every 60s normally; every 1s when under one hour.
 * Target milestone is phase-aware: team_formation → hacking start,
 * hacking → first submission milestone, submission → last submission milestone.
 */
function EditorialCountdown({ scheduleMilestones, eventPhase }) {
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

  const targetMilestone = (() => {
    const now = new Date();
    const parsed = (scheduleMilestones || [])
      .map((m) => ({ ...m, _start: parseTs(m.startTime) }))
      .filter((m) => m._start);

    if (eventPhase === 'team_formation') {
      return parsed
        .filter((m) => m.phase === 'hacking' && m._start > now)
        .sort((a, b) => a._start - b._start)[0] || null;
    }
    if (eventPhase === 'hacking') {
      return parsed
        .filter((m) => m.phase === 'submission' && m._start > now)
        .sort((a, b) => a._start - b._start)[0] || null;
    }
    if (eventPhase === 'submission') {
      // Target the deadline — the latest future submission milestone
      return parsed
        .filter((m) => m.phase === 'submission' && m._start > now)
        .sort((a, b) => b._start - a._start)[0] || null;
    }
    // All other phases: earliest upcoming milestone
    return parsed.filter((m) => m._start > now).sort((a, b) => a._start - b._start)[0] || null;
  })();

  const tiles = (() => {
    if (!targetMilestone) return null;
    const diffMs = targetMilestone._start.getTime() - Date.now();
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
      <div className="mt-6 rounded-full border px-5 py-2.5 text-center" style={{ borderColor: 'var(--phase-active-border)', background: 'var(--phase-active-bg)' }}>
        <div className="text-sm font-semibold" style={{ color: 'var(--phase-active-text)' }}>
          {targetMilestone
            ? targetMilestone.title.replace(/\s+opens?$/i, ' is now open')
            : 'Loading schedule…'}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-3 gap-4 text-center">
      {tiles.map(([n, l], idx) => (
        <div
          key={l}
          className="relative rounded-2xl border px-3 py-5"
          style={{ borderColor: 'var(--countdown-tile-border)', background: 'var(--countdown-tile-bg)' }}
        >
          {/* Pulsing indicator on minutes tile only */}
          {idx === 2 && (
            <div
              className="absolute -top-2 -right-2 h-4 w-4 rounded-full animate-pulse dark:shadow-[0_0_8px_rgba(0,245,255,0.6)]"
              style={{ background: 'var(--accent)' }}
              aria-hidden="true"
            />
          )}
          <div
            className="text-4xl font-semibold tracking-tight lg:text-5xl"
            style={{ color: 'var(--countdown-digit-color)', filter: 'var(--countdown-label-filter)' }}
          >
            {n}
          </div>
          <div className="mt-2 text-[0.6875rem] uppercase tracking-[0.16em]" style={{ color: 'var(--countdown-label-color)' }}>{l}</div>
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
const COUNTDOWN_LABELS = {
  team_formation: 'Hacking starts in',
  hacking: 'Hacking ends in',
  submission: 'Submissions close in',
};

export default function EditorialHeroCard({ scheduleMilestones, eventPhase, children }) {
  const countdownLabel = COUNTDOWN_LABELS[eventPhase] || 'Up next';
  return (
    <section className="grid gap-6 lg:grid-cols-[1.55fr_0.75fr]" data-testid="dashboard-row1-status-card">
      {/* Left: editorial hero content */}
      <div
        className="relative rounded-[28px] border border-white/[0.08] p-8"
        style={{
          background: 'radial-gradient(circle at 80% 15%, rgba(139,92,246,0.08), transparent 45%), linear-gradient(180deg, #0a1428 0%, #070e1e 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          overflow: 'hidden'
        }}
        data-testid="dashboard-hero-card"
      >
        {children}
      </div>

      {/* Right: countdown + what matters now */}
      <div
        className="rounded-[28px] border p-8 dark:shadow-[var(--cyan-electric-glow-subtle),var(--card-inner-edge),var(--card-inner-edge-bottom),var(--card-depth-subtle)]"
        style={{ background: 'var(--hero-right-panel-bg)', borderColor: 'var(--hero-right-panel-border)' }}
      >
        <div className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--countdown-label-color)' }}>
          {countdownLabel}
        </div>
        <EditorialCountdown scheduleMilestones={scheduleMilestones} eventPhase={eventPhase} />
        <div
          className="mt-6 rounded-2xl border border-l-2 p-4 text-sm leading-relaxed"
          style={{
            borderColor: 'var(--rail-card-border)',
            borderLeftColor: 'var(--accent)',
            background: 'var(--phase-inactive-bg, var(--rail-card-bg))',
            color: 'var(--stat-meta-color)',
          }}
        >
          <div className="font-semibold" style={{ color: 'var(--stat-value-color)' }}>What matters now</div>
          <div className="mt-1">
            Get a pain point posted early and find your team before hacking starts.
          </div>
        </div>
      </div>
    </section>
  );
}
