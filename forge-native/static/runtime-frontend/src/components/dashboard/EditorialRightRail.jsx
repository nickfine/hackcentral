/**
 * EditorialRightRail - three stacked cards:
 *   1. Upcoming schedule
 *   2. New here? (early phases only)
 *   3. Your readiness
 */

function parseTs(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatRelativeCompact(startTime) {
  const target = parseTs(startTime);
  if (!target) return '-';
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return 'Now';
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) {
    const mins = totalMins % 60;
    return `${hours}h ${mins}m`;
  }
  return `${totalMins}m`;
}

function formatScheduleTime(milestone, isFirst) {
  if (milestone.isNow && isFirst) return 'NOW';
  return formatRelativeCompact(milestone.startTime);
}

// ─── Schedule card ────────────────────────────────────────────────────────────

function ScheduleCard({ comingUpMilestones, onNavigate }) {
  return (
    <div className="rounded-[26px] border border-white/[0.07] bg-white/[0.03] p-6 shadow-[var(--card-inner-edge),var(--card-depth-subtle)]">
      <div className="text-xs uppercase tracking-[0.16em] text-white/40">Upcoming schedule</div>
      <div className="mt-5 space-y-4">
        {comingUpMilestones.length > 0 ? (
          comingUpMilestones.map((milestone, index) => (
            <div
              key={milestone.id}
              data-testid="dashboard-coming-up-item"
              className="flex items-start justify-between gap-4 border-b border-white/[0.05] pb-4 last:border-b-0 last:pb-0"
            >
              <div
                className={`text-sm font-medium ${milestone.isNow && index === 0 ? 'text-cyan-300 font-semibold' : 'text-white/50'}`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatScheduleTime(milestone, index === 0)}
              </div>
              <div className="flex-1 text-sm text-white/80">{milestone.title}</div>
            </div>
          ))
        ) : (
          <p className="py-3 text-sm text-white/45">No upcoming milestones</p>
        )}
      </div>
      <button
        type="button"
        data-testid="dashboard-view-full-schedule"
        onClick={() => onNavigate?.('schedule')}
        className="mt-5 text-sm font-medium text-cyan-300/80 hover:text-cyan-200 transition-colors"
      >
        View full schedule
      </button>
    </div>
  );
}

// ─── New here card ────────────────────────────────────────────────────────────

export function NewHereCard({ onNavigate }) {
  return (
    <div className="rounded-[26px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(0,245,255,0.03)_0%,rgba(255,255,255,0.02)_100%)] p-6 shadow-[var(--card-inner-edge),var(--card-depth-subtle)]">
      <div className="text-xs uppercase tracking-[0.16em] text-white/40">Everyone Vibing Together</div>
      <h3
        className="mt-3 text-2xl font-semibold tracking-tight text-white/95"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        New to HackDay?
      </h3>
      <p className="mt-2 text-sm text-white/55">Build something together with your colleagues</p>
      <ul className="mt-4 space-y-1.5">
        {[
          'Bring your work problem',
          'Bring your awkward question',
          'Bring your user pain',
          'Bring your eye for what feels wrong',
          'Bring your patience to test what others make',
        ].map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm text-white/65">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-400/60" />
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-white/55">
        The barrier to joining in and building with others is lower than you think. Even if you
        do not want to code, you still have plenty to contribute.
      </p>
      <ul className="mt-4 space-y-1 text-sm font-medium text-white/75">
        {['Describe it', 'Shape it', 'Build it together', 'Vibe together'].map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onNavigate?.('painpoints')}
          className="w-full rounded-2xl bg-cyan-400/10 border border-cyan-400/25 px-4 py-3 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/20 hover:border-cyan-400/40"
        >
          Post a pain point
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('signup')}
          className="w-full rounded-2xl border border-white/[0.08] px-4 py-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white/80"
        >
          Take the 2-minute tour
        </button>
      </div>
    </div>
  );
}

// ─── Readiness card ───────────────────────────────────────────────────────────

function ReadinessCard({ readinessItems, readinessProgressPercent, nextBestAction, onNavigate }) {
  const readinessCompleteCount = readinessItems.filter((item) => item.tone === 'green').length;
  const statusLabel = readinessCompleteCount === readinessItems.length ? 'All set' : 'On track';

  return (
    <div
      className="rounded-[26px] border border-cyan-400/[0.22] bg-[linear-gradient(180deg,rgba(64,212,255,0.06)_0%,rgba(255,255,255,0.02)_70%,rgba(64,212,255,0.02)_100%)] p-6 shadow-[var(--cyan-electric-glow-subtle),var(--cyan-electric-inner-edge),var(--card-inner-edge-bottom)]"
      data-testid="dashboard-row2-readiness"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Your readiness</div>
          <div className="mt-2 text-2xl font-semibold text-white">{readinessProgressPercent}%</div>
        </div>
        <div className="text-sm font-medium text-cyan-300">{statusLabel}</div>
      </div>

      <div className="mt-5 space-y-3">
        {readinessItems.map((item) => {
          const isGreen = item.tone === 'green';
          return (
            <div
              key={item.id}
              data-testid={item.testId}
              title={item.detail}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                isGreen
                  ? 'bg-emerald-400/10 text-emerald-200'
                  : 'bg-white/[0.03] text-white/70'
              }`}
            >
              <span className="text-sm font-medium">{item.pillLabel}</span>
              <span className="text-sm">{item.value}</span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-5 h-2 overflow-hidden rounded-full"
        data-testid="dashboard-readiness-progress"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-[width] duration-300"
          data-testid="dashboard-readiness-progress-fill"
          style={{ width: `${readinessProgressPercent}%`, boxShadow: '0 0 8px rgba(0,245,255,0.2)' }}
        />
      </div>

      <button
        type="button"
        onClick={() => onNavigate?.(nextBestAction.route, nextBestAction.params)}
        aria-label={`Next action: ${nextBestAction.label}`}
        className="mt-5 w-full rounded-2xl border border-cyan-400/[0.25] px-4 py-3.5 text-sm font-medium text-cyan-200/90 transition-all hover:bg-cyan-400/[0.08] hover:border-cyan-400/35 hover:shadow-[0_0_16px_rgba(0,245,255,0.12)]"
      >
        Complete next step
      </button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {{
 *   comingUpMilestones: any[],
 *   onNavigate: Function,
 *   readinessItems: any[],
 *   readinessProgressPercent: number,
 *   nextBestAction: { label: string, route: string, params: object },
 *   isEarlyExecutionPhase: boolean,
 * }} props
 */
export default function EditorialRightRail({
  comingUpMilestones,
  onNavigate,
  readinessItems,
  readinessProgressPercent,
  nextBestAction,
  isEarlyExecutionPhase,
}) {
  return (
    <div className="space-y-6">
      <ReadinessCard
        readinessItems={readinessItems}
        readinessProgressPercent={readinessProgressPercent}
        nextBestAction={nextBestAction}
        onNavigate={onNavigate}
      />
      <ScheduleCard comingUpMilestones={comingUpMilestones} onNavigate={onNavigate} />
      {isEarlyExecutionPhase && <NewHereCard onNavigate={onNavigate} />}
    </div>
  );
}
