import type { PipelineBoardItem, PipelineStage, PipelineStageCriteria, ProblemListItem } from '../../types';
import { getInitials } from '../../utils/format';
import type { HeroStageDefinition } from './types';

const AVATAR_TONE_COUNT = 5;

function hashName(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function avatarToneClass(value: string): string {
  return `pipeline-avatar-tone-${hashName(value) % AVATAR_TONE_COUNT}`;
}

function formatAgeDays(createdAt: string): string {
  const parsed = Date.parse(createdAt);
  if (!Number.isFinite(parsed)) return '0 days old';
  const days = Math.max(0, Math.round((Date.now() - parsed) / (1000 * 60 * 60 * 24)));
  return `${days} days old`;
}

interface StageDetailProps {
  stage: HeroStageDefinition;
  items: PipelineBoardItem[];
  painsItems: ProblemListItem[];
  stages: PipelineStageCriteria[];
  canManage: boolean;
  pipelineMovePendingProjectId: string | null;
  pipelineMoveStageByProjectId: Record<string, PipelineStage>;
  pipelineMoveNoteByProjectId: Record<string, string>;
  onPipelineMoveStageChange: (projectId: string, stage: PipelineStage) => void;
  onPipelineMoveNoteChange: (projectId: string, note: string) => void;
  onMoveItem: (item: PipelineBoardItem) => void;
  onOpenPains: () => void;
}

export function StageDetail({
  stage,
  items,
  painsItems,
  stages,
  canManage,
  pipelineMovePendingProjectId,
  pipelineMoveStageByProjectId,
  pipelineMoveNoteByProjectId,
  onPipelineMoveStageChange,
  onPipelineMoveNoteChange,
  onMoveItem,
  onOpenPains,
}: StageDetailProps): JSX.Element {
  const isPainsStage = stage.stage === 'pains';
  const visiblePainItems = painsItems.slice(0, 3);
  const visibleProjectItems = items.slice(0, 3);
  const overflowCount = isPainsStage
    ? Math.max(painsItems.length - visiblePainItems.length, 0)
    : Math.max(items.length - visibleProjectItems.length, 0);

  return (
    <article className="pipeline-detail-panel" aria-label={`${stage.label} details`}>
      <header className="pipeline-detail-header">
        <div>
          <h3>{stage.label}</h3>
          <p>{stage.description}</p>
        </div>
        <span className="pipeline-detail-count">
          {isPainsStage ? painsItems.length : items.length} {isPainsStage ? 'pains' : 'items'} in stage
        </span>
      </header>

      <section className="pipeline-detail-section">
        <h4>{isPainsStage ? 'Pain criteria' : 'Gate criteria'}</h4>
        <ul className="pipeline-detail-criteria-list">
          {stage.criteria.map((criterion) => (
            <li key={criterion}>
              <span className="pipeline-detail-check" aria-hidden>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="pipeline-detail-section">
        <h4>{isPainsStage ? 'Pains' : 'Items'}</h4>
        {(isPainsStage ? visiblePainItems.length === 0 : visibleProjectItems.length === 0) ? (
          <p className="empty-copy">{isPainsStage ? 'No pains in this stage.' : 'No items in this stage.'}</p>
        ) : (
          <div className="pipeline-detail-items">
            {isPainsStage ? (
              visiblePainItems.map((pain) => (
                <article key={pain.id} className="pipeline-detail-item">
                  <div className="pipeline-detail-item-main">
                    <span className={`pipeline-item-avatar ${avatarToneClass(pain.team)}`} aria-hidden>
                      {getInitials(pain.team)}
                    </span>
                    <div>
                      <p className="pipeline-item-title">{pain.title}</p>
                      <p className="pipeline-item-meta">Team: {pain.team} • Domain: {pain.domain} • {formatAgeDays(pain.createdAt)}</p>
                    </div>
                  </div>
                  <div className="pipeline-pain-item-actions">
                    <button type="button" className="btn btn-outline" onClick={onOpenPains}>
                      Open in Pains
                    </button>
                  </div>
                </article>
              ))
            ) : (
              visibleProjectItems.map((projectItem) => {
                const targetOptions = stages.filter((candidate) => candidate.stage !== projectItem.stage);
                const selectedTarget = pipelineMoveStageByProjectId[projectItem.projectId] ?? '';
                const isPending = pipelineMovePendingProjectId === projectItem.projectId;

                return (
                  <article key={projectItem.projectId} className="pipeline-detail-item">
                    <div className="pipeline-detail-item-main">
                      <span className={`pipeline-item-avatar ${avatarToneClass(projectItem.ownerName)}`} aria-hidden>
                        {getInitials(projectItem.ownerName)}
                      </span>
                      <div>
                        <p className="pipeline-item-title">{projectItem.title}</p>
                        <p className="pipeline-item-meta">{projectItem.ownerName} • {projectItem.daysInStage} days in stage</p>
                      </div>
                    </div>
                    {canManage ? (
                      <div className="pipeline-item-move-row">
                        <label>
                          <span className="sr-only">Target stage</span>
                          <select
                            value={selectedTarget}
                            onChange={(event) => {
                              if (!event.target.value) return;
                              onPipelineMoveStageChange(projectItem.projectId, event.target.value as PipelineStage);
                            }}
                            disabled={isPending}
                          >
                            <option value="">Select target stage</option>
                            {targetOptions.map((option) => (
                              <option key={`${projectItem.projectId}-${option.stage}`} value={option.stage}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className="sr-only">Move note</span>
                          <input
                            type="text"
                            value={pipelineMoveNoteByProjectId[projectItem.projectId] ?? ''}
                            onChange={(event) => onPipelineMoveNoteChange(projectItem.projectId, event.target.value)}
                            placeholder="Add a note"
                            disabled={isPending}
                          />
                        </label>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => onMoveItem(projectItem)}
                          disabled={isPending}
                        >
                          {isPending ? 'Moving…' : 'Move'}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
            {overflowCount > 0 ? <p className="pipeline-more-items">+{overflowCount} more {isPainsStage ? 'pains' : 'items'}</p> : null}
          </div>
        )}
      </section>
    </article>
  );
}
