import { useCountUp } from '../../hooks/useCountUp';

function StatCard({ label, value, rawValue, meta, accent, testId }) {
  const animatedNum = useCountUp(typeof rawValue === 'number' ? rawValue : 0, 900);
  const displayValue = typeof rawValue === 'number' ? animatedNum.toLocaleString() : value;

  return (
    <div
      className="rounded-[22px] border border-white/[0.10] bg-[var(--stat-card-gradient)] p-5 shadow-[var(--card-inner-edge),var(--card-inner-edge-bottom),var(--card-depth-subtle),0_2px_6px_rgba(0,0,0,0.25)] transition-all duration-200 hover:border-cyan-400/20 hover:shadow-[var(--card-inner-edge),var(--card-inner-edge-bottom),var(--card-depth-subtle),0_2px_6px_rgba(0,0,0,0.25),0_0_12px_rgba(0,245,255,0.08)]"
      data-testid={testId}
    >
      <div className="text-[0.6875rem] uppercase tracking-[0.16em] text-white/50">{label}</div>
      <div
        className="mt-2.5 text-4xl font-semibold tracking-tight text-white"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {displayValue}
      </div>
      {meta && <div className="mt-1.5 text-sm text-white/55">{meta}</div>}
      {accent && <div className="mt-3.5 text-sm font-medium text-cyan-300">{accent}</div>}
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
