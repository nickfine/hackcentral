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
    <div className="rounded-[26px] border p-6 shadow-[var(--card-inner-edge),var(--card-depth-subtle)]" style={{ background: 'var(--rail-card-bg)', borderColor: 'var(--rail-card-border)' }}>
      <div className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--stat-label-color)' }}>Upcoming schedule</div>
      <div className="mt-5 space-y-4">
        {comingUpMilestones.length > 0 ? (
          comingUpMilestones.map((milestone, index) => (
            <div
              key={milestone.id}
              data-testid="dashboard-coming-up-item"
              className="flex items-start justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0"
              style={{ borderColor: 'var(--rail-card-border)' }}
            >
              <div
                className="text-sm font-medium"
                style={{
                  color: milestone.isNow && index === 0 ? 'var(--stat-accent-color)' : 'var(--stat-label-color)',
                  fontWeight: milestone.isNow && index === 0 ? 600 : 500,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatScheduleTime(milestone, index === 0)}
              </div>
              <div className="flex-1 text-sm" style={{ color: 'var(--stat-value-color)' }}>{milestone.title}</div>
            </div>
          ))
        ) : (
          <p className="py-3 text-sm" style={{ color: 'var(--stat-label-color)' }}>No upcoming milestones</p>
        )}
      </div>
      <button
        type="button"
        data-testid="dashboard-view-full-schedule"
        onClick={() => onNavigate?.('schedule')}
        className="mt-5 text-sm font-medium transition-colors"
        style={{ color: 'var(--stat-accent-color)' }}
      >
        View full schedule
      </button>
    </div>
  );
}

// ─── New here card ────────────────────────────────────────────────────────────

export function NewHereCard({ onNavigate }) {
  return (
    <div className="rounded-[26px] border p-6 shadow-[var(--card-inner-edge),var(--card-depth-subtle)]" style={{ background: 'var(--rail-card-bg)', borderColor: 'var(--rail-card-border)' }}>
      <div className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--stat-label-color)' }}>Everyone Vibing Together</div>
      <h3
        className="mt-3 text-2xl font-semibold tracking-tight"
        style={{ color: 'var(--stat-value-color)', fontFamily: 'var(--font-heading)' }}
      >
        New to HackDay?
      </h3>
      <p className="mt-2 text-sm" style={{ color: 'var(--stat-meta-color)' }}>Build something together with your colleagues</p>
      <ul className="mt-4 space-y-1.5">
        {[
          'Bring your work problem',
          'Bring your awkward question',
          'Bring your user pain',
          'Bring your eye for what feels wrong',
          'Bring your patience to test what others make',
        ].map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm" style={{ color: 'var(--stat-meta-color)' }}>
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} />
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--stat-meta-color)' }}>
        The barrier to joining in and building with others is lower than you think. Even if you
        do not want to code, you still have plenty to contribute.
      </p>
      <ul className="mt-4 space-y-1 text-sm font-medium" style={{ color: 'var(--stat-value-color)' }}>
        {['Describe it', 'Shape it', 'Build it together', 'Vibe together'].map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onNavigate?.('painpoints')}
          className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors"
          style={{ background: 'var(--phase-active-bg)', borderColor: 'var(--phase-active-border)', color: 'var(--stat-accent-color)' }}
        >
          Post a pain point
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('signup')}
          className="w-full rounded-2xl border px-4 py-3 text-sm font-medium transition-colors"
          style={{ borderColor: 'var(--rail-card-border)', color: 'var(--stat-label-color)' }}
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
      className="rounded-[26px] border p-6"
      style={{ background: 'var(--rail-card-bg)', borderColor: 'var(--phase-active-border)' }}
      data-testid="dashboard-row2-readiness"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--stat-label-color)' }}>Your readiness</div>
          <div className="mt-2 text-2xl font-semibold" style={{ color: 'var(--stat-value-color)' }}>{readinessProgressPercent}%</div>
        </div>
        <div className="text-sm font-medium" style={{ color: 'var(--stat-accent-color)' }}>{statusLabel}</div>
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
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200'
                  : ''
              }`}
              style={!isGreen ? { background: 'var(--phase-inactive-bg, var(--countdown-tile-bg))', color: 'var(--stat-label-color)' } : undefined}
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
        style={{ background: 'var(--readiness-track-bg)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          data-testid="dashboard-readiness-progress-fill"
          style={{
            width: `${readinessProgressPercent}%`,
            background: 'linear-gradient(90deg, var(--accent), #10b981)',
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => onNavigate?.(nextBestAction.route, nextBestAction.params)}
        aria-label={`Next action: ${nextBestAction.label}`}
        className="mt-5 w-full rounded-2xl border px-4 py-3.5 text-sm font-medium transition-all"
        style={{ borderColor: 'var(--phase-active-border)', color: 'var(--stat-accent-color)' }}
      >
        Complete next step
      </button>
    </div>
  );
}

// ─── HackDay Central promo card ───────────────────────────────────────────────

const HDC_URL = 'https://tag-hackday.atlassian.net/wiki/apps/22696465-0692-48af-9741-323e1cfc2631/1c797890-3b54-448e-85da-4ecbe9e9e777/hackday-central';

function HackDayCentralCard() {
  const handleOpen = async () => {
    try {
      const { router } = await import('@forge/bridge');
      router.open(HDC_URL);
    } catch {
      window.open(HDC_URL, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="rounded-[26px] border p-6 shadow-[var(--card-inner-edge),var(--card-depth-subtle)]"
      style={{ background: 'var(--rail-card-bg)', borderColor: 'var(--rail-card-border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-subtle)' }}
        >
          Preview
        </span>
      </div>
      <h3
        className="text-lg font-semibold tracking-tight"
        style={{ color: 'var(--stat-value-color)', fontFamily: 'var(--font-heading)' }}
      >
        HackDay Central
      </h3>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--stat-meta-color)' }}>
        Where HackDay outputs live all year round. A shared space to capture innovation, surface tooling, and build on the work that started here.
      </p>
      <button
        type="button"
        onClick={handleOpen}
        className="mt-4 text-sm font-medium transition-colors"
        style={{ color: 'var(--stat-accent-color)' }}
      >
        Open HackDay Central →
      </button>
      <p className="mt-3 text-xs" style={{ color: 'var(--stat-label-color)' }}>
        This is a preview concept and is work in progress. Please feedback to Nick.
      </p>
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
      <HackDayCentralCard />
    </div>
  );
}
