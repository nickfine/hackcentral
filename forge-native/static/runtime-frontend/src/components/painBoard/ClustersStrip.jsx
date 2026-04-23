/**
 * ClustersStrip - horizontal row of cluster cards shown above the board.
 * A cluster is 3+ pain points in the same category with >= 8 total votes.
 * Hidden entirely when no clusters qualify.
 */

import { getCategoryColour } from '../../lib/painCategoryColours';

export default function ClustersStrip({ clusters, onNavigate }) {
  if (!clusters?.length) return null;

  return (
    <div className="mt-5">
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
        Clusters forming
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {clusters.map((cluster) => {
          const colour = getCategoryColour(cluster.category);
          return (
            <div
              key={cluster.category}
              className="flex shrink-0 flex-col gap-2 rounded-[14px] border border-white/8 bg-white/[0.03] p-3 min-w-[180px] max-w-[220px]"
              style={{ borderLeftColor: colour.border, borderLeftWidth: '2px' }}
            >
              <div className="text-sm font-semibold text-white truncate">
                {cluster.category} pains
              </div>
              <div className="flex items-center gap-2 text-xs text-white/45">
                <span>{cluster.count} related pains</span>
                <span className="text-white/20">·</span>
                <span style={{ color: colour.text }}>{cluster.totalVotes} votes</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('marketplace')}
                className="mt-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                style={{ background: colour.bg, color: colour.text, border: `1px solid ${colour.border}` }}
              >
                Start a team
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
