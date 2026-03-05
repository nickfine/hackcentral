interface ConversionArrowProps {
  rate: number | null;
}

function formatRate(rate: number | null): string {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return '-';
  return `${Math.max(0, Math.round(rate))}%`;
}

export function ConversionArrow({ rate }: ConversionArrowProps): JSX.Element {
  const isActive = typeof rate === 'number' && Number.isFinite(rate) && rate > 0;

  return (
    <div className={`pipeline-conversion-arrow ${isActive ? 'is-active' : 'is-muted'}`} aria-hidden>
      <svg className="pipeline-conversion-arrow-horizontal" width="40" height="24" viewBox="0 0 40 24" fill="none">
        <path
          d="M4 12H32M32 12L24 5M32 12L24 19"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg className="pipeline-conversion-arrow-vertical" width="24" height="32" viewBox="0 0 24 32" fill="none">
        <path
          d="M12 4V26M12 26L6 20M12 26L18 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="pipeline-conversion-rate">{formatRate(rate)}</span>
    </div>
  );
}
