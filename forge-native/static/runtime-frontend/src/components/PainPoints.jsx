/**
 * PainPoints — full-page pain point feed.
 * Uses the same editorial dark/cyan styling as the dashboard PainPointsSection widget,
 * but shows all pain points with search and pagination.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { invokeEventScopedResolver } from '../lib/appModeResolverPayload';
import { PainItem } from './shared/PainItem';

const PAGE_SIZE = 10;

export default function PainPoints({ appModeResolverPayload }) {
  const [allPainPoints, setAllPainPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('reactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

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
        { sortBy, limit: 200, includeTeams: true }
      );
      setAllPainPoints(result?.painPoints ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [appModeResolverPayload, sortBy]);

  useEffect(() => { load(); }, [load]);

  // Reset visible count when search or sort changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchQuery, sortBy]);

  const filteredPainPoints = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return allPainPoints;
    return allPainPoints.filter(
      (pp) =>
        pp.title?.toLowerCase().includes(q) ||
        pp.submitterName?.toLowerCase().includes(q) ||
        pp.description?.toLowerCase().includes(q)
    );
  }, [allPainPoints, searchQuery]);

  const visiblePainPoints = filteredPainPoints.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPainPoints.length;

  // Infinite scroll — reveal more items when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) {
          setVisibleCount((n) => n + PAGE_SIZE);
        }
      },
      { rootMargin: '120px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

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

  return (
    <div
      className="rounded-[28px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(64,212,255,0.06),rgba(255,255,255,0.02))] p-6"
      data-testid="painpoints-page"
    >
      {/* Page header */}
      <div className="flex flex-col gap-4 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">Live problem feed</div>
          <h2
            className="mt-2 text-3xl font-semibold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Pain Points
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            Tell us about any pain points you have at work — where's the friction? What can be improved?
          </p>
        </div>

        {/* Sort tabs */}
        <div className="flex items-center gap-2" role="tablist" aria-label="Feed filters">
          {[
            { key: 'reactions', label: 'Trending' },
            { key: 'newest', label: 'Just posted' },
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

      {/* Composer */}
      <div className="mt-5 rounded-[24px] border border-white/8 bg-[rgba(10,22,40,0.85)] p-4 shadow-[var(--cyan-electric-inner-edge)]">
        <form onSubmit={handleSubmit}>
          <textarea
            value={gripe}
            onChange={(e) => setGripe(e.target.value)}
            placeholder="What is slowing you down? A sentence is enough. Describe the friction, not the solution"
            rows={4}
            className="min-h-[120px] w-full resize-none rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-white outline-none placeholder:text-white/30"
            style={{ fontFamily: 'inherit' }}
          />
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              type="text"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="Your name"
              className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
              style={{ fontFamily: 'inherit' }}
            />
            <div className="flex items-center gap-3">
              {submitted && (
                <span className="text-xs font-medium text-emerald-400">Submitted!</span>
              )}
              <button
                type="submit"
                disabled={!gripe.trim() || submitting}
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit pain point'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Search bar */}
      <div className="mt-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search pain points…"
          className="w-full rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/30"
          style={{ fontFamily: 'inherit' }}
        />
      </div>

      {/* Feed */}
      <div className="mt-5 space-y-4">
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[24px] border border-white/8 bg-white/[0.02]" />
          ))
        ) : visiblePainPoints.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/45">
            {searchQuery ? 'No pain points match your search.' : 'No pain points yet — be the first to submit one!'}
          </p>
        ) : (
          visiblePainPoints.map((pp) => (
            <PainItem key={pp._id} pp={pp} onReact={handleReact} />
          ))
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="mt-4 flex justify-center">
        {hasMore && (
          <div className="flex items-center gap-2 py-4 text-sm text-white/35">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />
            Loading more…
          </div>
        )}
        {!loading && !hasMore && filteredPainPoints.length > PAGE_SIZE && (
          <p className="py-4 text-xs text-white/25">All {filteredPainPoints.length} pain points loaded</p>
        )}
      </div>
    </div>
  );
}
