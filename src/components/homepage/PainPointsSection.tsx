import { Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { PainPointSubmitForm } from './PainPointSubmitForm';
import type { Id } from '../../../convex/_generated/dataModel';

const ESTIMATE_LABEL: Record<string, string> = { low: 'Low', medium: 'Med', high: 'High' };

function ReactionButton({ painPointId, count }: { painPointId: Id<'painPoints'>; count: number }) {
  const react = useMutation(api.painPoints.react);
  return (
    <button
      type="button"
      onClick={() => react({ painPointId })}
      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      aria-label="React to this pain point"
    >
      <span>🔥</span>
      <span>{count}</span>
    </button>
  );
}

export function PainPointsSection() {
  const painPoints = useQuery(api.painPoints.list, { sortBy: 'reactions', limit: 5 });

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
          <PainPointSubmitForm />
        </div>

        {/* Right: trending pain points */}
        <div>
          <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Trending pain points
          </div>

          {painPoints === undefined ? (
            /* Loading skeleton */
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          ) : painPoints.length === 0 ? (
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              No pain points yet&nbsp;&mdash; be the first to submit one
            </span>
          ) : (
            <div className="flex flex-col gap-2">
              {painPoints.map((pp) => (
                <div
                  key={pp._id}
                  className="soft-panel flex items-start justify-between gap-3 rounded-lg px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {pp.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {pp.submitterName}
                      {pp.effortEstimate && (
                        <span className="ml-2 badge badge-outline text-[10px]">
                          Effort: {ESTIMATE_LABEL[pp.effortEstimate]}
                        </span>
                      )}
                      {pp.impactEstimate && (
                        <span className="ml-1 badge badge-outline text-[10px]">
                          Impact: {ESTIMATE_LABEL[pp.impactEstimate]}
                        </span>
                      )}
                    </p>
                  </div>
                  <ReactionButton painPointId={pp._id} count={pp.reactionCount} />
                </div>
              ))}

              <Link
                to="/pain-points"
                className="mt-1 self-start text-[12px] text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
