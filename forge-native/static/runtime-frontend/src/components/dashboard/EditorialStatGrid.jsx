import { useCountUp } from '../../hooks/useCountUp';

function StatCard({ label, value, rawValue, meta, accent, testId }) {
  const animatedNum = useCountUp(typeof rawValue === 'number' ? rawValue : 0, 900);
  const displayValue = typeof rawValue === 'number' ? animatedNum.toLocaleString() : value;

  return (
    <div
      className="rounded-[22px] border border-white/8 bg-white/[0.03] p-5 shadow-[var(--card-inner-edge)]"
      data-testid={testId}
    >
      <div className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div
        className="mt-3 text-4xl font-semibold tracking-tight text-white"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {displayValue}
      </div>
      {meta && <div className="mt-1 text-sm text-white/65">{meta}</div>}
      {accent && <div className="mt-4 text-sm font-medium text-cyan-300">{accent}</div>}
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
