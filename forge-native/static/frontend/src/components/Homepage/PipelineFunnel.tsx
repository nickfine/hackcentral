/**
 * PipelineFunnel — five-stage horizontal funnel from pain to product candidate.
 *
 * Stage mapping (from types.ts PipelineStage):
 *   Pains              → painCount prop (from hdcListProblems total)
 *   Hack               → 'hack' stage
 *   Validated prototype → 'validated_prototype' stage
 *   Incubating project  → 'incubating_project' stage
 *   Product candidate   → 'product_candidate' stage
 *
 * Gate labels are static strings.
 */

import type { PipelineMetrics, PipelineStage } from '../../types';

interface PipelineFunnelProps {
  metrics: PipelineMetrics | null;
  painCount: number | null;
  loading: boolean;
}

interface FunnelStage {
  name: string;
  desc: string;
  pipelineStage: PipelineStage | null;
  gate?: string;
  colorClass: string;
}

const stages: FunnelStage[] = [
  { name: 'Pains', desc: 'Real problems from teams', pipelineStage: null, colorClass: 'hp-c-brand' },
  { name: 'Hack', desc: 'Teams attempt rapid solutions', pipelineStage: 'hack', colorClass: 'hp-c-brand-strong' },
  { name: 'Validated prototype', desc: 'Tested with real users', pipelineStage: 'validated_prototype', gate: 'Problem Fit', colorClass: 'hp-c-success' },
  { name: 'Incubating project', desc: 'Resourced and developed', pipelineStage: 'incubating_project', gate: 'Solution Fit', colorClass: 'hp-c-text' },
  { name: 'Product candidate', desc: 'Ready to scale', pipelineStage: 'product_candidate', gate: 'Scale Fit', colorClass: 'hp-c-brand' },
];

function ArrowSvg(): JSX.Element {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 5h6M6 2l3 3-3 3" stroke="var(--text-soft)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PipelineFunnel({ metrics, painCount, loading }: PipelineFunnelProps): JSX.Element {
  const getCount = (stage: PipelineStage | null): string => {
    if (stage === null) return painCount === null ? '\u2014' : String(painCount);
    if (!metrics || loading) return '\u2014';
    const entry = metrics.itemsPerStage.find((s) => s.stage === stage);
    return String(entry?.count ?? 0);
  };

  return (
    <section className="hp-section" aria-label="Pre-product pipeline">
      <div className="hp-eyebrow">The pre-product pipeline</div>
      <div className="hp-sec-title">From pain to product candidate</div>
      <div className="hp-sec-sub">
        Every product at Adaptavist starts as a pain point. This is how it moves through the system.
      </div>

      <div className="hp-funnel-stages">
        {stages.map((stage, i) => (
          <div key={stage.name} style={{ display: 'contents' }}>
            {i > 0 && (
              <div className="hp-farrow">
                <ArrowSvg />
              </div>
            )}
            <div className="hp-fstage">
              <div className="hp-fstage-name">{stage.name}</div>
              <div className="hp-fstage-desc">{stage.desc}</div>
              <div className={`hp-fstage-count ${stage.colorClass}`}>
                {getCount(stage.pipelineStage)}
              </div>
              {stage.gate ? (
                <div className="hp-fstage-gate">Gate: {stage.gate}</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
