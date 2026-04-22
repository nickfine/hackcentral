/**
 * PainPointsSection — editorial "live problem feed" layout.
 * Eyebrow + heading + subtitle + Trending/Just-posted toggle + composer + pain-point cards.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { invokeEventScopedResolver } from '../lib/appModeResolverPayload';

// ─── helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const PAIN_CATEGORIES = [
  { label: 'UX',        keywords: ['ux', 'user', 'ui', 'interface', 'design', 'click', 'button', 'confusing', 'flow', 'navigation'] },
  { label: 'Process',   keywords: ['process', 'workflow', 'approval', 'review', 'meeting', 'manual', 'ticket', 'sprint', 'jira', 'blocker'] },
  { label: 'Tech Debt', keywords: ['tech debt', 'legacy', 'old', 'deprecated', 'refactor', 'hack', 'workaround', 'dirty', 'spaghetti'] },
  { label: 'Infra',     keywords: ['infra', 'server', 'deploy', 'ci', 'cd', 'pipeline', 'build', 'crash', 'down', 'scaling', 'cloud'] },
  { label: 'Customer',  keywords: ['customer', 'client', 'churn', 'complaint', 'feedback', 'satisfaction', 'onboard', 'support'] },
  { label: 'Tooling',   keywords: ['tool', 'tooling', 'script', 'automation', 'ide', 'editor', 'dev tool', 'local', 'dx'] },
  { label: 'Eng',       keywords: [] },
];

function inferCategoryLabel(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  for (const cat of PAIN_CATEGORIES) {
    if (cat.keywords.some((kw) => text.includes(kw))) return cat.label;
  }
  // Deterministic fallback via hash
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return PAIN_CATEGORIES[h % PAIN_CATEGORIES.length].label;
}

// ─── UpvoteButton ─────────────────────────────────────────────────────────────

function UpvoteButton({ count, voted, onVote, disabled }) {
  return (
    <button
      type="button"
      onClick={onVote}
      disabled={disabled}
      aria-label={`Upvote — ${count} votes`}
      className="flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] px-2 py-3 text-cyan-300 transition-colors hover:bg-cyan-400/10 disabled:cursor-not-allowed"
      style={{
        borderColor: voted ? 'rgba(34,211,238,0.45)' : undefined,
        background: voted ? 'rgba(34,211,238,0.12)' : undefined,
      }}
    >
      <div className="text-2xl font-semibold leading-none">{count}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">Up</div>
    </button>
  );
}

// ─── PainItem ─────────────────────────────────────────────────────────────────

function PainItem({ pp, onReact }) {
  const [reacting, setReacting] = useState(false);
  const [localCount, setLocalCount] = useState(pp.reactionCount || 0);
  const [reacted, setReacted] = useState(pp.hasReacted ?? false);

  const handleVote = async () => {
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

  const tagLabel = inferCategoryLabel(pp.title, pp.description);
  const timeAgo = pp._creationTime ? relativeTime(pp._creationTime) : '';
  const authorName = pp.submitterName || 'Anonymous';

  return (
    <article className="flex gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 transition hover:border-cyan-400/20 hover:bg-white/[0.045]">
      <UpvoteButton
        count={localCount}
        voted={reacted}
        onVote={handleVote}
        disabled={reacting || reacted}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
          <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 font-medium text-cyan-200">
            {tagLabel}
          </span>
          <span className="font-medium text-white/75">{authorName}</span>
          {timeAgo && <span>{timeAgo}</span>}
        </div>
        <h3 className="mt-2 text-lg font-medium text-white">{pp.title}</h3>
        {pp.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/60">{pp.description}</p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="text-sm text-white/55 transition-colors hover:text-white"
          >
            Reply
          </button>
          <button
            type="button"
            className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/5"
          >
            Open
          </button>
        </div>
      </div>
    </article>
  );
}

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
      <div className="flex flex-col gap-4 border-b border-white/8 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">Top pain points</div>
          <h2
            className="mt-2 text-3xl font-semibold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Live Pain Point Feed
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            Tell us about any pain points you have at work — where's the friction? What can be improved?
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
      <div className="mt-5 rounded-[24px] border border-white/8 bg-[#0a1628] p-4">
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

      {/* Feed */}
      <div className="mt-5 space-y-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[24px] border border-white/8 bg-white/[0.02]" />
          ))
        ) : painPoints.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/45">
            No pain points yet — be the first to submit one!
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
            onClick={() => onNavigate('marketplace', { tab: 'pains' })}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5"
          >
            See all pain points
          </button>
        </div>
      )}
    </div>
  );
}
