import { Fragment, useMemo, useState } from 'react';
import type { PipelineBoardItem, PipelineMetrics, PipelineStage, PipelineStageCriteria } from '../../types';
import { ConversionArrow } from './ConversionArrow';
import { StageDetail } from './StageDetail';
import { StageNode } from './StageNode';
import { SummaryBar } from './SummaryBar';

interface PipelineHeroProps {
  stages: PipelineStageCriteria[];
  itemsByStage: Record<PipelineStage, PipelineBoardItem[]>;
  metrics: PipelineMetrics;
  canManage: boolean;
  pipelineMovePendingProjectId: string | null;
  pipelineMoveStageByProjectId: Record<string, PipelineStage>;
  pipelineMoveNoteByProjectId: Record<string, string>;
  onPipelineMoveStageChange: (projectId: string, stage: PipelineStage) => void;
  onPipelineMoveNoteChange: (projectId: string, note: string) => void;
  onMoveItem: (item: PipelineBoardItem) => void;
}

function getConversionRate(metrics: PipelineMetrics, from: PipelineStage, to: PipelineStage): number | null {
  if (from === 'hack' && to === 'validated_prototype') return metrics.conversionHackToValidated;
  if (from === 'validated_prototype' && to === 'incubating_project') return metrics.conversionValidatedToIncubating;
  if (from === 'incubating_project' && to === 'product_candidate') return metrics.conversionIncubatingToCandidate;
  return null;
}

export function PipelineHero({
  stages,
  itemsByStage,
  metrics,
  canManage,
  pipelineMovePendingProjectId,
  pipelineMoveStageByProjectId,
  pipelineMoveNoteByProjectId,
  onPipelineMoveStageChange,
  onPipelineMoveNoteChange,
  onMoveItem,
}: PipelineHeroProps): JSX.Element {
  const [selectedStageId, setSelectedStageId] = useState<PipelineStage | null>(null);

  const averageDaysByStage = useMemo(() => {
    const map: Partial<Record<PipelineStage, number>> = {};
    for (const metric of metrics.averageDaysInStage) {
      map[metric.stage] = metric.averageDays;
    }
    return map;
  }, [metrics.averageDaysInStage]);

  const selectedStage = useMemo(
    () => stages.find((candidate) => candidate.stage === selectedStageId) ?? null,
    [selectedStageId, stages]
  );

  const selectedItems = selectedStage ? itemsByStage[selectedStage.stage] ?? [] : [];

  return (
    <section className="pipeline-hero-layout" aria-label="Pipeline hero">
      <SummaryBar entered={metrics.totalEntered} graduated={metrics.totalGraduated} />

      <section className="pipeline-hero-main card">
        <div className="pipeline-stage-flow">
          {stages.map((stage, index) => (
            <Fragment key={stage.stage}>
              <StageNode
                stage={stage}
                index={index}
                count={itemsByStage[stage.stage]?.length ?? 0}
                averageDays={averageDaysByStage[stage.stage] ?? null}
                isActive={selectedStageId === stage.stage}
                onToggleStage={(stageId) => setSelectedStageId((current) => (current === stageId ? null : stageId))}
              />
              {index < stages.length - 1 ? (
                <ConversionArrow
                  rate={getConversionRate(metrics, stage.stage, stages[index + 1].stage)}
                />
              ) : null}
            </Fragment>
          ))}
        </div>
      </section>

      <section className={`pipeline-detail-transition ${selectedStage ? 'is-open' : 'is-closed'}`} aria-hidden={!selectedStage}>
        {selectedStage ? (
          <StageDetail
            stage={selectedStage}
            items={selectedItems}
            stages={stages}
            canManage={canManage}
            pipelineMovePendingProjectId={pipelineMovePendingProjectId}
            pipelineMoveStageByProjectId={pipelineMoveStageByProjectId}
            pipelineMoveNoteByProjectId={pipelineMoveNoteByProjectId}
            onPipelineMoveStageChange={onPipelineMoveStageChange}
            onPipelineMoveNoteChange={onPipelineMoveNoteChange}
            onMoveItem={onMoveItem}
          />
        ) : null}
      </section>

      {!selectedStage ? (
        <section className="pipeline-detail-empty" aria-label="No selected stage">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            <path
              d="M18 24H30M30 24L26 20M30 24L26 28"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p>Select a stage above to view details</p>
        </section>
      ) : null}
    </section>
  );
}
