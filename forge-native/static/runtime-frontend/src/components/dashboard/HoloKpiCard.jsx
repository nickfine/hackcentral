import { useCountUp } from '../../hooks/useCountUp';
import HoloPanel from './HoloPanel';

/**
 * Holographic KPI stat card with animated count-up and a large outlined icon.
 *
 * @param {{
 *   label: string,
 *   value?: string,
 *   rawValue?: number,
 *   trend?: string,
 *   meta?: string,
 *   icon?: React.ElementType,
 *   accent?: boolean,
 *   progressPercent?: number,
 *   testId?: string,
 *   className?: string,
 * }} props
 */
export default function HoloKpiCard({
  label,
  value,
  rawValue,
  trend,
  meta,
  icon: Icon,
  accent = false,
  progressPercent,
  testId,
  className = '',
}) {
  const animatedNum = useCountUp(typeof rawValue === 'number' ? rawValue : 0, 900);
  const displayValue = typeof rawValue === 'number' ? animatedNum.toLocaleString() : value;

  return (
    <HoloPanel
      hoverable
      className={`relative overflow-hidden ${accent ? 'holo-accent-left' : ''} ${className}`}
      style={{ padding: '14px 16px' }}
      data-testid={testId}
    >
      {/* Content */}
      <div className="flex items-start justify-between gap-2 min-h-0">
        <div className="flex flex-col gap-0 min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
          >
            {label}
          </p>
          <p
            className="text-2xl font-bold leading-none tracking-tight text-text-primary"
            style={{ marginTop: 4, fontVariantNumeric: 'tabular-nums' }}
          >
            {displayValue}
          </p>
          {trend && (
            <p className="text-xs font-medium" style={{ marginTop: 3, color: '#22c55e' }}>
              {trend}
            </p>
          )}
          {meta && (
            <p className="text-xs text-text-muted" style={{ marginTop: trend ? 2 : 4 }}>
              {meta}
            </p>
          )}
        </div>

        {/* Large outlined icon */}
        {Icon && (
          <div
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              border: '1px solid color-mix(in srgb, var(--accent) 20%, var(--border-default))',
              background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
              color: 'var(--accent)',
              opacity: 0.7,
            }}
          >
            <Icon size={20} strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Progress bar — shown when accent + progressPercent provided */}
      {accent && progressPercent != null && (
        <div style={{ marginTop: 10 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span className="text-[10px] text-text-muted">Progress</span>
            <span
              className="text-[10px] font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              {progressPercent}%
            </span>
          </div>
          <div
            className="h-1 overflow-hidden rounded-full"
            style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--border-default))' }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${progressPercent}%`, background: 'var(--accent)' }}
            />
          </div>
        </div>
      )}
    </HoloPanel>
  );
}
