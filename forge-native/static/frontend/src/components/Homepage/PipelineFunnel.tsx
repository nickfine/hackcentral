import type { PipelineMetrics, PipelineStage } from '../../types';

interface PipelineFunnelProps {
  metrics: PipelineMetrics | null;
  painCount: number | null;
  loading: boolean;
  onNavigatePipeline: () => void;
}

interface FunnelStage {
  name: string;
  desc: string;
  pipelineStage: PipelineStage | null;
  gate?: string;
}

const stages: FunnelStage[] = [
  { name: 'Pains', desc: 'Real problems from teams', pipelineStage: null },
  { name: 'Hack', desc: 'Teams attempt rapid solutions', pipelineStage: 'hack' },
  { name: 'Validated prototype', desc: 'Tested with real users', pipelineStage: 'validated_prototype', gate: 'Problem Fit' },
  { name: 'Incubating project', desc: 'Resourced and developed', pipelineStage: 'incubating_project', gate: 'Solution Fit' },
  { name: 'Product candidate', desc: 'Ready to scale', pipelineStage: 'product_candidate', gate: 'Scale Fit' },
];

export function PipelineFunnel({ metrics, painCount, loading, onNavigatePipeline }: PipelineFunnelProps): JSX.Element {
  const getCount = (stage: PipelineStage | null): string => {
    if (stage === null) return painCount === null ? '—' : String(painCount);
    if (!metrics || loading) return '—';
    const entry = metrics.itemsPerStage.find((s) => s.stage === stage);
    return String(entry?.count ?? 0);
  };

  return (
    <section className="hp-section hp-section--pipeline" aria-label="Pre-product pipeline">
      <div className="hp-eyebrow">The pipeline</div>
      <div className="hp-sec-title">From pain to product</div>
      <div className="hp-sec-sub">
        Every product starts as a pain point. Watch how it moves through the system.
      </div>

      <div className="hp-pipeline-stages">
        {stages.map((stage) => (
          <button
            key={stage.name}
            type="button"
            className="hp-pipeline-stage-row"
            onClick={onNavigatePipeline}
            aria-label={`${stage.name}: ${getCount(stage.pipelineStage)} — view pipeline`}
          >
            <div className="hp-pipeline-stage-info">
              <span className="hp-pipeline-stage-name">{stage.name}</span>
              <span className="hp-pipeline-stage-desc">{stage.desc}</span>
            </div>
            <span className="hp-pipeline-stage-count">{getCount(stage.pipelineStage)}</span>
            {stage.gate && (
              <span className="hp-fstage-gate">{stage.gate}</span>
            )}
          </button>
        ))}
      </div>

      <button type="button" className="hp-pipeline-view-all" onClick={onNavigatePipeline}>
        View full pipeline &rsaquo;
      </button>
    </section>
  );
}
