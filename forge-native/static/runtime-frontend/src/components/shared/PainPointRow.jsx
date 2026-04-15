/**
 * PainPointRow — shared row component for displaying a single pain point.
 * Used by both the dashboard widget (PainPointsSection) and the Pains tab (Marketplace).
 */

import { useState } from 'react';

/** Human-readable labels for effort/impact estimate values. */
export const ESTIMATE_LABEL = { low: 'Low', med: 'Med', medium: 'Med', high: 'High' };

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-arena-border bg-arena-bg px-2 py-0.5 text-[10px] text-text-muted">
      {children}
    </span>
  );
}

/**
 * @param {object}   props
 * @param {object}   props.pp       - Pain point data object
 * @param {function} props.onReact  - Async callback receiving pain point _id
 */
export default function PainPointRow({ pp, onReact }) {
  const [reacting, setReacting] = useState(false);
  const [localCount, setLocalCount] = useState(pp.reactionCount);
  const [reacted, setReacted] = useState(pp.hasReacted ?? false);

  const handleReact = async () => {
    if (reacting || reacted) return;
    setReacting(true);
    setLocalCount((c) => c + 1);
    setReacted(true);
    try {
      await onReact(pp._id);
    } catch {
      setLocalCount((c) => c - 1);
      setReacted(false);
    } finally {
      setReacting(false);
    }
  };

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-arena-border bg-arena-elevated px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{pp.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-text-muted">{pp.submitterName}</span>
          {pp.effortEstimate && <Pill>Effort: {ESTIMATE_LABEL[pp.effortEstimate]}</Pill>}
          {pp.impactEstimate && <Pill>Impact: {ESTIMATE_LABEL[pp.impactEstimate]}</Pill>}
        </div>
        {pp.description && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-text-muted">{pp.description}</p>
        )}
        {pp.claimingTeams && pp.claimingTeams.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-text-muted">Claimed by:</span>
            {pp.claimingTeams.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center rounded-full bg-brand/10 border border-brand/30 px-2 py-0.5 text-[10px] text-brand"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleReact}
        disabled={reacting || reacted}
        className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition-colors disabled:cursor-not-allowed ${
          reacted
            ? 'border-brand/40 bg-brand/10 text-brand'
            : 'border-arena-border bg-arena-bg text-text-secondary hover:border-brand/40 hover:text-text-primary'
        }`}
        aria-label={reacted ? 'Already reacted' : 'React to this pain point'}
      >
        <span>🔥</span>
        <span className="tabular-nums">{localCount}</span>
      </button>
    </li>
  );
}
