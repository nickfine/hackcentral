/**
 * PipelineFunnel — five-stage horizontal funnel from pain to product candidate.
 *
 * Status mapping (from convex/schema.ts project status enum):
 *   Pains              → (no data model yet — renders "—")
 *   Hack               → idea | building
 *   Validated prototype → completed
 *   Incubating project  → incubation
 *   Product candidate   → archived  (imperfect — may include abandoned)
 */

type ProjectStatus = 'idea' | 'building' | 'incubation' | 'completed' | 'archived';

interface PipelineFunnelProps {
  projects: Array<{ status: ProjectStatus }> | undefined;
}

interface FunnelStage {
  name: string;
  desc: string;
  statuses: ProjectStatus[];
  gate?: string;
  colorClass: string;
}

const stages: FunnelStage[] = [
  { name: 'Pains', desc: 'Real problems from teams', statuses: [], gate: undefined, colorClass: 'text-primary' },
  { name: 'Hack', desc: 'Teams attempt rapid solutions', statuses: ['idea', 'building'], gate: undefined, colorClass: 'text-primary-600' },
  { name: 'Validated prototype', desc: 'Tested with real users', statuses: ['completed'], gate: 'Problem Fit', colorClass: 'text-success' },
  { name: 'Incubating project', desc: 'Resourced and developed', statuses: ['incubation'], gate: 'Solution Fit', colorClass: 'text-foreground' },
  { name: 'Product candidate', desc: 'Ready to scale', statuses: ['archived'], gate: 'Scale Fit', colorClass: 'text-primary' },
];

const ArrowSvg = () => (
  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M2 5h6M6 2l3 3-3 3" stroke="var(--color-muted-foreground)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function PipelineFunnel({ projects }: PipelineFunnelProps) {
  const countByStatus = (statuses: ProjectStatus[]): number | null => {
    if (!projects) return null;
    if (statuses.length === 0) return null; // No data model
    return projects.filter((p) => statuses.includes(p.status)).length;
  };

  return (
    <section
      className="card p-7 lg:p-8"
      style={{ boxShadow: 'var(--shadow-section)' }}
      aria-label="Pre-product pipeline"
    >
      <div className="section-label mb-1.5 text-primary">The pre-product pipeline</div>
      <h2 className="font-display text-[22px] font-semibold text-foreground">
        From pain to product candidate
      </h2>
      <p className="mb-5 mt-1 text-[13px] leading-relaxed text-muted-foreground">
        Every product at Adaptavist starts as a pain point. This is how it moves
        through the system.
      </p>

      <div className="flex items-stretch overflow-x-auto rounded-2xl border border-border">
        {stages.map((stage, i) => {
          const count = countByStatus(stage.statuses);
          return (
            <div key={stage.name} className="contents">
              {/* Arrow separator */}
              {i > 0 && (
                <div className="flex w-3 shrink-0 items-center justify-center border-r border-border bg-[rgba(20,33,61,0.04)]">
                  <ArrowSvg />
                </div>
              )}

              {/* Stage */}
              <div className="min-w-[110px] flex-1 border-r border-border bg-background px-3 py-3.5 last:border-r-0">
                <div className="text-xs font-semibold text-foreground">{stage.name}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {stage.desc}
                </div>
                <div className={`mt-2.5 font-display text-2xl font-semibold ${stage.colorClass}`}>
                  {count === null ? '—' : count}
                </div>
                {stage.gate && (
                  <div className="mt-1.5 inline-block rounded border border-dashed border-[rgba(20,33,61,0.2)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Gate: {stage.gate}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
