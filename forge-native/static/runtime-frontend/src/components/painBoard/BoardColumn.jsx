/**
 * BoardColumn - a single category column on the Pain Points workshop board.
 * Shows a coloured header (category name + count badge + total votes),
 * then a sorted list of PainItem cards in the "board" variant.
 *
 * On mobile the column can be collapsed to just its header via
 * isCollapsed / onToggleCollapse props.
 */

import { useMemo, useState } from 'react';
import { PainItem, relativeTime } from '../shared/PainItem';
import { getCategoryColour } from '../../lib/painCategoryColours';

export default function BoardColumn({ category, painPoints, sortBy, onReact, isCollapsed, onToggleCollapse, orientation = 'vertical' }) {
  const colour = getCategoryColour(category);
  const [selectedPainPoint, setSelectedPainPoint] = useState(null);

  const sorted = useMemo(() => {
    const items = [...painPoints];
    if (sortBy === 'newest') {
      items.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
    } else {
      items.sort((a, b) => (b.reactionCount ?? 0) - (a.reactionCount ?? 0));
    }
    return items;
  }, [painPoints, sortBy]);

  const totalVotes = painPoints.reduce((sum, pp) => sum + (pp.reactionCount || 0), 0);

  return (
    <div className="flex flex-col rounded-[18px] border border-[var(--pain-column-border)] bg-[var(--pain-column-surface)] overflow-hidden">
      {/* Column header */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-arena-border dark:hover:bg-white/[0.025] lg:cursor-default"
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-text-primary truncate">{category}</span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
            style={{ color: colour.text, background: colour.bg }}
          >
            {painPoints.length}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalVotes > 0 && (
            <span className="text-xs text-arena-muted dark:text-white/35 tabular-nums">{totalVotes} votes</span>
          )}
          {/* Collapse chevron - visible on mobile only */}
          <svg
            className={`lg:hidden h-4 w-4 text-arena-muted dark:text-white/35 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Thin accent line under header */}
      <div className="h-px mx-3" style={{ background: colour.border }} />

      {/* Card list - hidden when collapsed */}
      {!isCollapsed && (
        <>
          <div className={orientation === 'horizontal'
            ? 'flex flex-row gap-3 p-2.5 overflow-x-auto'
            : 'flex flex-col gap-3 p-2.5 overflow-y-auto max-h-[65vh]'
          }>
            {sorted.length === 0 ? (
              <p className="py-6 text-center text-xs text-arena-muted dark:text-white/30">
                No {category} pains match your search
              </p>
            ) : (
              sorted.map((pp) => (
                <div key={pp._id} className={`animate-slide-up${orientation === 'horizontal' ? ' flex-shrink-0 w-[240px]' : ''}`}>
                  <PainItem
                    pp={pp}
                    onReact={onReact}
                    variant="board"
                    onReadMore={orientation === 'horizontal' ? (p) => setSelectedPainPoint((prev) => prev?._id === p._id ? null : p) : undefined}
                  />
                </div>
              ))
            )}
          </div>

          {/* Horizontal mode: full-width detail panel shown below the strip */}
          {orientation === 'horizontal' && selectedPainPoint && (() => {
            const ppColour = getCategoryColour(selectedPainPoint._category ?? category);
            return (
              <div className="mx-2.5 mb-2.5 rounded-[14px] border border-[var(--pain-column-border)] bg-[var(--pain-card-surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-arena-muted dark:text-white/35">
                    <span
                      className="rounded-full px-2 py-0.5 font-medium"
                      style={{ color: ppColour.text, background: ppColour.bg, border: `1px solid ${ppColour.border}` }}
                    >
                      {selectedPainPoint._category ?? category}
                    </span>
                    <span className="font-medium text-text-body dark:text-white/60">
                      {selectedPainPoint.submitterName || 'Anonymous'}
                    </span>
                    {selectedPainPoint._creationTime && (
                      <span>{relativeTime(selectedPainPoint._creationTime)}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPainPoint(null)}
                    className="shrink-0 text-lg leading-none text-arena-muted dark:text-white/35 hover:text-text-primary dark:hover:text-white/70 transition-colors"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <h3 className="mt-2 text-base font-semibold leading-snug text-text-primary">
                  {selectedPainPoint.title}
                </h3>
                {selectedPainPoint.description && (
                  <p className="mt-2 text-sm leading-6 text-text-body dark:text-white/50">
                    {selectedPainPoint.description}
                  </p>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
