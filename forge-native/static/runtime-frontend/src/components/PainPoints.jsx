/**
 * PainPoints — workshop board view.
 * Pain points are grouped into columns by inferred category,
 * sorted by vote count within each column.
 * A clusters strip surfaces high-signal groupings above the board.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { invokeEventScopedResolver } from '../lib/appModeResolverPayload';
import { inferCategoryLabel } from './shared/PainItem';
import { COLUMN_ORDER, detectClusters } from '../lib/painCategoryColours';
import BoardColumn from './painBoard/BoardColumn';
import ClustersStrip from './painBoard/ClustersStrip';

export default function PainPoints({ appModeResolverPayload, onNavigate }) {
  const [allPainPoints, setAllPainPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('reactions');
  const [searchQuery, setSearchQuery] = useState('');
  // Mobile: track which columns are collapsed (Set of category labels)
  const [collapsedColumns, setCollapsedColumns] = useState(() => new Set());

  // Composer state
  const [gripe, setGripe] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { invoke } = await import('@forge/bridge');
      const result = await invokeEventScopedResolver(
        invoke, 'getPainPoints', appModeResolverPayload,
        { sortBy: 'reactions', limit: 200, includeTeams: true }
      );
      setAllPainPoints(result?.painPoints ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [appModeResolverPayload]);

  useEffect(() => { load(); }, [load]);

  // On initial load for mobile: collapse all columns by default
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      // Collapse all after load — updated once we know categories
      setCollapsedColumns(new Set(COLUMN_ORDER));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gripe.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { invoke } = await import('@forge/bridge');
      await invokeEventScopedResolver(invoke, 'submitPainPoint', appModeResolverPayload, {
        submitterName: submitterName.trim() || 'Anonymous',
        title: gripe.trim(),
      });
      setGripe('');
      setSubmitterName('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      await load();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleReact = useCallback(async (painPointId) => {
    const { invoke } = await import('@forge/bridge');
    await invokeEventScopedResolver(invoke, 'reactToPainPoint', appModeResolverPayload, { painPointId });
  }, [appModeResolverPayload]);

  const handleToggleCollapse = useCallback((category) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // ─── Data pipeline ──────────────────────────────────────────────────────────

  // 1. Enrich each pain point with its inferred category
  const categorised = useMemo(
    () => allPainPoints.map((pp) => ({
      ...pp,
      _category: inferCategoryLabel(pp.title, pp.description),
    })),
    [allPainPoints]
  );

  // 2. Apply search filter
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return categorised;
    return categorised.filter(
      (pp) =>
        pp.title?.toLowerCase().includes(q) ||
        pp.submitterName?.toLowerCase().includes(q) ||
        pp.description?.toLowerCase().includes(q)
    );
  }, [categorised, searchQuery]);

  // 3. Group by category
  const grouped = useMemo(() => {
    const map = new Map();
    for (const pp of filtered) {
      const cat = pp._category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(pp);
    }
    return map;
  }, [filtered]);

  // 4. Active categories: those with >= 1 item, ordered by COLUMN_ORDER
  const activeCategories = useMemo(() => {
    const seen = new Set(grouped.keys());
    const ordered = COLUMN_ORDER.filter((cat) => seen.has(cat));
    // Append any categories not in COLUMN_ORDER (shouldn't happen, but just in case)
    for (const cat of seen) {
      if (!ordered.includes(cat)) ordered.push(cat);
    }
    return ordered;
  }, [grouped]);

  // 5. Cluster detection runs on unfiltered data (persists during search)
  const clusters = useMemo(() => detectClusters(allPainPoints), [allPainPoints]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="p-5"
      data-testid="painpoints-page"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">Live problem feed</div>
          <h2
            className="mt-1.5 text-3xl font-semibold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Pain Points
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/65">
            Tell us about any pain points you have at work — where's the friction? What can be improved?
          </p>
        </div>

        {/* Sort tabs */}
        <div className="flex items-center gap-2 shrink-0" role="tablist" aria-label="Feed filters">
          {[
            { key: 'reactions', label: 'Trending' },
            { key: 'newest',    label: 'Just posted' },
          ].map((f) => {
            const isActive = sortBy === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSortBy(f.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-400/12 text-cyan-200'
                    : 'border border-white/10 text-white/65 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Composer ───────────────────────────────────────────────────────── */}
      <div className="rounded-[20px] border border-white/8 bg-[rgba(10,22,40,0.85)] p-3">
        <form onSubmit={handleSubmit}>
          <textarea
            value={gripe}
            onChange={(e) => setGripe(e.target.value)}
            placeholder="What is slowing you down? A sentence is enough. Describe the friction, not the solution"
            rows={3}
            className="min-h-[80px] w-full resize-none rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-white outline-none placeholder:text-white/30"
            style={{ fontFamily: 'inherit' }}
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="Your name"
              className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
              style={{ fontFamily: 'inherit' }}
            />
            <div className="flex items-center gap-3">
              {submitted && (
                <span className="text-xs font-medium text-emerald-400">Submitted!</span>
              )}
              <button
                type="submit"
                disabled={!gripe.trim() || submitting}
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit pain point'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search pain points…"
          className="w-full rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/30"
          style={{ fontFamily: 'inherit' }}
        />
      </div>

      {/* ── Clusters strip ─────────────────────────────────────────────────── */}
      <ClustersStrip clusters={clusters} onNavigate={onNavigate} />

      {/* ── Board ──────────────────────────────────────────────────────────── */}
      <div className="mt-5">
        {loading ? (
          /* Loading: skeleton columns */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-[18px] border border-white/8 bg-white/[0.02]" />
            ))}
          </div>
        ) : activeCategories.length === 0 ? (
          /* Empty state */
          <p className="py-12 text-center text-sm text-white/40">
            {searchQuery
              ? 'No pain points match your search.'
              : 'No pain points yet — be the first to submit one!'}
          </p>
        ) : (
          /* The board — auto-fill grid wraps columns to fit available width */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {activeCategories.map((category) => (
              <BoardColumn
                key={category}
                category={category}
                painPoints={grouped.get(category) ?? []}
                sortBy={sortBy}
                onReact={handleReact}
                isCollapsed={collapsedColumns.has(category)}
                onToggleCollapse={() => handleToggleCollapse(category)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
