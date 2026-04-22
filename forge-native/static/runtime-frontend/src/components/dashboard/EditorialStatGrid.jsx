import { useCountUp } from '../../hooks/useCountUp';

function StatCard({ label, value, rawValue, meta, accent, testId }) {
  const animatedNum = useCountUp(typeof rawValue === 'number' ? rawValue : 0, 900);
  const displayValue = typeof rawValue === 'number' ? animatedNum.toLocaleString() : value;

  return (
    <div
      className="rounded-[22px] border border-white/[0.07] bg-[var(--stat-card-surface)] p-5 shadow-[var(--card-inner-edge),var(--card-inner-edge-bottom),var(--card-depth-subtle)]"
      data-testid={testId}
    >
      <div className="text-[0.6875rem] uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div
        className="mt-2.5 text-4xl font-semibold tracking-tight text-white"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {displayValue}
      </div>
      {meta && <div className="mt-1.5 text-sm text-white/55">{meta}</div>}
      {accent && <div className="mt-3.5 text-sm font-medium text-cyan-300/85">{accent}</div>}
    </div>
  );
}

/**
 * Four-column editorial stat grid.
 *
 * @param {{
 *   stats: Array<{label: string, value?: string, rawValue?: number, meta?: string, accent?: string, testId?: string}>,
 * }} props
 */
export default function EditorialStatGrid({ stats }) {
  return (
    <section className="grid gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </section>
  );
}
