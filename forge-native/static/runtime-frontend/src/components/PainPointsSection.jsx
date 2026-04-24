/**
 * PainPointsSection - editorial "live problem feed" layout.
 * Eyebrow + heading + subtitle + Trending/Just-posted toggle + composer + pain-point cards.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { invokeEventScopedResolver } from '../lib/appModeResolverPayload';
import { PainItem } from './shared/PainItem';

// ─── Main section ─────────────────────────────────────────────────────────────

export default function PainPointsSection({ appModeResolverPayload, onNavigate }) {
  const [allPainPoints, setAllPainPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('reactions');
  const [gripe, setGripe] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { invoke } = await import('@forge/bridge');
      const result = await invokeEventScopedResolver(
        invoke, 'getPainPoints', appModeResolverPayload, { sortBy: 'reactions', limit: 20 }
      );
      setAllPainPoints(result?.painPoints ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [appModeResolverPayload]);

  useEffect(() => { load(); }, [load]);

  const painPoints = useMemo(() => {
    const sorted = [...allPainPoints].sort((a, b) => {
      if (sortBy === 'newest') return (b._creationTime || 0) - (a._creationTime || 0);
      return (b.reactionCount || 0) - (a.reactionCount || 0);
    });
    return sorted.slice(0, 6);
  }, [allPainPoints, sortBy]);

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

  const handleReact = async (painPointId) => {
    const { invoke } = await import('@forge/bridge');
    await invokeEventScopedResolver(invoke, 'reactToPainPoint', appModeResolverPayload, { painPointId });
  };

  return (
    <div
      className="rounded-[28px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(64,212,255,0.06),rgba(255,255,255,0.02))] p-6"
      data-testid="dashboard-pain-points"
    >
      {/* Section header */}
      <div className="flex flex-col gap-4 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">Top pain points</div>
          <h2
            className="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Live Pain Point Feed
            <span className="inline-flex items-center gap-1.5 align-middle" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)] animate-[live-pulse_2s_ease-in-out_infinite]" />
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-400/70" style={{ fontFamily: 'var(--font-body)' }}>Live</span>
            </span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            Tell us about any pain points you have at work - where's the friction? What can be improved?
          </p>
        </div>

        {/* Filter tabs */}
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
      <div className="mt-5 rounded-[20px] border border-white/[0.06] bg-[rgba(10,22,40,0.65)] p-4">
        <form onSubmit={handleSubmit}>
          <textarea
            value={gripe}
            onChange={(e) => setGripe(e.target.value)}
            placeholder="What is slowing you down? A sentence is enough. Describe the friction, not the solution"
            rows={3}
            className="min-h-[96px] w-full resize-none rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-white outline-none placeholder:text-white/30"
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

      {/* Friction lenses — show only when feed is empty */}
      {painPoints.length === 0 && !loading && (
        <div className="mt-6 space-y-3">
          <div className="text-xs uppercase tracking-[0.16em] text-white/40">Friction areas</div>
          <div className="flex flex-wrap gap-2">
            {[
              'Process',
              'Tools',
              'Communication',
              'Access',
              'Handoffs',
              'Duplication',
              'Waiting',
              'Ownership',
            ].map((lens) => (
              <span
                key={lens}
                className="rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs text-white/65"
              >
                {lens}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Separator — only show when feed has items */}
      {painPoints.length > 0 && (
        <div className="mt-5 flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">Recent submissions</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>
      )}

      {/* Feed */}
      <div className={`space-y-4 ${loading || painPoints.length > 0 ? 'mt-4' : 'mt-2'}`}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[24px] border border-white/8 bg-white/[0.02]" />
          ))
        ) : painPoints.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/50">
            No pain points yet. Start with real friction you have experienced at work.
          </p>
        ) : (
          painPoints.map((pp) => (
            <PainItem key={pp._id} pp={pp} onReact={handleReact} />
          ))
        )}
      </div>

      {/* See all */}
      {onNavigate && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => onNavigate('painpoints')}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5"
          >
            See all pain points
          </button>
        </div>
      )}
    </div>
  );
}
