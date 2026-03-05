import type { PipelineStageCriteria } from '../../types';

interface StageNodeProps {
  stage: PipelineStageCriteria;
  index: number;
  count: number;
  averageDays: number | null;
  isActive: boolean;
  onToggleStage: (stageId: PipelineStageCriteria['stage']) => void;
}

function formatAverageDays(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '-';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function StageNode({ stage, index, count, averageDays, isActive, onToggleStage }: StageNodeProps): JSX.Element {
  return (
    <button
      type="button"
      className={`pipeline-stage-node ${isActive ? 'is-active' : ''}`}
      aria-pressed={isActive}
      onClick={() => onToggleStage(stage.stage)}
    >
      <span className="pipeline-stage-index" aria-hidden>
        {index + 1}
      </span>
      <div className="pipeline-stage-gates" aria-label={`${stage.criteria.length} gates`}>
        {stage.criteria.length} gates
      </div>
      <h3>{stage.label}</h3>
      <p className="pipeline-stage-description">{stage.description}</p>
      <div className="pipeline-stage-metrics">
        <div>
          <strong>{count}</strong>
          <span>items</span>
        </div>
        <div>
          <strong>{formatAverageDays(averageDays)}</strong>
          <span>avg days</span>
        </div>
      </div>
    </button>
  );
}
