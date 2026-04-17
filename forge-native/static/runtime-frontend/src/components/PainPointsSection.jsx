/**
 * PainPointsSection — submit and browse pain points on a HackDay dashboard.
 * Uses Forge Bridge resolvers (getPainPoints, submitPainPoint, reactToPainPoint).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { invokeEventScopedResolver } from '../lib/appModeResolverPayload';
import EditableText from '../configMode/EditableText';
import { PainPointRow } from './shared';

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
export default function PainPointsSection({ appModeResolverPayload, onNavigate }) {
  const [allPainPoints, setAllPainPoints] = useState([]);
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
        { sortBy: 'reactions', limit: 20 }
      );
      setAllPainPoints(result?.painPoints ?? []);
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
    }
  }, [appModeResolverPayload]);

  useEffect(() => { load(); }, [load]);

  // Client-side sort and slice — avoids re-fetching on sort toggle
  const painPoints = useMemo(() => {
    const sorted = [...allPainPoints].sort((a, b) => {
      if (sortBy === 'newest') {
        return (b._creationTime || 0) - (a._creationTime || 0);
      }
      return (b.reactionCount || 0) - (a.reactionCount || 0);
    });
    return sorted.slice(0, 5);
  }, [allPainPoints, sortBy]);

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
      <div className="dashboard-card-header">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Pain points</p>
        <EditableText
          contentKey="dashboard.painPoints.title"
          fallback="What would you fix at work if you had the time?"
          as="p"
          className="mt-1 text-xl font-bold text-text-primary"
        />
      </div>

      <div className="dashboard-card-body">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left — Submit form */}
          <div className="rounded-lg border border-arena-border bg-arena-elevated p-3">
            <SubmitForm onSubmit={handleSubmit} />
          </div>

          {/* Right — Sort toggle + list */}
          <div className="flex flex-col gap-2">
            <div className="flex rounded-full border border-arena-border bg-arena-bg p-0.5 text-[11px] self-start w-fit">
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
              <>
                <ul className="space-y-2">
                  {painPoints.map((pp) => (
                    <PainPointRow key={pp._id} pp={pp} onReact={handleReact} />
                  ))}
                </ul>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('marketplace', { tab: 'pains' })}
                    className="mt-1 text-[11px] text-brand hover:underline self-start"
                  >
                    See all pain points →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
