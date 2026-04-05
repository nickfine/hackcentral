/**
 * PainPointsSection — pain submission + trending tags.
 *
 * DATA GAP: No painPoints table exists in convex/schema.ts.
 * Submit is a no-op toast. Trending tags render a placeholder state.
 * TODO: Requires new painPoints data model (table + create/vote mutations).
 */

import { useState } from 'react';
import toast from 'react-hot-toast';

export function PainPointsSection() {
  const [painText, setPainText] = useState('');

  const handleSubmit = () => {
    if (!painText.trim()) return;
    toast('Pain points submission coming soon!', { icon: '🚧' });
    setPainText('');
  };

  return (
    <section
      className="card p-7 lg:p-8"
      style={{ boxShadow: 'var(--shadow-section)' }}
      aria-label="Pain points"
      id="pain-points"
    >
      <div className="section-label mb-1.5 text-primary">Pain points</div>

      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
        {/* Left: submission */}
        <div>
          <h2 className="font-display text-[22px] font-semibold text-foreground">
            What&rsquo;s slowing your team down?
          </h2>
          <p className="mb-5 mt-1 text-[13px] leading-relaxed text-muted-foreground">
            You don&rsquo;t need a solution. Just describe the pain&nbsp;&mdash;
            HackDay teams will pick it up.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={painText}
              onChange={(e) => setPainText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Describe a recurring work problem..."
              className="input flex-1"
              style={{ borderRadius: '9999px' }}
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-accent shrink-0"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Right: trending tags (placeholder) */}
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Trending pain points
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              No pain points yet&nbsp;&mdash; be the first to submit one
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
