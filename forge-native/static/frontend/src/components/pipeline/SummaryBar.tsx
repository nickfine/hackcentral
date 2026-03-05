interface SummaryBarProps {
  entered: number;
  graduated: number;
}

function formatThroughput(entered: number, graduated: number): string {
  if (entered <= 0) return '-';
  return `${Math.round((graduated / entered) * 100)}%`;
}

export function SummaryBar({ entered, graduated }: SummaryBarProps): JSX.Element {
  return (
    <section className="pipeline-summary-bar" aria-label="Pipeline summary">
      <div>
        <h2>Pipeline</h2>
        <p>Stage-gate board from hack to product candidate.</p>
      </div>
      <div className="pipeline-summary-metrics">
        <div>
          <strong>{entered}</strong>
          <span>entered</span>
        </div>
        <div className="pipeline-summary-arrow" aria-hidden>
          <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
            <path
              d="M2 8H22M22 8L16 3M22 8L16 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <strong>{graduated}</strong>
          <span>graduated</span>
        </div>
        <span className="pipeline-throughput-pill">{formatThroughput(entered, graduated)} throughput</span>
      </div>
    </section>
  );
}
