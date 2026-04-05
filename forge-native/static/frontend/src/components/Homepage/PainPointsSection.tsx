/**
 * PainPointsSection — pain submission input + trending tags.
 * Wired to hdcListProblems (sorted by votes) and hdcCreateProblem.
 */

import { useState } from 'react';
import type { ProblemListItem } from '../../types';

interface PainPointsSectionProps {
  problems: ProblemListItem[];
  totalCount: number;
  loading: boolean;
  onSubmit: (title: string) => void;
}

const HOT_THRESHOLD = 15;

export function PainPointsSection({
  problems,
  totalCount,
  loading,
  onSubmit,
}: PainPointsSectionProps): JSX.Element {
  const [painText, setPainText] = useState('');

  const handleSubmit = () => {
    if (!painText.trim()) return;
    onSubmit(painText.trim());
    setPainText('');
  };

  const displayed = problems.slice(0, 6);
  const overflow = totalCount > 6 ? totalCount - 6 : 0;

  return (
    <section className="hp-section" aria-label="Pain points" id="hp-pain-points">
      <div className="hp-eyebrow">Pain points</div>
      <div className="hp-pains-grid">
        <div>
          <div className="hp-sec-title">What&rsquo;s slowing your team down?</div>
          <div className="hp-sec-sub">
            You don&rsquo;t need a solution. Just describe the pain&nbsp;&mdash;
            HackDay teams will pick it up.
          </div>
          <div className="hp-pain-row">
            <input
              type="text"
              className="hp-pain-input"
              placeholder="Describe a recurring work problem..."
              value={painText}
              onChange={(e) => setPainText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button type="button" className="hp-pain-submit" onClick={handleSubmit}>
              Submit
            </button>
          </div>
        </div>
        <div>
          <div className="hp-trending-label">Trending pain points</div>
          <div className="hp-pain-tags">
            {loading ? (
              <span className="hp-tag">Loading...</span>
            ) : displayed.length === 0 ? (
              <span className="hp-tag">No pain points yet &mdash; be the first to submit one</span>
            ) : (
              <>
                {displayed.map((p) => (
                  <span
                    key={p.id}
                    className={`hp-tag${p.voteCount >= HOT_THRESHOLD ? ' hp-tag-hot' : ''}`}
                  >
                    {p.title}
                    <span className="hp-tag-votes"> +{p.voteCount}</span>
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="hp-tag-more">+ {overflow} more pain points</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
