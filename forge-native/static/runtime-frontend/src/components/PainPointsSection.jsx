/**
 * PainPointsSection — submit and browse pain points on a HackDay dashboard.
 * Uses Forge Bridge resolvers (getPainPoints, submitPainPoint, reactToPainPoint).
 */

import { useState, useEffect, useCallback } from 'react';
import { invokeEventScopedResolver } from '../lib/appModeResolverPayload';

const ESTIMATE_LABEL = { low: 'Low', med: 'Med', medium: 'Med', high: 'High' };

// ─── Pill badge ───────────────────────────────────────────────────────────────
function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-arena-border bg-arena-bg px-2 py-0.5 text-[10px] text-text-muted">
      {children}
    </span>
  );
}

// ─── Single pain point row ────────────────────────────────────────────────────
function PainPointRow({ pp, onReact }) {
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
    <li className="flex items-start justify-between gap-3 rounded-lg border border-arena-border bg-arena-elevated px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{pp.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-text-muted">{pp.submitterName}</span>
          {pp.effortEstimate && <Pill>Effort: {ESTIMATE_LABEL[pp.effortEstimate]}</Pill>}
          {pp.impactEstimate && <Pill>Impact: {ESTIMATE_LABEL[pp.impactEstimate]}</Pill>}
        </div>
        {pp.description && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-text-muted">{pp.description}</p>
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

// ─── Submit form ──────────────────────────────────────────────────────────────
function SubmitForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [effort, setEffort] = useState('');
  const [impact, setImpact] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = name.trim() && title.trim() && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        submitterName: name.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        effortEstimate: effort || undefined,
        impactEstimate: impact || undefined,
      });
      setName('');
      setTitle('');
      setDescription('');
      setEffort('');
      setImpact('');
      setShowDetail(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-arena-border bg-arena-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30";
  const selectClass = `${inputClass} cursor-pointer`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Our weekly status reports take 3 hours but nobody reads them *"
        className={inputClass}
        required
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name *"
        className={inputClass}
        required
      />

      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="self-start text-[11px] text-text-muted hover:text-text-secondary transition-colors"
      >
        {showDetail ? '▲ Less detail' : '▼ Add more detail'}
      </button>

      {showDetail && (
        <div className="flex flex-col gap-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="More context (optional)"
            rows={2}
            className={`${inputClass} resize-none`}
          />
          <div className="flex gap-2">
            <select value={effort} onChange={(e) => setEffort(e.target.value)} className={selectClass}>
              <option value="">Effort –</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select value={impact} onChange={(e) => setImpact(e.target.value)} className={selectClass}>
              <option value="">Impact –</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      )}

      {error && <p className="text-[12px] text-status-error">{error}</p>}
      {submitted && <p className="text-[12px] text-status-success">Pain point submitted!</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export default function PainPointsSection({ appModeResolverPayload }) {
  const [painPoints, setPainPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('reactions');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { invoke } = await import('@forge/bridge');
      const result = await invokeEventScopedResolver(
        invoke,
        'getPainPoints',
        appModeResolverPayload,
        { sortBy, limit: 10 }
      );
      setPainPoints(result?.painPoints ?? []);
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
    }
  }, [appModeResolverPayload, sortBy]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (payload) => {
    const { invoke } = await import('@forge/bridge');
    await invokeEventScopedResolver(invoke, 'submitPainPoint', appModeResolverPayload, payload);
    await load();
  };

  const handleReact = async (painPointId) => {
    const { invoke } = await import('@forge/bridge');
    await invokeEventScopedResolver(invoke, 'reactToPainPoint', appModeResolverPayload, { painPointId });
  };

  return (
    <section
      data-testid="dashboard-pain-points"
      className="dashboard-main-card rounded-xl border border-arena-border bg-arena-card p-0 shadow-sm"
    >
      <div className="dashboard-card-header flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Pain points</p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">What&rsquo;s slowing your team down?</p>
        </div>
        {/* Sort toggle */}
        <div className="flex rounded-full border border-arena-border bg-arena-bg p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setSortBy('reactions')}
            className={`rounded-full px-2.5 py-0.5 transition-colors ${sortBy === 'reactions' ? 'bg-brand text-white' : 'text-text-muted hover:text-text-primary'}`}
          >
            🔥 Top
          </button>
          <button
            type="button"
            onClick={() => setSortBy('newest')}
            className={`rounded-full px-2.5 py-0.5 transition-colors ${sortBy === 'newest' ? 'bg-brand text-white' : 'text-text-muted hover:text-text-primary'}`}
          >
            ✨ New
          </button>
        </div>
      </div>

      <div className="dashboard-card-body space-y-3">
        {/* Submit form — always visible */}
        <div className="rounded-lg border border-arena-border bg-arena-elevated p-3">
          <SubmitForm onSubmit={handleSubmit} />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-arena-elevated" />
            ))}
          </div>
        ) : painPoints.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            No pain points yet — be the first to submit one!
          </p>
        ) : (
          <ul className="space-y-2">
            {painPoints.map((pp) => (
              <PainPointRow key={pp._id} pp={pp} onReact={handleReact} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
