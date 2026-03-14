import { Fragment, useMemo, useState } from 'react';
import type { PipelineBoardItem, PipelineMetrics, PipelineStage, PipelineStageCriteria, ProblemListItem } from '../../types';
import { ConversionArrow } from './ConversionArrow';
import { StageDetail } from './StageDetail';
import { StageNode } from './StageNode';
import { SummaryBar } from './SummaryBar';
import type { HeroStageDefinition, HeroStageKey } from './types';

interface PipelineHeroProps {
  stages: PipelineStageCriteria[];
  itemsByStage: Record<PipelineStage, PipelineBoardItem[]>;
  metrics: PipelineMetrics;
  painsItems: ProblemListItem[];
  painsAverageDays: number | null;
  painsToHackConversionRate: number | null;
  canManage: boolean;
  pipelineMovePendingProjectId: string | null;
  pipelineMoveStageByProjectId: Record<string, PipelineStage>;
  pipelineMoveNoteByProjectId: Record<string, string>;
  onPipelineMoveStageChange: (projectId: string, stage: PipelineStage) => void;
  onPipelineMoveNoteChange: (projectId: string, note: string) => void;
  onMoveItem: (item: PipelineBoardItem) => void;
  onOpenPains: () => void;
}

const PAINS_STAGE: HeroStageDefinition = {
  stage: 'pains',
  label: 'Pains',
  description: 'Reported workflow pain points ready for hack exploration.',
  criteria: [
    'Pain statement is clear and actionable',
    'Impact context captured (team/domain/time wasted)',
    'Ready for hack exploration and ownership',
  ],
};

function getConversionRate(metrics: PipelineMetrics, from: HeroStageKey, to: HeroStageKey, painsToHack: number | null): number | null {
  if (from === 'pains' && to === 'hack') return painsToHack;
  if (from === 'hack' && to === 'validated_prototype') return metrics.conversionHackToValidated;
  if (from === 'validated_prototype' && to === 'incubating_project') return metrics.conversionValidatedToIncubating;
  if (from === 'incubating_project' && to === 'product_candidate') return metrics.conversionIncubatingToCandidate;
  return null;
}

export function PipelineHero({
  stages,
  itemsByStage,
  metrics,
  painsItems,
  painsAverageDays,
  painsToHackConversionRate,
  canManage,
  pipelineMovePendingProjectId,
  pipelineMoveStageByProjectId,
  pipelineMoveNoteByProjectId,
  onPipelineMoveStageChange,
  onPipelineMoveNoteChange,
  onMoveItem,
  onOpenPains,
}: PipelineHeroProps): JSX.Element {
  const [selectedStageId, setSelectedStageId] = useState<HeroStageKey | null>(null);
  const stageCounts = useMemo<Record<PipelineStage, number>>(
    () => ({
      hack: itemsByStage.hack?.length ?? 0,
      validated_prototype: itemsByStage.validated_prototype?.length ?? 0,
      incubating_project: itemsByStage.incubating_project?.length ?? 0,
      product_candidate: itemsByStage.product_candidate?.length ?? 0,
    }),
    [itemsByStage]
  );

  const averageDaysByStage = useMemo(() => {
    const map: Partial<Record<PipelineStage, number>> = {};
    for (const metric of metrics.averageDaysInStage) {
      map[metric.stage] = metric.averageDays;
    }
    return map;
  }, [metrics.averageDaysInStage]);

  const heroStages = useMemo<HeroStageDefinition[]>(
    () => [
      PAINS_STAGE,
      ...stages.map((stage) => ({
        stage: stage.stage,
        label: stage.label,
        description: stage.description,
        criteria: stage.criteria,
      })),
    ],
    [stages]
  );

  const selectedStage = useMemo(
    () => heroStages.find((candidate) => candidate.stage === selectedStageId) ?? null,
    [heroStages, selectedStageId]
  );

  const selectedItems = selectedStage && selectedStage.stage !== 'pains' ? itemsByStage[selectedStage.stage] ?? [] : [];

  return (
    <section className="pipeline-hero-layout" aria-label="Pipeline hero">
      <SummaryBar entered={metrics.totalEntered} graduated={metrics.totalGraduated} />

      <section className="pipeline-hero-main card">
        <div className="pipeline-stage-flow">
          {heroStages.map((stage, index) => (
            <Fragment key={stage.stage}>
              <StageNode
                stage={stage}
                index={index}
                count={stage.stage === 'pains' ? painsItems.length : itemsByStage[stage.stage]?.length ?? 0}
                averageDays={stage.stage === 'pains' ? painsAverageDays : averageDaysByStage[stage.stage] ?? null}
                isActive={selectedStageId === stage.stage}
                onToggleStage={(stageId) => setSelectedStageId((current) => (current === stageId ? null : stageId))}
              />
              {index < heroStages.length - 1 ? (
                <ConversionArrow
                  rate={(() => {
                    const nextStage = heroStages[index + 1].stage;
                    if (stage.stage === 'pains') {
                      return painsItems.length > 0 ? getConversionRate(metrics, stage.stage, nextStage, painsToHackConversionRate) : null;
                    }
                    return stageCounts[stage.stage] > 0
                      ? getConversionRate(metrics, stage.stage, nextStage, painsToHackConversionRate)
                      : null;
                  })()}
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
            painsItems={painsItems}
            stages={stages}
            canManage={canManage}
            pipelineMovePendingProjectId={pipelineMovePendingProjectId}
            pipelineMoveStageByProjectId={pipelineMoveStageByProjectId}
            pipelineMoveNoteByProjectId={pipelineMoveNoteByProjectId}
            onPipelineMoveStageChange={onPipelineMoveStageChange}
            onPipelineMoveNoteChange={onPipelineMoveNoteChange}
            onMoveItem={onMoveItem}
            onOpenPains={onOpenPains}
          />
        ) : null}
      </section>

      {!selectedStage ? (
        <section className="pipeline-detail-empty" aria-label="No selected stage">
          <span className="pipeline-detail-empty-icon" aria-hidden>📈</span>
          <p className="pipeline-detail-empty-copy">Select a stage to see what&apos;s in it and what&apos;s blocking progress.</p>
        </section>
      ) : null}
    </section>
  );
}
