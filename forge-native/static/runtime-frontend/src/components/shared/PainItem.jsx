/**
 * Shared pain point sub-components and helpers.
 * Used by PainPointsSection (dashboard widget) and PainPoints (full page).
 */

import { useState } from 'react';

// ─── helpers ─────────────────────────────────────────────────────────────────

export function relativeTime(ts) {
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

export function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const PAIN_CATEGORIES = [
  { label: 'UX',        keywords: ['ux', 'user', 'ui', 'interface', 'design', 'click', 'button', 'confusing', 'flow', 'navigation'] },
  { label: 'Process',   keywords: ['process', 'workflow', 'approval', 'review', 'meeting', 'manual', 'ticket', 'sprint', 'jira', 'blocker'] },
  { label: 'Tech Debt', keywords: ['tech debt', 'legacy', 'old', 'deprecated', 'refactor', 'hack', 'workaround', 'dirty', 'spaghetti'] },
  { label: 'Infra',     keywords: ['infra', 'server', 'deploy', 'ci', 'cd', 'pipeline', 'build', 'crash', 'down', 'scaling', 'cloud'] },
  { label: 'Customer',  keywords: ['customer', 'client', 'churn', 'complaint', 'feedback', 'satisfaction', 'onboard', 'support'] },
  { label: 'Tooling',   keywords: ['tool', 'tooling', 'script', 'automation', 'ide', 'editor', 'dev tool', 'local', 'dx'] },
  { label: 'Eng',       keywords: [] },
];

export function inferCategoryLabel(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  for (const cat of PAIN_CATEGORIES) {
    if (cat.keywords.some((kw) => text.includes(kw))) return cat.label;
  }
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return PAIN_CATEGORIES[h % PAIN_CATEGORIES.length].label;
}

// ─── UpvoteButton ─────────────────────────────────────────────────────────────

export function UpvoteButton({ count, voted, onVote, disabled }) {
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

export function PainItem({ pp, onReact }) {
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
    <article className="flex gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 shadow-[var(--card-inner-edge)] transition hover:border-cyan-400/20 hover:bg-white/[0.045]">
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
        {pp.teams?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pp.teams.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-0.5 text-xs text-cyan-200"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
