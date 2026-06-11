import { useCountUp } from '../../hooks/useCountUp';

function StatCard({ label, value, rawValue, meta, accent, href, footer, testId }) {
  const animatedNum = useCountUp(typeof rawValue === 'number' ? rawValue : 0, 900);
  const displayValue = typeof rawValue === 'number' ? animatedNum.toLocaleString() : value;

  const card = (
    <div
      className={`rounded-[22px] bg-[var(--stat-card-bg)] p-5 transition-all duration-200${
        href
          ? ' border-2 shadow-[var(--card-inner-edge),var(--card-inner-edge-bottom),0_6px_24px_rgba(249,115,22,0.28)]'
          : ' border shadow-[var(--card-inner-edge),var(--card-inner-edge-bottom),var(--card-depth-subtle)] hover:border-[var(--accent)]'
      }`}
      style={{ borderColor: href ? 'var(--accent)' : 'var(--stat-card-border)' }}
      data-testid={testId}
    >
      <div className="text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--stat-label-color)]">{label}</div>
      <div
        className="mt-2.5 text-4xl font-semibold tracking-tight text-[var(--stat-value-color)]"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {displayValue}
      </div>
      {meta && <div className="mt-1.5 text-sm text-[var(--stat-meta-color)]">{meta}</div>}
      {accent && <div className="mt-3.5 text-sm font-medium text-[var(--stat-accent-color)]">{accent}</div>}
      {footer && <div className="mt-3.5 border-t pt-3" style={{ borderColor: 'var(--stat-card-border)' }}>{footer}</div>}
    </div>
  );

  if (href) {
    return (
      <button
        type="button"
        className="block w-full text-left cursor-pointer"
        onClick={async () => {
          const { router } = await import('@forge/bridge');
          router.open(href);
        }}
      >
        {card}
      </button>
    );
  }

  return card;
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
