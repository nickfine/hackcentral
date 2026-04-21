/**
 * PainPointsSection — composer + filter row + pain-point feed.
 * Matches the HackDay Dashboard Wireframe "Mission Control" layout:
 *   1. Composer card (teal left-border, textarea, chip toggles, submit)
 *   2. Filter chip row
 *   3. Feed card with upvote-style pain-point rows
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

const AVATAR_COLORS = [
  'hsl(215, 40%, 45%)',
  'hsl(30, 20%, 50%)',
  'hsl(350, 35%, 50%)',
  'hsl(150, 30%, 45%)',
  'hsl(40, 40%, 48%)',
];

function avatarColor(name) {
  const s = String(name || '').trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// QUICK WIN 2 — Category pill system ─────────────────────────────────────────

const PAIN_CATEGORIES = [
  { label: 'UX',        bg: 'rgba(20,184,166,0.14)',  border: 'rgba(20,184,166,0.35)',  color: '#14b8a6', keywords: ['ux', 'user', 'ui', 'interface', 'design', 'click', 'button', 'confusing', 'flow', 'navigation'] },
  { label: 'Process',   bg: 'rgba(139,92,246,0.14)',  border: 'rgba(139,92,246,0.35)',  color: '#a78bfa', keywords: ['process', 'workflow', 'approval', 'review', 'meeting', 'manual', 'ticket', 'sprint', 'jira', 'blocker'] },
  { label: 'Tech Debt', bg: 'rgba(249,115,22,0.14)',  border: 'rgba(249,115,22,0.35)',  color: '#fb923c', keywords: ['tech debt', 'legacy', 'old', 'deprecated', 'refactor', 'hack', 'workaround', 'dirty', 'spaghetti'] },
  { label: 'Infra',     bg: 'rgba(56,189,248,0.14)',  border: 'rgba(56,189,248,0.35)',  color: '#38bdf8', keywords: ['infra', 'server', 'deploy', 'ci', 'cd', 'pipeline', 'build', 'crash', 'down', 'scaling', 'cloud'] },
  { label: 'Customer',  bg: 'rgba(236,72,153,0.14)',  border: 'rgba(236,72,153,0.35)',  color: '#f472b6', keywords: ['customer', 'client', 'churn', 'complaint', 'feedback', 'satisfaction', 'onboard', 'support'] },
  { label: 'Tooling',   bg: 'rgba(245,158,11,0.14)',  border: 'rgba(245,158,11,0.35)',  color: '#fbbf24', keywords: ['tool', 'tooling', 'script', 'automation', 'ide', 'editor', 'dev tool', 'local', 'dx'] },
];

function inferCategory(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  for (const cat of PAIN_CATEGORIES) {
    if (cat.keywords.some((kw) => text.includes(kw))) return cat;
  }
  // Deterministic fallback via hash
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return PAIN_CATEGORIES[h % PAIN_CATEGORIES.length];
}

// QUICK WIN 2 — Enhanced upvote button with bounce animation ──────────────────

function UpvoteButton({ count, voted, onVote, disabled, justVoted }) {
  return (
    <button
      type="button"
      onClick={onVote}
      disabled={disabled}
      aria-label={`Upvote — ${count} votes`}
      className={`flex flex-col items-center justify-start rounded-lg border transition-colors ${justVoted ? 'upvote-pop' : ''}`}
      style={{
        width: 52,
        padding: '8px 6px',
        borderColor: voted ? 'var(--accent)' : 'var(--border-default)',
        background: voted
          ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
          : 'var(--surface-card)',
        color: voted ? 'var(--accent)' : 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: voted ? '0 0 10px rgba(45,212,191,0.18)' : 'none',
      }}
    >
      {/* Larger arrow for better affordance */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill={voted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      <span
        className="font-bold leading-none"
        style={{
          marginTop: 3,
          fontSize: 15,
          fontVariantNumeric: 'tabular-nums',
          color: voted ? 'var(--accent)' : 'var(--text-primary)',
        }}
      >
        {count}
      </span>
      <span
        className="uppercase leading-none"
        style={{ fontSize: 9, letterSpacing: '0.1em', marginTop: 2, color: voted ? 'var(--accent)' : 'var(--text-muted)' }}
      >
        Up
      </span>
    </button>
  );
}

// QUICK WIN 2 — Enhanced PainItem with category pill, hot badge, reply count ──

function PainItem({ pp, onReact }) {
  const [reacting, setReacting] = useState(false);
  const [localCount, setLocalCount] = useState(pp.reactionCount || 0);
  const [reacted, setReacted] = useState(pp.hasReacted ?? false);
  const [justVoted, setJustVoted] = useState(false);

  const handleVote = async () => {
    if (reacting || reacted) return;
    setReacting(true);
    setJustVoted(true);
    setLocalCount((c) => c + 1);
    setReacted(true);
    // Reset bounce class after animation completes
    setTimeout(() => setJustVoted(false), 450);
    try {
      await onReact(pp._id);
    } catch {
      setLocalCount((c) => c - 1);
      setReacted(false);
    } finally {
      setReacting(false);
    }
  };

  const hasClaims = pp.claimingTeams && pp.claimingTeams.length > 0;
  const isHot = localCount >= 10; // QUICK WIN 2: hot badge threshold
  const replyCount = pp.replyCount || 0;
  const category = inferCategory(pp.title, pp.description); // QUICK WIN 2: category

  return (
    <article
      className="grid rounded-lg transition-colors hover:bg-arena-elevated"
      style={{
        gridTemplateColumns: 'auto 1fr auto',
        gap: 14,
        padding: 14,
        borderTop: '1px solid var(--border-subtle, var(--border-default))',
      }}
    >
      {/* QUICK WIN 2: Enhanced upvote with bounce */}
      <UpvoteButton count={localCount} voted={reacted} onVote={handleVote} disabled={reacting || reacted} justVoted={justVoted} />

      {/* Main */}
      <div className="min-w-0">
        {/* QUICK WIN 2: Category pill + Hot badge row */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              background: category.bg,
              border: `1px solid ${category.border}`,
              color: category.color,
              letterSpacing: '0.04em',
            }}
          >
            {category.label}
          </span>
          {isHot && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.35)', color: '#fb923c' }}
              aria-label="Hot item"
            >
              🔥 Hot
            </span>
          )}
        </div>

        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white"
            style={{ fontSize: 10, fontWeight: 600, background: avatarColor(pp.submitterName) }}
          >
            {getInitials(pp.submitterName)}
          </span>
          <span className="text-xs font-semibold text-text-primary">{pp.submitterName || 'Anonymous'}</span>
          {pp._creationTime && (
            <span className="text-xs text-text-muted">{relativeTime(pp._creationTime)}</span>
          )}
        </div>
        {/* VISUAL BRAND UPGRADE 3: Bolder title for clear hierarchy */}
        <p className="pain-title-strong text-sm leading-snug" style={{ margin: '0 0 10px' }}>
          {pp.title}
        </p>
        {pp.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-text-muted" style={{ margin: '0 0 6px' }}>
            {pp.description}
          </p>
        )}
        <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
          {/* QUICK WIN 2: Reply button with count */}
          <button
            type="button"
            className="inline-flex items-center rounded text-xs text-text-muted transition-colors hover:bg-arena-elevated hover:text-text-primary"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Reply
            {replyCount > 0 && (
              <span
                className="rounded-full px-1.5 text-[10px] font-semibold"
                style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)', minWidth: 18, textAlign: 'center' }}
              >
                {replyCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Aside */}
      <div className="flex flex-col items-end gap-1.5" style={{ minWidth: 80 }}>
        {hasClaims ? (
          pp.claimingTeams.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs"
              style={{ borderColor: 'var(--border-default)', background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {t.name}
            </span>
          ))
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
            style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Open</span>
          </span>
        )}
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

  const totalCount = allPainPoints.length;

  return (
    <div className="flex flex-col gap-5" data-testid="dashboard-pain-points">

      {/* ── Feed card (composer inline + filter tabs in header) ── */}
      <section
        className="rounded-xl border border-arena-border bg-arena-card shadow-sm"
        style={{ padding: 6 }}
      >
        {/* Header: title + filter tabs */}
        <div className="flex items-center justify-between" style={{ padding: '10px 14px 6px' }}>
          {/* VISUAL BRAND UPGRADE 1 + 3: Cyan accent on active sort label */}
          <span
            className="text-xs font-semibold uppercase tracking-widest text-text-muted"
            style={{ fontVariant: 'all-small-caps', letterSpacing: '0.12em' }}
          >
            Top pain points{' '}
            <span className="trending-label-cyan" aria-label={sortBy === 'newest' ? 'sorted by latest' : 'sorted by trending'}>
              · {sortBy === 'newest' ? 'latest' : 'trending'}
            </span>
          </span>
          <div className="flex items-center gap-2" role="tablist" aria-label="Feed filters">
            {[
              { key: 'reactions', label: 'Trending', count: totalCount || null },
              { key: 'newest', label: 'Just posted', count: null },
            ].map((f) => {
              const isActive = sortBy === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSortBy(f.key)}
                  className="inline-flex items-center rounded-lg border text-xs font-medium transition-colors"
                  style={{
                    gap: 6,
                    padding: '6px 12px',
                    borderColor: isActive ? 'rgba(0, 245, 255, 0.4)' : 'var(--border-default)',
                    background: isActive ? 'rgba(0, 245, 255, 0.1)' : 'var(--surface-card)',
                    color: isActive ? '#00d4e8' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 10px rgba(0, 245, 255, 0.1)' : 'none',
                  }}
                >
                  {f.label}
                  {f.count != null && (
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: isActive ? 'currentColor' : 'var(--text-muted)' }}>
                      · {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compose form — first row inside feed */}
        <div
          style={{ padding: '8px 8px 12px', borderBottom: '1px solid var(--border-subtle, var(--border-default))' }}
        >
          <form onSubmit={handleSubmit}>
            <textarea
              value={gripe}
              onChange={(e) => setGripe(e.target.value)}
              placeholder='One thing that slows you down. A sentence is enough — "it&#39;s annoying" counts.'
              rows={3}
              className="w-full resize-y rounded-lg border border-arena-border bg-arena-card text-sm text-text-primary placeholder:text-text-muted"
              style={{ fontFamily: 'inherit', lineHeight: 1.5, minHeight: 72, padding: '10px 12px' }}
            />
            <div className="flex flex-wrap items-center justify-between" style={{ gap: 12, marginTop: 10 }}>
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="Your name"
                className="rounded-lg border border-arena-border bg-arena-card px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted"
                style={{ width: 140, fontFamily: 'inherit' }}
              />
              <div className="flex items-center gap-2">
                {submitted && <span className="text-xs text-green-600">Submitted!</span>}
                {/* QUICK WIN 4: Electric cyan submit CTA */}
                <button
                  type="submit"
                  disabled={!gripe.trim() || submitting}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${!gripe.trim() || submitting ? '' : 'btn-electric-cyan'}`}
                  style={!gripe.trim() || submitting ? { background: 'var(--accent)', color: 'white', cursor: 'not-allowed' } : {}}
                >
                  {submitting ? 'Submitting...' : 'Submit pain point'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-arena-elevated" />
            ))}
          </div>
        ) : painPoints.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            No pain points yet — be the first to submit one!
          </p>
        ) : (
          <>
            {painPoints.map((pp) => (
              <PainItem key={pp._id} pp={pp} onReact={handleReact} />
            ))}
            {onNavigate && (
              <div className="py-3 text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('marketplace', { tab: 'pains' })}
                  className="rounded-lg border border-arena-border bg-transparent px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-arena-elevated hover:text-text-primary"
                  style={{ cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  See all pain points
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
