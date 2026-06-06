import { useState } from 'react';
import type { PainPoint } from '../../types';

interface PainPointsSectionProps {
  problems: PainPoint[];
  totalCount: number;
  loading: boolean;
  onSubmit: (title: string, submitterName: string, description?: string) => void;
  onViewAll?: () => void;
}

const HOT_THRESHOLD = 15;

export function PainPointsSection({
  problems,
  totalCount,
  loading,
  onSubmit,
  onViewAll,
}: PainPointsSectionProps): JSX.Element {
  const [painText, setPainText] = useState('');
  const [nameText, setNameText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!painText.trim()) return;
    onSubmit(painText.trim(), nameText.trim() || 'Anonymous');
    setPainText('');
    setNameText('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const displayed = problems.slice(0, 4);
  const overflow = totalCount > 4 ? totalCount - 4 : 0;

  return (
    <section className="hp-section" aria-label="Pain points" id="hp-pain-points">
      <div className="hp-eyebrow">Pain points</div>
      <div className="hp-sec-title">What&rsquo;s slowing your team down?</div>
      <div className="hp-sec-sub">
        You don&rsquo;t need a solution. Just describe the pain&nbsp;&mdash; HackDay teams will pick it up.
      </div>

      {/* Pain cards feed */}
      <div className="hp-pain-cards">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="hp-skeleton" style={{ height: 72 }} />
          ))
        ) : displayed.length === 0 ? (
          <p className="hp-pain-empty">No pain points yet &mdash; be the first to submit one below.</p>
        ) : (
          displayed.map((p) => (
            <div
              key={p.id}
              className={`hp-pain-card${p.voteCount >= HOT_THRESHOLD ? ' hp-pain-card--hot' : ''}`}
            >
              <p className="hp-pain-card-title">{p.title}</p>
              <div className="hp-pain-card-meta">
                {p.eventName && <span className="hp-pain-card-event">{p.eventName}</span>}
                {p.eventName && <span aria-hidden="true">&middot;</span>}
                <span>{p.submitterName}</span>
                <span aria-hidden="true">&middot;</span>
                <span className="hp-pain-card-votes">+{p.voteCount}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {overflow > 0 && onViewAll && (
        <button type="button" className="hp-pain-view-all" onClick={onViewAll}>
          + {overflow} more pain point{overflow === 1 ? '' : 's'} &rsaquo;
        </button>
      )}

      {/* Submission form — de-emphasised, below the feed */}
      <div className="hp-pain-form">
        <p className="hp-pain-form-label">
          Got a pain? One sentence is enough. Describe the frustration, not the solution.
        </p>
        <textarea
          className="hp-pain-textarea"
          placeholder="What is slowing you or your team down right now?"
          value={painText}
          rows={2}
          onChange={(e) => setPainText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        />
        <div className="hp-pain-form-row">
          <input
            type="text"
            className="hp-pain-input hp-pain-input--name"
            placeholder="Your name (optional)"
            value={nameText}
            onChange={(e) => setNameText(e.target.value)}
          />
          <div className="hp-pain-form-actions">
            {submitted && <span className="hp-pain-submitted">Submitted!</span>}
            <button
              type="button"
              className="hp-pain-submit"
              onClick={handleSubmit}
              disabled={!painText.trim()}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
