import type { SummaryStats } from '../../types';

export interface StatCardsProps {
  summary: SummaryStats;
}

const METRIC_ITEMS: Array<{ key: string; label: string; icon: string; getValue: (s: SummaryStats) => number }> = [
  { key: 'totalHacks', label: 'Total Hacks', icon: '⚡', getValue: (s) => s.totalHacks },
  { key: 'featuredHacks', label: 'Featured Hacks', icon: '⭐', getValue: (s) => s.featuredHacks },
  { key: 'inProgress', label: 'In Progress', icon: '🔄', getValue: (s) => s.inProgressProjects },
  { key: 'completed', label: 'Completed Projects', icon: '✅', getValue: (s) => s.completedProjects },
  { key: 'people', label: 'People', icon: '👥', getValue: (s) => s.totalPeople },
  { key: 'mentors', label: 'Active Mentors', icon: '🎓', getValue: (s) => s.activeMentors },
];

/**
 * StatCards — metric cards for dashboard (icon + label, large number).
 * ECD: 3-column grid, icon-first, bigger number typography.
 */
export function StatCards({ summary }: StatCardsProps): JSX.Element {
  return (
    <section className="grid metric-grid dashboard-metric-grid" aria-label="Summary metrics">
      {METRIC_ITEMS.map(({ key, label, icon, getValue }) => (
        <article key={key} className="card metric-tile dashboard-metric-card">
          <div className="metric-tile-head dashboard-metric-head">
            <span className="metric-icon" aria-hidden>{icon}</span>
            <h3 className="dashboard-metric-label">{label}</h3>
          </div>
          <p className="metric-value dashboard-metric-value">{getValue(summary)}</p>
        </article>
      ))}
    </section>
  );
}
